# SQL Server database setup

`Tables.sql` is the current idempotent schema and existing master-data seed
script for the Web Forms migration. It is based on the final EF model snapshot
and the model/initializer seed values in `backend/Data/AppDbContext.cs` and
`backend/Data/DbInitializer.cs`, not on the old manual scripts in this folder.
It creates missing tables, indexes and foreign keys,
and inserts only missing role and venue/pricing/equipment/facility/rule
master rows. It does not drop objects, alter existing columns, or update
existing data. It does not create stored procedures or
`__EFMigrationsHistory`.

The scripts `001_CreateSchema.sql`, `002_remove_approval_workflow.sql`,
`003_venue_master_from_rate_chart_20230912.sql`,
`004_create_venue_master_tables.sql`,
`009_create_booking_modification_tables.sql`, and
`010_remove_approval_finalize_and_add_session.sql` are historical/reference
files. Do not run them for the migrated application. In particular,
`009_create_booking_modification_tables.sql` creates stored procedures, which
are prohibited for this module. The `deprecated/` files are not setup inputs.

## New, empty database

1. Use SQL Server 2012 or later (`THROW` is used for transaction error
   propagation) and create an empty database with the intended name in SQL Server
   Management Studio (or the approved deployment tooling).
2. Select that database and run `Tables.sql`.
3. Review the Messages output and confirm the final `PRINT` statement appears.
   The script does not add a default Admin account. Configure the application
   connection string separately; do not put production credentials in source.
4. Configure SQL Server backups and grant the application identity only the
   permissions it needs. Run deployment scripts with a separate privileged
   deployment account.

The script includes only seed values already in the current initializer:
Admin/Staff/User/Clerk roles and the existing venue, pricing, equipment,
facility and rule master entries. It intentionally omits the baked Admin
identity/password hash from EF seed data and adds no sample booking, citizen,
payment, holiday, gallery or complaint data.

## Existing database created or managed by EF migrations

Back up the database first. Connect to the exact target database and inspect
the EF migration history before running any script:

```sql
SELECT CASE
    WHEN OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL THEN 0
    ELSE 1
END AS HasEfMigrationsHistory;

IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
BEGIN
    SELECT MigrationId, ProductVersion
    FROM dbo.__EFMigrationsHistory
    ORDER BY MigrationId;
END;
```

The checked-in migration chain contains these expected IDs; compare the
database's query output with this list rather than assuming that a live
database has applied them:

- `20260620201317_InitialCreate`
- `20260622060000_RemoveApprovalAddBookingSession`
- `20260707172336_AddRazorpayPaymentFields`
- `20260930090745_AddRefundRequests`
- `20260930093146_AddRefundRequestUpdatedAt`
- `20260930101151_SetAdminLoginMobile`
- `20260930101711_PersistAdminLoginOtp`
- `20260930104856_AddRefundOtpChallenges`
- `20261005072559_AddVenueBookingCapacityPerSession`
- `20261005102409_AddSessionSpecificBookingCapacities`
- `20261005134000_AddCancellationOtpChallenges`
- `20261006104500_AddAfternoonSlotAndMultiSlotBookings`

If all those migrations are recorded and the tables/columns/indexes/FKs match
the final snapshot, do not apply EF migrations again. `Tables.sql` may be used
as a no-destructive reconciliation only after review: its `IF NOT EXISTS`
checks skip matching objects, and its seed inserts only natural-key rows that
are absent. It does not verify or repair the shape of an existing table. Check
for duplicate values before applying its unique indexes and for orphan rows
before adding foreign keys; the script will fail rather than delete or rewrite
conflicting data.

If `__EFMigrationsHistory` exists but is missing expected migration IDs, or
the schema differs from the final snapshot, stop and compare the database with
the exact migration chain. Do not run the old hand-written scripts or mix
partial EF migrations with `Tables.sql` as an automatic repair. Resolve the
difference with a reviewed backup/restore or DBA-approved, data-preserving
migration plan first. If the history table is absent, treat the database as
manually provisioned and inspect its schema before deciding whether the
missing-object script is appropriate.
