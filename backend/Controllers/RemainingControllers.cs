using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace HutatmaBooking.API.Controllers;

// ── File Upload ────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration      _config;

    public UploadController(IWebHostEnvironment env, IConfiguration config)
    {
        _env    = env;
        _config = config;
    }

    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        var maxMB   = int.Parse(_config["FileStorage:MaxFileSizeMB"] ?? "5");
        var maxBytes = maxMB * 1024 * 1024;
        if (file.Length > maxBytes)
            return BadRequest(new { error = $"File size exceeds {maxMB}MB limit." });

        var allowed = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
        var ext     = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { error = "Only PDF, JPG, and PNG files are allowed." });

        var uploadPath = Path.Combine(_env.WebRootPath, "uploads", "idproofs");
        Directory.CreateDirectory(uploadPath);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return Ok(new { filePath = $"/uploads/idproofs/{fileName}" });
    }
}

// ── Users Controller ───────────────────────────────────────────────────────────
[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles() =>
        Ok(await _db.Roles.OrderBy(role => role.Id)
            .Select(role => new { role.Id, role.Name })
            .ToListAsync());

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Users.Include(u => u.Role).Select(u => new {
            u.Id, u.FullName, u.Email, u.Mobile, u.IsActive, u.CreatedAt,
            RoleId = u.RoleId, RoleName = u.Role.Name,
        }).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { error = "Email already exists." });

        var user = new User
        {
            FullName     = dto.FullName,
            Email        = dto.Email,
            Mobile       = dto.Mobile,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId       = dto.RoleId,
            IsActive     = true,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Email });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.FullName  = dto.FullName;
        user.Mobile    = dto.Mobile;
        user.RoleId    = dto.RoleId;
        user.IsActive  = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(dto.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName });
    }
}

// ── Complaints Controller ─────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class ComplaintsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ComplaintsController(AppDbContext db) => _db = db;

    [HttpGet]
    [Authorize(Policy = "StaffPlus")]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var q = _db.Complaints.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
        return Ok(await q.OrderByDescending(c => c.CreatedAt).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Complaint dto)
    {
        dto.CreatedAt = DateTime.UtcNow;
        dto.Status    = "Open";
        _db.Complaints.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id}/resolve")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveDto dto)
    {
        var c = await _db.Complaints.FindAsync(id);
        if (c == null) return NotFound();
        c.Status     = "Resolved";
        c.Resolution = dto.Resolution;
        c.ResolvedAt = DateTime.UtcNow;
        c.UpdatedAt  = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(c);
    }
}

// ── Cancellations Controller ──────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public class CancellationsController : ControllerBase
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan OtpRequestCooldown = TimeSpan.FromSeconds(30);
    private const int MaxOtpAttempts = 5;

    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;
    private readonly IWebHostEnvironment _environment;

    public CancellationsController(
        AppDbContext db,
        INotificationService notifications,
        IWebHostEnvironment environment)
    {
        _db = db;
        _notifications = notifications;
        _environment = environment;
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cancellations = await _db.Cancellations.Include(c => c.Booking)
            .OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(cancellations.Select(c => new
        {
            c.Id,
            c.BookingId,
            c.Reason,
            c.RequestedBy,
            refundAmount = c.RefundAmount,
            c.RefundStatus,
            c.ProcessedBy,
            c.ProcessedAt,
            c.CreatedAt,
            booking = new { c.Booking.BookingNumber, c.Booking.FromDate, c.Booking.ToDate, c.Booking.Session },
        }));
    }

    [HttpPost("{bookingId:int}/request-otp")]
    public async Task<IActionResult> RequestCancellationOtp(int bookingId, [FromBody] CancellationOtpRequestDto dto)
    {
        var booking = await _db.Bookings
            .Include(item => item.Applicant)
            .Include(item => item.Payments)
            .FirstOrDefaultAsync(item => item.Id == bookingId);
        if (booking == null) return NotFound(new { error = "Booking not found." });

        var mobile = dto.Mobile?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(mobile) || booking.Applicant?.Mobile != mobile)
            return BadRequest(new { error = "The registered mobile number could not be verified." });

        var ineligibilityReason = GetCancellationIneligibilityReason(booking);
        if (ineligibilityReason != null) return Conflict(new { error = ineligibilityReason });
        if (await _db.Cancellations.AnyAsync(item => item.BookingId == bookingId))
            return Conflict(new { error = "A cancellation application already exists for this booking." });

        var now = DateTime.UtcNow;
        var challenge = await _db.CancellationOtpChallenges.FindAsync(bookingId);
        if (challenge != null && challenge.UsedAt == null && now - challenge.CreatedAt < OtpRequestCooldown)
            return Conflict(new { error = "Wait 30 seconds before requesting another verification code." });

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        if (challenge == null)
        {
            challenge = new CancellationOtpChallenge { BookingId = bookingId, Mobile = mobile };
            _db.CancellationOtpChallenges.Add(challenge);
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
            await _notifications.SendOneTimeCodeAsync(mobile, otp, "cancellation application");
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
    public async Task<IActionResult> ApplyVerifiedCancellation(int bookingId, [FromBody] ApplyCancellationVerifiedDto dto)
    {
        var mobile = dto.Mobile.Trim();
        var otp = dto.Otp.Trim();
        var reason = dto.Reason.Trim();
        var result = await _db.Database.CreateExecutionStrategy().ExecuteAsync<IActionResult>(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var booking = await _db.Bookings
                .Include(item => item.Applicant)
                .Include(item => item.Payments)
                .FirstOrDefaultAsync(item => item.Id == bookingId);
            if (booking == null) return NotFound(new { error = "Booking not found." });
            if (string.IsNullOrWhiteSpace(mobile) || booking.Applicant?.Mobile != mobile)
                return BadRequest(new { error = "The registered mobile number could not be verified." });

            var ineligibilityReason = GetCancellationIneligibilityReason(booking);
            if (ineligibilityReason != null) return Conflict(new { error = ineligibilityReason });
            if (await _db.Cancellations.AnyAsync(item => item.BookingId == bookingId))
                return Conflict(new { error = "A cancellation application already exists for this booking." });

            var challenge = await _db.CancellationOtpChallenges.SingleOrDefaultAsync(item => item.BookingId == bookingId);
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
            booking.Status = "Cancelled";
            booking.CancelReason = reason;
            booking.UpdatedAt = now;
            var cancellation = new Cancellation
            {
                BookingId = booking.Id,
                Reason = reason,
                RequestedBy = booking.Applicant?.FullName ?? "Applicant",
                RefundAmount = CalculateRefundAmount(booking, now),
                RefundStatus = "Pending",
                CreatedAt = now,
            };
            _db.Cancellations.Add(cancellation);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                cancellation.Id,
                cancellation.BookingId,
                cancellation.Reason,
                cancellation.RequestedBy,
                cancellation.RefundAmount,
                cancellation.RefundStatus,
                cancellation.CreatedAt,
                bookingNumber = booking.BookingNumber,
            });
        });

        return result;
    }

    [HttpPost]
    public IActionResult RequestCancellation() =>
        Conflict(new { error = "Verify the registered mobile number with an OTP before applying for cancellation." });

    private static string? GetCancellationIneligibilityReason(Booking booking)
    {
        if (booking.Status != "Confirmed")
            return "Cancellation is available only for confirmed bookings.";
        if (!booking.Payments.Any(payment => payment.Status == "Paid"))
            return "Cancellation is available only for bookings with a recorded payment.";
        return null;
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id}/process")]
    public async Task<IActionResult> ProcessRefund(int id, [FromBody] ProcessRefundDto dto)
    {
        var c = await _db.Cancellations.Include(cancellation => cancellation.Booking)
            .FirstOrDefaultAsync(cancellation => cancellation.Id == id);
        if (c == null) return NotFound();
        if (c.RefundStatus != "Pending") return Conflict(new { error = "This cancellation refund has already been processed." });

        var calculatedRefund = CalculateRefundAmount(c.Booking, c.CreatedAt);
        if (dto.RefundAmount != calculatedRefund)
            return BadRequest(new { error = $"Refund amount must match the cancellation policy amount of {calculatedRefund:0.00}." });

        c.RefundAmount  = calculatedRefund;
        c.RefundStatus  = "Processed";
        c.ProcessedAt   = DateTime.UtcNow;
        var userId      = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        c.ProcessedBy   = userId == 0 ? null : userId;
        await _db.SaveChangesAsync();
        return Ok(c);
    }

    private static decimal CalculateRefundAmount(Booking booking, DateTime cancellationDateTime)
    {
        var cancellationDate = DateOnly.FromDateTime(cancellationDateTime);
        var eventDate = booking.FromDate;
        if (eventDate >= cancellationDate.AddMonths(2))
            return Math.Round(booking.GrandTotal * 0.90m, 2, MidpointRounding.AwayFromZero);
        if (eventDate >= cancellationDate.AddMonths(1))
            return Math.Round(booking.GrandTotal * 0.80m, 2, MidpointRounding.AwayFromZero);
        if (eventDate.DayNumber - cancellationDate.DayNumber >= 7)
            return Math.Round(booking.GrandTotal * 0.50m, 2, MidpointRounding.AwayFromZero);
        return booking.SecurityDeposit;
    }
}

// ── Receipts Controller ────────────────────────────────────────────────────────
[Authorize(Policy = "StaffPlus")]
[ApiController]
[Route("api/[controller]")]
public class ReceiptsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IReceiptService _receipts;
    private readonly INotificationService _notifications;
    public ReceiptsController(AppDbContext db, IReceiptService receipts, INotificationService notifications)
    {
        _db = db;
        _receipts = receipts;
        _notifications = notifications;
    }

    [HttpGet("booking/{bookingId}")]
    public async Task<IActionResult> GetByBooking(int bookingId)
    {
        var receipt = await _db.Receipts
            .Include(r => r.Payment)
            .FirstOrDefaultAsync(r => r.BookingId == bookingId);
        return receipt == null ? NotFound() : Ok(receipt);
    }

    [AllowAnonymous]
    [HttpGet("number/{bookingNumber}/pdf")]
    public async Task<IActionResult> DownloadByBookingNumber(string bookingNumber)
    {
        var receipt = await _db.Receipts
            .Include(item => item.Payment)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.Venue)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.VenuePricing)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.Applicant)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.EquipmentItems)
            .FirstOrDefaultAsync(item =>
                item.Booking.BookingNumber == bookingNumber &&
                item.Payment.Status == "Paid");
        if (receipt == null) return NotFound(new { error = "A paid receipt was not found for this booking." });

        var pdf = _receipts.GenerateReceiptPdf(receipt.Booking, receipt.Payment, receipt.ReceiptNumber);
        return File(pdf, "application/pdf", $"Receipt-{receipt.ReceiptNumber}.pdf");
    }

    [AllowAnonymous]
    [HttpPost("number/{bookingNumber}/email")]
    public async Task<IActionResult> ResendByBookingNumber(string bookingNumber)
    {
        var receipt = await _db.Receipts
            .Include(item => item.Payment)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.Venue)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.VenuePricing)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.Applicant)
            .Include(item => item.Booking)
                .ThenInclude(booking => booking.EquipmentItems)
            .FirstOrDefaultAsync(item =>
                item.Booking.BookingNumber == bookingNumber &&
                item.Payment.Status == "Paid");
        if (receipt == null) return NotFound(new { error = "A paid receipt was not found for this booking." });
        if (string.IsNullOrWhiteSpace(receipt.Booking.Applicant?.Email))
            return Conflict(new { error = "No email address is registered for this booking." });

        var pdf = _receipts.GenerateReceiptPdf(receipt.Booking, receipt.Payment, receipt.ReceiptNumber);
        await _notifications.SendReceiptEmailAsync(receipt.Booking, receipt.Payment, receipt.ReceiptNumber, pdf);
        return Ok(new { message = "Receipt sent to the email address registered for this booking." });
    }
}

// ── DTOs ───────────────────────────────────────────────────────────────────────
public class CreateUserDto
{
    public string FullName { get; set; } = "";
    public string Email    { get; set; } = "";
    public string Mobile   { get; set; } = "";
    public string Password { get; set; } = "";
    public int    RoleId   { get; set; } = 2;
}

public class UpdateUserDto
{
    public string  FullName  { get; set; } = "";
    public string  Mobile    { get; set; } = "";
    public int     RoleId    { get; set; }
    public bool    IsActive  { get; set; }
    public string? Password  { get; set; }
}

public class ResolveDto
{
    public string Resolution { get; set; } = "";
}

public class ProcessRefundDto
{
    public decimal RefundAmount { get; set; }
}

public class CancellationOtpRequestDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";
}

public class ApplyCancellationVerifiedDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{6}$")]
    public string Otp { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.MaxLength(500)]
    public string Reason { get; set; } = "";
}
