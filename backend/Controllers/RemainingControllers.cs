using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

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
    private readonly AppDbContext _db;
    public CancellationsController(AppDbContext db) => _db = db;

    [Authorize(Policy = "StaffPlus")]
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Cancellations.Include(c => c.Booking)
            .OrderByDescending(c => c.CreatedAt).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> RequestCancellation([FromBody] Cancellation dto)
    {
        var booking = await _db.Bookings.FindAsync(dto.BookingId);
        if (booking == null) return NotFound();
        if (booking.Status == "Cancelled") return BadRequest(new { error = "Already cancelled." });

        booking.Status      = "Cancelled";
        booking.CancelReason = dto.Reason;
        booking.UpdatedAt   = DateTime.UtcNow;

        dto.CreatedAt    = DateTime.UtcNow;
        dto.RefundStatus = "Pending";
        _db.Cancellations.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id}/process")]
    public async Task<IActionResult> ProcessRefund(int id, [FromBody] ProcessRefundDto dto)
    {
        var c = await _db.Cancellations.FindAsync(id);
        if (c == null) return NotFound();
        c.RefundAmount  = dto.RefundAmount;
        c.RefundStatus  = "Processed";
        c.ProcessedAt   = DateTime.UtcNow;
        var userId      = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        c.ProcessedBy   = userId == 0 ? null : userId;
        await _db.SaveChangesAsync();
        return Ok(c);
    }
}

// ── Receipts Controller ────────────────────────────────────────────────────────
[Authorize(Policy = "StaffPlus")]
[ApiController]
[Route("api/[controller]")]
public class ReceiptsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReceiptsController(AppDbContext db) => _db = db;

    [HttpGet("booking/{bookingId}")]
    public async Task<IActionResult> GetByBooking(int bookingId)
    {
        var receipt = await _db.Receipts
            .Include(r => r.Payment)
            .FirstOrDefaultAsync(r => r.BookingId == bookingId);
        return receipt == null ? NotFound() : Ok(receipt);
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
