/*
  PHASE 5 & 6: Service Interfaces
  
  Interfaces for Rate Calculation and Booking Modification Services
*/

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HutatmaBooking.DTOs;

namespace HutatmaBooking.Services.Interfaces
{
    // ===================================
    // PHASE 5: Rate Calculation Service
    // ===================================
    
    /// <summary>
    /// Service for calculating booking rates based on venue, date, and session type
    /// </summary>
    public interface IRateCalculationService
    {
        /// <summary>
        /// Get applicable rate for a specific venue/date/session combination
        /// </summary>
        Task<RateDto> GetApplicableRateAsync(int venueId, DateTime bookingDate, string sessionType);
        
        /// <summary>
        /// Check if a rate exists for given criteria and return detailed response with GST calculation
        /// </summary>
        Task<RateCheckResponseDto> CheckRateAsync(int venueId, DateTime bookingDate, string sessionType);
        
        /// <summary>
        /// Calculate total booking amount including GST
        /// </summary>
        Task<BookingCalculationResponseDto> CalculateBookingAmountAsync(int venueId, DateTime bookingDate, 
            string sessionType, int durationHours = 3);
        
        /// <summary>
        /// Get all rates for a specific venue
        /// </summary>
        Task<VenueRatesResponseDto> GetVenueRatesAsync(int venueId);
        
        /// <summary>
        /// Get rates for a date range (admin view)
        /// </summary>
        Task<List<RateDto>> GetRatesByDateRangeAsync(DateTime fromDate, DateTime toDate);
        
        /// <summary>
        /// Get all session types
        /// </summary>
        Task<List<SessionTypeDto>> GetSessionTypesAsync();
        
        /// <summary>
        /// Create new rate (admin)
        /// </summary>
        Task<RateDto> CreateRateAsync(RateDto rateDto, string createdBy);
        
        /// <summary>
        /// Update existing rate (admin)
        /// </summary>
        Task<RateDto> UpdateRateAsync(int rateId, RateDto rateDto, string updatedBy);
        
        /// <summary>
        /// Deactivate rate
        /// </summary>
        Task<bool> DeactivateRateAsync(int rateId, string reason);
    }
    
    // ===================================
    // PHASE 6: Booking Modification Service
    // ===================================
    
    /// <summary>
    /// Service for managing booking modifications with business rule enforcement
    /// </summary>
    public interface IBookingModificationService
    {
        /// <summary>
        /// Check if a booking can be modified (within 3-day window)
        /// </summary>
        Task<ModificationEligibilityDto> CheckModificationEligibilityAsync(int bookingId);
        
        /// <summary>
        /// Check availability of a specific venue/date/session combination
        /// </summary>
        Task<AvailabilityCheckResponseDto> CheckAvailabilityAsync(int venueId, DateTime bookingDate, 
            string sessionType, int? excludeBookingId = null);
        
        /// <summary>
        /// Preview proposed modification without committing
        /// </summary>
        Task<ModificationPreviewDto> PreviewModificationAsync(int bookingId, int newVenueId, 
            string newSessionType);
        
        /// <summary>
        /// Confirm and apply modification to booking
        /// </summary>
        Task<ModificationConfirmResponseDto> ConfirmModificationAsync(int bookingId, 
            ModificationConfirmRequestDto request, int modifiedBy);
        
        /// <summary>
        /// Get modification history for a booking
        /// </summary>
        Task<ModificationHistoryResponseDto> GetModificationHistoryAsync(int bookingId);
        
        /// <summary>
        /// Get Payment Pendings for modifications
        /// </summary>
        Task<List<ModificationHistoryEntryDto>> GetPendingPaymentsAsync(int? bookingId = null);
        
        /// <summary>
        /// Process payment for modification (additional charge or refund)
        /// </summary>
        Task<ModificationPaymentResponseDto> ProcessPaymentAsync(int modificationId, 
            ModificationPaymentRequestDto request, int processedBy);
        
        /// <summary>
        /// Cancel a modification
        /// </summary>
        Task<bool> CancelModificationAsync(int modificationId, string reason, int cancelledBy);
    }
    
    /// <summary>
    /// Service for availability checking (used by modification service)
    /// </summary>
    public interface IAvailabilityService
    {
        /// <summary>
        /// Get conflicting bookings for a venue/date/session
        /// </summary>
        Task<List<ConflictingBookingDto>> GetConflictingBookingsAsync(int venueId, DateTime bookingDate, 
            string sessionType, int? excludeBookingId = null);
        
        /// <summary>
        /// Check if specific venue/date/session is available
        /// </summary>
        Task<bool> IsAvailableAsync(int venueId, DateTime bookingDate, string sessionType, 
            int? excludeBookingId = null);
    }
}
