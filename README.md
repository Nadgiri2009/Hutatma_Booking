# Hutatma Smruti Mandir Venue Booking System

The checked-out application currently contains an ASP.NET Web Forms frontend,
an ASP.NET Core 8 API, and SQL Server persistence through Entity Framework
Core. The Web Forms migration is in progress; the current `Site.aspx` shell
does not yet replace all citizen and department workflows. Do not treat the
migration as complete or remove the API until the approved page-by-page
replacement is implemented and tested.

## Project structure

```text
frontend/                         ASP.NET Web Forms (.NET Framework 4.8)
  Site.aspx                       Routed Web Forms entry point
  Global.asax                     Friendly-route registration
  Site.aspx.cs                    Server-side rendering and request handling
  Content/site.css                Responsive site styles
backend/                          ASP.NET Core 8 Web API
  Controllers/                    Existing application API
  Data/                           EF Core SQL Server context and initialization
  Migrations/                     SQL Server schema migrations
database/                         Reference/manual SQL scripts
```

The API and EF migrations remain the current application's behavior and
schema reference while the migration is underway. For the proposed Web Forms
schema script and safe fresh/existing-database handling, see
[`database/README.md`](./database/README.md). Do not run the historical scripts
in `database/` on an EF-managed database.

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

The existing API implements the public home, venue information, gallery,
contact/complaints, booking, booking lookup and receipt printing, cancellation
applications, refund applications, and refund tracking. These are not all
available in the current Web Forms shell yet.

The existing API also implements staff OTP sign-in and role-aware
administration for the dashboard, bookings, slot availability, payments,
venues and pricing, holidays, gallery, notices, complaints, cancellations,
refunds, users, receipts, and audit records. The migration will remove the
standalone staff sign-in only when equivalent pages are integrated with the
host Department Panel; the module is not yet ready to replace these API
workflows.

## Production deployment

See [VM_GO_LIVE_STEPS.md](VM_GO_LIVE_STEPS.md) for the step-by-step Windows VM
setup and [Deployment_Guide.md](Deployment_Guide.md) for additional IIS,
SQL Server, secrets, publishing, smoke-test, and rollback details.
