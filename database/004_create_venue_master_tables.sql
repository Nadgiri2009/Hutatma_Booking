/*
  Venue master schema for SQL Server
  - Creates VenueMaster, VenueFacilities, VenueImages, VenueRules
  - Use in your database to store venue master data extracted from PDF
*/

SET NOCOUNT ON;

IF OBJECT_ID('dbo.VenueMaster', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VenueMaster (
    VenueId INT IDENTITY(1,1) PRIMARY KEY,
    VenueName NVARCHAR(150) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Capacity INT NULL,
    Location NVARCHAR(200) NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT('Active'),
    DisplayOrder INT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
  CREATE UNIQUE INDEX IX_VenueMaster_VenueName ON dbo.VenueMaster(VenueName);
END

IF OBJECT_ID('dbo.VenueFacilities', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VenueFacilities (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VenueId INT NOT NULL,
    FacilityName NVARCHAR(150) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_VenueFacilities_Venue FOREIGN KEY (VenueId)
      REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
  );
END

IF OBJECT_ID('dbo.VenueImages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VenueImages (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VenueId INT NOT NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    Caption NVARCHAR(200) NULL,
    IsPrimary BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_VenueImages_Venue FOREIGN KEY (VenueId)
      REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
  );
END

IF OBJECT_ID('dbo.VenueRules', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VenueRules (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VenueId INT NOT NULL,
    RuleTitle NVARCHAR(200) NOT NULL,
    RuleText NVARCHAR(MAX) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    DisplayOrder INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_VenueRules_Venue FOREIGN KEY (VenueId)
      REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
  );
END

-- Optional: VenuePricing and VenueEquipment tables already exist in the codebase.

PRINT 'Venue master tables created (if not present)';
