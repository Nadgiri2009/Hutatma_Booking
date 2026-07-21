# Database scripts

These `.sql` files are reference/manual scripts. **They are not executed
automatically by the application.** The application's actual schema and
seed data are managed by EF Core migrations in `backend/Migrations/`, run
via `dotnet ef database update` (see note on `Program.cs` below).

| File | Purpose |
|---|---|
| `001_CreateSchema.sql` | Initial schema (users, roles, premises, bookings). **Describes the `Premises`/`Sessions`/`Rates` tables, which have since been retired** — see "Booking flow now prices off VenueMaster" below. Kept for history only. |
| `002_remove_approval_workflow.sql` | Drops the old approval-workflow columns. Also references the retired `Premises`/`Sessions` tables; historical only. |
| `003_venue_master_from_rate_chart_20230912.sql` | **Source of truth** for venue/pricing/equipment data, extracted and verified directly from `HSM_-_Rate_Chart_12_09_2023.pdf`. |
| `004_create_venue_master_tables.sql` | Redundant table-creation script — `003` already creates the same tables. Harmless (idempotent) but superseded by the EF migration `AddVenueMasterTables`. |
| `009_create_booking_modification_tables.sql` | Booking-modification history tables and stored procedures (not currently wired into the running app — see Phase 5/6 docs). Its `SessionType` columns are free-text change-log labels, unrelated to the retired `Sessions` table. |
| `010_remove_approval_finalize_and_add_session.sql` | Reference copy of EF migration `RemoveApprovalAddBookingSession`: normalises legacy `Approved`/`Rejected` rows to `Confirmed`/`Cancelled`, and adds the `Bookings.Session` (Morning/Evening/FullDay) column used for same-day conflict checks. |
| `deprecated/` | A second, conflicting attempt at the venue/pricing seed that does **not** match the PDF. See `deprecated/README.md`. Do not run these. |

## Booking flow now prices off VenueMaster, not Premises/Sessions/Rates

The booking/payment flow originally priced bookings from `Premises` + `Sessions`
(Morning/Evening/Full Day) + `Rates` — a table set that was never seeded
anywhere (no script or migration ever inserted a `Rates` row) and that doesn't
match the real rate chart's per-use-case, per-venue pricing model.

This has been refactored: `Bookings` now references `VenueMaster` and
`VenuePricing` directly (see migration `RefactorBookingsToVenuePricing`), and
`Premises`/`Sessions`/`Rates` have been dropped. If you have an existing
database created before this change, applying the new migration will drop
those tables — back up first if you have real data in them (in practice
there shouldn't be any, since booking creation always threw before this fix).


## Why the PDF data wasn't showing up in the app

The EF Core migration meant to seed this data
(`backend/Migrations/20260619102310_PopulateVenueMasterData.cs`) was empty —
it only touched an unrelated timestamp column. The real insert statements
existed only in this folder's loose `.sql` files, which nothing in the app
ever executes. On top of that, `Program.cs` had its `db.Database.Migrate()`
call commented out, so even schema migrations weren't applied automatically
on startup.

Both are now fixed:

- `PopulateVenueMasterData.cs` now contains the verified data from `003`
  (plus the previously-missing Shubhrai Art Gallery pricing row), inserted
  idempotently via `migrationBuilder.Sql(...)`.
- Auto-migration on startup is re-enabled in `Program.cs`.

To apply this to an existing database that already has the empty version of
this migration recorded in `__EFMigrationsHistory`, run:

```
dotnet ef database update
```

If the migration was already marked as applied with no data, EF will skip
it. In that case, run the data section directly with:

```
sqlcmd -S localhost\SQLEXPRESS02 -d HutatmaBookingDB -i 003_venue_master_from_rate_chart_20230912.sql
```
