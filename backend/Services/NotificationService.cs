using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using System.Net.Mime;
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

    public async Task SendBookingPaymentNotificationAsync(Booking booking, Payment payment, string receiptNumber, byte[] receiptPdf)
    {
        var emailEnabled = !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:Host"])
            && !string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:FromEmail"]);
        var smsEnabled = IsAclGatewayConfigured();

        if (!emailEnabled && !smsEnabled)
        {
            _logger.LogInformation("Payment notifications skipped because no email or SMS credentials are configured.");
            return;
        }

        var smsMessage = $"Your booking {booking.BookingNumber} has been paid successfully. Receipt: {receiptNumber}.";

        if (emailEnabled && !string.IsNullOrWhiteSpace(booking.Applicant?.Email))
        {
            try
            {
                await SendReceiptEmailAsync(booking, payment, receiptNumber, receiptPdf);
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
                await SendSmsAsync(booking.Applicant.Mobile, smsMessage, "PaymentDltTemplateId");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMS notification failed for booking {BookingNumber}", booking.BookingNumber);
            }
        }
    }

    public async Task SendReceiptEmailAsync(Booking booking, Payment payment, string receiptNumber, byte[] receiptPdf)
    {
        if (string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:Host"])
            || string.IsNullOrWhiteSpace(_config["PaymentNotifications:Smtp:FromEmail"]))
            throw new InvalidOperationException("Receipt email delivery is not configured.");
        var recipientEmail = booking.Applicant?.Email;
        if (string.IsNullOrWhiteSpace(recipientEmail))
            throw new InvalidOperationException("No email address is registered for this booking.");

        var reference = payment.TransactionRef ?? payment.GatewayPaymentId ?? "N/A";
        var amount = payment.Amount.ToString("N2", System.Globalization.CultureInfo.GetCultureInfo("en-IN"));
        var logoPath = Path.Combine(_environment.WebRootPath, "SMC.png");
        var logoAvailable = File.Exists(logoPath);
        var logo = logoAvailable
            ? "<img src=\"cid:smc-logo\" alt=\"Hutatma Smruti Mandir\" style=\"display:block;max-width:180px;max-height:90px;margin:0 auto 12px\">"
            : "";
        var body = $"""
            <!doctype html>
            <html><body style="margin:0;padding:24px;background:#f3f1f4;font-family:Arial,sans-serif;color:#29232d">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5dfe8;border-radius:8px">
                <tr><td style="padding:28px 32px 18px;text-align:center;border-bottom:3px solid #50175d">
                  {logo}<h1 style="margin:0;color:#50175d;font-size:22px">Hutatma Smruti Mandir</h1>
                  <p style="margin:6px 0 0;color:#625969">Booking payment receipt</p>
                </td></tr>
                <tr><td style="padding:24px 32px">
                  <p style="margin:0 0 16px">Dear {WebUtility.HtmlEncode(booking.Applicant?.FullName ?? "Applicant")},</p>
                  <p style="margin:0 0 20px">Your payment has been recorded successfully. The official receipt is attached as a PDF.</p>
                  <table role="presentation" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse">
                    {EmailRow("Booking ID", booking.BookingNumber)}
                    {EmailRow("Receipt Number", receiptNumber)}
                    {EmailRow("Venue", booking.Venue?.VenueName ?? "N/A")}
                    {EmailRow("Booking Dates", $"{booking.FromDate:dd MMM yyyy} to {booking.ToDate:dd MMM yyyy}")}
                    {EmailRow("Session", booking.Session == "FullDay" ? "Full Day" : booking.Session)}
                    {EmailRow("Payment Reference", reference)}
                    {EmailRow("Amount Paid", $"INR {amount}")}
                    {EmailRow("Payment Date", payment.PaymentDate?.ToString("dd MMM yyyy", System.Globalization.CultureInfo.InvariantCulture) ?? "N/A")}
                  </table>
                  <p style="margin:20px 0 0;color:#625969;font-size:13px">Please retain the attached receipt for your records. For assistance, contact Hutatma Smruti Mandir.</p>
                </td></tr>
                <tr><td style="padding:14px 32px;background:#f8f6f9;color:#756c7a;text-align:center;font-size:12px">This is an automated message. Please do not reply to this email.</td></tr>
              </table>
            </body></html>
            """;
        await SendEmailAsync(recipientEmail, "Hutatma Smruti Mandir - payment receipt", body, receiptPdf, receiptNumber, logoPath, logoAvailable);
    }

    private static string EmailRow(string label, string value) =>
        $"<tr><td style=\"border-bottom:1px solid #eee9f0;color:#625969;width:38%\">{WebUtility.HtmlEncode(label)}</td><td style=\"border-bottom:1px solid #eee9f0;font-weight:600\">{WebUtility.HtmlEncode(value)}</td></tr>";

    private async Task SendEmailAsync(string toEmail, string subject, string body, byte[] receiptPdf, string receiptNumber, string logoPath, bool logoAvailable)
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

        using var message = new MailMessage(fromEmail, toEmail, subject, "")
        {
            IsBodyHtml = true
        };
        var htmlView = AlternateView.CreateAlternateViewFromString(body, null, MediaTypeNames.Text.Html);
        if (logoAvailable)
        {
            var logo = new LinkedResource(logoPath, MediaTypeNames.Image.Png)
            {
                ContentId = "smc-logo",
                TransferEncoding = TransferEncoding.Base64
            };
            htmlView.LinkedResources.Add(logo);
        }
        message.AlternateViews.Add(htmlView);
        using var receiptStream = new MemoryStream(receiptPdf, writable: false);
        message.Attachments.Add(new Attachment(
            receiptStream,
            $"Receipt-{receiptNumber}.pdf",
            "application/pdf"));

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
