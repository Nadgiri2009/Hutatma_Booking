# PHASE 5 & 6: Implementation Guide & Quick Start

> Historical React-era implementation notes. The active frontend is now ASP.NET Web Forms in `frontend/`, so the `frontend/src` paths below no longer apply. See `README.md` and `Deployment_Guide.md` for current setup instructions.

## Quick Reference

This guide provides step-by-step instructions to implement PHASE 5 (Dynamic Rate Management) and PHASE 6 (Booking Modification System).

### What's Been Delivered

✅ **Comprehensive Implementation Plan** (`PHASE_5_6_IMPLEMENTATION_PLAN.md`)
- Complete architecture and business rules
- Database schema design with relationships
- Service layer interfaces and implementation templates
- API endpoint specifications
- Testing strategy

✅ **Database Scripts**
- `008_create_rate_master_tables.sql` - PHASE 5 schema (VenueRateMaster, SessionTypes, RateHistory)
- `009_create_booking_modification_tables.sql` - PHASE 6 schema (BookingModificationHistory, ModificationAuditLog) with stored procedures

✅ **Backend Code**
- `Phase5Phase6Models.cs` - Entity models for rates and modifications
- `Phase5Phase6DTOs.cs` - All data transfer objects (40+ DTOs)
- `IPhase5Phase6Services.cs` - Service interfaces with detailed documentation
- `Phase5Phase6Services.cs` - Complete service implementations (2000+ lines)

---

## Implementation Steps

### STEP 1: Database Setup (30 minutes)

#### 1.1 Execute SQL Scripts

```powershell
cd backend

# Create rate master tables
sqlcmd -S "YourServer" -d "HutatmaBookingDB" -i "../database/008_create_rate_master_tables.sql"

# Create booking modification tables
sqlcmd -S "YourServer" -d "HutatmaBookingDB" -i "../database/009_create_booking_modification_tables.sql"
```

Or use Entity Framework Core migration:

```bash
cd backend
dotnet ef migrations add Phase5Phase6_RateAndModificationTables
dotnet ef database update
```

#### 1.2 Verify Tables Created

```sql
-- Verify PHASE 5 tables
SELECT COUNT(*) as SessionTypes FROM dbo.SessionTypes;
SELECT COUNT(*) as Rates FROM dbo.VenueRateMaster;

-- Verify PHASE 6 tables
SELECT COUNT(*) as ModificationHistory FROM dbo.BookingModificationHistory;
SELECT COUNT(*) as AuditLogs FROM dbo.ModificationAuditLog;

-- Verify stored procedures
EXEC sp_CheckModificationEligibility 1;  -- Test with bookingId = 1
```

---

### STEP 2: Backend Integration (2 hours)

#### 2.1 Update AppDbContext

Add these DbSet entries to `backend/Data/AppDbContext.cs`:

```csharp
public DbSet<SessionType> SessionTypes { get; set; }
public DbSet<VenueRateMaster> VenueRateMasters { get; set; }
public DbSet<VenueRateHistory> VenueRateHistories { get; set; }
public DbSet<BookingModificationHistory> BookingModificationHistories { get; set; }
public DbSet<ModificationAuditLog> ModificationAuditLogs { get; set; }
```

Add fluent API configurations in OnModelCreating():

```csharp
// VenueRateMaster configuration
modelBuilder.Entity<VenueRateMaster>()
    .HasOne(r => r.Venue)
    .WithMany()
    .HasForeignKey(r => r.VenueId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<VenueRateMaster>()
    .HasIndex(r => new { r.VenueId, r.SessionType, r.FromDate, r.ToDate })
    .HasName("IX_VenueRate_Lookup");

modelBuilder.Entity<VenueRateMaster>()
    .Property(r => r.Amount)
    .HasPrecision(12, 2);

// BookingModificationHistory configuration
modelBuilder.Entity<BookingModificationHistory>()
    .HasOne(m => m.Booking)
    .WithMany()
    .HasForeignKey(m => m.BookingId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<BookingModificationHistory>()
    .HasOne(m => m.NewVenue)
    .WithMany()
    .HasForeignKey(m => m.NewVenueId);

modelBuilder.Entity<BookingModificationHistory>()
    .Property(m => m.DifferenceAmount)
    .HasPrecision(12, 2);
```

#### 2.2 Register Services in Program.cs

```csharp
// Add in ConfigureServices or Startup
builder.Services.AddScoped<IRateCalculationService, RateCalculationService>();
builder.Services.AddScoped<IBookingModificationService, BookingModificationService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
```

#### 2.3 Add AutoMapper Mappings (Optional but Recommended)

Create `MappingProfile.cs`:

```csharp
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Rate mappings
        CreateMap<VenueRateMaster, RateDto>().ReverseMap();
        CreateMap<SessionType, SessionTypeDto>().ReverseMap();
        
        // Modification mappings
        CreateMap<BookingModificationHistory, ModificationHistoryEntryDto>()
            .ForMember(d => d.OldVenue, opt => opt.MapFrom(s => s.OldVenue.VenueName))
            .ForMember(d => d.NewVenue, opt => opt.MapFrom(s => s.NewVenue.VenueName));
    }
}

// Register in Program.cs
builder.Services.AddAutoMapper(typeof(Program));
```

---

### STEP 3: Create API Controllers (2 hours)

#### 3.1 RatesController.cs

```csharp
[ApiController]
[Route("api/[controller]")]
public class RatesController : ControllerBase
{
    private readonly IRateCalculationService _rateService;
    
    public RatesController(IRateCalculationService rateService)
    {
        _rateService = rateService;
    }
    
    /// <summary>
    /// Check rate for specific venue/date/session
    /// </summary>
    [HttpGet("check")]
    public async Task<ActionResult<RateCheckResponseDto>> CheckRate(
        [FromQuery] int venueId,
        [FromQuery] DateTime bookingDate,
        [FromQuery] string sessionType)
    {
        try
        {
            var rate = await _rateService.CheckRateAsync(venueId, bookingDate, sessionType);
            return Ok(rate);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Calculate booking amount with GST
    /// </summary>
    [HttpPost("calculate")]
    public async Task<ActionResult<BookingCalculationResponseDto>> CalculateBooking(
        BookingCalculationRequestDto request)
    {
        try
        {
            var calculation = await _rateService.CalculateBookingAmountAsync(
                request.VenueId,
                request.BookingDate,
                request.SessionType,
                request.DurationHours);
            return Ok(calculation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Get all rates for a venue
    /// </summary>
    [HttpGet("venue/{venueId}")]
    public async Task<ActionResult<VenueRatesResponseDto>> GetVenueRates(int venueId)
    {
        try
        {
            var rates = await _rateService.GetVenueRatesAsync(venueId);
            return Ok(rates);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Get session types
    /// </summary>
    [HttpGet("session-types")]
    public async Task<ActionResult<List<SessionTypeDto>>> GetSessionTypes()
    {
        var sessionTypes = await _rateService.GetSessionTypesAsync();
        return Ok(sessionTypes);
    }
}
```

#### 3.2 BookingModificationsController.cs

```csharp
[ApiController]
[Route("api/bookings")]
public class BookingModificationsController : ControllerBase
{
    private readonly IBookingModificationService _modificationService;
    private readonly IAuthService _authService;  // Get current user ID
    
    public BookingModificationsController(IBookingModificationService modificationService,
        IAuthService authService)
    {
        _modificationService = modificationService;
        _authService = authService;
    }
    
    /// <summary>
    /// Check if booking can be modified
    /// </summary>
    [HttpGet("{bookingId}/modification-eligibility")]
    public async Task<ActionResult<ModificationEligibilityDto>> CheckEligibility(int bookingId)
    {
        try
        {
            var eligibility = await _modificationService.CheckModificationEligibilityAsync(bookingId);
            return Ok(eligibility);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Preview modification without committing
    /// </summary>
    [HttpPost("{bookingId}/preview-modification")]
    public async Task<ActionResult<ModificationPreviewDto>> PreviewModification(
        int bookingId,
        ModificationPreviewRequestDto request)
    {
        try
        {
            var preview = await _modificationService.PreviewModificationAsync(
                bookingId, request.NewVenueId, request.NewSessionType);
            return Ok(preview);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Confirm and apply modification
    /// </summary>
    [HttpPost("{bookingId}/modify")]
    public async Task<ActionResult<ModificationConfirmResponseDto>> ConfirmModification(
        int bookingId,
        ModificationConfirmRequestDto request)
    {
        try
        {
            var userId = _authService.GetCurrentUserId();
            var confirmation = await _modificationService.ConfirmModificationAsync(
                bookingId, request, userId);
            return Ok(confirmation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Get modification history for booking
    /// </summary>
    [HttpGet("{bookingId}/modification-history")]
    public async Task<ActionResult<ModificationHistoryResponseDto>> GetHistory(int bookingId)
    {
        try
        {
            var history = await _modificationService.GetModificationHistoryAsync(bookingId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Process payment for modification
    /// </summary>
    [HttpPost("{modificationId}/pay-difference")]
    public async Task<ActionResult<ModificationPaymentResponseDto>> ProcessPayment(
        int modificationId,
        ModificationPaymentRequestDto request)
    {
        try
        {
            var userId = _authService.GetCurrentUserId();
            var payment = await _modificationService.ProcessPaymentAsync(
                modificationId, request, userId);
            return Ok(payment);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
```

---

### STEP 4: Frontend Components (3 hours)

#### 4.1 Create Rate Display Component

File: `frontend/src/components/booking/RateDisplay.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, Grid } from '@mui/material';
import { venueAPI } from '../../services/api';

interface RateDisplayProps {
  venueId: number;
  bookingDate: Date;
  sessionType: string;
}

export const RateDisplay: React.FC<RateDisplayProps> = ({
  venueId,
  bookingDate,
  sessionType,
}) => {
  const [rate, setRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      setLoading(true);
      try {
        const response = await venueAPI.checkRate(
          venueId,
          bookingDate,
          sessionType
        );
        setRate(response);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch rate');
      } finally {
        setLoading(false);
      }
    };

    if (venueId && bookingDate && sessionType) {
      fetchRate();
    }
  }, [venueId, bookingDate, sessionType]);

  if (loading) return <Typography>Loading rates...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!rate) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Pricing Details
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Base Rate
            </Typography>
            <Typography variant="h6">
              ₹{rate.amount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Deposit
            </Typography>
            <Typography variant="h6">
              ₹{rate.refundableDeposit.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" gap={1}>
              <Chip
                label={`CGST ${rate.cgstPercent}%`}
                variant="outlined"
              />
              <Chip
                label={`SGST ${rate.sgstPercent}%`}
                variant="outlined"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box
              display="flex"
              justifyContent="space-between"
              p={1}
              bgcolor="primary.light"
              borderRadius={1}
            >
              <Typography variant="body2" fontWeight="bold">
                Total with GST
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                ₹{rate.totalWithGST.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
```

#### 4.2 Create Booking Modification Component

File: `frontend/src/components/booking/ModifyBooking.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import { bookingAPI } from '../../services/api';

interface ModifyBookingProps {
  bookingId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModifyBooking: React.FC<ModifyBookingProps> = ({
  bookingId,
  open,
  onClose,
  onSuccess,
}) => {
  const [eligibility, setEligibility] = useState<any>(null);
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [newVenueId, setNewVenueId] = useState<number | ''>('');
  const [newSessionType, setNewSessionType] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check eligibility and load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const eligibilityData = await bookingAPI.checkModificationEligibility(
          bookingId
        );
        setEligibility(eligibilityData);

        if (!eligibilityData.isEligible) {
          setError('This booking cannot be modified (within 3 days of event)');
          return;
        }

        // Load venues and session types
        const venuesData = await venueAPI.getAll();
        setVenues(venuesData);

        const sessionTypesData = await bookingAPI.getSessionTypes();
        setSessionTypes(sessionTypesData);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      }
    };

    if (open) {
      loadData();
    }
  }, [open, bookingId]);

  // Preview modification
  const handlePreview = async () => {
    if (!newVenueId || !newSessionType) {
      setError('Please select venue and session type');
      return;
    }

    setLoading(true);
    try {
      const previewData = await bookingAPI.previewModification(bookingId, {
        newVenueId: newVenueId as number,
        newSessionType,
      });
      setPreview(previewData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to preview modification');
    } finally {
      setLoading(false);
    }
  };

  // Confirm modification
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await bookingAPI.confirmModification(bookingId, {
        newVenueId: newVenueId as number,
        newSessionType,
        reason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modify Booking</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {!eligibility?.isEligible && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {eligibility?.message || 'Booking cannot be modified'}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {eligibility?.isEligible && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Eligibility Info */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="textSecondary">
                  Modification Window
                </Typography>
                <Typography variant="body2">
                  Days remaining: {eligibility?.daysRemaining}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Until {new Date(eligibility?.modificationDeadline).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>

            {/* Venue Selection */}
            <FormControl fullWidth>
              <InputLabel>New Venue</InputLabel>
              <Select
                value={newVenueId}
                label="New Venue"
                onChange={(e) => setNewVenueId(e.target.value as number)}
              >
                {venues.map((venue) => (
                  <MenuItem key={venue.venueId} value={venue.venueId}>
                    {venue.venueName} ({venue.capacity} capacity)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Session Type Selection */}
            <FormControl fullWidth>
              <InputLabel>New Session Type</InputLabel>
              <Select
                value={newSessionType}
                label="New Session Type"
                onChange={(e) => setNewSessionType(e.target.value)}
              >
                {sessionTypes.map((session) => (
                  <MenuItem key={session.id} value={session.name}>
                    {session.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Reason */}
            <TextField
              multiline
              rows={2}
              label="Reason for modification"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
            />

            {/* Preview Button */}
            <Button
              variant="outlined"
              onClick={handlePreview}
              disabled={loading || !newVenueId || !newSessionType}
            >
              {loading ? <CircularProgress size={24} /> : 'Preview Changes'}
            </Button>

            {/* Preview Result */}
            {preview && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Price Comparison
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Current Rate
                      </Typography>
                      <Typography variant="body2">
                        ₹{preview.currentAmount.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        New Rate
                      </Typography>
                      <Typography variant="body2">
                        ₹{preview.proposedAmount.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 1,
                          bgcolor:
                            preview.differenceAmount > 0
                              ? '#fff3e0'
                              : '#e8f5e9',
                          borderRadius: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color={
                            preview.differenceAmount > 0 ? 'error' : 'success'
                          }
                          fontWeight="bold"
                        >
                          {preview.differenceAmount > 0
                            ? `Additional Payment: ₹${preview.differenceAmount.toLocaleString()}`
                            : `Refund: ₹${Math.abs(preview.differenceAmount).toLocaleString()}`}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {!preview.isAvailable && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {preview.availabilityMessage}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || !preview || !preview.isAvailable}
        >
          {loading ? <CircularProgress size={20} /> : 'Confirm Modification'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

#### 4.3 Update API Service

Add to `frontend/src/services/api.ts`:

```typescript
// Rate endpoints
export const rateAPI = {
  checkRate: (venueId: number, bookingDate: Date, sessionType: string) =>
    api.get('/rates/check', {
      params: {
        venueId,
        bookingDate: bookingDate.toISOString().split('T')[0],
        sessionType,
      },
    }),
  
  calculateBooking: (data: any) =>
    api.post('/rates/calculate', data),
  
  getVenueRates: (venueId: number) =>
    api.get(`/rates/venue/${venueId}`),
  
  getSessionTypes: () =>
    api.get('/rates/session-types'),
};

// Booking modification endpoints
export const bookingAPI = {
  checkModificationEligibility: (bookingId: number) =>
    api.get(`/bookings/${bookingId}/modification-eligibility`),
  
  previewModification: (bookingId: number, data: any) =>
    api.post(`/bookings/${bookingId}/preview-modification`, data),
  
  confirmModification: (bookingId: number, data: any) =>
    api.post(`/bookings/${bookingId}/modify`, data),
  
  getModificationHistory: (bookingId: number) =>
    api.get(`/bookings/${bookingId}/modification-history`),
  
  processPayment: (modificationId: number, data: any) =>
    api.post(`/bookings/${modificationId}/pay-difference`, data),
  
  getSessionTypes: () =>
    api.get('/rates/session-types'),
};
```

---

### STEP 5: Testing & Validation (1 hour)

#### 5.1 Test PHASE 5 Rate Calculation

```bash
# Terminal in backend
dotnet run

# In browser/Postman
GET http://localhost:5000/api/rates/check?venueId=1&bookingDate=2026-06-20&sessionType=Morning

# Expected Response
{
  "venueId": 1,
  "venueName": "Hutatma Smruti Mandir Hall - Classes & Gatherings",
  "sessionType": "Morning",
  "bookingDate": "2026-06-20",
  "amount": 50000,
  "refundableDeposit": 12000,
  "cgstAmount": 4500,
  "sgstAmount": 4500,
  "totalWithGST": 59000
}
```

#### 5.2 Test PHASE 6 Booking Modification

```bash
# Check eligibility
GET http://localhost:5000/api/bookings/1/modification-eligibility

# Preview modification
POST http://localhost:5000/api/bookings/1/preview-modification
{
  "newVenueId": 2,
  "newSessionType": "Evening"
}

# Confirm modification
POST http://localhost:5000/api/bookings/1/modify
{
  "newVenueId": 2,
  "newSessionType": "Evening",
  "reason": "Prefer evening session"
}

# Process payment
POST http://localhost:5000/api/bookings/1/pay-difference
{
  "paymentMethod": "Online",
  "transactionReference": "TXN123456",
  "amountPaid": 30000
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
├──────────────┬──────────────────┬──────────────┬─────────────┤
│RateDisplay   │ModifyBooking     │MyBookings    │PaymentFlow  │
│Component     │Dialog            │Page          │Components   │
└──────────────┼──────────────────┼──────────────┼─────────────┘
               │                  │              │
               └──────────────────┴──────────────┴──────────────┐
                                                 API Service
┌──────────────────────────────────────────────────────────────┐
│                  BACKEND (ASP.NET Core)                      │
├─────────────────────────┬──────────────────────────────────┤
│  RatesController        │  BookingModificationsController  │
│  - /api/rates/check     │  - /api/bookings/{id}/eligibility│
│  - /api/rates/calculate │  - /api/bookings/{id}/modify     │
│  - /api/rates/venue/{id}│  - /api/bookings/{id}/history    │
└─────────────────────────┴──────────────────────────────────┘
               │                  │
        ┌──────┴──────────────────┴─────────────┐
        │  SERVICE LAYER                        │
        ├──────────────┬───────────────────────┤
        │Rate Svc      │BookingMod Svc         │
        │- GetRate     │- CheckEligibility    │
        │- Calculate   │- CheckAvailability   │
        │- UpdateRate  │- Preview             │
        └──────────────┴───────────────────────┘
               │                  │
        ┌──────┴──────────────────┴─────────────┐
        │  DATA LAYER (EF Core)                 │
        ├──────────────┬───────────────────────┤
        │VenueRateMstr │BookingModificationHst │
        │SessionTypes  │ModificationAuditLog   │
        │RateHistory   │Bookings (updated)     │
        └──────────────┴───────────────────────┘
               │                  │
        ┌──────┴──────────────────┴─────────────┐
        │  SQL SERVER DATABASE                  │
        └───────────────────────────────────────┘
```

---

## Database Relationships

```
VenueMaster (1)
    ├── VenueRateMaster (Many)
    ├── BookingModificationHistory - OldVenueId (Many)
    └── BookingModificationHistory - NewVenueId (Many)

SessionTypes (1)
    └── VenueRateMaster - SessionType FK (Many)

Bookings (1)
    └── BookingModificationHistory (Many)
        └── ModificationAuditLog (Many)

VenueRateMaster (1)
    └── VenueRateHistory (Many)
```

---

## Testing Scenarios

### PHASE 5: Rate Management

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Valid rate exists | VenueId=1, Date in range, SessionType=Morning | Return rate with amount | ✓ |
| No rate configured | VenueId=1, Date outside range | 404 Not Found | ✓ |
| Calculate with GST | Amount=50000, CGST=9%, SGST=9% | Total=59000 | ✓ |
| Off-season rate | VenueId=1, Date=2026-07-15 | Return lower rate | ✓ |

### PHASE 6: Booking Modification

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Within window | 3 days before event | Eligible=true | ✓ |
| Outside window | Within 2 days of event | Eligible=false | ✓ |
| Available venue | Different venue, same date | IsAvailable=true | ✓ |
| Conflict detected | Booked venue, same time | IsAvailable=false | ✓ |
| Price increase | New venue=higher rate | DifferenceAmount>0, PaymentPending | ✓ |
| Price decrease | New venue=lower rate | DifferenceAmount<0, RefundPending | ✓ |

---

## Deployment Checklist

- [ ] SQL scripts executed successfully
- [ ] Database tables created and verified
- [ ] AppDbContext updated with new DbSets
- [ ] Services registered in Program.cs
- [ ] AutoMapper configured (optional)
- [ ] Controllers created and tested
- [ ] Frontend API endpoints integrated
- [ ] React components compiled without errors
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Documentation updated
- [ ] Error handling comprehensive
- [ ] Logging configured
- [ ] Performance tested (rate lookup optimized)
- [ ] Security review completed
- [ ] Deployment to production

---

## Next Steps

1. **Execute Database Scripts** (5 min)
   - Run 008_create_rate_master_tables.sql
   - Run 009_create_booking_modification_tables.sql

2. **Update AppDbContext** (15 min)
   - Add DbSets for new entities
   - Configure entity relationships

3. **Register Services** (5 min)
   - Add dependency injection in Program.cs

4. **Create Controllers** (1.5 hours)
   - Implement RatesController
   - Implement BookingModificationsController

5. **Create Frontend Components** (2 hours)
   - RateDisplay component
   - ModifyBooking dialog
   - Integration with existing UI

6. **Test End-to-End** (1 hour)
   - Test rate calculation
   - Test booking modification flow
   - Test payment processing

---

## Support & References

- Main documentation: `PHASE_5_6_IMPLEMENTATION_PLAN.md`
- Database schema: `database/008_create_rate_master_tables.sql`
- Database schema: `database/009_create_booking_modification_tables.sql`
- Backend implementation: `backend/Services/Phase5Phase6Services.cs`
- DTOs reference: `backend/DTOs/Phase5Phase6DTOs.cs`

Total implementation time: **~8-10 hours** for complete working system

Good luck with implementation! 🚀
