using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HutatmaBooking.API.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration  _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUserRepository userRepo, IConfiguration config, ILogger<AuthService> logger)
    {
        _userRepo = userRepo;
        _config   = config;
        _logger   = logger;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto dto)
    {
        var user = await _userRepo.GetByEmailAsync(dto.Email);
        if (user == null)
        {
            _logger.LogWarning("Login failed - user not found: {Email}", dto.Email);
            return null;
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed - invalid password for: {Email}", dto.Email);
            return null;
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed - user inactive: {Email}", dto.Email);
            return null;
        }

        var token    = GenerateJwtToken(user.Id, user.Email, user.Role.Name);
        var expiresAt = DateTime.UtcNow.AddHours(
            double.Parse(_config["Jwt:ExpiryHours"] ?? "8"));

        return new LoginResponseDto
        {
            Token     = token,
            FullName  = user.FullName,
            Role      = user.Role.Name,
            ExpiresAt = expiresAt
        };
    }

    private string GenerateJwtToken(int userId, string email, string role)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddHours(double.Parse(_config["Jwt:ExpiryHours"] ?? "8"));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role,               role),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:   _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims:   claims,
            expires:  expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
