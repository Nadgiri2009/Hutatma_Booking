/*
  PHASE 5 & 6: Rate Management and Booking Modification Models
  
  New entities and DTOs for dynamic pricing and booking modification features
*/

using System;
using System.Collections.Generic;

namespace HutatmaBooking.Models
{
    // ===================================
    // PHASE 5: Rate Management Models
    // ===================================
    
    /// <summary>
    /// Represents a session type (Morning, Evening, FullDay, etc.)
    /// </summary>
    public class SessionType
    {
        public int SessionTypeId { get; set; }
        public string SessionTypeName { get; set; }  // Morning, Evening, FullDay, etc.
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public int DurationHours { get; set; } = 3;
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
    
    /// <summary>
    /// Represents pricing rules for venue + session + date range combination
    /// </summary>
    public class VenueRateMaster
    {
        public int RateId { get; set; }
        public int VenueId { get; set; }
        public string SessionType { get; set; }  // References SessionType.SessionTypeName
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal Amount { get; set; }
        public decimal RefundableDeposit { get; set; } = 0;
        public decimal CGSTPercent { get; set; } = 9.00m;
        public decimal SGSTPercent { get; set; } = 9.00m;
        public string Notes { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string UpdatedBy { get; set; }
        
        // Navigation properties
        public virtual VenueMaster Venue { get; set; }
    }
    
    /// <summary>
    /// Audit trail for rate changes
    /// </summary>
    public class VenueRateHistory
    {
        public int HistoryId { get; set; }
        public int RateId { get; set; }
        public int VenueId { get; set; }
        public string SessionType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal? OldAmount { get; set; }
        public decimal? NewAmount { get; set; }
        public string ChangeReason { get; set; }
        public string ChangedBy { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    }
    
    // ===================================
    // PHASE 6: Booking Modification Models
    // ===================================
    
    /// <summary>
    /// Tracks booking modifications with audit trail and payment status
    /// </summary>
    public class BookingModificationHistory
    {
        public int ModificationId { get; set; }
        public int BookingId { get; set; }
        
        // Original booking details
        public int? OldVenueId { get; set; }
        public string OldSessionType { get; set; }
        public DateTime? OldBookingDate { get; set; }
        public decimal OldAmount { get; set; }
        
        // New booking details
        public int NewVenueId { get; set; }
        public string NewSessionType { get; set; }
        public DateTime NewBookingDate { get; set; }
        public decimal NewAmount { get; set; }
        
        // Price reconciliation
        public decimal DifferenceAmount { get; set; }  // Positive = additional, Negative = refund
        public string PaymentStatus { get; set; } = "Pending";  // Pending, Completed, Refunded, Cancelled
        public string PaymentMethod { get; set; }  // Online, Cash, Adjustment
        public string TransactionReference { get; set; }
        
        // Audit trail
        public string ModificationReason { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime ModifiedDate { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual Booking Booking { get; set; }
        public virtual VenueMaster OldVenue { get; set; }
        public virtual VenueMaster NewVenue { get; set; }
        public virtual ICollection<ModificationAuditLog> AuditLogs { get; set; } = new List<ModificationAuditLog>();
    }
    
    /// <summary>
    /// Audit log for booking modification actions
    /// </summary>
    public class ModificationAuditLog
    {
        public int AuditId { get; set; }
        public int ModificationId { get; set; }
        public string Action { get; set; }  // Created, PaymentInitiated, PaymentCompleted, Refunded, Cancelled
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public string Comments { get; set; }
        public int? ActionBy { get; set; }
        public DateTime ActionAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public virtual BookingModificationHistory Modification { get; set; }
    }
}
