# Deployment Guide

This guide deploys the React frontend and ASP.NET Core 8 API on Windows Server/IIS, backed by SQL Server. The public site uses `hsm.solapurcorporation.org` and `115.242.140.250`; IIS serves the frontend on the public bindings and reverse-proxies `/api/*` to an API site bound only to loopback.

## 1. Prepare the Server

1. In the authoritative DNS zone for `solapurcorporation.org`, create or update an **A** record: host `hsm`, value `115.242.140.250`. Remove conflicting A/AAAA records unless they also point to this server. DNS changes must be made with the domain's DNS provider; IIS cannot create public DNS records.
2. Verify DNS after it propagates:

   ```powershell
   Resolve-DnsName hsm.solapurcorporation.org
   ```

   Confirm the returned IPv4 address is `115.242.140.250`. Ensure the server owns that public IP, or that the router/NAT forwards ports 80 and 443 to it.
3. Install Windows Server updates and IIS with Static Content, the IIS URL Rewrite module, and Application Request Routing (ARR). Enable ARR's **Proxy** feature at the server level in IIS Manager.
4. Install the .NET 8 Hosting Bundle on the IIS server, then restart IIS.
5. Install SQL Server 2022 (or a supported managed SQL Server) and configure encrypted connectivity from the API server.
6. Install Node.js 18 LTS on the build machine. Node.js is needed only to build the frontend.
7. Obtain a trusted TLS certificate for `hsm.solapurcorporation.org` and install it in the server's Local Computer certificate store.

### Public IIS bindings

Create one frontend IIS site, with its physical path set to the deployed React `build` directory. Add these bindings to that site:

| Type | IP address | Port | Host name | Certificate |
| --- | --- | ---: | --- | --- |
| HTTP | All Unassigned (or `115.242.140.250`) | 80 | `hsm.solapurcorporation.org` | None |
| HTTP | `115.242.140.250` | 80 | *(leave blank)* | None |
| HTTPS | All Unassigned (or `115.242.140.250`) | 443 | `hsm.solapurcorporation.org` | Domain certificate; enable SNI if sharing the IP |

The blank-host HTTP binding lets `http://115.242.140.250` reach the site; the included frontend `web.config` redirects HTTP requests, including IP requests, to `https://hsm.solapurcorporation.org`. Use the domain URL for normal public access. A regular domain certificate does **not** validate `https://115.242.140.250`; only add an HTTPS IP binding if the certificate includes that IP address in its subject alternative names.

Open inbound TCP 80 and 443 in Windows Firewall and any upstream firewall/NAT. Do not expose the API's loopback port (5001) publicly.

## 2. Configure SQL Server

1. Create a production database, for example `HutatmaBookingDB`.
2. Create a dedicated application database identity. Do not use `sa` for the running API.
3. Back up the database before every schema deployment.
4. From the repository root, restore the .NET project and generate an idempotent migration script when the database administrator will apply schema changes separately:

   ```powershell
   dotnet restore .\backend\HutatmaBooking.API.csproj
   dotnet tool install --global dotnet-ef --version 8.0.0
   dotnet ef migrations script --idempotent --project .\backend\HutatmaBooking.API.csproj --output .\artifacts\database.sql
   ```

5. Review and run `artifacts\database.sql` against the production database using the DBA deployment process.
6. The application currently calls `Database.Migrate()` during startup. If migrations are not applied separately, the API database identity must have permission to apply migrations. Prefer applying the reviewed script before deploying the API and use a least-privilege runtime identity.
7. Do not run `database\001_CreateSchema.sql` on top of the EF-managed production schema. Use the EF migration history as the schema source of truth.

## 3. Configure Production Secrets

Do not commit production credentials, `.env` files, or `appsettings.Production.json`. The repository ignores local appsettings files and environment files; keep production values in a protected secret store or in the hosting environment.

**Set `ASPNETCORE_ENVIRONMENT=Production` explicitly in IIS.** `backend\Program.cs` defaults an unset environment to `Development`.

Configure these values for the API process using .NET environment-variable naming (`__` represents a configuration section separator):

| Setting | Purpose |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT=Production` | Loads production behavior and configuration. |
| `ConnectionStrings__DefaultConnection` | Encrypted SQL Server connection string for the dedicated runtime identity. |
| `Jwt__Key` | Long, cryptographically random signing key. Do not reuse the sample value. |
| `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpiryHours` | Match the production JWT configuration. |
| `PaymentGateway__Provider` | Set the intended provider for this environment. |
| `PaymentGateway__Razorpay__Key`, `PaymentGateway__Razorpay__Secret`, `PaymentGateway__Razorpay__WebhookSecret` | Credentials from the corresponding Razorpay environment. Never mix test and live credentials. |
| `PaymentGateway__CallbackUrl` | Public HTTPS payment callback URL, if configured for the provider. |
| `PaymentNotifications__Smtp__*` | SMTP host, port, TLS, username, password, and sender address. |
| `PaymentNotifications__AclGateway__BaseUrl` | ACL gateway endpoint, for example `https://push3.aclgateway.com/servlet/com.aclwireless.pushconnectivity.listeners.TextListener`. |
| `PaymentNotifications__AclGateway__AppId`, `PaymentNotifications__AclGateway__UserId`, `PaymentNotifications__AclGateway__Password`, `PaymentNotifications__AclGateway__SenderId` | ACL gateway credentials and registered sender ID. Keep credentials in protected server configuration; do not commit them. |
| `PaymentNotifications__AclGateway__OtpDltTemplateId`, `PaymentNotifications__AclGateway__PaymentDltTemplateId` | DLT template IDs registered and approved for the OTP and payment SMS text, respectively. |
| `FileStorage__UploadPath` | Not currently read by the upload controller, which writes under `wwwroot\uploads\idproofs`; preserve that directory as described below. |

Use the values and structure in `backend\appsettings.example.json` as a reference only. Configure SQL encryption and certificate validation for production; do not copy development settings such as `TrustServerCertificate=True` without an approved reason.

## 4. Apply Production Security Gates

Complete these checks before exposing the API to the internet:

1. **Restrict CORS.** `backend\Program.cs` currently uses `AllowAnyOrigin()`. Replace it with an explicit allowlist containing only the frontend HTTPS origin. The existing `AllowedOrigins` setting is not currently wired into the CORS policy. For example:

   ```csharp
   var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? "")
       .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

   builder.Services.AddCors(options => options.AddPolicy("AllowFrontend", policy =>
       policy.WithOrigins(allowedOrigins)
           .AllowAnyHeader()
           .AllowAnyMethod()));
   ```

   Set `AllowedOrigins` to `https://hsm.solapurcorporation.org` if the CORS policy is made configurable. The production frontend uses the same origin for `/api`.

2. **Protect Swagger.** Swagger is currently enabled in every environment. Disable it in production or protect it behind an authenticated/internal-only route before internet exposure.
3. **Change default credentials.** Change any seeded/default administrator password before launch and verify that no sample JWT, SQL, Razorpay, SMTP, or ACL gateway credentials are present in the production environment.
4. **Use HTTPS only for the public domain.** Bind the domain certificate in IIS and redirect domain HTTP traffic to HTTPS. Direct-IP HTTP is for diagnostics only; do not enter applicant or payment information there. Use HTTPS URLs for external payment callbacks.

## 5. Publish the API behind IIS

Run from the repository root on the build machine:

```powershell
dotnet publish .\backend\HutatmaBooking.API.csproj --configuration Release --output .\artifacts\api
```

1. Copy the contents of `artifacts\api` to a versioned directory on the server, for example `D:\Sites\HutatmaApi\releases\2026-10-07`.
2. Create an IIS application pool with **.NET CLR Version: No Managed Code**.
3. Create an IIS site named `HutatmaBookingApi` pointing to the published API directory. Add a single HTTP binding to IP `127.0.0.1`, port `5001`, with no host name. Do not add a public binding. Keep the generated ASP.NET Core `web.config` in the published directory.
4. Assign the API application pool and grant its identity read/execute access to the API directory plus write access to persistent upload and log directories.
5. Set `ASPNETCORE_ENVIRONMENT=Production` and production configuration/secrets for the API process. For IIS, use the API site's deployed `web.config` `<aspNetCore><environmentVariables>` section or the server's protected environment configuration; never add secrets to source control. Recycle the API application pool after changes.
6. Keep the frontend site's included `/api/*` rewrite rule. It forwards requests to `http://127.0.0.1:5001`; this requires ARR Proxy to be enabled. Test `http://127.0.0.1:5001/api/venues` on the server before publishing traffic.
7. Start the API and check its logs. Resolve database migration/connectivity errors before enabling public traffic.

## 6. Build and Publish the Frontend

Build the frontend to use a relative API URL so both the domain and IP bindings work without a separate API DNS name. From the repository root:

```powershell
Push-Location .\frontend
npm ci
$env:REACT_APP_API_URL = '/api'
npm run build
Pop-Location
```

1. Confirm that `frontend\build` is generated and that API requests use `/api` (not `localhost` or a hard-coded server address).
2. Deploy the contents of `frontend\build` to the frontend IIS site's physical path. Its included `web.config` redirects domain HTTP to HTTPS, proxies `/api/*` to the loopback API site, and falls back to `index.html` for React routes.
3. In IIS Manager, verify the domain and IP bindings. The API site must remain bound only to `127.0.0.1:5001`.
4. Do not put API credentials or other secrets in React environment variables; build variables are public in the generated JavaScript.

## 7. Configure Storage, Logs, and Backups

1. The current upload controller writes ID proofs under the API site's `wwwroot\uploads\idproofs`. Preserve that directory across API releases (for example, keep it outside the release directory and use a junction), and back it up. `FileStorage:UploadPath` is not currently used by that controller.
2. Grant the API application-pool identity write permission to the persistent upload directory and the Serilog log directory.
3. Configure log rotation, monitoring, and alerts for API startup failures, database errors, payment callbacks, and notification delivery failures.
4. Schedule SQL Server full backups and test restoring them. Retain a pre-deployment backup before applying migrations.
5. Keep the previous frontend and API release directories until the new release passes its smoke tests.

## 8. Smoke-Test the Deployment

1. Open `https://hsm.solapurcorporation.org` and verify that direct navigation to routes such as `/cancel-booking` and `/track-refund` works after refresh.
2. Request `https://hsm.solapurcorporation.org/api/venues` and confirm the API returns venue data.
3. Verify `http://115.242.140.250` reaches the frontend. Check the browser console and network panel for failed `/api/` requests.
4. Test application/mobile lookup, booking availability, booking summary, and admin sign-in with non-production test data.
5. In a payment test environment, verify payment initiation, callback handling, receipt generation, and notification delivery. Do not test live charges with production credentials.
6. Verify that uploaded files persist across an API deployment and that logs are being written.
7. Confirm TLS certificates, redirects, database backups, and monitoring before announcing availability.

## 9. Roll Back Safely

1. Disable or drain traffic to the affected site.
2. Point IIS back to the previous versioned frontend/API release.
3. If a migration caused the failure, restore the pre-deployment database backup or use a reviewed forward-fix migration. Do not assume every migration can be safely rolled back with `Down()`.
4. Re-run the smoke tests before restoring traffic.

## Local Wi-Fi Testing Is Not Production Hosting

For temporary same-network phone testing only, bind the React dev server and API to `0.0.0.0`, configure `REACT_APP_API_URL` to the PC's Wi-Fi IP, and allow the selected ports on the PC's private-network firewall. Use the current Wi-Fi IP shown by `Get-NetIPAddress`; it can change. Do not expose the development server or HTTP test credentials to the public internet.
