using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Data;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;

namespace HutatmaBooking.API.Services;

public class AuthService : IAuthService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan OtpRequestCooldown = TimeSpan.FromSeconds(30);
    private const int MaxOtpAttempts = 5;

    private readonly IUserRepository _userRepo;
    private readonly AppDbContext _db;
    private readonly IConfiguration  _config;
    private readonly ILogger<AuthService> _logger;
    private readonly INotificationService _notifications;

    public AuthService(
        IUserRepository userRepo,
        AppDbContext db,
        IConfiguration config,
        ILogger<AuthService> logger,
        INotificationService notifications)
    {
        _userRepo = userRepo;
        _db       = db;
        _config   = config;
        _logger   = logger;
        _notifications = notifications;
    }

    public async Task RequestAdminOtpAsync(string mobile)
    {
        var normalizedMobile = mobile.Trim();
        var user = await _userRepo.GetAdminByMobileAsync(normalizedMobile);
        if (user == null || !user.IsActive || user.Role.Name is not ("Admin" or "Staff" or "Clerk"))
        {
            _logger.LogInformation("Admin OTP request ignored for an ineligible account.");
            return;
        }

        var now = DateTime.UtcNow;
        var challenge = await _db.AdminLoginOtps.FindAsync(normalizedMobile);
        if (challenge != null && now - challenge.CreatedAt < OtpRequestCooldown)
        {
            _logger.LogInformation("Admin OTP request is cooling down for the submitted mobile number.");
            return;
        }

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        if (challenge == null)
        {
            challenge = new AdminLoginOtp { Mobile = normalizedMobile };
            _db.AdminLoginOtps.Add(challenge);
        }
        challenge.OtpHash = SHA256.HashData(Encoding.UTF8.GetBytes(otp));
        challenge.CreatedAt = now;
        challenge.ExpiresAt = now.Add(OtpLifetime);
        challenge.FailedAttempts = 0;
        challenge.UsedAt = null;
        await _db.SaveChangesAsync();
        await _notifications.SendOneTimeCodeAsync(normalizedMobile, otp, "admin login");
    }

    public async Task<LoginResponseDto?> VerifyAdminOtpAsync(string mobile, string otp)
    {
        var normalizedMobile = mobile.Trim();
        var user = await _userRepo.GetAdminByMobileAsync(normalizedMobile);
        if (user == null || !user.IsActive || user.Role.Name is not ("Admin" or "Staff" or "Clerk"))
        {
            _logger.LogWarning("Admin OTP verification failed because the account is no longer eligible.");
            return null;
        }

        var otpAccepted = await _db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            _db.ChangeTracker.Clear();
            await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            var challenge = await _db.AdminLoginOtps.SingleOrDefaultAsync(item => item.Mobile == normalizedMobile);
            var now = DateTime.UtcNow;
            if (challenge == null || challenge.UsedAt != null || challenge.ExpiresAt <= now)
            {
                if (challenge != null && challenge.UsedAt == null)
                {
                    challenge.UsedAt = now;
                    challenge.OtpHash = new byte[32];
                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                return false;
            }

            var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(otp.Trim()));
            if (!CryptographicOperations.FixedTimeEquals(challenge.OtpHash, providedHash))
            {
                challenge.FailedAttempts++;
                if (challenge.FailedAttempts >= MaxOtpAttempts)
                {
                    challenge.UsedAt = now;
                    challenge.OtpHash = new byte[32];
                }
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return false;
            }

            challenge.UsedAt = now;
            challenge.OtpHash = new byte[32];
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        });
        if (!otpAccepted) return null;

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
