using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly IHolidayService _svc;
    public HolidaysController(IHolidayService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _svc.GetAllAsync());

    [Authorize(Policy = "StaffPlus")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] HolidayDto dto) =>
        Ok(await _svc.CreateAsync(dto));

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] HolidayDto dto) =>
        Ok(await _svc.UpdateAsync(id, dto));

    [Authorize(Policy = "StaffPlus")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _svc;
    public PaymentsController(IPaymentService svc) => _svc = svc;

    [Authorize(Policy = "StaffPlus")]
    [HttpGet("booking/{bookingId}")]
    public async Task<IActionResult> GetByBooking(int bookingId) =>
        Ok(await _svc.GetByBookingAsync(bookingId));

    [Authorize(Policy = "StaffPlus")]
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyPaymentDto dto)
    {
        var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
        var result = await _svc.VerifyPaymentAsync(dto, userId);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate([FromBody] InitiatePaymentDto dto)
    {
        var result = await _svc.InitiatePaymentAsync(dto);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("complete")]
    public async Task<IActionResult> Complete([FromBody] CompleteGatewayPaymentDto dto)
    {
        var result = await _svc.CompleteGatewayPaymentAsync(dto);
        return Ok(result);
    }
}

[ApiController]
[Route("api/[controller]")]
public class GalleryController : ControllerBase
{
    private readonly IGalleryService _svc;
    public GalleryController(IGalleryService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type) =>
        Ok(await _svc.GetAllAsync(type));

    [Authorize(Policy = "StaffPlus")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] GalleryItemDto dto) =>
        Ok(await _svc.CreateAsync(dto));

    [Authorize(Policy = "StaffPlus")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class NoticesController : ControllerBase
{
    private readonly INoticeService _svc;
    public NoticesController(INoticeService svc) => _svc = svc;

    [HttpGet("active")]
    public async Task<IActionResult> GetActive() => Ok(await _svc.GetActiveAsync());

    [Authorize(Policy = "StaffPlus")]
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _svc.GetAllAsync());

    [Authorize(Policy = "StaffPlus")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NoticeDto dto) =>
        Ok(await _svc.CreateAsync(dto));

    [Authorize(Policy = "StaffPlus")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] NoticeDto dto) =>
        Ok(await _svc.UpdateAsync(id, dto));

    [Authorize(Policy = "StaffPlus")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }
}

[Authorize(Policy = "StaffPlus")]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IBookingService _bookingSvc;
    public DashboardController(IBookingService bookingSvc) => _bookingSvc = bookingSvc;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var all = await _bookingSvc.GetAllAsync(new HutatmaBooking.API.DTOs.BookingFilterDto { PageSize = 1000 });
        var recent = await _bookingSvc.GetAllAsync(new HutatmaBooking.API.DTOs.BookingFilterDto { PageSize = 10 });

        return Ok(new
        {
            TotalBookings          = all.TotalCount,
            PendingPaymentBookings = all.Items.Count(b => b.Status == "PendingPayment"),
            ConfirmedBookings      = all.Items.Count(b => b.Status == "Confirmed"),
            CancelledBookings      = all.Items.Count(b => b.Status == "Cancelled"),
            TotalRevenue           = all.Items.Where(b => b.Status == "Confirmed").Sum(b => b.GrandTotal),
            RecentBookings         = recent.Items
        });
    }
}
