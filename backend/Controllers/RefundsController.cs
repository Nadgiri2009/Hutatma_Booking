using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/refunds")]
public class RefundsController : ControllerBase
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan OtpRequestCooldown = TimeSpan.FromSeconds(30);
    private const int MaxOtpAttempts = 5;

    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IAuditService _audit;
    private readonly IWebHostEnvironment _environment;

    public RefundsController(
        AppDbContext db,
        INotificationService notifications,
        IAuditService audit,
        IWebHostEnvironment environment)
    {
        _db = db;
        _notifications = notifications;
        _audit = audit;
        _environment = environment;
    }

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
        int? bookingId = int.TryParse(bookingNumber, out var parsedBookingId) ? parsedBookingId : null;

        var bookings = !string.IsNullOrWhiteSpace(bookingNumber)
            ? await query.Where(b => b.BookingNumber == bookingNumber || (bookingId.HasValue && b.Id == bookingId.Value)).ToListAsync()
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

    [HttpPost("{bookingId:int}/request-otp")]
    public async Task<IActionResult> RequestApplicationOtp(int bookingId, [FromBody] RefundOtpRequestDto dto)
    {
        var booking = await _db.Bookings
            .Include(b => b.Applicant)
            .Include(b => b.Payments)
            .FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return NotFound(new { error = "Booking not found." });
        var mobile = dto.Mobile.Trim();
        if (string.IsNullOrWhiteSpace(mobile) || booking.Applicant?.Mobile != mobile)
            return BadRequest(new { error = "The registered mobile number could not be verified." });
        var ineligibilityReason = GetRefundIneligibilityReason(booking);
        if (ineligibilityReason != null) return Conflict(new { error = ineligibilityReason });
        if (await _db.RefundRequests.AnyAsync(r => r.BookingId == booking.Id))
            return Conflict(new { error = "A refund request already exists for this booking." });

        var now = DateTime.UtcNow;
        var challenge = await _db.RefundOtpChallenges.FindAsync(booking.Id);
        if (challenge != null && challenge.UsedAt == null && now - challenge.CreatedAt < OtpRequestCooldown)
            return Conflict(new { error = "Wait 30 seconds before requesting another verification code." });

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        if (challenge == null)
        {
            challenge = new RefundOtpChallenge { BookingId = booking.Id, Mobile = mobile };
            _db.RefundOtpChallenges.Add(challenge);
        }
        challenge.Mobile = mobile;
        challenge.OtpHash = SHA256.HashData(Encoding.UTF8.GetBytes(otp));
        challenge.CreatedAt = now;
        challenge.ExpiresAt = now.Add(OtpLifetime);
        challenge.FailedAttempts = 0;
        challenge.UsedAt = null;
        await _db.SaveChangesAsync();

        try
        {
            await _notifications.SendOneTimeCodeAsync(mobile, otp, "refund application");
        }
        catch (Exception)
        {
            challenge.UsedAt = DateTime.UtcNow;
            challenge.OtpHash = new byte[32];
            await _db.SaveChangesAsync();
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Could not deliver the verification code. Please try again later." });
        }

        var message = _environment.IsDevelopment()
            ? "The verification code is printed in the backend terminal for local testing."
            : "A verification code was sent to the registered mobile number.";
        return Ok(new { message });
    }

    [HttpPost("{bookingId:int}/apply-verified")]
    public async Task<IActionResult> ApplyVerified(int bookingId, [FromBody] RefundOtpVerifyDto dto)
    {
        var mobile = dto.Mobile.Trim();
        var otp = dto.Otp.Trim();
        var result = await _db.Database.CreateExecutionStrategy().ExecuteAsync<IActionResult>(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var booking = await _db.Bookings
                .Include(b => b.Applicant)
                .Include(b => b.Payments)
                .Include(b => b.BankDetail)
                .FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null) return NotFound(new { error = "Booking not found." });
            if (string.IsNullOrWhiteSpace(mobile) || booking.Applicant?.Mobile != mobile)
                return BadRequest(new { error = "The registered mobile number could not be verified." });

            var ineligibilityReason = GetRefundIneligibilityReason(booking);
            if (ineligibilityReason != null) return Conflict(new { error = ineligibilityReason });
            if (await _db.RefundRequests.AnyAsync(r => r.BookingId == booking.Id))
                return Conflict(new { error = "A refund request already exists for this booking." });

            var challenge = await _db.RefundOtpChallenges.SingleOrDefaultAsync(item => item.BookingId == bookingId);
            var now = DateTime.UtcNow;
            if (challenge == null || challenge.Mobile != mobile || challenge.UsedAt != null || challenge.ExpiresAt <= now)
            {
                if (challenge != null && challenge.UsedAt == null)
                {
                    challenge.UsedAt = now;
                    challenge.OtpHash = new byte[32];
                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return BadRequest(new { error = "The verification code is invalid or expired. Request a new code." });
            }

            var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(otp));
            if (!CryptographicOperations.FixedTimeEquals(challenge.OtpHash, suppliedHash))
            {
                challenge.FailedAttempts++;
                if (challenge.FailedAttempts >= MaxOtpAttempts)
                {
                    challenge.UsedAt = now;
                    challenge.OtpHash = new byte[32];
                }
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return BadRequest(new { error = challenge.FailedAttempts >= MaxOtpAttempts
                    ? "Too many incorrect codes. Request a new verification code."
                    : "The verification code is incorrect." });
            }

            challenge.UsedAt = now;
            challenge.OtpHash = new byte[32];
            var request = new RefundRequest
            {
                RefundRequestNumber = $"RF-{now:yyyy}-{Guid.NewGuid():N}",
                BookingId = booking.Id,
                Status = "Requested",
                RequestedAt = now,
                UpdatedAt = now,
            };
            _db.RefundRequests.Add(request);
            await _db.SaveChangesAsync();
            await _audit.LogAsync(
                "RefundApplicationSubmitted",
                "RefundRequests",
                request.Id,
                null,
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    request.RefundRequestNumber,
                    request.Status,
                    request.RequestedAt,
                    booking.BookingNumber,
                    booking.Applicant?.FullName,
                    booking.Applicant?.Mobile,
                    booking.GrandTotal,
                    TotalAmountPaid = booking.Payments.Where(payment => payment.Status == "Paid").Sum(payment => payment.Amount),
                }));
            await transaction.CommitAsync();

            return Ok(new
            {
                request.RefundRequestNumber,
                bookingNumber = booking.BookingNumber,
                request.Status,
                request.RequestedAt,
                bankDetails = booking.BankDetail == null ? null : new
                {
                    booking.BankDetail.BankName,
                    booking.BankDetail.AccountHolderName,
                    booking.BankDetail.AccountNumber,
                    booking.BankDetail.IFSCCode,
                    booking.BankDetail.BranchName,
                    booking.BankDetail.MICRCode,
                },
            });
        });

        return result;
    }

    [HttpPost]
    public IActionResult Apply([FromBody] ApplyRefundRequestDto dto) =>
        Conflict(new { error = "Verify the registered mobile number with an OTP before applying for a refund." });

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{bookingId:int}/admin-apply")]
    public Task<IActionResult> ApplyForCustomer(int bookingId, [FromBody] AdminRefundApplicationDto dto) =>
        ExecuteSerializableAsync(async () =>
        {
            var booking = await _db.Bookings
                .Include(item => item.Applicant)
                .Include(item => item.Venue)
                .Include(item => item.Payments)
                .Include(item => item.BankDetail)
                .FirstOrDefaultAsync(item => item.Id == bookingId);
            if (booking == null) return NotFound(new { error = "Booking not found." });
            if (!BookingSlots.IsActiveBooking(booking) || !booking.Payments.Any(payment => payment.Status == "Paid"))
                return Conflict(new { error = "An admin refund application requires an active booking with a recorded payment." });
            if (await _db.RefundRequests.AnyAsync(item => item.BookingId == booking.Id)
                || await _db.Cancellations.AnyAsync(item => item.BookingId == booking.Id))
                return Conflict(new { error = "A cancellation or refund application already exists for this booking." });

            var now = DateTime.UtcNow;
            var request = new RefundRequest
            {
                RefundRequestNumber = $"RF-{now:yyyy}-{Guid.NewGuid():N}",
                BookingId = booking.Id,
                Status = "Requested",
                RequestedAt = now,
                UpdatedAt = now,
            };
            _db.RefundRequests.Add(request);
            await _db.SaveChangesAsync();
            await _audit.LogAsync(
                "AdminSubmittedRefundApplication",
                "RefundRequests",
                request.Id,
                null,
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    request.RefundRequestNumber,
                    request.Status,
                    request.RequestedAt,
                    AdminUserId = CurrentUserId(),
                    Reason = dto.Reason?.Trim(),
                    booking.BookingNumber,
                    ApplicantName = booking.Applicant?.FullName,
                    ApplicantMobile = booking.Applicant?.Mobile,
                    TotalAmountPaid = booking.Payments.Where(payment => payment.Status == "Paid").Sum(payment => payment.Amount),
                }));
            return Ok(ToAdminRequest(request));
        });

    private static string? GetRefundIneligibilityReason(Booking booking)
    {
        if (booking.Status is "Cancelled" or "ForceCancelled" or "Force Cancelled")
            return "This booking is cancelled and is not eligible for a new refund application.";
        if (booking.Status != "Confirmed" || !booking.Payments.Any(p => p.Status == "Paid"))
            return "A refund request requires a confirmed booking with a recorded payment.";
        return null;
    }

    [Authorize(Policy = "RefundReviewers")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var requests = await _db.RefundRequests.AsNoTracking()
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .Include(r => r.Booking).ThenInclude(b => b.BankDetail)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();
        return Ok(requests.Select(ToAdminRequest));
    }

    [Authorize(Policy = "RefundReviewers")]
    [HttpGet("{id:int}/history")]
    public async Task<IActionResult> GetHistory(int id)
    {
        var request = await _db.RefundRequests.AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new { item.Id, item.BookingId, item.Booking.Status })
            .FirstOrDefaultAsync();
        if (request == null) return NotFound();
        var isForceCancelled = request.Status == "ForceCancelled" || request.Status == "Force Cancelled";

        var history = await _db.AuditLogs.AsNoTracking()
            .Where(item =>
                (item.TableName == "RefundRequests" && item.RecordId == id)
                || (isForceCancelled
                    && item.TableName == "Bookings"
                    && item.RecordId == request.BookingId
                    && item.Action == "ForceCancelled"))
            .OrderBy(item => item.CreatedAt)
            .Select(item => new
            {
                item.Action,
                item.UserId,
                item.CreatedAt,
                item.OldValues,
                item.NewValues,
            })
            .ToListAsync();
        return Ok(history);
    }

    [Authorize(Policy = "ClerkOnly")]
    [HttpPut("{id:int}/verify")]
    public Task<IActionResult> Verify(int id) => UpdateStatus(id, "Requested", request =>
    {
        request.Status = "Under Verification";
        request.VerifiedAt = DateTime.UtcNow;
        request.VerifiedBy = CurrentUserId();
        request.UpdatedAt = DateTime.UtcNow;
        return Task.CompletedTask;
    }, "ClerkStartedReview");

    [Authorize(Policy = "ClerkOnly")]
    [HttpPut("{id:int}/review")]
    public Task<IActionResult> Review(int id, [FromBody] ReviewRefundRequestDto dto) =>
        ExecuteSerializableAsync(async () =>
        {
        var request = await _db.RefundRequests
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.BankDetail)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != "Under Verification")
            return Conflict(new { error = "Only refund requests under verification can be processed by the Clerk." });

        var paidAmount = request.Booking.Payments.Where(payment => payment.Status == "Paid").Sum(payment => payment.Amount);
        var isForceCancellation = request.Booking.Status is "ForceCancelled" or "Force Cancelled";
        if (dto.RefundAmount <= 0 || dto.RefundAmount > paidAmount)
            return BadRequest(new { error = "The recommended refund amount must be greater than zero and cannot exceed the recorded paid amount." });
        if (isForceCancellation && dto.RefundAmount != paidAmount)
            return BadRequest(new { error = "A force-cancelled booking must be recommended for a full refund of the amount paid." });

        request.RefundAmount = dto.RefundAmount;
        request.Status = "Clerk Processed";
        request.VerifiedBy = CurrentUserId();
        request.VerifiedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;
        await UpdateForceCancellationStatusAsync(request, request.Status);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            "ClerkProcessedRefund",
            "RefundRequests",
            request.Id,
            "Under Verification",
            System.Text.Json.JsonSerializer.Serialize(new
            {
                request.Status,
                request.RefundAmount,
                ClerkUserId = CurrentUserId(),
                ProcessedAt = request.VerifiedAt,
                Recommendation = dto.Recommendation,
            }));
        return Ok(ToAdminRequest(request));
        });

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/approve")]
    public Task<IActionResult> Approve(int id, [FromBody] ApproveRefundRequestDto dto) =>
        ExecuteSerializableAsync(async () =>
        {
        var request = await _db.RefundRequests
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .Include(r => r.Booking).ThenInclude(b => b.BankDetail)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != "Clerk Processed")
            return Conflict(new { error = "Only refund requests processed by a Clerk can be approved." });
        var paidAmount = request.Booking.Payments.Where(p => p.Status == "Paid").Sum(p => p.Amount);
        if (dto.RefundAmount <= 0 || dto.RefundAmount > paidAmount)
            return BadRequest(new { error = "The approved refund amount must be greater than zero and cannot exceed the recorded paid amount." });
        if ((request.Booking.Status is "ForceCancelled" or "Force Cancelled") && dto.RefundAmount != paidAmount)
            return BadRequest(new { error = "A force-cancelled booking must be approved for a full refund of the amount paid." });

        var oldStatus = request.Status;
        request.RefundAmount = dto.RefundAmount;
        request.Status = "Approved";
        request.ApprovedAt = DateTime.UtcNow;
        request.ApprovedBy = CurrentUserId();
        request.UpdatedAt = DateTime.UtcNow;
        await UpdateForceCancellationStatusAsync(request, request.Status);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            "AdminApprovedRefund",
            "RefundRequests",
            request.Id,
            oldStatus,
            System.Text.Json.JsonSerializer.Serialize(new
            {
                request.Status,
                request.RefundAmount,
                AdminUserId = CurrentUserId(),
                request.ApprovedAt,
            }));
        return Ok(ToAdminRequest(request));
        });

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/reject")]
    public Task<IActionResult> Reject(int id, [FromBody] RejectRefundRequestDto dto) =>
        ExecuteSerializableAsync(async () =>
        {
        var request = await _db.RefundRequests.Include(r => r.Booking).FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != "Clerk Processed")
            return Conflict(new { error = "Only refund requests processed by a Clerk can be rejected." });
        if (request.Booking.Status is "ForceCancelled" or "Force Cancelled")
            return Conflict(new { error = "A force-cancellation refund must be approved for the full amount paid." });

        var oldStatus = request.Status;
        request.Status = "Rejected";
        request.RejectionReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        request.ApprovedBy = CurrentUserId();
        request.ApprovedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;
        await UpdateForceCancellationStatusAsync(request, request.Status);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            "AdminRejectedRefund",
            "RefundRequests",
            request.Id,
            oldStatus,
            System.Text.Json.JsonSerializer.Serialize(new
            {
                request.Status,
                AdminUserId = CurrentUserId(),
                request.ApprovedAt,
                request.RejectionReason,
                bookingStatus = request.Booking.Status,
            }));
        return Ok(new { request.Id, request.Status, request.RejectionReason });
        });

    [Authorize(Policy = "ClerkOnly")]
    [HttpPut("{id:int}/start-processing")]
    public Task<IActionResult> StartProcessing(int id) => UpdateStatus(id, "Approved", request =>
    {
        request.Status = "Processing";
        request.UpdatedAt = DateTime.UtcNow;
        return Task.CompletedTask;
    }, "ClerkStartedRefundProcessing");

    [Authorize(Policy = "ClerkOnly")]
    [HttpPut("{id:int}/process")]
    public Task<IActionResult> Process(int id, [FromBody] CompleteRefundRequestDto dto) =>
        UpdateStatus(id, "Processing", async request =>
        {
            request.Status = "Processed";
            request.ProcessedAt = DateTime.UtcNow;
            request.ProcessedBy = CurrentUserId();
            request.UpdatedAt = DateTime.UtcNow;
            await UpdateForceCancellationStatusAsync(request, request.Status, markProcessed: true);
        }, "ClerkCompletedRefund", System.Text.Json.JsonSerializer.Serialize(new
        {
            Status = "Processed",
            RefundTransactionReference = dto.RefundTransactionReference?.Trim(),
        }));

    private async Task<IActionResult> UpdateStatus(
        int id,
        string expectedStatus,
        Func<RefundRequest, Task> update,
        string auditAction,
        string? auditNewValues = null) => await ExecuteSerializableAsync(async () =>
    {
        var request = await _db.RefundRequests
            .Include(r => r.Booking).ThenInclude(b => b.Applicant)
            .Include(r => r.Booking).ThenInclude(b => b.Venue)
            .Include(r => r.Booking).ThenInclude(b => b.Payments)
            .Include(r => r.Booking).ThenInclude(b => b.BankDetail)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != expectedStatus)
            return Conflict(new { error = $"This action requires status '{expectedStatus}'." });
        var oldStatus = request.Status;
        await update(request);
        await UpdateForceCancellationStatusAsync(request, request.Status);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(auditAction, "RefundRequests", request.Id, oldStatus, auditNewValues ?? request.Status);
        return Ok(ToAdminRequest(request));
    });

    private async Task UpdateForceCancellationStatusAsync(RefundRequest request, string status, bool markProcessed = false)
    {
        if (request.Booking.Status is not ("ForceCancelled" or "Force Cancelled")) return;
        var cancellation = await _db.Cancellations.FirstOrDefaultAsync(item => item.BookingId == request.BookingId);
        if (cancellation == null) return;
        cancellation.RefundStatus = status;
        cancellation.RefundAmount = request.RefundAmount ?? cancellation.RefundAmount;
        if (markProcessed)
        {
            cancellation.ProcessedAt = request.ProcessedAt;
            cancellation.ProcessedBy = request.ProcessedBy;
        }
    }

    private Task<IActionResult> ExecuteSerializableAsync(Func<Task<IActionResult>> action) =>
        _db.Database.CreateExecutionStrategy().ExecuteAsync<IActionResult>(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var result = await action();
            await transaction.CommitAsync();
            return result;
        });

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
            clerkProcessedAt = request.VerifiedAt,
            clerkProcessedBy = request.VerifiedBy,
            request.RejectionReason,
            bookingStatus = booking.Status,
            applicationNumber = booking.BookingNumber,
            applicantName = booking.Applicant?.FullName ?? "",
            applicantEmail = booking.Applicant?.Email ?? "",
            contactNumber = booking.Applicant?.Mobile ?? "",
            applicantAlternateMobile = booking.Applicant?.AlternateMobile,
            applicantAddress = booking.Applicant?.Address ?? "",
            functionName = booking.Applicant?.FunctionName ?? "",
            functionType = booking.Applicant?.FunctionType ?? "",
            expectedGuests = booking.Applicant?.ExpectedGuests ?? 0,
            idProofType = booking.Applicant?.IDProofType ?? "",
            idProofFile = booking.Applicant?.IDProofFile,
            venue = booking.Venue.VenueName,
            booking.FromDate,
            booking.ToDate,
            booking.Session,
            bookingAmount = booking.GrandTotal,
            baseRent = booking.BaseRent,
            holidayCharge = booking.HolidayCharge,
            equipmentCharge = booking.EquipmentCharge,
            cgstAmount = booking.CGSTAmount,
            sgstAmount = booking.SGSTAmount,
            depositAmount = booking.SecurityDeposit,
            bankDetails = booking.BankDetail == null ? null : new
            {
                booking.BankDetail.BankName,
                booking.BankDetail.AccountHolderName,
                booking.BankDetail.AccountNumber,
                booking.BankDetail.IFSCCode,
                booking.BankDetail.BranchName,
                booking.BankDetail.MICRCode,
            },
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

public class RefundOtpRequestDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";
}

public class RefundOtpVerifyDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{6}$")]
    public string Otp { get; set; } = "";
}

public class ApproveRefundRequestDto
{
    public decimal RefundAmount { get; set; }
}

public class RejectRefundRequestDto
{
    public string? Reason { get; set; }
}

public class ReviewRefundRequestDto
{
    public decimal RefundAmount { get; set; }
    [System.ComponentModel.DataAnnotations.MaxLength(1000)]
    public string? Recommendation { get; set; }
}

public class CompleteRefundRequestDto
{
    [System.ComponentModel.DataAnnotations.MaxLength(200)]
    public string? RefundTransactionReference { get; set; }
}

public class AdminRefundApplicationDto
{
    [System.ComponentModel.DataAnnotations.MaxLength(1000)]
    public string? Reason { get; set; }
}
