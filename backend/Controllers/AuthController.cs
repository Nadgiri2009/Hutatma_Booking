using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IAuthService auth, IWebHostEnvironment environment)
    {
        _auth = auth;
        _environment = environment;
    }

    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] AdminOtpRequestDto dto)
    {
        await _auth.RequestAdminOtpAsync(dto.Mobile);
        var message = _environment.IsDevelopment()
            ? "If this is an active account, the one-time code is printed in the backend terminal."
            : "If this is an active account, the one-time code has been sent to the registered mobile number.";
        return Ok(new { message });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] AdminOtpVerifyDto dto)
    {
        var result = await _auth.VerifyAdminOtpAsync(dto.Mobile, dto.Otp);
        if (result == null) return BadRequest(new { message = "The code is invalid or expired. Request a new code and try again." });
        return Ok(result);
    }
}
