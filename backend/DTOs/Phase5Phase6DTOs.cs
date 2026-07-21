/*
  PHASE 5 & 6: Data Transfer Objects (DTOs)
  
  DTOs for Rate Management and Booking Modification APIs
*/

using System;
using System.Collections.Generic;

namespace HutatmaBooking.DTOs
{
    // ===================================
    // PHASE 5: Rate Management DTOs
    // ===================================
    
    /// <summary>
    /// Session type information
    /// </summary>
    public class SessionTypeDto
    {
        public int SessionTypeId { get; set; }
        public string SessionTypeName { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public int DurationHours { get; set; }
        public int DisplayOrder { get; set; }
    }
    
    /// <summary>
    /// Rate information for a venue
    /// </summary>
    public class RateDto
    {
        public int RateId { get; set; }
        public int VenueId { get; set; }
        public string SessionType { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal Amount { get; set; }
        public decimal RefundableDeposit { get; set; }
        public decimal CGSTPercent { get; set; }
        public decimal SGSTPercent { get; set; }
        public string Notes { get; set; }
    }
    
    /// <summary>
    /// Request to check rate for a specific booking scenario
    /// </summary>
    public class RateCheckRequestDto
    {
        public int VenueId { get; set; }
        public DateTime BookingDate { get; set; }
        public string SessionType { get; set; }
    }
    
    /// <summary>
    /// Response with rate and calculated costs
    /// </summary>
    public class RateCheckResponseDto
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; }
        public string SessionType { get; set; }
        public DateTime BookingDate { get; set; }
        public decimal BaseAmount { get; set; }
        public decimal RefundableDeposit { get; set; }
        public decimal CGSTPercent { get; set; }
        public decimal SGSTPercent { get; set; }
        public decimal CGSTAmount { get; set; }
        public decimal SGSTAmount { get; set; }
        public decimal TotalWithGST { get; set; }
        public string DateRange { get; set; }
        public string Notes { get; set; }
    }
    
    /// <summary>
    /// Request to calculate booking amount
    /// </summary>
    public class BookingCalculationRequestDto
    {
        public int VenueId { get; set; }
        public DateTime BookingDate { get; set; }
        public string SessionType { get; set; }
        public int DurationHours { get; set; } = 3;
    }
    
    /// <summary>
    /// Response with detailed booking cost breakdown
    /// </summary>
    public class BookingCalculationResponseDto
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; }
        public string SessionType { get; set; }
        public DateTime BookingDate { get; set; }
        public int DurationHours { get; set; }
        
        // Cost breakdown
        public decimal BaseAmount { get; set; }
        public decimal RefundableDeposit { get; set; }
        public decimal CGSTPercent { get; set; }
        public decimal CGSTAmount { get; set; }
        public decimal SGSTPercent { get; set; }
        public decimal SGSTAmount { get; set; }
        
        // Totals
        public decimal GSTAmount { get; set; }  // CGST + SGST
        public decimal TotalAmount { get; set; }  // Base + GST
        public decimal AmountToPay { get; set; }  // Total (including deposit if required)
    }
    
    /// <summary>
    /// List of available rates for a venue
    /// </summary>
    public class VenueRatesResponseDto
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; }
        public List<RateDto> Rates { get; set; } = new List<RateDto>();
    }
    
    // ===================================
    // PHASE 6: Booking Modification DTOs
    // ===================================
    
    /// <summary>
    /// Check if a booking can be modified
    /// </summary>
    public class ModificationEligibilityDto
    {
        public int BookingId { get; set; }
        public bool IsEligible { get; set; }
        public DateTime EventDate { get; set; }
        public DateTime ModificationDeadline { get; set; }
        public int DaysRemaining { get; set; }
        public string Message { get; set; }
    }
    
    /// <summary>
    /// Check availability of venue/session
    /// </summary>
    public class AvailabilityCheckRequestDto
    {
        public int VenueId { get; set; }
        public DateTime BookingDate { get; set; }
        public string SessionType { get; set; }
    }
    
    /// <summary>
    /// Availability check response
    /// </summary>
    public class AvailabilityCheckResponseDto
    {
        public bool IsAvailable { get; set; }
        public int ConflictCount { get; set; }
        public List<ConflictingBookingDto> ConflictingBookings { get; set; } = new List<ConflictingBookingDto>();
        public string Message { get; set; }
    }
    
    /// <summary>
    /// Information about conflicting booking
    /// </summary>
    public class ConflictingBookingDto
    {
        public int BookingId { get; set; }
        public string CustomerName { get; set; }
        public DateTime BookingDate { get; set; }
        public string SessionType { get; set; }
    }
    
    /// <summary>
    /// Request to preview modification
    /// </summary>
    public class ModificationPreviewRequestDto
    {
        public int NewVenueId { get; set; }
        public string NewSessionType { get; set; }
    }
    
    /// <summary>
    /// Preview of proposed modification
    /// </summary>
    public class ModificationPreviewDto
    {
        public int BookingId { get; set; }
        
        // Current booking
        public VenueInfoDto CurrentVenue { get; set; }
        public string CurrentSessionType { get; set; }
        public DateTime CurrentBookingDate { get; set; }
        public decimal CurrentAmount { get; set; }
        
        // Proposed booking
        public VenueInfoDto ProposedVenue { get; set; }
        public string ProposedSessionType { get; set; }
        public DateTime ProposedBookingDate { get; set; }
        public decimal ProposedAmount { get; set; }
        
        // Price difference
        public decimal DifferenceAmount { get; set; }
        public string PriceChangeType { get; set; }  // Additional, Refund, NoChange
        public string PaymentRequired { get; set; }  // Yes, No, Refund
        
        // Availability
        public bool IsAvailable { get; set; }
        public string AvailabilityMessage { get; set; }
    }
    
    /// <summary>
    /// Venue information for modification display
    /// </summary>
    public class VenueInfoDto
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; }
        public int Capacity { get; set; }
        public string Location { get; set; }
    }
    
    /// <summary>
    /// Request to confirm modification
    /// </summary>
    public class ModificationConfirmRequestDto
    {
        public int NewVenueId { get; set; }
        public string NewSessionType { get; set; }
        public string Reason { get; set; }
    }
    
    /// <summary>
    /// Response after modification confirmed
    /// </summary>
    public class ModificationConfirmResponseDto
    {
        public int ModificationId { get; set; }
        public int BookingId { get; set; }
        
        // Change summary
        public string OldVenue { get; set; }
        public string NewVenue { get; set; }
        public string OldSessionType { get; set; }
        public string NewSessionType { get; set; }
        
        // Pricing
        public decimal OldAmount { get; set; }
        public decimal NewAmount { get; set; }
        public decimal DifferenceAmount { get; set; }
        
        // Payment status
        public string PaymentStatus { get; set; }  // Pending, Completed, RefundPending
        public string NextAction { get; set; }
        public DateTime ModifiedAt { get; set; }
    }
    
    /// <summary>
    /// Request to process payment for modification
    /// </summary>
    public class ModificationPaymentRequestDto
    {
        public string PaymentMethod { get; set; }  // Online, Cash, Adjustment
        public string TransactionReference { get; set; }
        public decimal AmountPaid { get; set; }
    }
    
    /// <summary>
    /// Response after payment processed
    /// </summary>
    public class ModificationPaymentResponseDto
    {
        public int ModificationId { get; set; }
        public string PaymentStatus { get; set; }
        public decimal Amount { get; set; }
        public string TransactionReference { get; set; }
        public DateTime ProcessedAt { get; set; }
        public string Message { get; set; }
    }
    
    /// <summary>
    /// Modification history entry
    /// </summary>
    public class ModificationHistoryEntryDto
    {
        public int ModificationId { get; set; }
        public DateTime ModifiedDate { get; set; }
        
        // Change details
        public string OldVenue { get; set; }
        public string NewVenue { get; set; }
        public string OldSessionType { get; set; }
        public string NewSessionType { get; set; }
        
        // Pricing
        public decimal OldAmount { get; set; }
        public decimal NewAmount { get; set; }
        public decimal DifferenceAmount { get; set; }
        
        // Status
        public string PaymentStatus { get; set; }
        public string Reason { get; set; }
    }
    
    /// <summary>
    /// Complete modification history for booking
    /// </summary>
    public class ModificationHistoryResponseDto
    {
        public int BookingId { get; set; }
        public List<ModificationHistoryEntryDto> Modifications { get; set; } = new List<ModificationHistoryEntryDto>();
        public int TotalModifications { get; set; }
    }
}
