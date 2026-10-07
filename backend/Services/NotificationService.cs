using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using Microsoft.AspNetCore.Hosting;

namespace HutatmaBooking.API.Services;

public class NotificationService : INotificationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;

    public NotificationService(
        IConfiguration config,
        ILogger<NotificationService> logger,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendOneTimeCodeAsync(string mobile, string otp, string purpose)
    {
        try
        {
            if (_environment.IsDevelopment())
            {
                Console.WriteLine($"TEMPORARY {purpose.ToUpperInvariant()} OTP for {mobile}: {otp} (expires in 5 minutes)");
                return;
            }

            if (IsAclGatewayConfigured())
            {
                await SendSmsAsync(
                    mobile,
                    $"Your Hutatma Smruti Mandir {purpose} verification code is {otp}. It expires in 5 minutes.",
                    "OtpDltTemplateId");
                return;
            }

            throw new InvalidOperationException("SMS verification is not configured.");
        }
        catch (Exception ex)
        {
            var failureDetails = ex switch
            {
                InvalidOperationException => ex.Message,
                HttpRequestException { InnerException: SocketException socketException } =>
                    $"network error {socketException.SocketErrorCode}",
                HttpRequestException httpException => $"HTTP {httpException.StatusCode?.ToString() ?? "no response"}",
                OperationCanceledException => "request timed out or was canceled",
                _ => ex.GetType().Name
            };
            _logger.LogError(
                "One-time-code SMS delivery failed for {Purpose}: {FailureDetails}",
                purpose,
                failureDetails);
            throw;
        }
    }

    public async Task SendBookingPaymentNotificationAsync(Booking booking, Payment payment, string receiptNumber)
    {
        var emailEnabled = !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:Host"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:FromEmail"]);
        var smsEnabled = IsAclGatewayConfigured();

        if (!emailEnabled && !smsEnabled)
        {
            _logger.LogInformation("Payment notifications skipped because no email or SMS credentials are configured.");
            return;
        }

        var message = $"Your booking {booking.BookingNumber} has been paid successfully. Receipt: {receiptNumber}.";

        if (emailEnabled && !string.IsNullOrWhiteSpace(booking.Applicant?.Email))
        {
            try
            {
                await SendEmailAsync(booking.Applicant.Email, "Booking payment confirmed", message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email notification failed for booking {BookingNumber}", booking.BookingNumber);
            }
        }

        if (smsEnabled && !string.IsNullOrWhiteSpace(booking.Applicant?.Mobile))
        {
            try
            {
                await SendSmsAsync(booking.Applicant.Mobile, message, "PaymentDltTemplateId");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMS notification failed for booking {BookingNumber}", booking.BookingNumber);
            }
        }
    }

    private async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var fromEmail = _config["PaymentNotifications:Smtp:FromEmail"]
            ?? throw new InvalidOperationException("SMTP sender email is not configured.");

        using var client = new SmtpClient(_config["PaymentNotifications:Smtp:Host"])
        {
            Port = int.Parse(_config["PaymentNotifications:Smtp:Port"] ?? "587"),
            EnableSsl = bool.Parse(_config["PaymentNotifications:Smtp:EnableSsl"] ?? "true"),
            Credentials = new NetworkCredential(
                _config["PaymentNotifications:Smtp:Username"],
                _config["PaymentNotifications:Smtp:Password"])
        };

        using var message = new MailMessage(
            fromEmail,
            toEmail,
            subject,
            body)
        {
            IsBodyHtml = false
        };

        await client.SendMailAsync(message);
    }

    private bool IsAclGatewayConfigured()
    {
        return !string.IsNullOrWhiteSpace(_config["PaymentNotifications:AclGateway:BaseUrl"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:AclGateway:AppId"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:AclGateway:UserId"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:AclGateway:Password"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:AclGateway:SenderId"]);
    }

    private async Task SendSmsAsync(string mobile, string body, string dltTemplateSetting)
    {
        var gateway = _config.GetSection("PaymentNotifications:AclGateway");
        var dltTemplateId = gateway[dltTemplateSetting];
        if (string.IsNullOrWhiteSpace(dltTemplateId))
        {
            throw new InvalidOperationException(
                $"ACL SMS gateway DLT template is not configured. Set PaymentNotifications:AclGateway:{dltTemplateSetting}.");
        }

        var phoneNumber = mobile.Trim();
        if (phoneNumber.StartsWith('+'))
        {
            phoneNumber = phoneNumber[1..];
        }
        else if (!phoneNumber.StartsWith("91", StringComparison.Ordinal))
        {
            phoneNumber = $"91{phoneNumber}";
        }

        var queryParameters = new Dictionary<string, string>
        {
            ["appid"] = gateway["AppId"]!,
            ["userId"] = gateway["UserId"]!,
            ["pass"] = gateway["Password"]!,
            ["contenttype"] = "1",
            ["from"] = gateway["SenderId"]!,
            ["to"] = phoneNumber,
            ["text"] = body,
            ["alert"] = "1",
            ["selfid"] = "true",
            ["dlrreq"] = "true",
            ["dtm"] = dltTemplateId
        };

        var queryString = string.Join("&", queryParameters.Select(parameter =>
            $"{Uri.EscapeDataString(parameter.Key)}={Uri.EscapeDataString(parameter.Value)}"));
        var requestUrl = $"{gateway["BaseUrl"]}?{queryString}";

        using var response = await _httpClientFactory.CreateClient().GetAsync(requestUrl);
        response.EnsureSuccessStatusCode();

        _logger.LogInformation("SMS sent through ACL gateway.");
    }
}
