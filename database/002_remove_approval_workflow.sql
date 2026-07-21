-- Migration: Remove approval workflow and switch to PendingPayment default
-- 1) Migrate existing statuses: PendingApproval -> PendingPayment
-- 2) Drop approval-related columns if present: ApprovedBy, ApprovedAt, RejectionReason
-- 3) Update default constraint on Bookings.Status to 'PendingPayment'
-- 4) Replace CHECK constraint to include 'PendingPayment'
-- 5) Add recommended index for availability checks

BEGIN TRANSACTION;

-- 1) Update existing rows
UPDATE Bookings
SET Status = 'PendingPayment'
WHERE Status = 'PendingApproval';

-- 2) Drop approval-related columns if they exist
IF COL_LENGTH('Bookings', 'ApprovedBy') IS NOT NULL
BEGIN
    ALTER TABLE Bookings DROP COLUMN ApprovedBy;
END

IF COL_LENGTH('Bookings', 'ApprovedAt') IS NOT NULL
BEGIN
    ALTER TABLE Bookings DROP COLUMN ApprovedAt;
END

IF COL_LENGTH('Bookings', 'RejectionReason') IS NOT NULL
BEGIN
    ALTER TABLE Bookings DROP COLUMN RejectionReason;
END

-- 3) Drop existing default constraint on Status and add new default
DECLARE @dfname NVARCHAR(128);
SELECT @dfname = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
JOIN sys.tables t ON t.object_id = c.object_id
WHERE t.name = 'Bookings' AND c.name = 'Status';

IF @dfname IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Bookings DROP CONSTRAINT ' + @dfname);
END

ALTER TABLE Bookings ADD CONSTRAINT DF_Bookings_Status DEFAULT ('PendingPayment') FOR Status;

-- 4) Drop existing check constraint on Status and add new one
DECLARE @ckname NVARCHAR(128);
SELECT @ckname = cc.name
FROM sys.check_constraints cc
JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'Bookings' AND cc.definition LIKE '%PendingApproval%';

IF @ckname IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Bookings DROP CONSTRAINT ' + @ckname);
END

ALTER TABLE Bookings ADD CONSTRAINT CK_Bookings_Status CHECK (Status IN ('PendingPayment','Approved','Rejected','Cancelled'));

-- 5) Recommended index to speed up availability/conflict queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bookings_Premise_From_To_Status_Session')
BEGIN
    CREATE INDEX IX_Bookings_Premise_From_To_Status_Session
    ON Bookings (PremiseId, FromDate, ToDate, Status, SessionId);
END

COMMIT TRANSACTION;
GO
