/*
  PHASE 6: Booking Modification System - Database Schema
  
  Creates tables for tracking booking modifications with business rules:
  - Can modify only within 3 days before event
  - Can change: Venue, Session Type
  - Cannot change: Event Date, Customer Details
  - Tracks price differences and payment status
*/

-- ===================================
-- 1. BookingModificationHistory Table
-- ===================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BookingModificationHistory' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.BookingModificationHistory (
        ModificationId INT PRIMARY KEY IDENTITY(1,1),
        BookingId INT NOT NULL,
        
        -- Original booking details (immutable)
        OldVenueId INT,
        OldSessionType NVARCHAR(50),
        OldBookingDate DATE,
        OldAmount DECIMAL(12,2) NOT NULL,
        
        -- New booking details
        NewVenueId INT NOT NULL,
        NewSessionType NVARCHAR(50) NOT NULL,
        NewBookingDate DATE NOT NULL,
        NewAmount DECIMAL(12,2) NOT NULL,
        
        -- Price reconciliation
        DifferenceAmount DECIMAL(12,2) NOT NULL,  -- Positive = additional, Negative = refund
        PaymentStatus NVARCHAR(30) DEFAULT 'Pending',  -- Pending, Completed, Refunded, Cancelled
        PaymentMethod NVARCHAR(50),
        TransactionReference NVARCHAR(100),
        
        -- Audit trail
        ModificationReason NVARCHAR(500),
        ModifiedBy INT,
        ModifiedDate DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        -- Foreign Keys
        CONSTRAINT FK_BookingModHistory_Booking 
            FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId) ON DELETE CASCADE,
        
        CONSTRAINT FK_BookingModHistory_OldVenue 
            FOREIGN KEY (OldVenueId) REFERENCES dbo.VenueMaster(VenueId),
        
        CONSTRAINT FK_BookingModHistory_NewVenue 
            FOREIGN KEY (NewVenueId) REFERENCES dbo.VenueMaster(VenueId),
        
        -- Indexes for common queries
        INDEX IX_BookingModHistory_BookingId (BookingId),
        INDEX IX_BookingModHistory_ModifiedDate (ModifiedDate DESC),
        INDEX IX_BookingModHistory_PaymentStatus (PaymentStatus) 
            WHERE PaymentStatus IN ('Pending', 'RefundPending')
    );
    
    PRINT 'BookingModificationHistory table created';
END
ELSE
BEGIN
    PRINT 'BookingModificationHistory table already exists';
END

-- ===================================
-- 2. ModificationAuditLog Table
-- ===================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ModificationAuditLog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.ModificationAuditLog (
        AuditId INT PRIMARY KEY IDENTITY(1,1),
        ModificationId INT NOT NULL,
        Action NVARCHAR(50),  -- 'Created', 'PaymentInitiated', 'PaymentCompleted', 'Refunded', 'Cancelled'
        OldStatus NVARCHAR(30),
        NewStatus NVARCHAR(30),
        Comments NVARCHAR(MAX),
        ActionBy INT,
        ActionAt DATETIME2 DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_ModAuditLog_Modification 
            FOREIGN KEY (ModificationId) REFERENCES dbo.BookingModificationHistory(ModificationId) ON DELETE CASCADE,
        
        INDEX IX_ModAuditLog_ModificationId (ModificationId)
    );
    
    PRINT 'ModificationAuditLog table created';
END
ELSE
BEGIN
    PRINT 'ModificationAuditLog table already exists';
END

-- ===================================
-- 3. Stored Procedures for Business Logic
-- ===================================

-- SP: Check Modification Eligibility
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_CheckModificationEligibility')
    DROP PROCEDURE dbo.sp_CheckModificationEligibility;
GO

CREATE PROCEDURE dbo.sp_CheckModificationEligibility
    @BookingId INT,
    @IsEligible BIT OUTPUT,
    @EventDate DATE OUTPUT,
    @ModificationDeadline DATE OUTPUT,
    @DaysRemaining INT OUTPUT,
    @Message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @MODIFICATION_WINDOW_DAYS INT = 3;
    DECLARE @BookingStatus NVARCHAR(30);
    
    -- Get booking details
    SELECT 
        @EventDate = BookingDate,
        @BookingStatus = Status
    FROM dbo.Bookings
    WHERE BookingId = @BookingId;
    
    IF @EventDate IS NULL
    BEGIN
        SET @IsEligible = 0;
        SET @Message = 'Booking not found';
        RETURN;
    END
    
    -- Check if booking is in valid status (not cancelled, completed, etc.)
    IF @BookingStatus NOT IN ('Confirmed', 'Pending')
    BEGIN
        SET @IsEligible = 0;
        SET @Message = 'Booking status does not allow modifications';
        RETURN;
    END
    
    -- Calculate modification deadline (3 days before event)
    SET @ModificationDeadline = DATEADD(DAY, -@MODIFICATION_WINDOW_DAYS, @EventDate);
    
    -- Check if today is before deadline
    IF CAST(GETDATE() AS DATE) <= @ModificationDeadline
    BEGIN
        SET @IsEligible = 1;
        SET @DaysRemaining = DATEDIFF(DAY, CAST(GETDATE() AS DATE), @ModificationDeadline);
        SET @Message = 'Can modify until ' + FORMAT(@ModificationDeadline, 'yyyy-MM-dd');
    END
    ELSE
    BEGIN
        SET @IsEligible = 0;
        SET @DaysRemaining = 0;
        SET @Message = 'Modification window closed (3 days before event)';
    END
END
GO

PRINT 'Stored procedure sp_CheckModificationEligibility created';

-- SP: Check Venue Availability
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_CheckVenueAvailability')
    DROP PROCEDURE dbo.sp_CheckVenueAvailability;
GO

CREATE PROCEDURE dbo.sp_CheckVenueAvailability
    @VenueId INT,
    @BookingDate DATE,
    @SessionType NVARCHAR(50),
    @ExcludeBookingId INT = NULL,
    @IsAvailable BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ConflictCount INT;
    
    -- Count conflicting bookings (existing bookings for same venue/date/session)
    SELECT @ConflictCount = COUNT(*)
    FROM dbo.Bookings
    WHERE VenueId = @VenueId
        AND CAST(BookingDate AS DATE) = @BookingDate
        AND SessionType = @SessionType
        AND Status IN ('Confirmed', 'Pending')
        AND BookingId != ISNULL(@ExcludeBookingId, 0);
    
    SET @IsAvailable = CASE WHEN @ConflictCount = 0 THEN 1 ELSE 0 END;
END
GO

PRINT 'Stored procedure sp_CheckVenueAvailability created';

-- SP: Create Booking Modification Record
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_CreateBookingModification')
    DROP PROCEDURE dbo.sp_CreateBookingModification;
GO

CREATE PROCEDURE dbo.sp_CreateBookingModification
    @BookingId INT,
    @NewVenueId INT,
    @NewSessionType NVARCHAR(50),
    @NewAmount DECIMAL(12,2),
    @Reason NVARCHAR(500),
    @ModifiedBy INT,
    @ModificationId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @OldVenueId INT;
        DECLARE @OldSessionType NVARCHAR(50);
        DECLARE @OldBookingDate DATE;
        DECLARE @OldAmount DECIMAL(12,2);
        DECLARE @DifferenceAmount DECIMAL(12,2);
        DECLARE @PaymentStatus NVARCHAR(30);
        
        -- Get current booking details
        SELECT 
            @OldVenueId = VenueId,
            @OldSessionType = SessionType,
            @OldBookingDate = BookingDate,
            @OldAmount = Amount
        FROM dbo.Bookings
        WHERE BookingId = @BookingId;
        
        IF @OldAmount IS NULL
        BEGIN
            THROW 50001, 'Booking not found', 1;
        END
        
        -- Calculate difference
        SET @DifferenceAmount = @NewAmount - @OldAmount;
        
        -- Determine payment status
        IF @DifferenceAmount > 0
            SET @PaymentStatus = 'Pending';  -- Additional payment required
        ELSE IF @DifferenceAmount < 0
            SET @PaymentStatus = 'RefundPending';  -- Refund due
        ELSE
            SET @PaymentStatus = 'Completed';  -- No payment needed
        
        -- Insert modification record
        INSERT INTO dbo.BookingModificationHistory
            (BookingId, OldVenueId, OldSessionType, OldBookingDate, OldAmount,
             NewVenueId, NewSessionType, NewBookingDate, NewAmount, DifferenceAmount,
             PaymentStatus, ModificationReason, ModifiedBy)
        VALUES
            (@BookingId, @OldVenueId, @OldSessionType, @OldBookingDate, @OldAmount,
             @NewVenueId, @NewSessionType, @OldBookingDate, @NewAmount, @DifferenceAmount,
             @PaymentStatus, @Reason, @ModifiedBy);
        
        SET @ModificationId = SCOPE_IDENTITY();
        
        -- Update booking
        UPDATE dbo.Bookings
        SET VenueId = @NewVenueId,
            SessionType = @NewSessionType,
            Amount = @NewAmount,
            UpdatedAt = GETDATE()
        WHERE BookingId = @BookingId;
        
        -- Create audit log entry
        INSERT INTO dbo.ModificationAuditLog
            (ModificationId, Action, OldStatus, NewStatus, Comments, ActionBy)
        VALUES
            (@ModificationId, 'Created', 'N/A', @PaymentStatus, @Reason, @ModifiedBy);
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT 'Stored procedure sp_CreateBookingModification created';

-- SP: Process Payment for Modification
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ProcessModificationPayment')
    DROP PROCEDURE dbo.sp_ProcessModificationPayment;
GO

CREATE PROCEDURE dbo.sp_ProcessModificationPayment
    @ModificationId INT,
    @PaymentMethod NVARCHAR(50),
    @TransactionReference NVARCHAR(100),
    @ProcessedBy INT,
    @Success BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @OldStatus NVARCHAR(30);
        DECLARE @NewStatus NVARCHAR(30);
        DECLARE @DifferenceAmount DECIMAL(12,2);
        
        -- Get current modification status
        SELECT 
            @OldStatus = PaymentStatus,
            @DifferenceAmount = DifferenceAmount
        FROM dbo.BookingModificationHistory
        WHERE ModificationId = @ModificationId;
        
        IF @OldStatus IS NULL
        BEGIN
            THROW 50002, 'Modification not found', 1;
        END
        
        -- Determine new status based on difference amount
        IF @DifferenceAmount > 0
            SET @NewStatus = 'Completed';  -- Additional payment processed
        ELSE IF @DifferenceAmount < 0
            SET @NewStatus = 'Refunded';  -- Refund processed
        ELSE
            SET @NewStatus = 'Completed';  -- No payment needed
        
        -- Update modification with payment details
        UPDATE dbo.BookingModificationHistory
        SET PaymentStatus = @NewStatus,
            PaymentMethod = @PaymentMethod,
            TransactionReference = @TransactionReference
        WHERE ModificationId = @ModificationId;
        
        -- Log the payment action
        INSERT INTO dbo.ModificationAuditLog
            (ModificationId, Action, OldStatus, NewStatus, Comments, ActionBy)
        VALUES
            (@ModificationId, 
             CASE WHEN @DifferenceAmount > 0 THEN 'PaymentCompleted'
                  WHEN @DifferenceAmount < 0 THEN 'Refunded'
                  ELSE 'PaymentCompleted' END,
             @OldStatus, 
             @NewStatus,
             'Transaction: ' + @TransactionReference,
             @ProcessedBy);
        
        SET @Success = 1;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        SET @Success = 0;
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT 'Stored procedure sp_ProcessModificationPayment created';

-- ===================================
-- Verification Queries
-- ===================================
PRINT '';
PRINT '=== Schema Verification ===';
PRINT 'BookingModificationHistory table: ' + 
    CASE WHEN EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BookingModificationHistory') 
    THEN 'Created' ELSE 'Not Found' END;
PRINT 'ModificationAuditLog table: ' + 
    CASE WHEN EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ModificationAuditLog')
    THEN 'Created' ELSE 'Not Found' END;

PRINT '';
PRINT '=== Stored Procedures ===';
SELECT name FROM sys.procedures WHERE name LIKE 'sp_%odif%' OR name LIKE 'sp_%Check%';
