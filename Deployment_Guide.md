# Deployment Guide

This guide deploys the React frontend and ASP.NET Core 8 API as separate IIS sites, backed by SQL Server. Use separate HTTPS hostnames such as `https://booking.example.org` and `https://api.example.org`.

## 1. Prepare the Server

1. Install Windows Server updates and configure DNS for the frontend and API hostnames.
2. Install IIS with Static Content, WebSocket Protocol if required, and the IIS URL Rewrite module.
3. Install the .NET 8 Hosting Bundle on the API server, then restart IIS.
4. Install SQL Server 2022 (or a supported managed SQL Server) and configure encrypted connectivity from the API server.
5. Install Node.js 18 LTS on the build machine. Node.js is only needed to build the frontend; it is not required to serve the static build from IIS.
6. Ensure the server has a valid TLS certificate for both public hostnames.

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
| `PaymentNotifications__Twilio__*` | Twilio credentials and sender number when SMS delivery is enabled. |
| `FileStorage__UploadPath` | Persistent upload directory outside the disposable deployment folder. |

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

   Set `AllowedOrigins` to the exact frontend origin, such as `https://booking.example.org`.

2. **Protect Swagger.** Swagger is currently enabled in every environment. Disable it in production or protect it behind an authenticated/internal-only route before internet exposure.
3. **Change default credentials.** Change any seeded/default administrator password before launch and verify that no sample JWT, SQL, Razorpay, SMTP, or Twilio credentials are present in the production environment.
4. **Use HTTPS only.** Bind valid certificates in IIS, redirect HTTP to HTTPS, and use HTTPS URLs for the frontend API URL and payment callbacks.

## 5. Publish the API

Run from the repository root on the build machine:

```powershell
dotnet publish .\backend\HutatmaBooking.API.csproj --configuration Release --output .\artifacts\api
```

1. Copy the contents of `artifacts\api` to a versioned directory on the server, for example `D:\Sites\HutatmaApi\releases\2026-10-05`.
2. Create an IIS application pool with **.NET CLR Version: No Managed Code**.
3. Create an IIS site for `api.example.org`, pointing to the published API directory. Use the generated ASP.NET Core `web.config` in the publish output.
4. Bind HTTPS and assign the API application pool.
5. Grant the application-pool identity read/execute access to the publish directory and write access only to the configured upload and log directories.
6. Set the production environment variables for the application process. Restart the site after changing them.
7. Start the API and check the startup logs. Database migration or connectivity failures must be resolved before enabling traffic.

## 6. Build and Publish the Frontend

The API URL is embedded in the React build, so set it before building. From the repository root:

```powershell
Push-Location .\frontend
npm ci
$env:REACT_APP_API_URL = 'https://api.example.org/api'
npm run build
Pop-Location
```

1. Confirm that `frontend\build` is generated and that its API URL points to the production API, not `localhost` or a LAN address.
2. Create a separate IIS site for `booking.example.org`, pointing to the contents of `frontend\build`.
3. The existing `frontend\public\web.config` is copied into the build and provides SPA route fallback for IIS. Install IIS URL Rewrite so this rule works.
4. Bind HTTPS and configure the frontend site to serve `index.html` for client-side routes.
5. Do not put API credentials or other secrets in React environment variables; frontend build variables are public in the generated JavaScript.

## 7. Configure Storage, Logs, and Backups

1. Store user uploads on persistent storage. Do not keep uploads only inside a release directory that will be replaced during deployment.
2. Grant the API application-pool identity write permission to the configured upload directory and the Serilog log directory.
3. Configure log rotation, monitoring, and alerts for API startup failures, database errors, payment callbacks, and notification delivery failures.
4. Schedule SQL Server full backups and test restoring them. Retain a pre-deployment backup before applying migrations.
5. Keep the previous frontend and API release directories until the new release passes its smoke tests.

## 8. Smoke-Test the Deployment

1. Open `https://booking.example.org` and verify that direct navigation to routes such as `/cancel-booking` and `/track-refund` works after refresh.
2. Request `https://api.example.org/api/venues` and confirm the API returns venue data.
3. Check the browser console and network panel for CORS failures or requests accidentally sent to `localhost`.
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
