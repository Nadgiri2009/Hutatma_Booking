# VM Go-Live Steps

This runbook deploys the React + TypeScript frontend and ASP.NET Core 8 API
to a Windows VM with IIS and SQL Server.

| Setting | Value |
| --- | --- |
| Domain | `hsm.solapurcorporation.org` |
| Public IPv4 | `115.242.140.250` |
| Public website | `https://hsm.solapurcorporation.org` |
| Private API listener | `http://127.0.0.1:5001` |

If your assigned domain or VM IP is different, substitute your actual values
throughout. The detailed deployment, secrets, database, backup, and rollback
guidance is in [Deployment_Guide.md](./Deployment_Guide.md).

## 1. Point the domain to the VM

1. At your DNS provider, create/update an **A** record for host `hsm` in the
   `solapurcorporation.org` zone with value `115.242.140.250`.
2. Wait for DNS propagation, then check:

   ```powershell
   Resolve-DnsName hsm.solapurcorporation.org
   ```

   It should resolve to your VM's public IP.
3. Allow inbound TCP **80** and **443** in the Windows Firewall and any
   hosting/cloud firewall. Do not expose port **5001** publicly.

## 2. Install server prerequisites

On the Windows VM, install:

- IIS with Static Content.
- IIS URL Rewrite and Application Request Routing (ARR); enable ARR Proxy.
- The .NET 8 Hosting Bundle for the API, then restart IIS.
- SQL Server locally or a reachable SQL Server with encrypted, firewall-
  restricted connectivity.
- A trusted TLS certificate for `hsm.solapurcorporation.org` in the Local
  Computer certificate store.

Node.js/npm and the .NET 8 SDK are needed on the build machine. They are not
required on the VM to serve the built React static files.

## 3. Configure the production database and secrets

1. Create the production database and a dedicated API database identity. Back
   up any existing database before deployment. EF Core migrations run during
   API startup, so coordinate database permissions or have the DBA apply a
   reviewed migration script first.
2. Configure these API process settings securely on the VM; do not put real
   credentials in source control or in the React application:

   ```text
   ASPNETCORE_ENVIRONMENT=Production
   ConnectionStrings__DefaultConnection=<encrypted production SQL connection string>
   Jwt__Key=<new long random signing key>
   Jwt__Issuer=<configured issuer>
   Jwt__Audience=<configured audience>
   Jwt__ExpiryHours=<approved lifetime>
   AllowedOrigins=https://hsm.solapurcorporation.org
   PaymentGateway__Provider=<approved provider>
   ```

3. For production payments and notifications, configure the appropriate live
   Razorpay, SMTP, and SMS gateway settings. Do not mix test and live payment
   credentials. Change any seeded/default administrator password before
   public launch.

## 4. Build and copy the release

From the repository root on the build machine:

```powershell
dotnet publish .\backend\HutatmaBooking.API.csproj --configuration Release --output .\artifacts\api
Push-Location .\frontend
npm ci
$env:REACT_APP_API_URL = '/api'
npm run build
Pop-Location
```

Copy `artifacts\api` to a versioned API directory on the VM. Copy the
contents of `frontend\build` to a separate versioned web directory. The
frontend build includes `web.config`, which provides React route fallback,
HTTPS redirection, and the `/api/*` proxy. Keep prior release directories
for rollback. Do not deploy `node_modules`, `.env` files, or local secrets.

## 5. Configure IIS

1. Create an API application pool using **No Managed Code**. Create an API
   IIS site pointing at its published directory and bind it only to
   `127.0.0.1:5001` over HTTP. Assign the API pool and set the production
   process settings from step 3.
2. Create a frontend IIS site pointing at the deployed React `build`
   directory. Add:

   | Type | IP | Port | Host name | Certificate |
   | --- | --- | ---: | --- | --- |
   | HTTP | All Unassigned or VM IP | 80 | `hsm.solapurcorporation.org` | None |
   | HTTPS | All Unassigned or VM IP | 443 | `hsm.solapurcorporation.org` | Domain certificate |

   Enable SNI if the VM hosts multiple HTTPS sites on the same IP. Enable ARR
   proxy at the IIS server level so the frontend's API rewrite can reach the
   API loopback listener.
3. Keep the API bound to loopback only. Do not create a public port 5001
   binding or firewall rule.
4. Preserve and back up API uploads under `wwwroot\uploads\idproofs` and
   ensure the API pool identity can write there and to its log directory.

## 6. Verify before announcing the site

From the VM, confirm the private API returns venue data:

```powershell
Invoke-WebRequest http://127.0.0.1:5001/api/venues -UseBasicParsing
```

Then check from a browser:

1. `https://hsm.solapurcorporation.org/book` loads the booking flow and has a
   trusted certificate.
2. `https://hsm.solapurcorporation.org/api/venues` returns venue data through
   the frontend IIS proxy.
3. Refresh direct React routes such as `/cancel-booking`, `/refunds`,
   `/track-refund`, and `/admin/login`.
4. Test availability, booking summary, OTP/admin flows, uploads, and payment
   callbacks with non-production data and test credentials. Check browser
   developer tools for failed API requests and mixed-content/CORS errors.
5. Confirm database backups, upload persistence, logging, monitoring, and
   rollback before opening the site to users.

See [Deployment_Guide.md](./Deployment_Guide.md) for the full production
checklist and rollback procedure.
