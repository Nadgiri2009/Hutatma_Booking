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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var result = await _auth.LoginAsync(dto);
        if (result == null) return Unauthorized(new { message = "Invalid credentials." });
        return Ok(result);
    }
}
