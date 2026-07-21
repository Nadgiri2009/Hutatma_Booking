using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _svc;
    public BookingsController(IBookingService svc) => _svc = svc;

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
