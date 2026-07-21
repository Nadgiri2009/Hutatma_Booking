# PHASE 5 & 6: Dynamic Rate Management & Booking Modification System

## Executive Summary

This document provides a complete implementation plan for:
- **PHASE 5**: Dynamic pricing engine with venue/date/session/duration-based rates
- **PHASE 6**: Booking modification feature with 3-day window, availability checks, and price reconciliation

---

## PHASE 5: Dynamic Rate Management System

### 5.1 Problem Statement
Current system has hardcoded rates. Need a database-driven pricing engine that supports:
- Multiple rates per venue
- Date-range based pricing (e.g., peak/off-season)
- Session-type pricing (Morning, Evening, Full Day, etc.)
- Flexible rate updates without code changes

### 5.2 Database Design

#### Table: VenueRateMaster
Stores pricing rules for each venue+session+date combination.

```sql
CREATE TABLE dbo.VenueRateMaster (
    RateId INT PRIMARY KEY IDENTITY(1,1),
    VenueId INT NOT NULL,
    SessionType NVARCHAR(50) NOT NULL,          -- 'Morning', 'Evening', 'FullDay', 'HalfDay'
    FromDate DATE NOT NULL,
    ToDate DATE NOT NULL,
    Amount DECIMAL(12,2) NOT NULL,
    RefundableDeposit DECIMAL(12,2) DEFAULT 0,
    Notes NVARCHAR(MAX),
    IsActive BIT DEFAULT 1,
    CreatedDate DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedDate DATETIME2,
    
    CONSTRAINT FK_VenueRateMaster_VenueMaster 
        FOREIGN KEY (VenueId) REFERENCES dbo.VenueMaster(VenueId) ON DELETE CASCADE,
    
    INDEX IX_VenueRate_Lookup (VenueId, SessionType, FromDate, ToDate)
);
```

#### Table: SessionTypes (Reference)
Standardized session definitions.

```sql
CREATE TABLE dbo.SessionTypes (
    SessionTypeId INT PRIMARY KEY IDENTITY(1,1),
    SessionTypeName NVARCHAR(50) NOT NULL,      -- 'Morning', 'Evening', 'FullDay'
    StartTime TIME,
    EndTime TIME,
    DurationHours INT,
    DisplayOrder INT,
    IsActive BIT DEFAULT 1
);
```

### 5.3 Rate Lookup Logic

**Algorithm: Find Applicable Rate**
```
INPUT: VenueId, BookingDate, SessionType
OUTPUT: Amount, RefundableDeposit, or NULL if not found

1. Query VenueRateMaster WHERE:
   - VenueId = input.VenueId
   - SessionType = input.SessionType
   - FromDate <= BookingDate <= ToDate
   - IsActive = 1
2. If multiple rates found (shouldn't happen):
   - Return most specific (narrowest date range) or latest created
3. If no rate found:
   - Return NULL (rate not configured error)
```

### 5.4 Pricing Examples

| Venue | Session | Date Range | Amount | Notes |
|-------|---------|-----------|--------|-------|
| Hall A | Morning | 01-Apr to 30-Jun | ₹50,000 | Peak season |
| Hall A | Morning | 01-Jul to 30-Sep | ₹40,000 | Off-season |
| Hall A | Evening | 01-Apr to 30-Jun | ₹60,000 | Prime time |
| Hall B | FullDay | 01-Apr to 30-Jun | ₹80,000 | Full day rate |

### 5.5 Implementation Components

#### 5.5.1 .NET Service Layer

**Interface: IRateCalculationService**
```csharp
public interface IRateCalculationService
{
    Task<RateDto> GetApplicableRateAsync(int venueId, DateTime bookingDate, string sessionType);
    Task<decimal> CalculateBookingAmountAsync(int venueId, DateTime bookingDate, 
        string sessionType, int durationHours);
    Task<List<RateDto>> GetVenueRatesAsync(int venueId);
    Task<List<RateDto>> GetRatesByDateRangeAsync(DateTime fromDate, DateTime toDate);
}
```

**Implementation: RateCalculationService**
```csharp
public class RateCalculationService : IRateCalculationService
{
    private readonly AppDbContext _context;
    private readonly ILogger<RateCalculationService> _logger;
    
    public async Task<RateDto> GetApplicableRateAsync(int venueId, DateTime bookingDate, 
        string sessionType)
    {
        var rate = await _context.VenueRateMasters
            .AsNoTracking()
            .Where(r => r.VenueId == venueId 
                && r.SessionType == sessionType
                && r.FromDate <= bookingDate.Date
                && r.ToDate >= bookingDate.Date
                && r.IsActive)
            .OrderBy(r => (r.ToDate - r.FromDate)) // Most specific (narrowest range)
            .ThenByDescending(r => r.CreatedDate)  // Most recent
            .FirstOrDefaultAsync();
            
        if (rate == null)
            throw new InvalidOperationException(
                $"No active rate found for venue {venueId}, session {sessionType} on {bookingDate:yyyy-MM-dd}");
                
        return MapToDto(rate);
    }
    
    public async Task<decimal> CalculateBookingAmountAsync(int venueId, DateTime bookingDate, 
        string sessionType, int durationHours)
    {
        var rate = await GetApplicableRateAsync(venueId, bookingDate, sessionType);
        // If duration matters (not yet in schema), adjust: rate.Amount * (durationHours / rate.DurationHours)
        return rate.Amount;
    }
}
```

#### 5.5.2 DTO Objects

```csharp
public class RateDto
{
    public int RateId { get; set; }
    public int VenueId { get; set; }
    public string SessionType { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal Amount { get; set; }
    public decimal RefundableDeposit { get; set; }
    public string Notes { get; set; }
}

public class RateSearchRequestDto
{
    public int VenueId { get; set; }
    public DateTime BookingDate { get; set; }
    public string SessionType { get; set; }
}

public class RateCheckResponseDto
{
    public int VenueId { get; set; }
    public string VenueName { get; set; }
    public string SessionType { get; set; }
    public DateTime BookingDate { get; set; }
    public decimal Amount { get; set; }
    public decimal RefundableDeposit { get; set; }
    public decimal TotalWithGST { get; set; }
}
```

#### 5.5.3 API Endpoints

**GET /api/rates/check**
Check rate for a specific venue/date/session combination.

```
Query Parameters:
  venueId (int, required)
  bookingDate (DateTime, required, format: yyyy-MM-dd)
  sessionType (string, required, values: Morning, Evening, FullDay, HalfDay)

Response: RateCheckResponseDto
```

**GET /api/rates/venue/{venueId}**
List all rates for a venue.

```
Response: List<RateDto>
```

**GET /api/rates/range**
List rates for a date range.

```
Query Parameters:
  fromDate (DateTime, required)
  toDate (DateTime, required)

Response: List<RateDto>
```

**POST /api/rates/calculate**
Calculate total booking amount with GST.

```
Request Body:
{
  "venueId": 1,
  "bookingDate": "2026-06-20",
  "sessionType": "Morning",
  "durationHours": 3
}

Response:
{
  "venueId": 1,
  "venueName": "Hall A",
  "sessionType": "Morning",
  "bookingDate": "2026-06-20",
  "amount": 50000,
  "refundableDeposit": 12000,
  "cgstPercent": 9,
  "sgstPercent": 9,
  "cgstAmount": 4500,
  "sgstAmount": 4500,
  "totalWithGST": 59000
}
```

---

## PHASE 6: Booking Modification System

### 6.1 Problem Statement
Users should be able to modify bookings with constraints:
- Only up to 3 days before event date
- Can change: Venue, Session
- Cannot change: Customer details, Event date (unless with approval)
- Must check availability of new venue/session
- Calculate price difference and handle refunds

### 6.2 Database Design

#### Table: BookingModificationHistory
Track all modifications for audit trail and payment reconciliation.

```sql
CREATE TABLE dbo.BookingModificationHistory (
    ModificationId INT PRIMARY KEY IDENTITY(1,1),
    BookingId INT NOT NULL,
    OldVenueId INT,
    NewVenueId INT,
    OldSessionType NVARCHAR(50),
    NewSessionType NVARCHAR(50),
    OldBookingDate DATE,
    NewBookingDate DATE,
    OldAmount DECIMAL(12,2),
    NewAmount DECIMAL(12,2),
    DifferenceAmount DECIMAL(12,2),                -- Positive = additional payment, Negative = refund
    ModificationReason NVARCHAR(MAX),
    PaymentStatus NVARCHAR(30) DEFAULT 'Pending',  -- Pending, Completed, Refunded, Cancelled
    PaymentMethod NVARCHAR(50),                     -- Online, Cash, Adjustment
    TransactionReference NVARCHAR(100),
    ModifiedBy INT,                                 -- UserId
    ModifiedDate DATETIME2 DEFAULT SYSUTCDATETIME(),
    
    CONSTRAINT FK_BookingModHistory_Booking 
        FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId) ON DELETE CASCADE,
    
    CONSTRAINT FK_BookingModHistory_OldVenue 
        FOREIGN KEY (OldVenueId) REFERENCES dbo.VenueMaster(VenueId),
    
    CONSTRAINT FK_BookingModHistory_NewVenue 
        FOREIGN KEY (NewVenueId) REFERENCES dbo.VenueMaster(VenueId)
);
```

### 6.3 Business Rules

#### Rule 6.3.1: Modification Window
```
Can Modify IF: Today <= (Event Date - 3 days)

Example:
- Event Date: 20-Jun-2026
- Modification Allowed Until: 17-Jun-2026
- On 18-Jun or later: Cannot modify
```

#### Rule 6.3.2: Allowed Modifications
- ✓ Venue/Hall (if available and not in conflict)
- ✓ Session Type (if applicable)
- ✗ Event Date (restricted)
- ✗ Customer Details (name, email, phone)
- ✗ Booking Type (business, personal, etc.)

#### Rule 6.3.3: Availability Check
Before allowing modification:
```
1. Check if New Venue + New Date + New Session is available
2. Use existing BookingConflict logic
3. If available: Allow modification
4. If not available: Return 409 Conflict with alternative options
```

#### Rule 6.3.4: Price Reconciliation
```
If Old Amount < New Amount:
  Additional Payment Required = New Amount - Old Amount
  Status: "Payment Pending"
  
If Old Amount > New Amount:
  Refund = Old Amount - New Amount
  Status: "Refund Pending"
  
If Old Amount == New Amount:
  No Payment Needed
  Status: "Completed"
```

### 6.4 Implementation Components

#### 6.4.1 .NET Service Layer

**Interface: IBookingModificationService**
```csharp
public interface IBookingModificationService
{
    Task<ModificationEligibilityDto> CheckModificationEligibilityAsync(int bookingId);
    Task<AvailabilityCheckDto> CheckAvailabilityAsync(int venueId, DateTime bookingDate, 
        string sessionType, int? excludeBookingId = null);
    Task<ModificationPreviewDto> PreviewModificationAsync(int bookingId, int newVenueId, 
        string newSessionType);
    Task<ModificationConfirmationDto> ConfirmModificationAsync(int bookingId, 
        ModificationRequestDto request, int modifiedBy);
    Task<ModificationHistoryDto> GetModificationHistoryAsync(int bookingId);
}
```

**Implementation Details**
```csharp
public class BookingModificationService : IBookingModificationService
{
    private const int MODIFICATION_WINDOW_DAYS = 3;
    
    public async Task<ModificationEligibilityDto> CheckModificationEligibilityAsync(int bookingId)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingId == bookingId);
        
        if (booking == null)
            throw new NotFoundException("Booking not found");
            
        var eventDate = booking.BookingDate;
        var modificationDeadline = eventDate.AddDays(-MODIFICATION_WINDOW_DAYS);
        var isEligible = DateTime.UtcNow.Date <= modificationDeadline;
        
        return new ModificationEligibilityDto
        {
            IsEligible = isEligible,
            EventDate = eventDate,
            ModificationDeadline = modificationDeadline,
            DaysRemaining = isEligible ? (modificationDeadline - DateTime.UtcNow.Date).Days : 0,
            Message = isEligible 
                ? $"Can modify until {modificationDeadline:yyyy-MM-dd}"
                : "Modification window closed (3 days before event)"
        };
    }
    
    public async Task<AvailabilityCheckDto> CheckAvailabilityAsync(int venueId, DateTime bookingDate, 
        string sessionType, int? excludeBookingId = null)
    {
        // Reuse existing conflict detection logic
        var conflicts = await _bookingService.GetConflictingBookingsAsync(
            venueId, bookingDate, sessionType, excludeBookingId);
            
        return new AvailabilityCheckDto
        {
            IsAvailable = conflicts.Count == 0,
            ConflictingBookings = conflicts.Select(b => new { b.BookingId, b.CustomerName }).ToList()
        };
    }
    
    public async Task<ModificationPreviewDto> PreviewModificationAsync(int bookingId, 
        int newVenueId, string newSessionType)
    {
        var booking = await _context.Bookings
            .Include(b => b.Venue)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);
            
        var eligibility = await CheckModificationEligibilityAsync(bookingId);
        if (!eligibility.IsEligible)
            throw new InvalidOperationException("Booking modification window closed");
            
        var newRate = await _rateCalculationService.GetApplicableRateAsync(
            newVenueId, booking.BookingDate, newSessionType);
            
        var availability = await CheckAvailabilityAsync(
            newVenueId, booking.BookingDate, newSessionType, bookingId);
            
        return new ModificationPreviewDto
        {
            BookingId = bookingId,
            CurrentVenue = new { booking.Venue.VenueId, booking.Venue.VenueName },
            CurrentSession = booking.SessionType,
            CurrentAmount = booking.Amount,
            ProposedVenue = new { VenueId = newVenueId },
            ProposedSession = newSessionType,
            ProposedAmount = newRate.Amount,
            DifferenceAmount = newRate.Amount - booking.Amount,
            IsAvailable = availability.IsAvailable,
            Message = availability.IsAvailable 
                ? "Available for booking"
                : $"Not available. Conflicts: {availability.ConflictingBookings.Count}"
        };
    }
    
    public async Task<ModificationConfirmationDto> ConfirmModificationAsync(int bookingId, 
        ModificationRequestDto request, int modifiedBy)
    {
        var preview = await PreviewModificationAsync(bookingId, request.NewVenueId, 
            request.NewSessionType);
            
        if (!preview.IsAvailable)
            throw new InvalidOperationException("Selected venue/session not available");
            
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingId == bookingId);
        
        // Create modification history record
        var modification = new BookingModificationHistory
        {
            BookingId = bookingId,
            OldVenueId = booking.VenueId,
            NewVenueId = request.NewVenueId,
            OldSessionType = booking.SessionType,
            NewSessionType = request.NewSessionType,
            OldBookingDate = booking.BookingDate,
            NewBookingDate = booking.BookingDate,
            OldAmount = booking.Amount,
            NewAmount = preview.ProposedAmount,
            DifferenceAmount = preview.DifferenceAmount,
            ModificationReason = request.Reason,
            PaymentStatus = preview.DifferenceAmount > 0 ? "Pending" : 
                           preview.DifferenceAmount < 0 ? "RefundPending" : "Completed",
            ModifiedBy = modifiedBy
        };
        
        _context.BookingModificationHistories.Add(modification);
        
        // Update booking
        booking.VenueId = request.NewVenueId;
        booking.SessionType = request.NewSessionType;
        booking.Amount = preview.ProposedAmount;
        booking.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return new ModificationConfirmationDto
        {
            ModificationId = modification.ModificationId,
            BookingId = bookingId,
            OldAmount = booking.Amount,
            NewAmount = preview.ProposedAmount,
            DifferenceAmount = preview.DifferenceAmount,
            PaymentStatus = modification.PaymentStatus,
            NextAction = preview.DifferenceAmount > 0 
                ? "Please pay additional amount"
                : preview.DifferenceAmount < 0 
                ? "Refund will be processed"
                : "Modification completed successfully"
        };
    }
}
```

#### 6.4.2 DTO Objects

```csharp
public class ModificationEligibilityDto
{
    public bool IsEligible { get; set; }
    public DateTime EventDate { get; set; }
    public DateTime ModificationDeadline { get; set; }
    public int DaysRemaining { get; set; }
    public string Message { get; set; }
}

public class AvailabilityCheckDto
{
    public bool IsAvailable { get; set; }
    public List<object> ConflictingBookings { get; set; }
}

public class ModificationPreviewDto
{
    public int BookingId { get; set; }
    public object CurrentVenue { get; set; }
    public string CurrentSession { get; set; }
    public decimal CurrentAmount { get; set; }
    public object ProposedVenue { get; set; }
    public string ProposedSession { get; set; }
    public decimal ProposedAmount { get; set; }
    public decimal DifferenceAmount { get; set; }
    public bool IsAvailable { get; set; }
    public string Message { get; set; }
}

public class ModificationRequestDto
{
    public int NewVenueId { get; set; }
    public string NewSessionType { get; set; }
    public string Reason { get; set; }
}

public class ModificationConfirmationDto
{
    public int ModificationId { get; set; }
    public int BookingId { get; set; }
    public decimal OldAmount { get; set; }
    public decimal NewAmount { get; set; }
    public decimal DifferenceAmount { get; set; }
    public string PaymentStatus { get; set; }
    public string NextAction { get; set; }
}

public class ModificationHistoryDto
{
    public int ModificationId { get; set; }
    public DateTime ModifiedDate { get; set; }
    public string OldVenue { get; set; }
    public string NewVenue { get; set; }
    public string OldSession { get; set; }
    public string NewSession { get; set; }
    public decimal OldAmount { get; set; }
    public decimal NewAmount { get; set; }
    public decimal DifferenceAmount { get; set; }
    public string PaymentStatus { get; set; }
}
```

#### 6.4.3 API Endpoints

**GET /api/bookings/{id}/modification-eligibility**
Check if booking can be modified.

```
Response:
{
  "isEligible": true,
  "eventDate": "2026-06-20",
  "modificationDeadline": "2026-06-17",
  "daysRemaining": 2,
  "message": "Can modify until 2026-06-17"
}
```

**GET /api/bookings/{id}/check-availability**
Check availability for new venue/session.

```
Query Parameters:
  venueId (int)
  sessionType (string)

Response:
{
  "isAvailable": true,
  "conflictingBookings": []
}
```

**POST /api/bookings/{id}/preview-modification**
Preview modification without committing.

```
Request Body:
{
  "newVenueId": 2,
  "newSessionType": "Evening"
}

Response: ModificationPreviewDto
```

**POST /api/bookings/{id}/modify**
Confirm and apply modification.

```
Request Body:
{
  "newVenueId": 2,
  "newSessionType": "Evening",
  "reason": "Prefer evening session"
}

Response: ModificationConfirmationDto
```

**GET /api/bookings/{id}/modification-history**
Get all modifications for a booking.

```
Response: List<ModificationHistoryDto>
```

**POST /api/bookings/{modificationId}/pay-difference**
Pay additional amount or receive refund.

```
Request Body:
{
  "paymentMethod": "Online",
  "transactionReference": "TXN123456"
}

Response:
{
  "paymentStatus": "Completed",
  "amount": 30000,
  "message": "Payment received successfully"
}
```

#### 6.4.4 Frontend Components

**MyBookings Page**
- List all user bookings with statuses
- Show "Modify" button if within 3-day window
- Display modification history

**ModifyBooking Dialog**
- Show current booking details (read-only: date, customer)
- Venue dropdown with availability indicator
- Session type selection with availability check
- Price comparison table
- Confirm/Cancel buttons

**Payment Dialog**
- Show if additional payment required
- Display payment methods
- Submit payment with transaction reference

---

## Implementation Sequence

### Phase 5 (Rates):
1. Create VenueRateMaster and SessionTypes tables
2. Seed sample rate data for all venues
3. Implement RateCalculationService
4. Create Rate API endpoints
5. Update booking flow to use rates (remove hardcoded values)
6. Create rate management UI (admin)

### Phase 6 (Modifications):
1. Create BookingModificationHistory table
2. Implement BookingModificationService
3. Create modification API endpoints
4. Update Booking model with modification fields
5. Create MyBookings page
6. Create ModifyBooking dialog
7. Create payment processing logic
8. Integrate with existing booking system

---

## Testing Strategy

### Unit Tests
- Rate calculation (edge cases: exact boundary dates, missing rates)
- Modification eligibility (days before event)
- Availability checking (conflicts, edge cases)
- Price difference calculation (positive, negative, zero)

### Integration Tests
- Complete booking creation with rate lookup
- Full modification flow (preview → confirmation → payment)
- Conflict scenarios (overlapping bookings)

### E2E Tests
- User modifies booking within 3-day window
- Price increase path (additional payment)
- Price decrease path (refund)
- Out-of-window modification (blocked)
- Availability conflict (alternative suggestions)

---

## Deployment Checklist

- [ ] Database migrations created and tested
- [ ] Service layer implemented and unit tested
- [ ] API endpoints implemented and documented
- [ ] React components created and styled
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Error handling comprehensive
- [ ] Logging in place
- [ ] Documentation updated
- [ ] User guide created
- [ ] Admin rate management tool created
- [ ] Performance validated (rate lookup query indexed)

---

## Summary

This comprehensive plan provides:
- **PHASE 5**: Database-driven dynamic pricing with flexible rate configuration
- **PHASE 6**: Booking modification with business rules, availability checks, and payment reconciliation

Both phases are designed to work seamlessly with existing booking infrastructure while adding powerful new capabilities for venue management and customer flexibility.
