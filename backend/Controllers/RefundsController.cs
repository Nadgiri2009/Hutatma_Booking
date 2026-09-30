using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/refunds")]
public class RefundsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RefundsController(AppDbContext db) => _db = db;

    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup([FromQuery] string? bookingNumber, [FromQuery] string? mobile)
    {
        bookingNumber = bookingNumber?.Trim();
        mobile = mobile?.Trim();
        if (string.IsNullOrWhiteSpace(bookingNumber) == string.IsNullOrWhiteSpace(mobile))
            return BadRequest(new { error = "Provide an application number or mobile number." });

        var query = _db.Bookings
            .AsNoTracking()
            .Include(b => b.Applicant)
            .Include(b => b.Venue)
            .Include(b => b.Payments)
            .AsQueryable();

        var bookings = !string.IsNullOrWhiteSpace(bookingNumber)
            ? await query.Where(b => b.BookingNumber == bookingNumber).ToListAsync()
            : await query.Where(b => b.Applicant != null && b.Applicant.Mobile == mobile)
                .OrderByDescending(b => b.CreatedAt).ToListAsync();

        if (bookings.Count == 0) return NotFound(new { error = "No booking was found for that application number or mobile number." });

        var bookingIds = bookings.Select(b => b.Id).ToList();
        var refundRequests = await _db.RefundRequests.AsNoTracking()
            .Where(r => bookingIds.Contains(r.BookingId)).ToDictionaryAsync(r => r.BookingId);
        var cancellations = await _db.Cancellations.AsNoTracking()
            .Where(c => bookingIds.Contains(c.BookingId))
            .GroupBy(c => c.BookingId)
            .Select(g => g.OrderByDescending(c => c.CreatedAt).First())
            .ToDictionaryAsync(c => c.BookingId);

        return Ok(bookings.Select(booking => ToCitizenBooking(
            booking,
            refundRequests.GetValueOrDefault(booking.Id),
            cancellations.GetValueOrDefault(booking.Id))));
    }

    [HttpGet("track")]
    public async Task<IActionResult> Track(
        [FromQuery] string? refundRequestNumber,
        [FromQuery] string? bookingNumber,
        [FromQuery] string? mobile)
    {
        refundRequestNumber = refundRequestNumber?.Trim();
        bookingNumber = bookingNumber?.Trim();
        mobile = mobile?.Trim();
        var suppliedValues = new[] { refundRequestNumber, bookingNumber, mobile }
            .Count(value => !string.IsNullOrWhiteSpace(value));
        if (suppliedValues != 1)
            return BadRequest(new { error = "Search using one refund request number, application number, or mobile number." });

        var query = _db.RefundRequests.AsNoTracking()
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .AsQueryable();
        var isMobileSearch = !string.IsNullOrWhiteSpace(mobile);
        if (!string.IsNullOrWhiteSpace(refundRequestNumber))
            query = query.Where(r => r.RefundRequestNumber == refundRequestNumber);
        else if (!string.IsNullOrWhiteSpace(bookingNumber))
            query = query.Where(r => r.Booking.BookingNumber == bookingNumber);
        else
            query = query.Where(r => r.Booking.Applicant != null && r.Booking.Applicant.Mobile == mobile);

        var requests = await query.OrderByDescending(r => r.RequestedAt).ToListAsync();
        if (requests.Count == 0)
        {
            var message = isMobileSearch
                ? "No refund request was found for this mobile number."
                : !string.IsNullOrWhiteSpace(refundRequestNumber)
                    ? "No refund request was found with that request number."
                    : "No refund request was found for this application number.";
            return NotFound(new { error = message });
        }

        return Ok(requests.Select(request => ToTrackingRequest(request, isMobileSearch)));
    }

    [HttpPost]
    public async Task<IActionResult> Apply([FromBody] ApplyRefundRequestDto dto)
    {
        var booking = await _db.Bookings
            .Include(b => b.Applicant)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId);
        if (booking == null) return NotFound(new { error = "Booking not found." });
        if (string.IsNullOrWhiteSpace(dto.Mobile) || booking.Applicant?.Mobile != dto.Mobile.Trim())
            return BadRequest(new { error = "The registered mobile number could not be verified." });
        if (booking.Status == "Cancelled")
            return Conflict(new { error = "This booking is cancelled and must be handled through the existing cancellation refund process." });
        if (booking.Status != "Confirmed" || !booking.Payments.Any(p => p.Status == "Paid"))
            return Conflict(new { error = "A refund request requires a confirmed booking with a recorded payment." });
        if (await _db.RefundRequests.AnyAsync(r => r.BookingId == booking.Id))
            return Conflict(new { error = "A refund request already exists for this booking." });

        var request = new RefundRequest
        {
            RefundRequestNumber = $"RF-{DateTime.UtcNow:yyyy}-{Guid.NewGuid():N}",
            BookingId = booking.Id,
            Status = "Requested",
            RequestedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _db.RefundRequests.Add(request);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return Conflict(new { error = "A refund request already exists for this booking." });
        }

        return Ok(new
        {
            request.RefundRequestNumber,
            booking.BookingNumber,
            request.Status,
            request.RequestedAt,
        });
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var requests = await _db.RefundRequests.AsNoTracking()
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();
        return Ok(requests.Select(ToAdminRequest));
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id:int}/verify")]
    public Task<IActionResult> Verify(int id) => UpdateStatus(id, "Requested", request =>
    {
        request.Status = "Under Verification";
        request.VerifiedAt = DateTime.UtcNow;
        request.VerifiedBy = CurrentUserId();
        request.UpdatedAt = DateTime.UtcNow;
    });

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveRefundRequestDto dto)
    {
        var request = await _db.RefundRequests
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != "Under Verification")
            return Conflict(new { error = "Only refund requests under verification can be approved." });
        var paidAmount = request.Booking.Payments.Where(p => p.Status == "Paid").Sum(p => p.Amount);
        if (dto.RefundAmount <= 0 || dto.RefundAmount > paidAmount)
            return BadRequest(new { error = "The approved refund amount must be greater than zero and cannot exceed the recorded paid amount." });

        request.RefundAmount = dto.RefundAmount;
        request.Status = "Approved";
        request.ApprovedAt = DateTime.UtcNow;
        request.ApprovedBy = CurrentUserId();
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToAdminRequest(request));
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id:int}/reject")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectRefundRequestDto dto)
    {
        var request = await _db.RefundRequests.FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != "Requested")
            return Conflict(new { error = "A refund request cannot be rejected after verification." });

        request.Status = "Rejected";
        request.RejectionReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        request.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { request.Id, request.Status, request.RejectionReason });
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id:int}/start-processing")]
    public Task<IActionResult> StartProcessing(int id) => UpdateStatus(id, "Approved", request =>
    {
        request.Status = "Processing";
        request.UpdatedAt = DateTime.UtcNow;
    });

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id:int}/process")]
    public Task<IActionResult> Process(int id) => UpdateStatus(id, "Processing", request =>
    {
        request.Status = "Processed";
        request.ProcessedAt = DateTime.UtcNow;
        request.ProcessedBy = CurrentUserId();
        request.UpdatedAt = DateTime.UtcNow;
    });

    private async Task<IActionResult> UpdateStatus(int id, string expectedStatus, Action<RefundRequest> update)
    {
        var request = await _db.RefundRequests
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != expectedStatus)
            return Conflict(new { error = $"This action requires status '{expectedStatus}'." });
        update(request);
        await _db.SaveChangesAsync();
        return Ok(ToAdminRequest(request));
    }

    private int? CurrentUserId()
    {
        return int.TryParse(User.FindFirst("sub")?.Value, out var userId) && userId > 0 ? userId : null;
    }

    private static object ToCitizenBooking(Booking booking, RefundRequest? refundRequest, Cancellation? cancellation)
    {
        var paidPayments = booking.Payments.Where(p => p.Status == "Paid").ToList();
        var eligible = booking.Status == "Confirmed" && paidPayments.Count > 0
            && refundRequest == null && booking.Status != "Cancelled";
        var eligibilityMessage = booking.Status == "Cancelled"
            ? "This booking is cancelled and must be handled through the existing cancellation refund process."
            : refundRequest != null
                ? "A refund request already exists for this booking."
                : booking.Status != "Confirmed" || paidPayments.Count == 0
                    ? "A refund request requires a confirmed booking with a recorded payment."
                    : null;

        return new
        {
            bookingId = booking.Id,
            applicationNumber = booking.BookingNumber,
            applicantName = booking.Applicant?.FullName ?? "",
            contactNumber = booking.Applicant?.Mobile ?? "",
            venue = booking.Venue.VenueName,
            booking.FromDate,
            booking.ToDate,
            booking.Session,
            bookingAmount = booking.GrandTotal,
            depositAmount = booking.SecurityDeposit,
            bookingStatus = booking.Status,
            paymentStatus = paidPayments.Count > 0 ? "Paid" : booking.Payments.FirstOrDefault()?.Status ?? "Unpaid",
            payments = booking.Payments.Select(payment => new
            {
                payment.Amount,
                payment.PaymentMethod,
                payment.TransactionRef,
                payment.GatewayPaymentId,
                payment.PaymentDate,
                payment.Status,
            }),
            eligibleForRefund = eligible,
            eligibilityMessage,
            refundRequest = refundRequest == null ? null : new
            {
                refundRequest.RefundRequestNumber,
                refundRequest.Status,
                refundRequest.RefundAmount,
                refundRequest.RequestedAt,
                refundRequest.RejectionReason,
            },
            existingCancellation = cancellation == null ? null : new
            {
                cancellation.RefundStatus,
                cancellation.RefundAmount,
                cancellation.CreatedAt,
                cancellation.ProcessedAt,
            },
        };
    }

    private static object ToAdminRequest(RefundRequest request)
    {
        var booking = request.Booking;
        return new
        {
            request.Id,
            request.RefundRequestNumber,
            request.Status,
            request.RefundAmount,
            request.RequestedAt,
            updatedAt = request.UpdatedAt ?? request.RequestedAt,
            request.VerifiedAt,
            request.VerifiedBy,
            request.ApprovedAt,
            request.ApprovedBy,
            request.ProcessedAt,
            request.ProcessedBy,
            request.RejectionReason,
            applicationNumber = booking.BookingNumber,
            applicantName = booking.Applicant?.FullName ?? "",
            contactNumber = booking.Applicant?.Mobile ?? "",
            venue = booking.Venue.VenueName,
            booking.FromDate,
            booking.ToDate,
            booking.Session,
            bookingAmount = booking.GrandTotal,
            depositAmount = booking.SecurityDeposit,
            paymentReferences = booking.Payments.Where(p => p.Status == "Paid").Select(p => new
            {
                p.Amount,
                p.PaymentMethod,
                p.TransactionRef,
                p.GatewayPaymentId,
                p.PaymentDate,
            }),
        };
    }

    private static object ToTrackingRequest(RefundRequest request, bool maskMobile)
    {
        var booking = request.Booking;
        var mobile = booking.Applicant?.Mobile ?? "";
        return new
        {
            request.RefundRequestNumber,
            applicationNumber = booking.BookingNumber,
            applicantName = booking.Applicant?.FullName ?? "",
            mobile = maskMobile ? MaskMobile(mobile) : mobile,
            venue = booking.Venue.VenueName,
            booking.FromDate,
            booking.ToDate,
            booking.Session,
            bookingAmount = booking.GrandTotal,
            request.RefundAmount,
            request.RequestedAt,
            lastUpdatedAt = request.UpdatedAt ?? request.RequestedAt,
            request.Status,
            request.RejectionReason,
        };
    }

    private static string MaskMobile(string mobile)
    {
        if (mobile.Length <= 4) return new string('*', mobile.Length);
        return $"{new string('*', mobile.Length - 4)}{mobile[^4..]}";
    }
}

public class ApplyRefundRequestDto
{
    public int BookingId { get; set; }
    public string Mobile { get; set; } = "";
}

public class ApproveRefundRequestDto
{
    public decimal RefundAmount { get; set; }
}

public class RejectRefundRequestDto
{
    public string? Reason { get; set; }
}
