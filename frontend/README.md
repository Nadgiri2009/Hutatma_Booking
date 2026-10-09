# ASP.NET Web Forms frontend

This is the ASP.NET Web Forms frontend. It uses the existing `backend/` ASP.NET Core 8 API, API contracts, SQL Server schema, migrations, and booking/refund validation.

## Requirements and configuration

- Windows IIS with ASP.NET 4.8 and the URL Rewrite module.
- .NET Framework 4.8 Developer Pack/MSBuild to build the Web Forms project.
- The existing ASP.NET Core API and SQL Server database.
- Enable ARR proxy in IIS for the included `/api/*` reverse-proxy rule.

`Web.config` defaults to `http://localhost:5001/api` for local development (the API's existing launch profile uses port 5001). For IIS production, set `ApiBaseUrl` to `/api`; the included rewrite rule forwards same-origin API calls to the API listening on `127.0.0.1:5001`. Do not expose the API listener directly to the public network.

## Run and publish

1. Start the existing API and SQL Server using the instructions in `backend/README.md`.
2. Set `ApiBaseUrl` in `Web.config` as appropriate for local use or production.
3. Build with Visual Studio/MSBuild or `dotnet build frontend/HutatmaBooking.WebForms.csproj --configuration Release`.
4. Deploy the `frontend` contents to an IIS application using an application pool with **.NET CLR v4.0 / Integrated**. Include the compiled `bin/HutatmaBooking.WebForms.dll`. The API remains a separate ASP.NET Core 8 process using a **No Managed Code** pool.
5. Verify direct routes (for example `/book`, `/cancel-booking`, `/admin/login`) and `/api/venues`.

The friendly routes mirror the existing frontend routes. Admin screens use the existing OTP login and JWT authorization. Booking, payment completion, refund/cancellation OTP, admin workflows, and file uploads continue to call their existing API endpoints.

## Pages

Public: about, gallery, contact/complaints, booking, booking lookup/print, refund application, cancellation application, and refund tracking. The root route opens the booking flow directly.

The booking flow no longer collects or displays applicant details. Booking submission remains blocked until the citizen profile API is connected and required applicant details can be loaded from the main database.

The four booking steps are separated into reusable JavaScript modules with step-scoped styles. See [BOOKING-WORKFLOW-INTEGRATION.md](BOOKING-WORKFLOW-INTEGRATION.md) for the complete file list, shared context contract, and integration instructions.

Admin: dashboard, bookings, slot availability, payments, venues/pricing, holidays, gallery, notices, complaints, cancellations, refund requests, users, audit report, and receipt printing.
