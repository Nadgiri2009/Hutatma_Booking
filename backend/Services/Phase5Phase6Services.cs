/*
  PHASE 5 & 6: Service Implementation Guide
  
  Comprehensive implementation templates for Rate Calculation and Booking Modification Services
  
  NOTE: This is a template showing structure and patterns. Full implementation would need:
  - AutoMapper for DTO mappings
  - Dependency injection registration
  - Error handling and validation
  - Logging
  - Unit tests
*/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HutatmaBooking.Data;
using HutatmaBooking.Models;
using HutatmaBooking.DTOs;
using HutatmaBooking.Services.Interfaces;

namespace HutatmaBooking.Services
{
    // ===================================
    // PHASE 5: Rate Calculation Service
    // ===================================
    
    /// <summary>
    /// Implementation of rate calculation service for dynamic pricing
    /// </summary>
    public class RateCalculationService : IRateCalculationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RateCalculationService> _logger;
        
        public RateCalculationService(AppDbContext context, ILogger<RateCalculationService> logger)
        {
            _context = context;
            _logger = logger;
        }
        
        public async Task<RateDto> GetApplicableRateAsync(int venueId, DateTime bookingDate, string sessionType)
        {
            try
            {
                var rate = await _context.VenueRateMasters
                    .AsNoTracking()
                    .Where(r => r.VenueId == venueId 
                        && r.SessionType == sessionType
                        && r.FromDate.Date <= bookingDate.Date
                        && r.ToDate.Date >= bookingDate.Date
                        && r.IsActive)
                    .OrderBy(r => (r.ToDate.Date - r.FromDate.Date))  // Most specific (narrowest range)
                    .ThenByDescending(r => r.CreatedAt)  // Most recent
                    .FirstOrDefaultAsync();
                
                if (rate == null)
                {
                    _logger.LogWarning($"No rate found for VenueId={venueId}, SessionType={sessionType}, BookingDate={bookingDate:yyyy-MM-dd}");
                    throw new InvalidOperationException(
                        $"No active rate found for venue {venueId}, session {sessionType} on {bookingDate:yyyy-MM-dd}");
                }
                
                return MapToRateDto(rate);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving applicable rate");
                throw;
            }
        }
        
        public async Task<RateCheckResponseDto> CheckRateAsync(int venueId, DateTime bookingDate, string sessionType)
        {
            var rate = await GetApplicableRateAsync(venueId, bookingDate, sessionType);
            
            var venue = await _context.VenueMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VenueId == venueId);
            
            // Calculate GST amounts
            var cgstAmount = (rate.Amount * rate.CGSTPercent) / 100;
            var sgstAmount = (rate.Amount * rate.SGSTPercent) / 100;
            var totalWithGST = rate.Amount + cgstAmount + sgstAmount;
            
            return new RateCheckResponseDto
            {
                VenueId = venueId,
                VenueName = venue?.VenueName ?? "Unknown Venue",
                SessionType = sessionType,
                BookingDate = bookingDate,
                Amount = rate.Amount,
                RefundableDeposit = rate.RefundableDeposit,
                CGSTPercent = rate.CGSTPercent,
                SGSTPercent = rate.SGSTPercent,
                CGSTAmount = cgstAmount,
                SGSTAmount = sgstAmount,
                TotalWithGST = totalWithGST
            };
        }
        
        public async Task<BookingCalculationResponseDto> CalculateBookingAmountAsync(int venueId, DateTime bookingDate, 
            string sessionType, int durationHours = 3)
        {
            var rateCheck = await CheckRateAsync(venueId, bookingDate, sessionType);
            
            // Get session type to calculate exact amount based on duration
            var sessionTypeEntity = await _context.SessionTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionTypeName == sessionType);
            
            // If duration matters, calculate proportionally
            decimal finalAmount = rateCheck.Amount;
            if (sessionTypeEntity != null && sessionTypeEntity.DurationHours > 0)
            {
                finalAmount = rateCheck.Amount * (decimal)durationHours / sessionTypeEntity.DurationHours;
            }
            
            var cgstAmount = (finalAmount * rateCheck.CGSTPercent) / 100;
            var sgstAmount = (finalAmount * rateCheck.SGSTPercent) / 100;
            var gstAmount = cgstAmount + sgstAmount;
            var totalAmount = finalAmount + gstAmount;
            
            return new BookingCalculationResponseDto
            {
                VenueId = venueId,
                VenueName = rateCheck.VenueName,
                SessionType = sessionType,
                BookingDate = bookingDate,
                DurationHours = durationHours,
                BaseAmount = finalAmount,
                RefundableDeposit = rateCheck.RefundableDeposit,
                CGSTPercent = rateCheck.CGSTPercent,
                CGSTAmount = cgstAmount,
                SGSTPercent = rateCheck.SGSTPercent,
                SGSTAmount = sgstAmount,
                GSTAmount = gstAmount,
                TotalAmount = totalAmount,
                AmountToPay = totalAmount + rateCheck.RefundableDeposit
            };
        }
        
        public async Task<VenueRatesResponseDto> GetVenueRatesAsync(int venueId)
        {
            var venue = await _context.VenueMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VenueId == venueId);
            
            if (venue == null)
                throw new InvalidOperationException($"Venue {venueId} not found");
            
            var rates = await _context.VenueRateMasters
                .AsNoTracking()
                .Where(r => r.VenueId == venueId && r.IsActive)
                .OrderBy(r => r.SessionType)
                .ThenBy(r => r.FromDate)
                .Select(r => MapToRateDto(r))
                .ToListAsync();
            
            return new VenueRatesResponseDto
            {
                VenueId = venueId,
                VenueName = venue.VenueName,
                Rates = rates
            };
        }
        
        public async Task<List<RateDto>> GetRatesByDateRangeAsync(DateTime fromDate, DateTime toDate)
        {
            if (fromDate > toDate)
                throw new InvalidOperationException("FromDate must be less than or equal to ToDate");
            
            var rates = await _context.VenueRateMasters
                .AsNoTracking()
                .Where(r => r.FromDate.Date <= toDate.Date 
                    && r.ToDate.Date >= fromDate.Date
                    && r.IsActive)
                .OrderBy(r => r.VenueId)
                .ThenBy(r => r.SessionType)
                .ThenBy(r => r.FromDate)
                .Select(r => MapToRateDto(r))
                .ToListAsync();
            
            return rates;
        }
        
        public async Task<List<SessionTypeDto>> GetSessionTypesAsync()
        {
            return await _context.SessionTypes
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.DisplayOrder)
                .Select(s => new SessionTypeDto
                {
                    SessionTypeId = s.SessionTypeId,
                    SessionTypeName = s.SessionTypeName,
                    StartTime = s.StartTime?.ToString(@"hh\:mm"),
                    EndTime = s.EndTime?.ToString(@"hh\:mm"),
                    DurationHours = s.DurationHours,
                    DisplayOrder = s.DisplayOrder
                })
                .ToListAsync();
        }
        
        public async Task<RateDto> CreateRateAsync(RateDto rateDto, string createdBy)
        {
            // Validate venue exists
            var venue = await _context.VenueMasters.FindAsync(rateDto.VenueId);
            if (venue == null)
                throw new InvalidOperationException($"Venue {rateDto.VenueId} not found");
            
            // Check for date conflicts with existing rates
            var existingRates = await _context.VenueRateMasters
                .Where(r => r.VenueId == rateDto.VenueId 
                    && r.SessionType == rateDto.SessionType
                    && r.IsActive)
                .ToListAsync();
            
            // Validate no overlapping date ranges
            foreach (var existing in existingRates)
            {
                if (!(rateDto.ToDate < existing.FromDate || rateDto.FromDate > existing.ToDate))
                    throw new InvalidOperationException(
                        $"Rate date range overlaps with existing rate (Id: {existing.RateId})");
            }
            
            var newRate = new VenueRateMaster
            {
                VenueId = rateDto.VenueId,
                SessionType = rateDto.SessionType,
                FromDate = rateDto.FromDate,
                ToDate = rateDto.ToDate,
                Amount = rateDto.Amount,
                RefundableDeposit = rateDto.RefundableDeposit,
                CGSTPercent = rateDto.CGSTPercent,
                SGSTPercent = rateDto.SGSTPercent,
                Notes = rateDto.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = createdBy
            };
            
            _context.VenueRateMasters.Add(newRate);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Rate created: RateId={newRate.RateId}, VenueId={newRate.VenueId}");
            
            return MapToRateDto(newRate);
        }
        
        public async Task<RateDto> UpdateRateAsync(int rateId, RateDto rateDto, string updatedBy)
        {
            var existingRate = await _context.VenueRateMasters.FindAsync(rateId);
            if (existingRate == null)
                throw new InvalidOperationException($"Rate {rateId} not found");
            
            // Log change to history
            var history = new VenueRateHistory
            {
                RateId = rateId,
                VenueId = existingRate.VenueId,
                SessionType = existingRate.SessionType,
                FromDate = existingRate.FromDate,
                ToDate = existingRate.ToDate,
                OldAmount = existingRate.Amount,
                NewAmount = rateDto.Amount,
                ChangeReason = $"Update from {existingRate.Amount} to {rateDto.Amount}",
                ChangedBy = updatedBy,
                ChangedAt = DateTime.UtcNow
            };
            
            _context.VenueRateHistories.Add(history);
            
            // Update rate
            existingRate.Amount = rateDto.Amount;
            existingRate.RefundableDeposit = rateDto.RefundableDeposit;
            existingRate.CGSTPercent = rateDto.CGSTPercent;
            existingRate.SGSTPercent = rateDto.SGSTPercent;
            existingRate.Notes = rateDto.Notes;
            existingRate.UpdatedAt = DateTime.UtcNow;
            existingRate.UpdatedBy = updatedBy;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Rate updated: RateId={rateId}, NewAmount={rateDto.Amount}");
            
            return MapToRateDto(existingRate);
        }
        
        public async Task<bool> DeactivateRateAsync(int rateId, string reason)
        {
            var rate = await _context.VenueRateMasters.FindAsync(rateId);
            if (rate == null)
                throw new InvalidOperationException($"Rate {rateId} not found");
            
            rate.IsActive = false;
            rate.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Rate deactivated: RateId={rateId}, Reason={reason}");
            
            return true;
        }
        
        // Helper method to map entity to DTO
        private RateDto MapToRateDto(VenueRateMaster rate)
        {
            return new RateDto
            {
                RateId = rate.RateId,
                VenueId = rate.VenueId,
                SessionType = rate.SessionType,
                FromDate = rate.FromDate,
                ToDate = rate.ToDate,
                Amount = rate.Amount,
                RefundableDeposit = rate.RefundableDeposit,
                CGSTPercent = rate.CGSTPercent,
                SGSTPercent = rate.SGSTPercent,
                Notes = rate.Notes
            };
        }
    }
    
    // ===================================
    // PHASE 6: Booking Modification Service
    // ===================================
    
    /// <summary>
    /// Implementation of booking modification service with business rule enforcement
    /// </summary>
    public class BookingModificationService : IBookingModificationService
    {
        private const int MODIFICATION_WINDOW_DAYS = 3;
        private readonly AppDbContext _context;
        private readonly IRateCalculationService _rateCalculationService;
        private readonly IAvailabilityService _availabilityService;
        private readonly ILogger<BookingModificationService> _logger;
        
        public BookingModificationService(
            AppDbContext context,
            IRateCalculationService rateCalculationService,
            IAvailabilityService availabilityService,
            ILogger<BookingModificationService> logger)
        {
            _context = context;
            _rateCalculationService = rateCalculationService;
            _availabilityService = availabilityService;
            _logger = logger;
        }
        
        public async Task<ModificationEligibilityDto> CheckModificationEligibilityAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);
            
            if (booking == null)
                throw new InvalidOperationException($"Booking {bookingId} not found");
            
            var eventDate = booking.BookingDate;
            var modificationDeadline = eventDate.AddDays(-MODIFICATION_WINDOW_DAYS);
            var today = DateTime.UtcNow.Date;
            var isEligible = today <= modificationDeadline;
            
            return new ModificationEligibilityDto
            {
                BookingId = bookingId,
                IsEligible = isEligible,
                EventDate = eventDate,
                ModificationDeadline = modificationDeadline,
                DaysRemaining = isEligible ? (modificationDeadline - today).Days : 0,
                Message = isEligible 
                    ? $"Can modify until {modificationDeadline:yyyy-MM-dd}"
                    : "Modification window closed (3 days before event)"
            };
        }
        
        public async Task<AvailabilityCheckResponseDto> CheckAvailabilityAsync(int venueId, DateTime bookingDate, 
            string sessionType, int? excludeBookingId = null)
        {
            var conflictingBookings = await _availabilityService.GetConflictingBookingsAsync(
                venueId, bookingDate, sessionType, excludeBookingId);
            
            var isAvailable = conflictingBookings.Count == 0;
            
            return new AvailabilityCheckResponseDto
            {
                IsAvailable = isAvailable,
                ConflictCount = conflictingBookings.Count,
                ConflictingBookings = conflictingBookings,
                Message = isAvailable 
                    ? "Available for booking"
                    : $"Not available. {conflictingBookings.Count} conflicting booking(s) found"
            };
        }
        
        public async Task<ModificationPreviewDto> PreviewModificationAsync(int bookingId, int newVenueId, 
            string newSessionType)
        {
            // Check eligibility
            var eligibility = await CheckModificationEligibilityAsync(bookingId);
            if (!eligibility.IsEligible)
                throw new InvalidOperationException("Booking modification window closed");
            
            // Get booking details
            var booking = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.Venue)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);
            
            // Get new rate
            var newRate = await _rateCalculationService.GetApplicableRateAsync(
                newVenueId, booking.BookingDate, newSessionType);
            
            // Check availability
            var availability = await CheckAvailabilityAsync(
                newVenueId, booking.BookingDate, newSessionType, bookingId);
            
            // Get new venue info
            var newVenue = await _context.VenueMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VenueId == newVenueId);
            
            var differenceAmount = newRate.Amount - booking.Amount;
            
            return new ModificationPreviewDto
            {
                BookingId = bookingId,
                CurrentVenue = new VenueInfoDto
                {
                    VenueId = booking.Venue.VenueId,
                    VenueName = booking.Venue.VenueName,
                    Capacity = booking.Venue.Capacity ?? 0,
                    Location = booking.Venue.Location
                },
                CurrentSessionType = booking.SessionType,
                CurrentBookingDate = booking.BookingDate,
                CurrentAmount = booking.Amount,
                ProposedVenue = new VenueInfoDto
                {
                    VenueId = newVenue.VenueId,
                    VenueName = newVenue.VenueName,
                    Capacity = newVenue.Capacity ?? 0,
                    Location = newVenue.Location
                },
                ProposedSessionType = newSessionType,
                ProposedBookingDate = booking.BookingDate,
                ProposedAmount = newRate.Amount,
                DifferenceAmount = differenceAmount,
                PriceChangeType = differenceAmount > 0 ? "Additional" : 
                                 differenceAmount < 0 ? "Refund" : "NoChange",
                PaymentRequired = differenceAmount > 0 ? "Yes" : 
                                 differenceAmount < 0 ? "Refund" : "No",
                IsAvailable = availability.IsAvailable,
                AvailabilityMessage = availability.Message
            };
        }
        
        public async Task<ModificationConfirmResponseDto> ConfirmModificationAsync(int bookingId, 
            ModificationConfirmRequestDto request, int modifiedBy)
        {
            // Validate availability
            var preview = await PreviewModificationAsync(bookingId, request.NewVenueId, 
                request.NewSessionType);
            
            if (!preview.IsAvailable)
                throw new InvalidOperationException("Selected venue/session not available");
            
            // Get booking
            var booking = await _context.Bookings
                .Include(b => b.Venue)
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);
            
            // Create modification history
            var modification = new BookingModificationHistory
            {
                BookingId = bookingId,
                OldVenueId = booking.VenueId,
                OldSessionType = booking.SessionType,
                OldBookingDate = booking.BookingDate,
                OldAmount = booking.Amount,
                NewVenueId = request.NewVenueId,
                NewSessionType = request.NewSessionType,
                NewBookingDate = booking.BookingDate,
                NewAmount = preview.ProposedAmount,
                DifferenceAmount = preview.DifferenceAmount,
                ModificationReason = request.Reason,
                PaymentStatus = preview.DifferenceAmount > 0 ? "Pending" :
                               preview.DifferenceAmount < 0 ? "RefundPending" : "Completed",
                ModifiedBy = modifiedBy,
                ModifiedDate = DateTime.UtcNow
            };
            
            _context.BookingModificationHistories.Add(modification);
            
            // Update booking
            booking.VenueId = request.NewVenueId;
            booking.SessionType = request.NewSessionType;
            booking.Amount = preview.ProposedAmount;
            booking.UpdatedAt = DateTime.UtcNow;
            
            // Create audit log
            var auditLog = new ModificationAuditLog
            {
                ModificationId = modification.ModificationId,
                Action = "Created",
                OldStatus = "N/A",
                NewStatus = modification.PaymentStatus,
                Comments = $"Venue changed from {booking.Venue.VenueName} to {request.NewVenueId}, "
                    + $"Session: {booking.SessionType} → {request.NewSessionType}",
                ActionBy = modifiedBy,
                ActionAt = DateTime.UtcNow
            };
            
            _context.ModificationAuditLogs.Add(auditLog);
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation(
                $"Booking modified: BookingId={bookingId}, ModificationId={modification.ModificationId}, " +
                $"VenueChange={booking.VenueId}→{request.NewVenueId}, " +
                $"AmountDifference={preview.DifferenceAmount}");
            
            return new ModificationConfirmResponseDto
            {
                ModificationId = modification.ModificationId,
                BookingId = bookingId,
                OldVenue = booking.Venue.VenueName,
                NewVenue = preview.ProposedVenue.VenueName,
                OldSessionType = booking.SessionType,
                NewSessionType = request.NewSessionType,
                OldAmount = booking.Amount,
                NewAmount = preview.ProposedAmount,
                DifferenceAmount = preview.DifferenceAmount,
                PaymentStatus = modification.PaymentStatus,
                NextAction = preview.DifferenceAmount > 0 
                    ? "Please pay additional amount"
                    : preview.DifferenceAmount < 0 
                    ? "Refund will be processed"
                    : "Modification completed successfully",
                ModifiedAt = modification.ModifiedDate
            };
        }
        
        public async Task<ModificationHistoryResponseDto> GetModificationHistoryAsync(int bookingId)
        {
            var booking = await _context.Bookings
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BookingId == bookingId);
            
            if (booking == null)
                throw new InvalidOperationException($"Booking {bookingId} not found");
            
            var modifications = await _context.BookingModificationHistories
                .AsNoTracking()
                .Where(m => m.BookingId == bookingId)
                .OrderByDescending(m => m.ModifiedDate)
                .Include(m => m.OldVenue)
                .Include(m => m.NewVenue)
                .ToListAsync();
            
            var historyEntries = modifications.Select(m => new ModificationHistoryEntryDto
            {
                ModificationId = m.ModificationId,
                ModifiedDate = m.ModifiedDate,
                OldVenue = m.OldVenue?.VenueName ?? "Unknown",
                NewVenue = m.NewVenue?.VenueName ?? "Unknown",
                OldSessionType = m.OldSessionType,
                NewSessionType = m.NewSessionType,
                OldAmount = m.OldAmount,
                NewAmount = m.NewAmount,
                DifferenceAmount = m.DifferenceAmount,
                PaymentStatus = m.PaymentStatus,
                Reason = m.ModificationReason
            }).ToList();
            
            return new ModificationHistoryResponseDto
            {
                BookingId = bookingId,
                Modifications = historyEntries,
                TotalModifications = modifications.Count
            };
        }
        
        public async Task<List<ModificationHistoryEntryDto>> GetPendingPaymentsAsync(int? bookingId = null)
        {
            var query = _context.BookingModificationHistories
                .AsNoTracking()
                .Where(m => m.PaymentStatus == "Pending" || m.PaymentStatus == "RefundPending");
            
            if (bookingId.HasValue)
                query = query.Where(m => m.BookingId == bookingId.Value);
            
            var modifications = await query
                .OrderBy(m => m.ModifiedDate)
                .Include(m => m.OldVenue)
                .Include(m => m.NewVenue)
                .ToListAsync();
            
            return modifications.Select(m => new ModificationHistoryEntryDto
            {
                ModificationId = m.ModificationId,
                ModifiedDate = m.ModifiedDate,
                OldVenue = m.OldVenue?.VenueName ?? "Unknown",
                NewVenue = m.NewVenue?.VenueName ?? "Unknown",
                OldSessionType = m.OldSessionType,
                NewSessionType = m.NewSessionType,
                OldAmount = m.OldAmount,
                NewAmount = m.NewAmount,
                DifferenceAmount = m.DifferenceAmount,
                PaymentStatus = m.PaymentStatus,
                Reason = m.ModificationReason
            }).ToList();
        }
        
        public async Task<ModificationPaymentResponseDto> ProcessPaymentAsync(int modificationId, 
            ModificationPaymentRequestDto request, int processedBy)
        {
            var modification = await _context.BookingModificationHistories
                .FirstOrDefaultAsync(m => m.ModificationId == modificationId);
            
            if (modification == null)
                throw new InvalidOperationException($"Modification {modificationId} not found");
            
            if (modification.PaymentStatus == "Completed" || modification.PaymentStatus == "Refunded")
                throw new InvalidOperationException("Payment already processed");
            
            var oldStatus = modification.PaymentStatus;
            var newStatus = modification.DifferenceAmount > 0 ? "Completed" : "Refunded";
            
            modification.PaymentStatus = newStatus;
            modification.PaymentMethod = request.PaymentMethod;
            modification.TransactionReference = request.TransactionReference;
            
            // Create audit log
            var auditLog = new ModificationAuditLog
            {
                ModificationId = modificationId,
                Action = modification.DifferenceAmount > 0 ? "PaymentCompleted" : "Refunded",
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Comments = $"Payment processed: {request.TransactionReference}",
                ActionBy = processedBy,
                ActionAt = DateTime.UtcNow
            };
            
            _context.ModificationAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation(
                $"Modification payment processed: ModificationId={modificationId}, " +
                $"Status={newStatus}, Amount={modification.DifferenceAmount}");
            
            return new ModificationPaymentResponseDto
            {
                ModificationId = modificationId,
                PaymentStatus = newStatus,
                Amount = modification.DifferenceAmount,
                TransactionReference = request.TransactionReference,
                ProcessedAt = DateTime.UtcNow,
                Message = modification.DifferenceAmount > 0 
                    ? "Payment received successfully"
                    : "Refund will be processed within 3-5 business days"
            };
        }
        
        public async Task<bool> CancelModificationAsync(int modificationId, string reason, int cancelledBy)
        {
            var modification = await _context.BookingModificationHistories
                .Include(m => m.Booking)
                .FirstOrDefaultAsync(m => m.ModificationId == modificationId);
            
            if (modification == null)
                throw new InvalidOperationException($"Modification {modificationId} not found");
            
            modification.PaymentStatus = "Cancelled";
            
            // Revert booking to original state (if modification was applied)
            // This depends on business logic - typically you'd keep booking as-is
            
            // Create audit log
            var auditLog = new ModificationAuditLog
            {
                ModificationId = modificationId,
                Action = "Cancelled",
                OldStatus = modification.PaymentStatus,
                NewStatus = "Cancelled",
                Comments = reason,
                ActionBy = cancelledBy,
                ActionAt = DateTime.UtcNow
            };
            
            _context.ModificationAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"Modification cancelled: ModificationId={modificationId}, Reason={reason}");
            
            return true;
        }
    }
    
    // ===================================
    // Availability Service Implementation
    // ===================================
    
    public class AvailabilityService : IAvailabilityService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AvailabilityService> _logger;
        
        public AvailabilityService(AppDbContext context, ILogger<AvailabilityService> logger)
        {
            _context = context;
            _logger = logger;
        }
        
        public async Task<List<ConflictingBookingDto>> GetConflictingBookingsAsync(int venueId, DateTime bookingDate, 
            string sessionType, int? excludeBookingId = null)
        {
            var conflictingBookings = await _context.Bookings
                .AsNoTracking()
                .Where(b => b.VenueId == venueId
                    && b.BookingDate.Date == bookingDate.Date
                    && b.SessionType == sessionType
                    && b.Status != "Cancelled"
                    && (excludeBookingId == null || b.BookingId != excludeBookingId.Value))
                .Select(b => new ConflictingBookingDto
                {
                    BookingId = b.BookingId,
                    CustomerName = b.CustomerName,
                    BookingDate = b.BookingDate,
                    SessionType = b.SessionType
                })
                .ToListAsync();
            
            return conflictingBookings;
        }
        
        public async Task<bool> IsAvailableAsync(int venueId, DateTime bookingDate, string sessionType, 
            int? excludeBookingId = null)
        {
            var conflictingBookings = await GetConflictingBookingsAsync(
                venueId, bookingDate, sessionType, excludeBookingId);
            
            return conflictingBookings.Count == 0;
        }
    }
}
