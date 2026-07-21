/*
  PHASE 5: Dynamic Rate Management System - Database Schema
  
  Creates tables for venue rate management with date-range and session-type support.
  Allows flexible pricing configuration without code changes.
*/

-- ===================================
-- 1. SessionTypes Reference Table
-- ===================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SessionTypes' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SessionTypes (
        SessionTypeId INT PRIMARY KEY IDENTITY(1,1),
        SessionTypeName NVARCHAR(50) NOT NULL UNIQUE,
        StartTime TIME NULL,
        EndTime TIME NULL,
        DurationHours INT DEFAULT 3,
        DisplayOrder INT DEFAULT 0,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        INDEX IX_SessionType_Name (SessionTypeName)
    );
    
    PRINT 'SessionTypes table created';
END
ELSE
BEGIN
    PRINT 'SessionTypes table already exists';
END

-- ===================================
-- 2. VenueRateMaster Table
-- ===================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VenueRateMaster' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.VenueRateMaster (
        RateId INT PRIMARY KEY IDENTITY(1,1),
        VenueId INT NOT NULL,
        SessionType NVARCHAR(50) NOT NULL,
        FromDate DATE NOT NULL,
        ToDate DATE NOT NULL,
        Amount DECIMAL(12,2) NOT NULL,
        RefundableDeposit DECIMAL(12,2) DEFAULT 0,
        CGSTPercent DECIMAL(5,2) DEFAULT 9.00,
        SGSTPercent DECIMAL(5,2) DEFAULT 9.00,
        Notes NVARCHAR(MAX),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(255) NULL,
        
        CONSTRAINT FK_VenueRateMaster_VenueMaster 
            FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE,
        
        -- Composite index for efficient rate lookup
        INDEX IX_VenueRate_Lookup (VenueId, SessionType, FromDate, ToDate) 
            WHERE IsActive = 1,
        
        -- Validate date range
        CHECK (FromDate <= ToDate)
    );
    
    PRINT 'VenueRateMaster table created';
END
ELSE
BEGIN
    PRINT 'VenueRateMaster table already exists';
END

-- ===================================
-- 3. RateHistory (Audit Trail)
-- ===================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VenueRateHistory' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.VenueRateHistory (
        HistoryId INT PRIMARY KEY IDENTITY(1,1),
        RateId INT NOT NULL,
        VenueId INT NOT NULL,
        SessionType NVARCHAR(50),
        FromDate DATE,
        ToDate DATE,
        OldAmount DECIMAL(12,2),
        NewAmount DECIMAL(12,2),
        ChangeReason NVARCHAR(MAX),
        ChangedBy NVARCHAR(255),
        ChangedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        INDEX IX_RateHistory_RateId (RateId),
        INDEX IX_RateHistory_ChangedAt (ChangedAt DESC)
    );
    
    PRINT 'VenueRateHistory table created';
END
ELSE
BEGIN
    PRINT 'VenueRateHistory table already exists';
END

-- ===================================
-- Sample Data - Session Types
-- ===================================
IF NOT EXISTS (SELECT 1 FROM dbo.SessionTypes WHERE SessionTypeName = 'Morning')
BEGIN
    INSERT INTO dbo.SessionTypes (SessionTypeName, StartTime, EndTime, DurationHours, DisplayOrder, IsActive)
    VALUES
        ('Morning', '09:00', '12:00', 3, 1, 1),
        ('Afternoon', '12:00', '15:00', 3, 2, 1),
        ('Evening', '15:00', '18:00', 3, 3, 1),
        ('Night', '18:00', '21:00', 3, 4, 1),
        ('FullDay', '09:00', '21:00', 12, 5, 1),
        ('HalfDay', '09:00', '15:00', 6, 6, 1);
    
    PRINT 'Sample session types inserted';
END
ELSE
BEGIN
    PRINT 'Session types already exist';
END

-- ===================================
-- Sample Data - Venue Rates (April to June 2026)
-- ===================================
-- VENUE 1: Classes & Gatherings
IF NOT EXISTS (SELECT 1 FROM dbo.VenueRateMaster WHERE VenueId = 1 AND SessionType = 'Morning' AND FromDate = '2026-04-01')
BEGIN
    INSERT INTO dbo.VenueRateMaster (VenueId, SessionType, FromDate, ToDate, Amount, RefundableDeposit, Notes)
    VALUES
        -- Venue 1: Classes & Gatherings - Peak Season (Apr-Jun)
        (1, 'Morning', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Peak season weekday rate'),
        (1, 'Afternoon', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Peak season weekday rate'),
        (1, 'Evening', '2026-04-01', '2026-06-30', 60000.00, 12000.00, 'Peak season prime time'),
        (1, 'Night', '2026-04-01', '2026-06-30', 60000.00, 12000.00, 'Peak season night rate'),
        (1, 'FullDay', '2026-04-01', '2026-06-30', 100000.00, 12000.00, 'Peak season full day'),
        
        -- Venue 1: Off-Season (Jul-Sep)
        (1, 'Morning', '2026-07-01', '2026-09-30', 40000.00, 12000.00, 'Off-season weekday rate'),
        (1, 'Afternoon', '2026-07-01', '2026-09-30', 40000.00, 12000.00, 'Off-season weekday rate'),
        (1, 'Evening', '2026-07-01', '2026-09-30', 45000.00, 12000.00, 'Off-season evening rate'),
        (1, 'FullDay', '2026-07-01', '2026-09-30', 80000.00, 12000.00, 'Off-season full day'),
        
        -- Venue 2: Government Programs - Peak Season
        (2, 'Morning', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Government hall - peak'),
        (2, 'Afternoon', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Government hall - peak'),
        (2, 'Evening', '2026-04-01', '2026-06-30', 55000.00, 12000.00, 'Government hall - peak evening'),
        (2, 'FullDay', '2026-04-01', '2026-06-30', 90000.00, 12000.00, 'Government hall - full day'),
        
        -- Venue 2: Off-Season
        (2, 'Morning', '2026-07-01', '2026-09-30', 40000.00, 12000.00, 'Government hall - off-season'),
        (2, 'Evening', '2026-07-01', '2026-09-30', 45000.00, 12000.00, 'Government hall - off-season'),
        
        -- Venue 3: Ceremonies & Conferences - Peak Season
        (3, 'Morning', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Ceremony hall - peak'),
        (3, 'Afternoon', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Ceremony hall - peak'),
        (3, 'Evening', '2026-04-01', '2026-06-30', 60000.00, 12000.00, 'Ceremony hall - peak evening'),
        (3, 'FullDay', '2026-04-01', '2026-06-30', 100000.00, 12000.00, 'Ceremony hall - full day'),
        
        -- Venue 3: Off-Season
        (3, 'Morning', '2026-07-01', '2026-09-30', 40000.00, 12000.00, 'Ceremony hall - off-season'),
        (3, 'FullDay', '2026-07-01', '2026-09-30', 80000.00, 12000.00, 'Ceremony hall - off-season'),
        
        -- Venue 4: Lecture Series - Peak Season
        (4, 'Morning', '2026-04-01', '2026-06-30', 15000.00, 10000.00, 'Lecture hall - peak'),
        (4, 'Afternoon', '2026-04-01', '2026-06-30', 15000.00, 10000.00, 'Lecture hall - peak'),
        (4, 'FullDay', '2026-04-01', '2026-06-30', 25000.00, 10000.00, 'Lecture hall - full day'),
        
        -- Venue 4: Off-Season
        (4, 'Morning', '2026-07-01', '2026-09-30', 12000.00, 10000.00, 'Lecture hall - off-season'),
        (4, 'FullDay', '2026-07-01', '2026-09-30', 20000.00, 10000.00, 'Lecture hall - off-season'),
        
        -- Venue 5: Orchestra & Entertainment - Peak
        (5, 'Evening', '2026-04-01', '2026-06-30', 60000.00, 12000.00, 'Orchestra - peak evening'),
        (5, 'Night', '2026-04-01', '2026-06-30', 70000.00, 12000.00, 'Orchestra - peak night'),
        (5, 'FullDay', '2026-04-01', '2026-06-30', 100000.00, 12000.00, 'Orchestra - full day'),
        
        -- Venue 5: Off-Season
        (5, 'Evening', '2026-07-01', '2026-09-30', 45000.00, 12000.00, 'Orchestra - off-season'),
        (5, 'FullDay', '2026-07-01', '2026-09-30', 80000.00, 12000.00, 'Orchestra - off-season'),
        
        -- Venue 6: Dance Programs - Peak
        (6, 'Evening', '2026-04-01', '2026-06-30', 30000.00, 12000.00, 'Dance - peak evening'),
        (6, 'Night', '2026-04-01', '2026-06-30', 35000.00, 12000.00, 'Dance - peak night'),
        (6, 'FullDay', '2026-04-01', '2026-06-30', 50000.00, 12000.00, 'Dance - full day'),
        
        -- Venue 6: Off-Season
        (6, 'Evening', '2026-07-01', '2026-09-30', 25000.00, 12000.00, 'Dance - off-season'),
        (6, 'FullDay', '2026-07-01', '2026-09-30', 40000.00, 12000.00, 'Dance - off-season'),
        
        -- Venue 7: Drama & Magic - Peak
        (7, 'Evening', '2026-04-01', '2026-06-30', 5000.00, 5000.00, 'Drama - peak evening'),
        (7, 'Night', '2026-04-01', '2026-06-30', 5000.00, 5000.00, 'Drama - peak night'),
        
        -- Venue 7: Off-Season
        (7, 'Evening', '2026-07-01', '2026-09-30', 3000.00, 5000.00, 'Drama - off-season'),
        
        -- Venue 8: Children Drama - Peak
        (8, 'Afternoon', '2026-04-01', '2026-06-30', 7000.00, 5000.00, 'Children - peak'),
        (8, 'Evening', '2026-04-01', '2026-06-30', 8000.00, 5000.00, 'Children - peak'),
        
        -- Venue 8: Off-Season
        (8, 'Afternoon', '2026-07-01', '2026-09-30', 5000.00, 5000.00, 'Children - off-season'),
        
        -- Venue 9: Rehearsal Stage - Peak
        (9, 'Morning', '2026-04-01', '2026-06-30', 5000.00, 5000.00, 'Rehearsal - peak'),
        (9, 'Afternoon', '2026-04-01', '2026-06-30', 5000.00, 5000.00, 'Rehearsal - peak'),
        
        -- Venue 9: Off-Season
        (9, 'Morning', '2026-07-01', '2026-09-30', 3000.00, 5000.00, 'Rehearsal - off-season'),
        
        -- Venue 10: Art Gallery - Daily Rate
        (10, 'FullDay', '2026-04-01', '2026-12-31', 2000.00, 0.00, 'Gallery - daily rate (electricity extra)'),
        
        -- Venue 11: Open Space V.I.P - Daily Rate
        (11, 'FullDay', '2026-04-01', '2026-12-31', 1000.00, 0.00, 'Open space - daily rate (electricity extra)'),
        
        -- Venue 12: Exhibition Space - Daily Rate
        (12, 'FullDay', '2026-04-01', '2026-12-31', 1000.00, 0.00, 'Exhibition - daily rate (electricity extra)');
    
    PRINT 'Sample venue rates inserted for Apr-Sep 2026';
END
ELSE
BEGIN
    PRINT 'Rates already exist for the date range';
END

-- ===================================
-- Verification Queries
-- ===================================
PRINT '';
PRINT '=== Schema Verification ===';
PRINT 'SessionTypes count: ' + CAST((SELECT COUNT(*) FROM dbo.SessionTypes) AS VARCHAR);
PRINT 'VenueRateMaster count: ' + CAST((SELECT COUNT(*) FROM dbo.VenueRateMaster WHERE IsActive = 1) AS VARCHAR);

PRINT '';
PRINT '=== Sample Rate Data ===';
SELECT TOP 5 
    vrm.RateId,
    vm.VenueName,
    vrm.SessionType,
    vrm.FromDate,
    vrm.ToDate,
    vrm.Amount,
    vrm.RefundableDeposit
FROM dbo.VenueRateMaster vrm
JOIN dbo.VenueMaster vm ON vrm.VenueId = vm.VenueId
WHERE vrm.IsActive = 1
ORDER BY vrm.VenueId, vrm.SessionType;
