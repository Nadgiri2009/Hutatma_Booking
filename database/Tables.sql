/*
    Hutatma Booking System - SQL Server schema for the approved Web Forms migration.

    Baseline: final EF Core model snapshot plus existing model seed code.
    This script creates missing objects only. It does not drop objects, alter
    existing columns, or update existing data. Back up and compare an existing
    database with the snapshot before running it.

    No stored procedures are created. This file must be run against the intended
    database from a privileged deployment account, not automatically at startup.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;

/* Tables. dbo matches the current EF/SQL usage. */
IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
        Name nvarchar(50) NOT NULL,
        Description nvarchar(200) NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        FullName nvarchar(150) NOT NULL,
        Email nvarchar(200) NOT NULL,
        Mobile nvarchar(15) NOT NULL,
        PasswordHash nvarchar(500) NOT NULL,
        RoleId int NOT NULL,
        IsActive bit NOT NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.VenueMaster', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueMaster
    (
        VenueId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueMaster PRIMARY KEY,
        VenueName nvarchar(150) NOT NULL,
        Description nvarchar(max) NULL,
        Capacity int NULL,
        MorningBookingCapacity int NOT NULL CONSTRAINT DF_VenueMaster_MorningBookingCapacity DEFAULT (30),
        AfternoonBookingCapacity int NOT NULL CONSTRAINT DF_VenueMaster_AfternoonBookingCapacity DEFAULT (30),
        EveningBookingCapacity int NOT NULL CONSTRAINT DF_VenueMaster_EveningBookingCapacity DEFAULT (30),
        Location nvarchar(200) NULL,
        Status nvarchar(30) NOT NULL,
        DisplayOrder int NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_VenueMaster_CreatedAt DEFAULT (GETUTCDATE()),
        UpdatedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.VenueEquipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueEquipment
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueEquipment PRIMARY KEY,
        EquipmentName nvarchar(150) NOT NULL,
        ChargeUnit nvarchar(50) NOT NULL,
        Amount decimal(12,2) NOT NULL,
        FreeQuantity int NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_VenueEquipment_IsActive DEFAULT (1),
        DisplayOrder int NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Holidays', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Holidays
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Holidays PRIMARY KEY,
        HolidayDate date NOT NULL,
        Name nvarchar(150) NOT NULL,
        Description nvarchar(500) NULL,
        IsActive bit NOT NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Gallery', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Gallery
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Gallery PRIMARY KEY,
        Title nvarchar(200) NOT NULL,
        Description nvarchar(max) NULL,
        MediaType nvarchar(10) NOT NULL,
        FilePath nvarchar(500) NULL,
        VideoURL nvarchar(500) NULL,
        ThumbnailPath nvarchar(500) NULL,
        DisplayOrder int NOT NULL,
        IsActive bit NOT NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Notices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notices
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notices PRIMARY KEY,
        Title nvarchar(300) NOT NULL,
        Content nvarchar(max) NOT NULL,
        IsImportant bit NOT NULL,
        PublishDate date NOT NULL,
        ExpiryDate date NULL,
        IsActive bit NOT NULL,
        CreatedBy int NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Complaints', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Complaints
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Complaints PRIMARY KEY,
        BookingId int NULL,
        ApplicantName nvarchar(150) NOT NULL,
        Mobile nvarchar(15) NOT NULL,
        Email nvarchar(200) NULL,
        Subject nvarchar(300) NOT NULL,
        Description nvarchar(max) NOT NULL,
        Status nvarchar(30) NOT NULL,
        Resolution nvarchar(max) NULL,
        AssignedTo int NULL,
        ResolvedAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.VenueFacilities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueFacilities
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueFacilities PRIMARY KEY,
        VenueId int NOT NULL,
        FacilityName nvarchar(150) NOT NULL,
        Description nvarchar(max) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_VenueFacilities_IsActive DEFAULT (1),
        DisplayOrder int NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.VenueImages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueImages
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueImages PRIMARY KEY,
        VenueId int NOT NULL,
        ImageUrl nvarchar(500) NOT NULL,
        Caption nvarchar(200) NULL,
        IsPrimary bit NOT NULL,
        IsActive bit NOT NULL,
        DisplayOrder int NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.VenueRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueRules
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueRules PRIMARY KEY,
        VenueId int NOT NULL,
        RuleTitle nvarchar(200) NOT NULL,
        RuleText nvarchar(max) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_VenueRules_IsActive DEFAULT (1),
        DisplayOrder int NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.VenuePricing', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenuePricing
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenuePricing PRIMARY KEY,
        VenueId int NOT NULL,
        PriceItemName nvarchar(150) NOT NULL,
        ChargeUnit nvarchar(50) NOT NULL,
        Amount decimal(12,2) NOT NULL,
        RefundableDeposit decimal(12,2) NOT NULL,
        HolidaySurchargeAmount decimal(12,2) NOT NULL,
        CGSTPercent decimal(12,2) NOT NULL,
        SGSTPercent decimal(12,2) NOT NULL,
        EffectiveFrom date NOT NULL,
        EffectiveTo date NULL,
        IsActive bit NOT NULL CONSTRAINT DF_VenuePricing_IsActive DEFAULT (1),
        DisplayOrder int NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Bookings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Bookings
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Bookings PRIMARY KEY,
        BookingNumber nvarchar(20) NOT NULL,
        VenueId int NOT NULL,
        VenuePricingId int NOT NULL,
        FromDate date NOT NULL,
        ToDate date NOT NULL,
        Session nvarchar(20) NOT NULL,
        TotalDays int NOT NULL,
        BaseRent decimal(12,2) NOT NULL,
        HolidayCharge decimal(12,2) NOT NULL,
        EquipmentCharge decimal(12,2) NOT NULL,
        SecurityDeposit decimal(12,2) NOT NULL,
        CGSTAmount decimal(12,2) NOT NULL,
        SGSTAmount decimal(12,2) NOT NULL,
        GrandTotal decimal(12,2) NOT NULL,
        Status nvarchar(30) NOT NULL CONSTRAINT DF_Bookings_Status DEFAULT (N'PendingPayment'),
        CancelReason nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.Applicants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Applicants
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Applicants PRIMARY KEY,
        BookingId int NOT NULL,
        FullName nvarchar(150) NOT NULL,
        Email nvarchar(200) NOT NULL,
        Mobile nvarchar(15) NOT NULL,
        AlternateMobile nvarchar(15) NULL,
        Address nvarchar(max) NOT NULL,
        FunctionName nvarchar(200) NOT NULL,
        FunctionType nvarchar(100) NOT NULL,
        ExpectedGuests int NOT NULL,
        IDProofType nvarchar(50) NOT NULL,
        IDProofFile nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.BankDetails', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankDetails
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BankDetails PRIMARY KEY,
        BookingId int NOT NULL,
        BankName nvarchar(150) NOT NULL,
        AccountHolderName nvarchar(150) NOT NULL,
        AccountNumber nvarchar(30) NOT NULL,
        IFSCCode nvarchar(15) NOT NULL,
        BranchName nvarchar(150) NOT NULL,
        MICRCode nvarchar(15) NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.BookingEquipment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BookingEquipment
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_BookingEquipment PRIMARY KEY,
        BookingId int NOT NULL,
        EquipmentId int NOT NULL,
        EquipmentName nvarchar(max) NOT NULL,
        ChargeUnit nvarchar(max) NOT NULL,
        UnitPrice decimal(12,2) NOT NULL,
        Quantity int NOT NULL,
        TotalPrice decimal(12,2) NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payments
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
        BookingId int NOT NULL,
        Amount decimal(12,2) NOT NULL,
        PaymentMethod nvarchar(50) NOT NULL,
        TransactionRef nvarchar(200) NULL,
        GatewayOrderId nvarchar(100) NULL,
        GatewayPaymentId nvarchar(100) NULL,
        GatewaySignature nvarchar(200) NULL,
        PaymentDate date NULL,
        Status nvarchar(30) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT (N'Pending'),
        Remarks nvarchar(500) NULL,
        VerifiedBy int NULL,
        VerifiedAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.Receipts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Receipts
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Receipts PRIMARY KEY,
        ReceiptNumber nvarchar(20) NOT NULL,
        BookingId int NOT NULL,
        PaymentId int NOT NULL,
        GeneratedAt datetime2 NOT NULL,
        GeneratedBy int NULL,
        FilePath nvarchar(500) NULL
    );
END;

IF OBJECT_ID(N'dbo.Cancellations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cancellations
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Cancellations PRIMARY KEY,
        BookingId int NOT NULL,
        Reason nvarchar(max) NOT NULL,
        RequestedBy nvarchar(150) NOT NULL,
        RefundAmount decimal(12,2) NOT NULL,
        RefundStatus nvarchar(30) NOT NULL,
        ProcessedBy int NULL,
        ProcessedAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.RefundRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefundRequests
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefundRequests PRIMARY KEY,
        RefundRequestNumber nvarchar(40) NOT NULL,
        BookingId int NOT NULL,
        RefundAmount decimal(12,2) NULL,
        Status nvarchar(30) NOT NULL,
        RejectionReason nvarchar(500) NULL,
        RequestedAt datetime2 NOT NULL,
        UpdatedAt datetime2 NULL,
        VerifiedBy int NULL,
        VerifiedAt datetime2 NULL,
        ApprovedBy int NULL,
        ApprovedAt datetime2 NULL,
        ProcessedBy int NULL,
        ProcessedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.AdminLoginOtps', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminLoginOtps
    (
        Mobile nvarchar(15) NOT NULL CONSTRAINT PK_AdminLoginOtps PRIMARY KEY,
        OtpHash varbinary(32) NOT NULL,
        CreatedAt datetime2 NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        FailedAttempts int NOT NULL,
        UsedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.RefundOtpChallenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefundOtpChallenges
    (
        BookingId int NOT NULL CONSTRAINT PK_RefundOtpChallenges PRIMARY KEY,
        Mobile nvarchar(15) NOT NULL,
        OtpHash varbinary(32) NOT NULL,
        CreatedAt datetime2 NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        FailedAttempts int NOT NULL,
        UsedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.CancellationOtpChallenges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CancellationOtpChallenges
    (
        BookingId int NOT NULL CONSTRAINT PK_CancellationOtpChallenges PRIMARY KEY,
        Mobile nvarchar(15) NOT NULL,
        OtpHash varbinary(32) NOT NULL,
        CreatedAt datetime2 NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        FailedAttempts int NOT NULL,
        UsedAt datetime2 NULL
    );
END;

IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs
    (
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
        UserId int NULL,
        Action nvarchar(100) NOT NULL,
        TableName nvarchar(100) NOT NULL,
        RecordId int NULL,
        OldValues nvarchar(max) NULL,
        NewValues nvarchar(max) NULL,
        IPAddress nvarchar(50) NULL,
        UserAgent nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL
    );
END;

/* Indexes from the final EF model. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.VenueMaster') AND name = N'IX_VenueMaster_VenueName')
    CREATE UNIQUE INDEX IX_VenueMaster_VenueName ON dbo.VenueMaster(VenueName);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'IX_Users_RoleId')
    CREATE INDEX IX_Users_RoleId ON dbo.Users(RoleId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.VenueFacilities') AND name = N'IX_VenueFacilities_VenueId')
    CREATE INDEX IX_VenueFacilities_VenueId ON dbo.VenueFacilities(VenueId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.VenueImages') AND name = N'IX_VenueImages_VenueId')
    CREATE INDEX IX_VenueImages_VenueId ON dbo.VenueImages(VenueId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.VenueRules') AND name = N'IX_VenueRules_VenueId')
    CREATE INDEX IX_VenueRules_VenueId ON dbo.VenueRules(VenueId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.VenuePricing') AND name = N'IX_VenuePricing_VenueId')
    CREATE INDEX IX_VenuePricing_VenueId ON dbo.VenuePricing(VenueId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Bookings') AND name = N'IX_Bookings_VenuePricingId')
    CREATE INDEX IX_Bookings_VenuePricingId ON dbo.Bookings(VenuePricingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Bookings') AND name = N'IX_Bookings_VenueId_FromDate_ToDate_Session')
    CREATE INDEX IX_Bookings_VenueId_FromDate_ToDate_Session
        ON dbo.Bookings(VenueId, FromDate, ToDate, Session);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Applicants') AND name = N'IX_Applicants_BookingId')
    CREATE UNIQUE INDEX IX_Applicants_BookingId ON dbo.Applicants(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.BankDetails') AND name = N'IX_BankDetails_BookingId')
    CREATE UNIQUE INDEX IX_BankDetails_BookingId ON dbo.BankDetails(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.BookingEquipment') AND name = N'IX_BookingEquipment_BookingId')
    CREATE INDEX IX_BookingEquipment_BookingId ON dbo.BookingEquipment(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.BookingEquipment') AND name = N'IX_BookingEquipment_EquipmentId')
    CREATE INDEX IX_BookingEquipment_EquipmentId ON dbo.BookingEquipment(EquipmentId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Payments') AND name = N'IX_Payments_BookingId')
    CREATE INDEX IX_Payments_BookingId ON dbo.Payments(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Receipts') AND name = N'IX_Receipts_BookingId')
    CREATE INDEX IX_Receipts_BookingId ON dbo.Receipts(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Receipts') AND name = N'IX_Receipts_PaymentId')
    CREATE UNIQUE INDEX IX_Receipts_PaymentId ON dbo.Receipts(PaymentId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Cancellations') AND name = N'IX_Cancellations_BookingId')
    CREATE INDEX IX_Cancellations_BookingId ON dbo.Cancellations(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RefundRequests') AND name = N'IX_RefundRequests_BookingId')
    CREATE UNIQUE INDEX IX_RefundRequests_BookingId ON dbo.RefundRequests(BookingId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.RefundRequests') AND name = N'IX_RefundRequests_RefundRequestNumber')
    CREATE UNIQUE INDEX IX_RefundRequests_RefundRequestNumber ON dbo.RefundRequests(RefundRequestNumber);

/* Foreign keys from the final EF model. */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Users_Roles_RoleId')
    ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Roles_RoleId
        FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VenueFacilities_VenueMaster_VenueId')
    ALTER TABLE dbo.VenueFacilities ADD CONSTRAINT FK_VenueFacilities_VenueMaster_VenueId
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VenueImages_VenueMaster_VenueId')
    ALTER TABLE dbo.VenueImages ADD CONSTRAINT FK_VenueImages_VenueMaster_VenueId
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VenueRules_VenueMaster_VenueId')
    ALTER TABLE dbo.VenueRules ADD CONSTRAINT FK_VenueRules_VenueMaster_VenueId
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_VenuePricing_VenueMaster_VenueId')
    ALTER TABLE dbo.VenuePricing ADD CONSTRAINT FK_VenuePricing_VenueMaster_VenueId
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Bookings_VenueMaster_VenueId')
    ALTER TABLE dbo.Bookings ADD CONSTRAINT FK_Bookings_VenueMaster_VenueId
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE NO ACTION;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Bookings_VenuePricing_VenuePricingId')
    ALTER TABLE dbo.Bookings ADD CONSTRAINT FK_Bookings_VenuePricing_VenuePricingId
        FOREIGN KEY (VenuePricingId) REFERENCES dbo.VenuePricing(Id) ON DELETE NO ACTION;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Applicants_Bookings_BookingId')
    ALTER TABLE dbo.Applicants ADD CONSTRAINT FK_Applicants_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BankDetails_Bookings_BookingId')
    ALTER TABLE dbo.BankDetails ADD CONSTRAINT FK_BankDetails_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BookingEquipment_Bookings_BookingId')
    ALTER TABLE dbo.BookingEquipment ADD CONSTRAINT FK_BookingEquipment_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_BookingEquipment_VenueEquipment_EquipmentId')
    ALTER TABLE dbo.BookingEquipment ADD CONSTRAINT FK_BookingEquipment_VenueEquipment_EquipmentId
        FOREIGN KEY (EquipmentId) REFERENCES dbo.VenueEquipment(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Payments_Bookings_BookingId')
    ALTER TABLE dbo.Payments ADD CONSTRAINT FK_Payments_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Receipts_Bookings_BookingId')
    ALTER TABLE dbo.Receipts ADD CONSTRAINT FK_Receipts_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE NO ACTION;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Receipts_Payments_PaymentId')
    ALTER TABLE dbo.Receipts ADD CONSTRAINT FK_Receipts_Payments_PaymentId
        FOREIGN KEY (PaymentId) REFERENCES dbo.Payments(Id) ON DELETE NO ACTION;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Cancellations_Bookings_BookingId')
    ALTER TABLE dbo.Cancellations ADD CONSTRAINT FK_Cancellations_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RefundRequests_Bookings_BookingId')
    ALTER TABLE dbo.RefundRequests ADD CONSTRAINT FK_RefundRequests_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RefundOtpChallenges_Bookings_BookingId')
    ALTER TABLE dbo.RefundOtpChallenges ADD CONSTRAINT FK_RefundOtpChallenges_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CancellationOtpChallenges_Bookings_BookingId')
    ALTER TABLE dbo.CancellationOtpChallenges ADD CONSTRAINT FK_CancellationOtpChallenges_Bookings_BookingId
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(Id) ON DELETE CASCADE;

/*
    Seed only the existing role lookups and venue/rate/equipment/facility/rule
    master values from DbInitializer. Inserts are matched by existing natural
    keys and never overwrite a row that is already present.
*/
DECLARE @RoleSeed TABLE
(
    Name nvarchar(50) NOT NULL,
    Description nvarchar(200) NULL,
    CreatedAt datetime2 NOT NULL
);
INSERT INTO @RoleSeed (Name, Description, CreatedAt)
VALUES
    (N'Admin', N'System Administrator', '2026-07-07T17:23:36.2495981'),
    (N'Staff', N'Office Staff', '2026-07-07T17:23:36.2495990'),
    (N'User', N'Public User', '2026-07-07T17:23:36.2495992'),
    (N'Clerk', N'Refund review and processing', SYSUTCDATETIME());

INSERT INTO dbo.Roles (Name, Description, CreatedAt)
SELECT seed.Name, seed.Description, seed.CreatedAt
FROM @RoleSeed seed
WHERE NOT EXISTS (SELECT 1 FROM dbo.Roles currentRole WHERE currentRole.Name = seed.Name);

DECLARE @EffectiveFrom date = '20230912';
DECLARE @VenueSeed TABLE
(
    VenueName nvarchar(150) NOT NULL,
    Description nvarchar(max) NULL,
    Location nvarchar(200) NULL,
    Status nvarchar(30) NOT NULL,
    DisplayOrder int NOT NULL
);
INSERT INTO @VenueSeed (VenueName, Description, Location, Status, DisplayOrder)
VALUES
    (N'Main Hall', N'Main auditorium/hall booking categories charged per selected session as per HSM rate chart dated 12/09/2023.', N'Hutatma Smruti Mandir', N'Active', 1),
    (N'Open Space in Front of VIP Room', N'Open space measuring 60 x 40, charged per day.', N'In front of VIP Room', N'Active', 2),
    (N'Parking-side Space 25 x 40', N'Parking-side open space measuring 25 x 40, charged per day.', N'Parking side', N'Active', 3),
    (N'Parking-side Space Complete', N'Complete parking-side open space, charged per day.', N'Parking side', N'Active', 4),
    (N'Front Porch Space', N'Front porch space available with hall booking, charged per slot.', N'Front porch', N'Active', 5),
    (N'Residential Rooms 1-5', N'Residential rooms 1 to 5 for outstation artists, charged per day.', N'Residential rooms', N'Active', 6),
    (N'Residential Room 6', N'Residential room 6 for outstation artists, charged per day.', N'Residential rooms', N'Active', 7),
    (N'Dining Hall', N'Dining hall charged per hour.', N'Dining hall', N'Active', 8),
    (N'Shubhrai Art Gallery', N'Art gallery listed in the source rate chart; currently closed for renovation.', N'Hutatma Smruti Mandir', N'Closed', 9);

INSERT INTO dbo.VenueMaster (VenueName, Description, Location, Status, DisplayOrder)
SELECT seed.VenueName, seed.Description, seed.Location, seed.Status, seed.DisplayOrder
FROM @VenueSeed seed
WHERE NOT EXISTS (SELECT 1 FROM dbo.VenueMaster venue WHERE venue.VenueName = seed.VenueName);

DECLARE @FacilitySeed TABLE
(
    VenueName nvarchar(150) NOT NULL,
    FacilityName nvarchar(150) NOT NULL,
    Description nvarchar(max) NULL,
    DisplayOrder int NOT NULL
);
INSERT INTO @FacilitySeed (VenueName, FacilityName, Description, DisplayOrder)
VALUES
    (N'Main Hall', N'Main auditorium stage', N'Main hall/stage available for public and private programs.', 1),
    (N'Main Hall', N'VIP room', N'VIP room available as an add-on service charged hourly.', 2),
    (N'Main Hall', N'Lighting support', N'Spot, PAR, LED, screen and building illumination services are listed separately in equipment master.', 3),
    (N'Open Space in Front of VIP Room', N'Open space', N'60 x 40 open space in front of VIP room.', 1),
    (N'Parking-side Space 25 x 40', N'Open space', N'25 x 40 parking-side open space.', 1),
    (N'Parking-side Space Complete', N'Open space', N'Complete parking-side open space.', 1),
    (N'Front Porch Space', N'Front porch', N'Front porch space available with hall booking.', 1),
    (N'Residential Rooms 1-5', N'Residential rooms', N'Rooms 1 to 5 for outstation artists.', 1),
    (N'Residential Room 6', N'Residential room', N'Room 6 for outstation artists.', 1),
    (N'Dining Hall', N'Dining hall', N'Dining hall charged hourly.', 1),
    (N'Shubhrai Art Gallery', N'Art gallery', N'Art gallery space, currently closed for renovation.', 1);

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, DisplayOrder)
SELECT venue.VenueId, seed.FacilityName, seed.Description, seed.DisplayOrder
FROM @FacilitySeed seed
JOIN dbo.VenueMaster venue ON venue.VenueName = seed.VenueName
WHERE NOT EXISTS
(
    SELECT 1 FROM dbo.VenueFacilities existing
    WHERE existing.VenueId = venue.VenueId AND existing.FacilityName = seed.FacilityName
);

DECLARE @PricingSeed TABLE
(
    VenueName nvarchar(150) NOT NULL,
    PriceItemName nvarchar(150) NOT NULL,
    ChargeUnit nvarchar(50) NOT NULL,
    Amount decimal(12,2) NOT NULL,
    RefundableDeposit decimal(12,2) NOT NULL,
    DisplayOrder int NOT NULL
);
INSERT INTO @PricingSeed (VenueName, PriceItemName, ChargeUnit, Amount, RefundableDeposit, DisplayOrder)
VALUES
    (N'Main Hall', N'Gathering - Private / School', N'Per slot', 20000, 12000, 1),
    (N'Main Hall', N'Govt / Semi-Govt / ZP / Entertainment', N'Per slot', 10000, 12000, 2),
    (N'Main Hall', N'Ceremony / Conference', N'Per slot', 12000, 12000, 3),
    (N'Main Hall', N'Lecture', N'Per slot', 7500, 12000, 4),
    (N'Main Hall', N'Orchestra / Gazal / Singing', N'Per slot', 7500, 12000, 5),
    (N'Main Hall', N'Lavni / Dance / Fashion Show', N'Per slot', 15000, 12000, 6),
    (N'Main Hall', N'Drama / Magic', N'Per slot', 8000, 12000, 7),
    (N'Main Hall', N'Children Drama / Balnatya', N'Per slot', 3000, 12000, 8),
    (N'Main Hall', N'Rehearsal - Stage Only', N'Per slot', 3000, 12000, 9),
    (N'Open Space in Front of VIP Room', N'Open Space in Front of VIP Room 60 x 40', N'Per day', 7500, 0, 10),
    (N'Parking-side Space 25 x 40', N'Parking-side Space 25 x 40', N'Per day', 6000, 0, 11),
    (N'Parking-side Space Complete', N'Parking-side Space - Complete', N'Per day', 12000, 0, 12),
    (N'Front Porch Space', N'Front Porch Space - with Hall Booking', N'Per slot', 4000, 0, 13),
    (N'Residential Rooms 1-5', N'Residential Rooms 1-5 - Outstation Artists', N'Per day', 250, 0, 14),
    (N'Residential Room 6', N'Residential Room 6 - Outstation Artists', N'Per day', 300, 0, 15),
    (N'Dining Hall', N'Dining Hall', N'Per hour', 100, 0, 16),
    (N'Shubhrai Art Gallery', N'Shubhrai Art Gallery', N'Per day', 10000, 12000, 17);

INSERT INTO dbo.VenuePricing
    (VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, HolidaySurchargeAmount,
     CGSTPercent, SGSTPercent, EffectiveFrom, DisplayOrder)
SELECT venue.VenueId, seed.PriceItemName, seed.ChargeUnit, seed.Amount, seed.RefundableDeposit,
       0, 9, 9, @EffectiveFrom, seed.DisplayOrder
FROM @PricingSeed seed
JOIN dbo.VenueMaster venue ON venue.VenueName = seed.VenueName
WHERE NOT EXISTS
(
    SELECT 1 FROM dbo.VenuePricing existing
    WHERE existing.VenueId = venue.VenueId
      AND existing.PriceItemName = seed.PriceItemName
      AND existing.EffectiveFrom = @EffectiveFrom
);

DECLARE @EquipmentSeed TABLE
(
    EquipmentName nvarchar(150) NOT NULL,
    ChargeUnit nvarchar(50) NOT NULL,
    Amount decimal(12,2) NOT NULL,
    FreeQuantity int NOT NULL,
    DisplayOrder int NOT NULL
);
INSERT INTO @EquipmentSeed (EquipmentName, ChargeUnit, Amount, FreeQuantity, DisplayOrder)
VALUES
    (N'Spot Light - SMC', N'Per piece', 100, 4, 1),
    (N'Spot / PAR / LED Light - Company', N'Per piece', 50, 4, 2),
    (N'LED Screen up to 10 x 10 ft', N'Per slot', 500, 0, 3),
    (N'LED Screen up to 10 x 20 ft', N'Per slot', 1000, 0, 4),
    (N'Flat Screen - Municipal', N'Per slot', 500, 0, 5),
    (N'Generator Rent - organiser provides diesel', N'Per hour', 1500, 0, 6),
    (N'VIP Room Rent', N'Per hour', 200, 0, 7),
    (N'Video Shooting up to 2 cameras', N'Per slot', 1000, 0, 8),
    (N'Building Lighting - Illumination', N'Per slot', 1500, 0, 9),
    (N'Level Rent', N'Per level', 75, 4, 10),
    (N'Sound System - External', N'Per slot', 500, 0, 11),
    (N'Change in Program', N'Flat', 1000, 0, 12),
    (N'Rangoli Making', N'Per slot', 200, 0, 13);

INSERT INTO dbo.VenueEquipment (EquipmentName, ChargeUnit, Amount, FreeQuantity, DisplayOrder)
SELECT seed.EquipmentName, seed.ChargeUnit, seed.Amount, seed.FreeQuantity, seed.DisplayOrder
FROM @EquipmentSeed seed
WHERE NOT EXISTS
(
    SELECT 1 FROM dbo.VenueEquipment existing WHERE existing.EquipmentName = seed.EquipmentName
);

DECLARE @RuleSeed TABLE
(
    VenueName nvarchar(150) NOT NULL,
    RuleTitle nvarchar(200) NOT NULL,
    RuleText nvarchar(max) NOT NULL,
    DisplayOrder int NOT NULL
);
INSERT INTO @RuleSeed (VenueName, RuleTitle, RuleText, DisplayOrder)
VALUES
    (N'Main Hall', N'GST', N'CGST 9% and SGST 9% are applicable on chargeable rent and add-on services.', 1),
    (N'Main Hall', N'Holiday surcharge', N'Saturday, Sunday and public holiday bookings carry an additional Rs. 500 surcharge.', 2),
    (N'Main Hall', N'Extra time', N'Extra time is charged at Rs. 2,500 per hour plus applicable GST.', 3),
    (N'Main Hall', N'Local artist discount', N'Local Solapur artists are eligible for 20% discount where applicable.', 4),
    (N'Main Hall', N'Refundable deposit', N'Main hall bookings carry a refundable security deposit of Rs. 12,000.', 5),
    (N'Main Hall', N'Staff responsibility', N'Door keeper and seating indicator staff are the responsibility of the organiser.', 6),
    (N'Main Hall', N'Open space electricity', N'Light bill for open spaces is charged as per actual use.', 7),
    (N'Open Space in Front of VIP Room', N'Open space electricity', N'Light bill for open spaces is charged as per actual use.', 1),
    (N'Parking-side Space 25 x 40', N'Open space electricity', N'Light bill for open spaces is charged as per actual use.', 1),
    (N'Parking-side Space Complete', N'Open space electricity', N'Light bill for open spaces is charged as per actual use.', 1),
    (N'Shubhrai Art Gallery', N'Status', N'Currently closed for renovation as per the source rate chart.', 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, DisplayOrder)
SELECT venue.VenueId, seed.RuleTitle, seed.RuleText, seed.DisplayOrder
FROM @RuleSeed seed
JOIN dbo.VenueMaster venue ON venue.VenueName = seed.VenueName
WHERE NOT EXISTS
(
    SELECT 1 FROM dbo.VenueRules existing
    WHERE existing.VenueId = venue.VenueId AND existing.RuleTitle = seed.RuleTitle
);

COMMIT TRANSACTION;
PRINT N'Schema checks and missing master lookup rows completed. No existing rows were updated or removed.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
