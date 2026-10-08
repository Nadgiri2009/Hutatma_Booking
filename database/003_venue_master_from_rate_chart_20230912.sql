-- ============================================================
-- Hutatma Smruti Mandir - Dynamic venue master data
-- Source: HSM Rate Chart dated 12/09/2023
-- Purpose: Keep PDF/rate-chart values in database tables, not React/.NET code.
-- ============================================================

USE HutatmaBookingDB;
GO

IF OBJECT_ID('dbo.VenueMaster', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueMaster (
        VenueId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueMaster PRIMARY KEY,
        VenueName    NVARCHAR(150) NOT NULL,
        Description  NVARCHAR(MAX) NULL,
        Capacity     INT NULL,
        Location     NVARCHAR(200) NULL,
        Status       NVARCHAR(30) NOT NULL CONSTRAINT DF_VenueMaster_Status DEFAULT 'Active',
        DisplayOrder INT NOT NULL CONSTRAINT DF_VenueMaster_DisplayOrder DEFAULT 0,
        CreatedAt    DATETIME2 NOT NULL CONSTRAINT DF_VenueMaster_CreatedAt DEFAULT GETUTCDATE(),
        UpdatedAt    DATETIME2 NULL,
        CONSTRAINT UQ_VenueMaster_VenueName UNIQUE (VenueName),
        CONSTRAINT CK_VenueMaster_Status CHECK (Status IN ('Active', 'Inactive', 'Closed'))
    );
END;
GO

IF OBJECT_ID('dbo.VenueFacilities', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueFacilities (
        Id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueFacilities PRIMARY KEY,
        VenueId      INT NOT NULL,
        FacilityName NVARCHAR(150) NOT NULL,
        Description  NVARCHAR(MAX) NULL,
        IsActive     BIT NOT NULL CONSTRAINT DF_VenueFacilities_IsActive DEFAULT 1,
        DisplayOrder INT NOT NULL CONSTRAINT DF_VenueFacilities_DisplayOrder DEFAULT 0,
        CONSTRAINT FK_VenueFacilities_VenueMaster
            FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID('dbo.VenueImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueImages (
        Id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueImages PRIMARY KEY,
        VenueId      INT NOT NULL,
        ImageUrl     NVARCHAR(500) NOT NULL,
        Caption      NVARCHAR(200) NULL,
        IsPrimary    BIT NOT NULL CONSTRAINT DF_VenueImages_IsPrimary DEFAULT 0,
        IsActive     BIT NOT NULL CONSTRAINT DF_VenueImages_IsActive DEFAULT 1,
        DisplayOrder INT NOT NULL CONSTRAINT DF_VenueImages_DisplayOrder DEFAULT 0,
        CONSTRAINT FK_VenueImages_VenueMaster
            FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID('dbo.VenueRules', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueRules (
        Id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueRules PRIMARY KEY,
        VenueId      INT NOT NULL,
        RuleTitle    NVARCHAR(200) NOT NULL,
        RuleText     NVARCHAR(MAX) NOT NULL,
        IsActive     BIT NOT NULL CONSTRAINT DF_VenueRules_IsActive DEFAULT 1,
        DisplayOrder INT NOT NULL CONSTRAINT DF_VenueRules_DisplayOrder DEFAULT 0,
        CONSTRAINT FK_VenueRules_VenueMaster
            FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE
    );
END;
GO

IF OBJECT_ID('dbo.VenuePricing', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenuePricing (
        Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenuePricing PRIMARY KEY,
        VenueId           INT NOT NULL,
        PriceItemName     NVARCHAR(150) NOT NULL,
        ChargeUnit        NVARCHAR(50) NOT NULL,
        Amount            DECIMAL(12,2) NOT NULL,
        RefundableDeposit DECIMAL(12,2) NOT NULL CONSTRAINT DF_VenuePricing_RefundableDeposit DEFAULT 0,
        CGSTPercent       DECIMAL(5,2) NOT NULL CONSTRAINT DF_VenuePricing_CGSTPercent DEFAULT 9,
        SGSTPercent       DECIMAL(5,2) NOT NULL CONSTRAINT DF_VenuePricing_SGSTPercent DEFAULT 9,
        EffectiveFrom     DATE NOT NULL,
        EffectiveTo       DATE NULL,
        IsActive          BIT NOT NULL CONSTRAINT DF_VenuePricing_IsActive DEFAULT 1,
        DisplayOrder      INT NOT NULL CONSTRAINT DF_VenuePricing_DisplayOrder DEFAULT 0,
        CONSTRAINT FK_VenuePricing_VenueMaster
            FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE,
        CONSTRAINT UQ_VenuePricing_Item_Date UNIQUE (VenueId, PriceItemName, EffectiveFrom)
    );
END;
GO

IF OBJECT_ID('dbo.VenueEquipment', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VenueEquipment (
        Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_VenueEquipment PRIMARY KEY,
        EquipmentName NVARCHAR(150) NOT NULL,
        ChargeUnit    NVARCHAR(50) NOT NULL,
        Amount        DECIMAL(12,2) NOT NULL,
        FreeQuantity  INT NOT NULL CONSTRAINT DF_VenueEquipment_FreeQuantity DEFAULT 0,
        IsActive      BIT NOT NULL CONSTRAINT DF_VenueEquipment_IsActive DEFAULT 1,
        DisplayOrder  INT NOT NULL CONSTRAINT DF_VenueEquipment_DisplayOrder DEFAULT 0,
        CONSTRAINT UQ_VenueEquipment_EquipmentName UNIQUE (EquipmentName)
    );
END;
GO

DECLARE @EffectiveFrom DATE = '2023-09-12';

DECLARE @Venues TABLE (
    VenueName NVARCHAR(150),
    Description NVARCHAR(MAX),
    Capacity INT NULL,
    Location NVARCHAR(200),
    Status NVARCHAR(30),
    DisplayOrder INT
);

INSERT INTO @Venues VALUES
('Main Hall', 'Main auditorium/hall booking categories charged per selected session as per HSM rate chart dated 12/09/2023.', NULL, 'Hutatma Smruti Mandir', 'Active', 1),
('Open Space in Front of VIP Room', 'Open space measuring 60 x 40, charged per day.', NULL, 'In front of VIP Room', 'Active', 2),
('Parking-side Space 25 x 40', 'Parking-side open space measuring 25 x 40, charged per day.', NULL, 'Parking side', 'Active', 3),
('Parking-side Space Complete', 'Complete parking-side open space, charged per day.', NULL, 'Parking side', 'Active', 4),
('Front Porch Space', 'Front porch space available with hall booking, charged per slot.', NULL, 'Front porch', 'Active', 5),
('Residential Rooms 1-5', 'Residential rooms 1 to 5 for outstation artists, charged per day.', NULL, 'Residential rooms', 'Active', 6),
('Residential Room 6', 'Residential room 6 for outstation artists, charged per day.', NULL, 'Residential rooms', 'Active', 7),
('Dining Hall', 'Dining hall charged per hour.', NULL, 'Dining hall', 'Active', 8),
('Shubhrai Art Gallery', 'Art gallery listed in the source rate chart as closed for renovation.', NULL, 'Hutatma Smruti Mandir', 'Closed', 9);

INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder, CreatedAt)
SELECT v.VenueName, v.Description, v.Capacity, v.Location, v.Status, v.DisplayOrder, GETUTCDATE()
FROM @Venues v
WHERE NOT EXISTS (SELECT 1 FROM dbo.VenueMaster m WHERE m.VenueName = v.VenueName);

DECLARE @MainHall INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Main Hall');
DECLARE @OpenVip INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Open Space in Front of VIP Room');
DECLARE @ParkingPartial INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Parking-side Space 25 x 40');
DECLARE @ParkingFull INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Parking-side Space Complete');
DECLARE @Porch INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Front Porch Space');
DECLARE @Rooms15 INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Residential Rooms 1-5');
DECLARE @Room6 INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Residential Room 6');
DECLARE @Dining INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Dining Hall');

DECLARE @Facilities TABLE (VenueId INT, FacilityName NVARCHAR(150), Description NVARCHAR(MAX), DisplayOrder INT);
INSERT INTO @Facilities VALUES
(@MainHall, 'Main auditorium stage', 'Main hall/stage available for public and private programs.', 1),
(@MainHall, 'VIP room', 'VIP room available as an add-on service charged hourly.', 2),
(@MainHall, 'Lighting support', 'Spot, PAR, LED, screen and building illumination services are listed separately in equipment master.', 3),
(@OpenVip, 'Open space', '60 x 40 open space in front of VIP room.', 1),
(@ParkingPartial, 'Open space', '25 x 40 parking-side open space.', 1),
(@ParkingFull, 'Open space', 'Complete parking-side open space.', 1),
(@Porch, 'Front porch', 'Front porch space available with hall booking.', 1),
(@Rooms15, 'Residential rooms', 'Rooms 1 to 5 for outstation artists.', 1),
(@Room6, 'Residential room', 'Room 6 for outstation artists.', 1),
(@Dining, 'Dining hall', 'Dining hall charged hourly.', 1);

INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, DisplayOrder)
SELECT f.VenueId, f.FacilityName, f.Description, f.DisplayOrder
FROM @Facilities f
WHERE f.VenueId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.VenueFacilities x
      WHERE x.VenueId = f.VenueId AND x.FacilityName = f.FacilityName
  );

DECLARE @Pricing TABLE (
    VenueId INT,
    PriceItemName NVARCHAR(150),
    ChargeUnit NVARCHAR(50),
    Amount DECIMAL(12,2),
    RefundableDeposit DECIMAL(12,2),
    DisplayOrder INT
);

INSERT INTO @Pricing VALUES
(@MainHall, 'Gathering - Private / School', 'Per slot', 20000, 12000, 1),
(@MainHall, 'Govt / Semi-Govt / ZP / Entertainment', 'Per slot', 10000, 12000, 2),
(@MainHall, 'Ceremony / Conference', 'Per slot', 12000, 12000, 3),
(@MainHall, 'Lecture', 'Per slot', 7500, 12000, 4),
(@MainHall, 'Orchestra / Gazal / Singing', 'Per slot', 7500, 12000, 5),
(@MainHall, 'Lavni / Dance / Fashion Show', 'Per slot', 15000, 12000, 6),
(@MainHall, 'Drama / Magic', 'Per slot', 8000, 12000, 7),
(@MainHall, 'Children Drama / Balnatya', 'Per slot', 3000, 12000, 8),
(@MainHall, 'Rehearsal - Stage Only', 'Per slot', 3000, 12000, 9),
(@OpenVip, 'Open Space in Front of VIP Room 60 x 40', 'Per day', 7500, 0, 10),
(@ParkingPartial, 'Parking-side Space 25 x 40', 'Per day', 6000, 0, 11),
(@ParkingFull, 'Parking-side Space - Complete', 'Per day', 12000, 0, 12),
(@Porch, 'Front Porch Space - with Hall Booking', 'Per slot', 4000, 0, 13),
(@Rooms15, 'Residential Rooms 1-5 - Outstation Artists', 'Per day', 250, 0, 14),
(@Room6, 'Residential Room 6 - Outstation Artists', 'Per day', 300, 0, 15),
(@Dining, 'Dining Hall', 'Per hour', 100, 0, 16);

INSERT INTO dbo.VenuePricing (
    VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit,
    CGSTPercent, SGSTPercent, EffectiveFrom, DisplayOrder
)
SELECT p.VenueId, p.PriceItemName, p.ChargeUnit, p.Amount, p.RefundableDeposit,
       9, 9, @EffectiveFrom, p.DisplayOrder
FROM @Pricing p
WHERE p.VenueId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.VenuePricing x
      WHERE x.VenueId = p.VenueId
        AND x.PriceItemName = p.PriceItemName
        AND x.EffectiveFrom = @EffectiveFrom
  );

DECLARE @Equipment TABLE (
    EquipmentName NVARCHAR(150),
    ChargeUnit NVARCHAR(50),
    Amount DECIMAL(12,2),
    FreeQuantity INT,
    DisplayOrder INT
);

INSERT INTO @Equipment VALUES
('Spot Light - SMC', 'Per piece', 100, 4, 1),
('Spot / PAR / LED Light - Company', 'Per piece', 50, 4, 2),
('LED Screen up to 10 x 10 ft', 'Per slot', 500, 0, 3),
('LED Screen up to 10 x 20 ft', 'Per slot', 1000, 0, 4),
('Flat Screen - Municipal', 'Per slot', 500, 0, 5),
('Generator Rent - organiser provides diesel', 'Per hour', 1500, 0, 6),
('VIP Room Rent', 'Per hour', 200, 0, 7),
('Video Shooting up to 2 cameras', 'Per slot', 1000, 0, 8),
('Building Lighting - Illumination', 'Per slot', 1500, 0, 9),
('Level Rent', 'Per level', 75, 4, 10),
('Sound System - External', 'Per slot', 500, 0, 11),
('Change in Program', 'Flat', 1000, 0, 12),
('Rangoli Making', 'Per slot', 200, 0, 13);

INSERT INTO dbo.VenueEquipment (EquipmentName, ChargeUnit, Amount, FreeQuantity, DisplayOrder, IsActive)
SELECT e.EquipmentName, e.ChargeUnit, e.Amount, e.FreeQuantity, e.DisplayOrder, 1
FROM @Equipment e
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.VenueEquipment x WHERE x.EquipmentName = e.EquipmentName
);

DECLARE @Rules TABLE (VenueId INT, RuleTitle NVARCHAR(200), RuleText NVARCHAR(MAX), DisplayOrder INT);
INSERT INTO @Rules VALUES
(@MainHall, 'GST', 'CGST 9% and SGST 9% are applicable on chargeable rent and add-on services.', 1),
(@MainHall, 'Holiday surcharge', 'Saturday, Sunday and public holiday bookings carry an additional Rs. 500 surcharge.', 2),
(@MainHall, 'Extra time', 'Extra time is charged at Rs. 2,500 per hour plus applicable GST.', 3),
(@MainHall, 'Local artist discount', 'Local Solapur artists are eligible for 20% discount where applicable.', 4),
(@MainHall, 'Refundable deposit', 'Main hall bookings carry a refundable security deposit of Rs. 12,000.', 5),
(@MainHall, 'Staff responsibility', 'Door keeper and seating indicator staff are the responsibility of the organiser.', 6),
(@MainHall, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 7),
(@OpenVip, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1),
(@ParkingPartial, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1),
(@ParkingFull, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1);

INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, DisplayOrder)
SELECT r.VenueId, r.RuleTitle, r.RuleText, r.DisplayOrder
FROM @Rules r
WHERE r.VenueId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.VenueRules x
      WHERE x.VenueId = r.VenueId AND x.RuleTitle = r.RuleTitle
  );

UPDATE dbo.VenuePricing
SET ChargeUnit = 'Per slot'
WHERE ChargeUnit LIKE '%hour slot%';

UPDATE dbo.VenuePricing
SET PriceItemName = 'Session (Weekday)'
WHERE PriceItemName LIKE '%Hour Session (Weekday)%';

UPDATE dbo.VenueMaster
SET Description = 'Main auditorium/hall booking categories charged per selected session as per HSM rate chart dated 12/09/2023.'
WHERE VenueName = 'Main Hall' AND Description LIKE '%hour slot%';

UPDATE dbo.VenueRules
SET RuleText = CASE RuleTitle
    WHEN 'Extra time' THEN 'Extra time is charged at Rs. 2,500 per hour plus applicable GST.'
    WHEN 'Deposit Refund' THEN 'Refundable deposit of Rs.12,000/- per session'
    WHEN 'Booking Duration' THEN 'Minimum one session or full day booking'
    ELSE RuleText
END
WHERE RuleText LIKE '%hour slot%' OR RuleText LIKE '%hour session%';

GO

PRINT 'Venue master data loaded from HSM rate chart dated 12/09/2023.';
