# Hutatma Smruti Mandir Venue Booking System

The application uses ASP.NET Web Forms for the frontend, ASP.NET Core 8 for
the API, and SQL Server with Entity Framework Core for persistence. The
frontend conversion preserves the existing booking, payment, cancellation,
refund, staff, and administration flows while continuing to use the existing
API contracts and database migrations.

## Project structure

```text
frontend/                         ASP.NET Web Forms (.NET Framework 4.8)
  Site.aspx                       Routed Web Forms entry point
  Global.asax                     Friendly-route registration
  Scripts/app.js                  Page interactions and existing API calls
  Content/site.css                Responsive site styles
backend/                          ASP.NET Core 8 Web API
  Controllers/                    Existing application API
  Data/                           EF Core SQL Server context and initialization
  Migrations/                     SQL Server schema migrations
database/                         Reference/manual SQL scripts
```

The API and SQL Server schema remain the source of truth for application
rules, validation, pricing, booking conflicts, and persistence. Do not apply
the historical scripts in `database/` on top of an EF-managed database; see
`database/README.md`.

## Requirements

- .NET Framework 4.8 Developer Pack and IIS ASP.NET 4.8 for the Web Forms site.
- .NET 8 SDK and ASP.NET Core 8 Hosting Bundle for the API.
- SQL Server and a database identity configured for the API.
- IIS URL Rewrite and Application Request Routing (ARR) when proxying `/api`
  through the frontend site.

## Configure and run locally

1. Configure the API connection string and required JWT settings using
   `backend/appsettings.example.json` as a reference. Keep credentials in
   local user secrets or environment variables; do not commit them.
2. Start the API:

   ```powershell
   dotnet run --project .\backend\HutatmaBooking.API.csproj
   ```

   The API applies EF Core migrations during startup. Confirm SQL Server is
   reachable and that the configured identity has the required permissions.
3. Set `ApiBaseUrl` in `frontend\Web.config` to the API URL for local use.
   The checked-in default is `http://localhost:5001/api`.
4. Build the Web Forms project:

   ```powershell
   dotnet build .\frontend\HutatmaBooking.WebForms.csproj --configuration Release
   ```

5. Run the Web Forms application in IIS/IIS Express with ASP.NET 4.8 enabled.
   Set `ApiBaseUrl` to `/api` when the IIS ARR rewrite rule proxies the
   same-origin API requests to `http://127.0.0.1:5001`.

## Application routes

The public site includes home, venue information, gallery, contact/complaints,
booking, booking lookup and receipt printing, cancellation applications,
refund applications, and refund tracking.

The staff portal includes OTP sign-in and role-aware administration for the
dashboard, bookings, slot availability, payments, venues and pricing,
holidays, gallery, notices, complaints, cancellations, refunds, users,
receipts, and audit records. Direct navigation to these friendly routes is
handled by Web Forms routing.

## Production deployment

See `Deployment_Guide.md` for IIS bindings, SQL Server configuration,
secrets, publishing, smoke tests, and rollback instructions.
