using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] AdminOtpRequestDto dto)
    {
        await _auth.RequestAdminOtpAsync(dto.Mobile);
        return Ok(new { message = "If this is an active admin account, a one-time code has been sent to the backend terminal." });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] AdminOtpVerifyDto dto)
    {
        var result = await _auth.VerifyAdminOtpAsync(dto.Mobile, dto.Otp);
        if (result == null) return BadRequest(new { message = "The code is invalid or expired. Request a new code and try again." });
        return Ok(result);
    }
}
