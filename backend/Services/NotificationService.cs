using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;

namespace HutatmaBooking.API.Services;

public class NotificationService : INotificationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(IConfiguration config, ILogger<NotificationService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendBookingPaymentNotificationAsync(Booking booking, Payment payment, string receiptNumber)
    {
        var emailEnabled = !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:Host"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:FromEmail"]);
        var smsEnabled = !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Twilio:AccountSid"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Twilio:AuthToken"]);

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
                await SendSmsAsync(booking.Applicant.Mobile, message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMS notification failed for booking {BookingNumber}", booking.BookingNumber);
            }
        }
    }

    private async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        using var client = new SmtpClient(_config["PaymentNotifications:Smtp:Host"])
        {
            Port = int.Parse(_config["PaymentNotifications:Smtp:Port"] ?? "587"),
            EnableSsl = bool.Parse(_config["PaymentNotifications:Smtp:EnableSsl"] ?? "true"),
            Credentials = new NetworkCredential(
                _config["PaymentNotifications:Smtp:Username"],
                _config["PaymentNotifications:Smtp:Password"])
        };

        using var message = new MailMessage(
            _config["PaymentNotifications:Smtp:FromEmail"],
            toEmail,
            subject,
            body)
        {
            IsBodyHtml = false
        };

        await client.SendMailAsync(message);
    }

    private async Task SendSmsAsync(string mobile, string body)
    {
        var accountSid = _config["PaymentNotifications:Twilio:AccountSid"];
        var authToken = _config["PaymentNotifications:Twilio:AuthToken"];
        var fromNumber = _config["PaymentNotifications:Twilio:FromNumber"];
        var normalizedMobile = mobile.StartsWith("+") ? mobile : $"+91{mobile}";

        using var client = new HttpClient();
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{accountSid}:{authToken}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var formData = new Dictionary<string, string>
        {
            ["From"] = fromNumber ?? "",
            ["To"] = normalizedMobile,
            ["Body"] = body
        };

        await client.PostAsync($"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json", new FormUrlEncodedContent(formData));
    }
}
