-- Reference/manual copy of EF Core migration
-- backend/Migrations/20260622060000_RemoveApprovalAddBookingSession.cs
-- NOT executed automatically — see README.md. Run `dotnet ef database update`
-- instead; this file is kept here only so the schema history stays readable
-- alongside the other numbered scripts in this folder.
--
-- 1) Admin "approve / reject" workflow is fully removed from the application.
--    Bookings are confirmed automatically the moment payment is verified
--    (see BookingService.CreateBookingAsync / PaymentService.VerifyPaymentAsync).
--    Normalise any legacy rows left over from the old workflow:
--      "Approved" -> "Confirmed"
--      "Rejected" -> "Cancelled"
-- 2) Add a Session column (Morning / Evening / FullDay) to Bookings so the
--    same venue can be booked for a Morning slot and an Evening slot on the
--    same date, while a FullDay booking blocks the whole date. Existing rows
--    are backfilled as FullDay (they occupied the whole day under the old
--    single-status-per-day model).

BEGIN TRANSACTION;

UPDATE Bookings SET Status = 'Confirmed' WHERE Status = 'Approved';
UPDATE Bookings SET Status = 'Cancelled' WHERE Status = 'Rejected';

IF COL_LENGTH('Bookings', 'Session') IS NULL
BEGIN
    ALTER TABLE Bookings ADD Session NVARCHAR(20) NOT NULL CONSTRAINT DF_Bookings_Session DEFAULT ('FullDay');
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bookings_VenueId_FromDate_ToDate_Session')
BEGIN
    CREATE INDEX IX_Bookings_VenueId_FromDate_ToDate_Session
    ON Bookings (VenueId, FromDate, ToDate, Session);
END

COMMIT TRANSACTION;
GO
