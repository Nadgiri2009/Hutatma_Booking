-- ============================================================
-- Hutatma Smruti Mandir - Venue Booking System
-- Database Schema - SQL Server 2022
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HutatmaBookingDB')
    CREATE DATABASE HutatmaBookingDB;
GO

USE HutatmaBookingDB;
GO

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE Roles (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(200) NULL,
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

INSERT INTO Roles (Name, Description) VALUES
('Admin', 'System Administrator'),
('Staff', 'Office Staff'),
('User',  'Public User');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(150) NOT NULL,
    Email        NVARCHAR(200) NOT NULL UNIQUE,
    Mobile       NVARCHAR(15)  NOT NULL,
    PasswordHash NVARCHAR(500) NOT NULL,
    RoleId       INT NOT NULL REFERENCES Roles(Id),
    IsActive     BIT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2 NULL
);
CREATE INDEX IX_Users_Email  ON Users(Email);
CREATE INDEX IX_Users_Mobile ON Users(Mobile);

-- ============================================================
-- PREMISES
-- ============================================================
CREATE TABLE Premises (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(150) NOT NULL,
    Description   NVARCHAR(MAX) NULL,
    Capacity      INT NOT NULL DEFAULT 0,
    AreaSqFt      DECIMAL(10,2) NULL,
    Location      NVARCHAR(200) NULL,
    Amenities     NVARCHAR(MAX) NULL,  -- JSON
    IsActive      BIT NOT NULL DEFAULT 1,
    DisplayOrder  INT NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2 NULL
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE Sessions (
    Id   INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE  -- Morning, Evening, Full Day
);
INSERT INTO Sessions (Name) VALUES ('Morning'), ('Evening'), ('Full Day');

-- ============================================================
-- RATES
-- ============================================================
CREATE TABLE Rates (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    PremiseId       INT NOT NULL REFERENCES Premises(Id),
    SessionId       INT NOT NULL REFERENCES Sessions(Id),
    BaseRent        DECIMAL(12,2) NOT NULL DEFAULT 0,
    VIPRoomCharge   DECIMAL(12,2) NOT NULL DEFAULT 0,
    SecurityDeposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    HolidayCharge   DECIMAL(12,2) NOT NULL DEFAULT 0,
    CGSTPercent     DECIMAL(5,2)  NOT NULL DEFAULT 9,
    SGSTPercent     DECIMAL(5,2)  NOT NULL DEFAULT 9,
    EffectiveFrom   DATE NOT NULL,
    EffectiveTo     DATE NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_Rates_Premise_Session_Date UNIQUE (PremiseId, SessionId, EffectiveFrom)
);

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE Holidays (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    HolidayDate DATE NOT NULL UNIQUE,
    Name        NVARCHAR(150) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_Holidays_Date ON Holidays(HolidayDate);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE Bookings (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    BookingNumber   NVARCHAR(20) NOT NULL UNIQUE,  -- HSM-2024-00001
    PremiseId       INT NOT NULL REFERENCES Premises(Id),
    SessionId       INT NOT NULL REFERENCES Sessions(Id),
    FromDate        DATE NOT NULL,
    ToDate          DATE NOT NULL,
    TotalDays       INT NOT NULL,
    BaseRent        DECIMAL(12,2) NOT NULL DEFAULT 0,
    VIPRoomCharge   DECIMAL(12,2) NOT NULL DEFAULT 0,
    HolidayCharge   DECIMAL(12,2) NOT NULL DEFAULT 0,
    SecurityDeposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    CGSTAmount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    SGSTAmount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    GrandTotal      DECIMAL(12,2) NOT NULL DEFAULT 0,
    Status          NVARCHAR(30)  NOT NULL DEFAULT 'PendingPayment',
    -- PendingPayment | Approved | Rejected | Cancelled
    RejectionReason NVARCHAR(500) NULL,
    CancelReason    NVARCHAR(500) NULL,
    ApprovedBy      INT NULL REFERENCES Users(Id),
    ApprovedAt      DATETIME2 NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT CK_Bookings_Dates    CHECK (ToDate >= FromDate),
    CONSTRAINT CK_Bookings_Status   CHECK (Status IN ('PendingPayment','Approved','Rejected','Cancelled'))
);
CREATE INDEX IX_Bookings_Number    ON Bookings(BookingNumber);
CREATE INDEX IX_Bookings_PremDate  ON Bookings(PremiseId, FromDate, ToDate);
CREATE INDEX IX_Bookings_Status    ON Bookings(Status);

-- ============================================================
-- APPLICANTS
-- ============================================================
CREATE TABLE Applicants (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT NOT NULL UNIQUE REFERENCES Bookings(Id),
    FullName        NVARCHAR(150) NOT NULL,
    Email           NVARCHAR(200) NOT NULL,
    Mobile          NVARCHAR(15)  NOT NULL,
    AlternateMobile NVARCHAR(15)  NULL,
    Address         NVARCHAR(MAX) NOT NULL,
    FunctionName    NVARCHAR(200) NOT NULL,
    FunctionType    NVARCHAR(100) NOT NULL,
    ExpectedGuests  INT NOT NULL DEFAULT 0,
    IDProofType     NVARCHAR(50)  NOT NULL,  -- Aadhaar | PAN | DrivingLicense
    IDProofFile     NVARCHAR(500) NULL,      -- stored path
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_Applicants_Mobile ON Applicants(Mobile);
CREATE INDEX IX_Applicants_Email  ON Applicants(Email);

-- ============================================================
-- BANK DETAILS
-- ============================================================
CREATE TABLE BankDetails (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    BookingId         INT NOT NULL UNIQUE REFERENCES Bookings(Id),
    BankName          NVARCHAR(150) NOT NULL,
    AccountHolderName NVARCHAR(150) NOT NULL,
    AccountNumber     NVARCHAR(30)  NOT NULL,
    IFSCCode          NVARCHAR(15)  NOT NULL,
    BranchName        NVARCHAR(150) NOT NULL,
    MICRCode          NVARCHAR(15)  NULL,
    CreatedAt         DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE Payments (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    BookingId       INT NOT NULL REFERENCES Bookings(Id),
    Amount          DECIMAL(12,2) NOT NULL,
    PaymentMethod   NVARCHAR(50)  NOT NULL DEFAULT 'BankTransfer',
    TransactionRef  NVARCHAR(200) NULL,
    PaymentDate     DATE NULL,
    Status          NVARCHAR(30)  NOT NULL DEFAULT 'Pending',
    -- Pending | Paid | Failed | Refunded
    Remarks         NVARCHAR(500) NULL,
    VerifiedBy      INT NULL REFERENCES Users(Id),
    VerifiedAt      DATETIME2 NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT CK_Payments_Status CHECK (Status IN ('Pending','Paid','Failed','Refunded'))
);
CREATE INDEX IX_Payments_BookingId ON Payments(BookingId);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE Receipts (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    ReceiptNumber NVARCHAR(20) NOT NULL UNIQUE,  -- RCP-2024-00001
    BookingId     INT NOT NULL REFERENCES Bookings(Id),
    PaymentId     INT NOT NULL REFERENCES Payments(Id),
    GeneratedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    GeneratedBy   INT NULL REFERENCES Users(Id),
    FilePath      NVARCHAR(500) NULL
);

-- ============================================================
-- GALLERY
-- ============================================================
CREATE TABLE Gallery (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Title        NVARCHAR(200) NOT NULL,
    Description  NVARCHAR(MAX) NULL,
    MediaType    NVARCHAR(10)  NOT NULL DEFAULT 'Photo',  -- Photo | Video
    FilePath     NVARCHAR(500) NULL,
    VideoURL     NVARCHAR(500) NULL,
    ThumbnailPath NVARCHAR(500) NULL,
    DisplayOrder INT NOT NULL DEFAULT 0,
    IsActive     BIT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- NOTICES
-- ============================================================
CREATE TABLE Notices (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Title       NVARCHAR(300) NOT NULL,
    Content     NVARCHAR(MAX) NOT NULL,
    IsImportant BIT NOT NULL DEFAULT 0,
    PublishDate DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    ExpiryDate  DATE NULL,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedBy   INT NULL REFERENCES Users(Id),
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE TABLE Complaints (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    BookingId    INT NULL REFERENCES Bookings(Id),
    ApplicantName NVARCHAR(150) NOT NULL,
    Mobile       NVARCHAR(15)  NOT NULL,
    Email        NVARCHAR(200) NULL,
    Subject      NVARCHAR(300) NOT NULL,
    Description  NVARCHAR(MAX) NOT NULL,
    Status       NVARCHAR(30)  NOT NULL DEFAULT 'Open',  -- Open | InProgress | Resolved | Closed
    Resolution   NVARCHAR(MAX) NULL,
    AssignedTo   INT NULL REFERENCES Users(Id),
    ResolvedAt   DATETIME2 NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2 NULL
);

-- ============================================================
-- CANCELLATIONS
-- ============================================================
CREATE TABLE Cancellations (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    BookingId      INT NOT NULL UNIQUE REFERENCES Bookings(Id),
    Reason         NVARCHAR(MAX) NOT NULL,
    RequestedBy    NVARCHAR(150) NOT NULL,
    RefundAmount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    RefundStatus   NVARCHAR(30)  NOT NULL DEFAULT 'Pending',
    ProcessedBy    INT NULL REFERENCES Users(Id),
    ProcessedAt    DATETIME2 NULL,
    CreatedAt      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE AuditLogs (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    UserId     INT NULL REFERENCES Users(Id),
    Action     NVARCHAR(100) NOT NULL,
    TableName  NVARCHAR(100) NOT NULL,
    RecordId   INT NULL,
    OldValues  NVARCHAR(MAX) NULL,  -- JSON
    NewValues  NVARCHAR(MAX) NULL,  -- JSON
    IPAddress  NVARCHAR(50) NULL,
    UserAgent  NVARCHAR(500) NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId);
CREATE INDEX IX_AuditLogs_Table  ON AuditLogs(TableName, RecordId);

-- ============================================================
-- SEED: Default Admin User (password: Admin@123)
-- ============================================================
INSERT INTO Users (FullName, Email, Mobile, PasswordHash, RoleId)
VALUES (
    'System Administrator',
    'admin@hutatmamandir.org',
    '9999999999',
    '$2a$12$placeholder_bcrypt_hash_here',  -- replace with actual bcrypt hash
    1
);

-- ============================================================
-- SEED: Sample Premises
-- ============================================================
INSERT INTO Premises (Name, Description, Capacity, AreaSqFt, Location, DisplayOrder)
VALUES
('Main Hall',      'Grand main hall for large events and ceremonies', 500, 5000, 'Ground Floor', 1),
('Conference Room','Air-conditioned conference room for meetings',     50,  800,  'First Floor',  2),
('VIP Lounge',     'Exclusive VIP lounge for special gatherings',      20,  400,  'First Floor',  3);

GO

PRINT 'Schema created successfully.';
