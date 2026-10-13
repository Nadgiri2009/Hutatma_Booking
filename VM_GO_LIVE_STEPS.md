# VM Go-Live Steps

This runbook deploys the Hutatma Smruti Mandir booking application to a
Windows VM using IIS, SQL Server, the ASP.NET Core 8 API, and the ASP.NET Web
Forms frontend.

The repository's current deployment values are:

| Setting | Value |
| --- | --- |
| Public domain | `hsm.solapurcorporation.org` |
| VM public IPv4 | `115.242.140.250` |
| Public frontend | `https://hsm.solapurcorporation.org` |
| API listener (private to the VM) | `http://127.0.0.1:5001` |

If your DNS provider or VM details differ, replace the domain and IP below
with the actual values before following the runbook. Keep the API listener
private; the public site forwards `/api/*` requests to it through IIS ARR.

For more detail on database operations, secrets, storage, smoke tests, and
rollback, see [Deployment_Guide.md](./Deployment_Guide.md).

## Important: booking submission is not production-ready yet

The booking screens and availability flow can be deployed, but the current
frontend intentionally blocks payment/submission until applicant details can
be loaded from the citizen profile API. That integration is not present yet.
Do not announce that customers can complete bookings or accept real payments
until the profile integration is implemented and tested. The deployment
steps below make the site reachable; they do not remove this application
limitation.

## 1. Prepare the VM and DNS

1. Confirm that the VM is a supported Windows Server release, has a stable
   public IPv4 address, and that you can administer it remotely.
2. At the DNS provider for `solapurcorporation.org`, create or update:

   | Record | Host/name | Value |
   | --- | --- | --- |
   | A | `hsm` | `115.242.140.250` |

   If you need another public hostname, configure its DNS record, TLS
   certificate, and IIS binding separately.
3. Allow inbound TCP **80** and **443** in the VM's Windows Firewall and any
   cloud firewall, security group, or router/NAT in front of it. Do not open
   TCP **5001** to the internet.
4. After DNS propagation, verify from an administrative PowerShell prompt:

   ```powershell
   Resolve-DnsName hsm.solapurcorporation.org
   ```

   Confirm it resolves to `115.242.140.250`.
5. Install Windows updates. Configure remote administration so that RDP or
   other management access is restricted to trusted addresses.

## 2. Install the web and runtime prerequisites

Install and verify the following on the VM:

- IIS with Static Content and ASP.NET 4.8 features.
- IIS URL Rewrite and Application Request Routing (ARR); enable ARR's
  **Proxy** feature in IIS Manager.
- .NET Framework 4.8 runtime for the Web Forms application.
- .NET 8 Hosting Bundle for the API. Restart IIS after installing it.
- SQL Server on the VM or a supported SQL Server reachable over an encrypted,
  firewall-restricted connection.
- A trusted TLS certificate for `hsm.solapurcorporation.org`, installed in
  **Local Computer \ Personal**. A normal domain certificate does not secure
  `https://115.242.140.250`.

Use a build machine with the .NET 8 SDK and .NET Framework 4.8 Developer Pack
to build the applications.

## 3. Prepare the production database

1. Create a production database and a dedicated SQL identity for the API. Do
   not run the application as `sa`.
2. Configure encrypted SQL connectivity and certificate validation. Do not
   copy a development connection string containing
   `TrustServerCertificate=True` into production without an approved reason.
3. Take a database backup before deploying. The API applies EF Core migrations
   and seeds required data during startup, so its database identity must have
   the permissions needed for this first startup. If your DBA applies
   migrations separately, coordinate the permissions and startup migration
   behavior before launch.
4. Do not execute the historical scripts under `database\` on top of an
   EF-managed database. EF Core migrations are the schema source of truth.
5. Schedule regular SQL backups and verify that a backup can be restored.

## 4. Build release files

Run these commands from the repository root on the build machine:

```powershell
dotnet publish .\backend\HutatmaBooking.API.csproj --configuration Release --output .\artifacts\api
dotnet build .\frontend\HutatmaBooking.WebForms.csproj --configuration Release
```

The API publish intentionally does not include local `appsettings*.json` or
uploaded ID proofs. Do not copy development secrets to the VM. Transfer
release files over an authenticated, encrypted channel.

On the VM, create versioned deployment directories, for example:

```text
D:\Sites\HutatmaApi\releases\<release>
D:\Sites\HutatmaWeb\releases\<release>
D:\Sites\HutatmaData\uploads\idproofs
```

Copy the API publish output to the API release directory. Copy the frontend
application files and the compiled
`frontend\bin\HutatmaBooking.WebForms.dll` to the frontend release directory.
Include `Site.aspx`, `Global.asax`, `Web.config`, `Scripts\`, `Content\`, and
the images used by the site. Do not deploy `.git`, `obj`, or `node_modules`.
Keep the previous release directories for rollback.

## 5. Configure and start the API in IIS

1. Create an IIS application pool named `HutatmaBookingApi` with
   **.NET CLR Version: No Managed Code** and **Integrated** pipeline mode.
2. Create an IIS site named `HutatmaBookingApi` pointing to the API release
   directory. Bind it to **HTTP**, IP `127.0.0.1`, port `5001`, with no host
   name. Do not add a public IP or public DNS binding to this API site.
3. Keep the generated ASP.NET Core `web.config` from the publish output.
   Configure production values for the API process using protected server
   configuration. If environment variables are placed in the API
   `web.config`, restrict file access to administrators and the API site
   identity; never commit that file with production values.
4. Set `ASPNETCORE_ENVIRONMENT` to `Production` and configure at least:

   | Environment variable | Required value |
   | --- | --- |
   | `ConnectionStrings__DefaultConnection` | Encrypted production SQL connection string |
   | `Jwt__Key` | A new, long, random signing key; never use the sample key |
   | `Jwt__Issuer` | The production JWT issuer used by this API |
   | `Jwt__Audience` | The production JWT audience used by this application |
   | `Jwt__ExpiryHours` | The approved token lifetime |
   | `AllowedOrigins` | `https://hsm.solapurcorporation.org` |
   | `PaymentGateway__Provider` | The payment provider approved for launch |

   For live Razorpay payments, also configure the live
   `PaymentGateway__Razorpay__Key`, `PaymentGateway__Razorpay__Secret`,
   `PaymentGateway__Razorpay__WebhookSecret`, and any required callback URL.
   Configure production SMTP and SMS gateway values if those notifications
   are required. Never mix test and live payment credentials.
5. Grant the API application-pool identity read/execute access to the release.
   The API writes uploads under `wwwroot\uploads\idproofs`; preserve that path
   across releases (for example, use a directory junction to
   `D:\Sites\HutatmaData\uploads\idproofs`) and grant the identity write access
   to the persistent upload directory. The default Serilog file sink writes
   under `Logs\log-.txt` relative to the API content root; ensure that
   directory is writable and preserve it when swapping releases.
6. Recycle the API application pool. Check the API logs and Windows Event
   Viewer for startup, SQL migration, or configuration errors before
   continuing.
7. From the VM, verify that the private API listener responds:

   ```powershell
   Invoke-WebRequest http://127.0.0.1:5001/api/venues -UseBasicParsing
   ```

   Expect an HTTP success response with venue data. Swagger should remain
   disabled in Production.

## 6. Configure and start the public frontend in IIS

1. Create an IIS application pool named `HutatmaBookingWeb` with
   **.NET CLR Version: v4.0** and **Integrated** pipeline mode.
2. In the deployed frontend `Web.config`, set the `ApiBaseUrl` app setting to
   `/api`. Keep the existing URL Rewrite rule that proxies `/api/*` to
   `http://127.0.0.1:5001/api/*`.
3. Create an IIS site named `HutatmaBookingWeb` pointing to the frontend
   release directory. Assign the `HutatmaBookingWeb` pool and add these
   bindings:

   | Type | IP address | Port | Host name | Certificate |
   | --- | --- | ---: | --- | --- |
   | HTTP | All Unassigned or `115.242.140.250` | 80 | `hsm.solapurcorporation.org` | None |
   | HTTPS | All Unassigned or `115.242.140.250` | 443 | `hsm.solapurcorporation.org` | The domain certificate |

   Enable SNI for HTTPS if other sites share the IP. An optional blank-host
   HTTP binding can make the site respond to the IP address for diagnostics;
   do not use the IP URL for personal or payment information.
4. In IIS Manager, confirm ARR proxy is enabled at the server level. This is
   required for the frontend `/api/*` rewrite rule.
5. Configure HTTP-to-HTTPS redirection for the public domain. Do not redirect
   API traffic to a different host or port; browser requests should use the
   same-origin `/api` path.
6. Start/recycle the frontend site and application pool.

## 7. Verify before announcing the site

From a browser and from PowerShell, run these checks:

1. Visit `https://hsm.solapurcorporation.org/` and
   `https://hsm.solapurcorporation.org/book`. Confirm the TLS certificate is
   trusted and the booking availability form loads.
2. Visit
   `https://hsm.solapurcorporation.org/api/venues`. Confirm venue JSON is
   returned through the frontend site. The public API must not require access
   to port `5001`.
3. Refresh direct routes such as `/about`, `/gallery`, `/cancel-booking`,
   `/track-refund`, and `/admin/login`.
4. Check browser developer tools for failed requests, CORS errors, mixed
   content, and missing JavaScript/CSS/images.
5. Test availability and booking-summary flows with non-production data.
   Test admin OTP, email/SMS, uploads, and payment callbacks with the
   appropriate test credentials before any live payment test.
6. Change any seeded/default administrator password. Confirm production
   secrets are not present in source files, browser responses, logs, or
   publicly readable deployment files.
7. Confirm scheduled SQL backups, upload persistence, log rotation, monitoring,
   and a tested rollback release.
8. Keep the public service in maintenance/not accepting bookings until the
   citizen-profile integration blocker at the top of this guide is resolved.

## 8. Roll back if deployment fails

1. Stop or drain public traffic.
2. Point the IIS sites back to the previous release directories and recycle
   both application pools.
3. If a database migration is involved, restore the pre-deployment backup or
   apply a reviewed forward fix. Do not assume a migration can safely be
   reversed.
4. Re-run the verification checks before restoring public traffic.
