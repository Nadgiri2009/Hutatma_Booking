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
-- Verification Queries
-- ===================================
PRINT '';
PRINT '=== Schema Verification ===';
PRINT 'SessionTypes count: ' + CAST((SELECT COUNT(*) FROM dbo.SessionTypes) AS VARCHAR);
PRINT 'VenueRateMaster count: ' + CAST((SELECT COUNT(*) FROM dbo.VenueRateMaster WHERE IsActive = 1) AS VARCHAR);

PRINT '';
PRINT '=== Active Rate Data ===';
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
