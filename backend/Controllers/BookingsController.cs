using HutatmaBooking.API.Data;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _svc;
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public BookingsController(IBookingService svc, AppDbContext db, IAuditService audit)
    {
        _svc = svc;
        _db = db;
        _audit = audit;
    }

    /// <summary>Check seat/session availability for a date range</summary>
    [HttpPost("availability")]
    public async Task<IActionResult> CheckAvailability([FromBody] AvailabilityRequestDto req)
    {
        var result = await _svc.CheckAvailabilityAsync(req);
        return Ok(result);
    }

    /// <summary>Calculate booking cost summary</summary>
    [HttpPost("summary")]
    public async Task<IActionResult> GetSummary([FromBody] BookingSummaryRequestDto req)
    {
        var summary = await _svc.CalculateSummaryAsync(req);
        return Ok(summary);
    }

    /// <summary>Submit new booking (public)</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingDto dto)
    {
        var result = await _svc.CreateBookingAsync(dto);
        return CreatedAtAction(nameof(GetByNumber), new { number = result.BookingNumber }, result);
    }

    /// <summary>Create a booking for a customer using the standard booking and pricing workflow.</summary>
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("admin")]
    public async Task<IActionResult> CreateForCustomer([FromBody] CreateBookingDto dto)
    {
        var result = await _svc.CreateBookingAsync(dto);
        return CreatedAtAction(nameof(GetByNumber), new { number = result.BookingNumber }, result);
    }

    /// <summary>Move a booking to a new start date while preserving its duration and selected slots.</summary>
    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/date")]
    public async Task<IActionResult> ChangeDate(int id, [FromBody] ChangeBookingDateDto dto)
    {
        var result = await _db.Database.CreateExecutionStrategy().ExecuteAsync<IActionResult>(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var booking = await _db.Bookings.FirstOrDefaultAsync(item => item.Id == id);
            if (booking == null) return NotFound(new { error = "Booking not found." });
            if (!BookingSlots.IsActiveBooking(booking))
                return Conflict(new { error = "A cancelled booking cannot be moved to another date." });

            var durationDays = booking.ToDate.DayNumber - booking.FromDate.DayNumber + 1;
            var newFromDate = DateOnly.FromDateTime(dto.NewFromDate);
            var newToDate = newFromDate.AddDays(durationDays - 1);
            if (newFromDate == booking.FromDate)
                return BadRequest(new { error = "Choose a different booking date." });

            var venue = await _db.VenueMaster.FirstOrDefaultAsync(item => item.VenueId == booking.VenueId);
            if (venue == null) return Conflict(new { error = "The venue for this booking is no longer available." });

            var overlappingBookings = await _db.Bookings
                .Where(item => item.VenueId == booking.VenueId
                    && item.FromDate <= newToDate
                    && item.ToDate >= newFromDate)
                .ToListAsync();
            if (BookingSlots.HasCapacityConflict(
                    overlappingBookings, newFromDate, newToDate, booking.Session, venue, booking.Id))
                return Conflict(new { error = "The same venue and selected time slots are unavailable on the new date." });

            var oldFromDate = booking.FromDate;
            var oldToDate = booking.ToDate;
            booking.FromDate = newFromDate;
            booking.ToDate = newToDate;
            booking.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _audit.LogAsync(
                "BookingDateChanged",
                "Bookings",
                booking.Id,
                JsonSerializer.Serialize(new { FromDate = oldFromDate, ToDate = oldToDate, booking.Session }),
                JsonSerializer.Serialize(new
                {
                    FromDate = newFromDate,
                    ToDate = newToDate,
                    booking.Session,
                    AdminUserId = int.TryParse(User.FindFirst("sub")?.Value, out var adminId) ? adminId : (int?)null,
                    ChangedAt = booking.UpdatedAt,
                }));
            await transaction.CommitAsync();
            return Ok(new { booking.Id, booking.BookingNumber, booking.FromDate, booking.ToDate, booking.Session });
        });
        return result;
    }

    /// <summary>Immediately cancel a paid booking and create a full-paid-amount refund request.</summary>
    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{id:int}/force-cancel")]
    public async Task<IActionResult> ForceCancel(int id)
    {
        var result = await _db.Database.CreateExecutionStrategy().ExecuteAsync<IActionResult>(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var booking = await _db.Bookings
                .Include(item => item.Applicant)
                .Include(item => item.Payments)
                .FirstOrDefaultAsync(item => item.Id == id);
            if (booking == null) return NotFound(new { error = "Booking not found." });
            if (!BookingSlots.IsActiveBooking(booking))
                return Conflict(new { error = "This booking has already been cancelled." });
            if (await _db.RefundRequests.AnyAsync(request => request.BookingId == booking.Id)
                || await _db.Cancellations.AnyAsync(cancellation => cancellation.BookingId == booking.Id))
                return Conflict(new { error = "A cancellation or refund already exists for this booking." });

            var paidAmount = booking.Payments.Where(payment => payment.Status == "Paid").Sum(payment => payment.Amount);
            if (paidAmount <= 0)
                return Conflict(new { error = "Force cancellation requires a booking with a recorded payment." });

            var now = DateTime.UtcNow;
            var adminUserId = int.TryParse(User.FindFirst("sub")?.Value, out var userId) ? userId : (int?)null;
            booking.Status = "ForceCancelled";
            booking.CancelReason = "Force cancelled by administrator; full paid amount to be refunded.";
            booking.UpdatedAt = now;
            var refund = new RefundRequest
            {
                RefundRequestNumber = $"RF-{now:yyyy}-{Guid.NewGuid():N}",
                BookingId = booking.Id,
                RefundAmount = paidAmount,
                Status = "Requested",
                RequestedAt = now,
                UpdatedAt = now,
            };
            _db.RefundRequests.Add(refund);
            _db.Cancellations.Add(new Cancellation
            {
                BookingId = booking.Id,
                Reason = booking.CancelReason,
                RequestedBy = "Administrator",
                RefundAmount = paidAmount,
                RefundStatus = "Refund Workflow",
                CreatedAt = now,
            });
            await _db.SaveChangesAsync();
            await _audit.LogAsync(
                "ForceCancelled",
                "Bookings",
                booking.Id,
                JsonSerializer.Serialize(new { booking.BookingNumber, booking.GrandTotal, booking.FromDate, booking.ToDate, booking.Session }),
                JsonSerializer.Serialize(new
                {
                    booking.BookingNumber,
                    Status = booking.Status,
                    ForceCancelledAt = now,
                    AdminUserId = adminUserId,
                    ApplicantName = booking.Applicant?.FullName,
                    ApplicantMobile = booking.Applicant?.Mobile,
                    ApplicantEmail = booking.Applicant?.Email,
                    OriginalBookingAmount = booking.GrandTotal,
                    TotalAmountPaid = paidAmount,
                    FullRefundAmount = paidAmount,
                    RefundRequestNumber = refund.RefundRequestNumber,
                    RefundStatus = refund.Status,
                    PaymentReferences = booking.Payments
                        .Where(payment => payment.Status == "Paid")
                        .Select(payment => new
                        {
                            payment.Amount,
                            payment.TransactionRef,
                            payment.GatewayPaymentId,
                            payment.PaymentMethod,
                            payment.PaymentDate,
                        }),
                }));
            await transaction.CommitAsync();
            return Ok(new
            {
                booking.Id,
                booking.BookingNumber,
                BookingStatus = booking.Status,
                refund.RefundRequestNumber,
                refund.RefundAmount,
                RefundStatus = refund.Status,
            });
        });
        return result;
    }

    /// <summary>Search by booking number</summary>
    [HttpGet("number/{number}")]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var result = await _svc.GetByBookingNumberAsync(number);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Search by mobile number</summary>
    [HttpGet("mobile/{mobile}")]
    public async Task<IActionResult> GetByMobile(string mobile)
    {
        var result = await _svc.GetByMobileAsync(mobile);
        return Ok(result);
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────

    /// <summary>Get all bookings (admin, paged + filtered)</summary>
    [Authorize(Policy = "StaffPlus")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] BookingFilterDto filter)
    {
        var result = await _svc.GetAllAsync(filter);
        return Ok(result);
    }
}
