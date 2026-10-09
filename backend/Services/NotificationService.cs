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
        var amountCulture = System.Globalization.CultureInfo.GetCultureInfo("en-IN");
        var amount = payment.Amount.ToString("N2", amountCulture);
        var applicant = booking.Applicant;
        var bank = booking.BankDetail;
        var logoPath = Path.Combine(_environment.WebRootPath, "SMC.png");
        var logoAvailable = File.Exists(logoPath);
        var logo = logoAvailable
            ? "<img src=\"cid:smc-logo\" alt=\"SMC logo\" width=\"72\" height=\"72\" style=\"display:block;width:72px;height:72px;object-fit:contain\">"
            : "";
        var applicantRows = new[]
        {
            ("Applicant Name", applicant?.FullName ?? "N/A"),
            ("Mobile", applicant?.Mobile ?? "N/A"),
            ("Alternate Mobile", applicant?.AlternateMobile ?? "N/A"),
            ("Email", applicant?.Email ?? "N/A"),
            ("Address", applicant?.Address ?? "N/A"),
            ("Function", $"{applicant?.FunctionName ?? "N/A"} ({applicant?.FunctionType ?? "N/A"})"),
            ("Expected Guests", applicant?.ExpectedGuests.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "N/A"),
            ("ID Proof Type", applicant?.IDProofType ?? "N/A")
        };
        var bookingRows = new List<(string Label, string Value)>
        {
            ("Booking ID", booking.BookingNumber),
            ("Venue", booking.Venue?.VenueName ?? "N/A"),
            ("Price Item", booking.VenuePricing?.PriceItemName ?? "N/A"),
            ("Booking Dates", $"{booking.FromDate:dd MMM yyyy} to {booking.ToDate:dd MMM yyyy}"),
            ("Session", booking.Session == "FullDay" ? "Full Day" : booking.Session),
            ("Total Days", booking.TotalDays.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            ("Booking Status", booking.Status),
            ("Base Rent", $"INR {booking.BaseRent.ToString("N2", amountCulture)}"),
            ("Holiday Charges", $"INR {booking.HolidayCharge.ToString("N2", amountCulture)}"),
            ("Equipment Charges", $"INR {booking.EquipmentCharge.ToString("N2", amountCulture)}")
        };
        var equipmentDetails = booking.EquipmentItems
            .Where(item => item.Quantity > 0)
            .OrderBy(item => item.EquipmentName)
            .Select(item => $"{item.EquipmentName}: {item.Quantity} x INR {item.UnitPrice.ToString("N2", amountCulture)}")
            .ToList();
        if (equipmentDetails.Count > 0)
            bookingRows.Add(("Equipment", string.Join("; ", equipmentDetails)));
        bookingRows.AddRange(new[]
        {
            ("Security Deposit", $"INR {booking.SecurityDeposit.ToString("N2", amountCulture)}"),
            ("CGST", $"INR {booking.CGSTAmount.ToString("N2", amountCulture)}"),
            ("SGST", $"INR {booking.SGSTAmount.ToString("N2", amountCulture)}"),
            ("TOTAL PAID", $"INR {amount}")
        });
        var paymentAndBankRows = new[]
        {
            ("Receipt Number", receiptNumber),
            ("Payment Status", payment.Status),
            ("Payment Method", payment.PaymentMethod),
            ("Transaction Reference", reference),
            ("Payment Date", payment.PaymentDate?.ToString("dd MMM yyyy", System.Globalization.CultureInfo.InvariantCulture) ?? "N/A"),
            ("Account Holder", bank?.AccountHolderName ?? "N/A"),
            ("Bank Name", bank?.BankName ?? "N/A"),
            ("Account Number", bank?.AccountNumber ?? "N/A"),
            ("Branch", bank?.BranchName ?? "N/A"),
            ("IFSC Code", bank?.IFSCCode ?? "N/A"),
            ("MICR Code", bank?.MICRCode ?? "N/A")
        };
        var body = $"""
            <!doctype html>
            <html><body style="margin:0;padding:24px;background:#f3f1f4;font-family:Arial,Helvetica,sans-serif;color:#29232d">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:760px;margin:0 auto;background:#fff;border:1px solid #e5dfe8;border-collapse:collapse">
                <tr><td style="padding:20px 24px 14px;border-bottom:3px solid #50175d">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>
                    <td style="vertical-align:middle"><h1 style="margin:0;color:#50175d;font-size:20px">Hutatma Smruti Mandir</h1>
                      <p style="margin:5px 0 0;color:#625969;font-size:12px">OFFICIAL VENUE BOOKING PAYMENT RECEIPT</p>
                      <p style="margin:8px 0 0;color:#625969;font-size:12px">Receipt No: {WebUtility.HtmlEncode(receiptNumber)} &nbsp; | &nbsp; Issued: {DateTime.Now:dd MMM yyyy}</p>
                    </td><td style="width:82px;text-align:right;vertical-align:middle">{logo}</td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:6px 24px 16px">
                  <p style="margin:8px 0 12px;font-size:13px">Dear {WebUtility.HtmlEncode(applicant?.FullName ?? "Applicant")}, your payment has been recorded. The single-page receipt is attached as a PDF.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr>
                    <td style="width:50%;padding-right:5px;vertical-align:top">{EmailSection("SECTION 1 - APPLICATION DETAILS", applicantRows)}</td>
                    <td style="width:50%;padding-left:5px;vertical-align:top">{EmailSection("SECTION 2 - BOOKING AND CHARGES DETAILS", bookingRows)}</td>
                  </tr></table>
                  {EmailSection("SECTION 3 - PAYMENT AND BANK DETAILS", paymentAndBankRows)}
                  <p style="margin:12px 0 0;color:#625969;font-size:11px">Please retain this receipt for your records. This is an automated message; please do not reply.</p>
                </td></tr>
              </table>
            </body></html>
            """;
        await SendEmailAsync(recipientEmail, "Hutatma Smruti Mandir - payment receipt", body, receiptPdf, receiptNumber, logoPath, logoAvailable);
    }

    private static string EmailSection(string title, IEnumerable<(string Label, string Value)> rows)
    {
        var content = string.Join("", rows.Select(row =>
            $"<tr><td style=\"padding:5px 7px;border-bottom:1px solid #eee9f0;color:#625969;width:34%;font-size:11px\">{WebUtility.HtmlEncode(row.Label)}</td><td style=\"padding:5px 7px;border-bottom:1px solid #eee9f0;font-weight:600;font-size:11px\">{WebUtility.HtmlEncode(row.Value)}</td></tr>"));
        return $"""
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:8px;border:1px solid #e5dfe8;border-collapse:collapse">
              <tr><th colspan="2" style="padding:7px 9px;background:#f3edf5;border-left:3px solid #7d3688;color:#50175d;text-align:left;font-size:12px">{WebUtility.HtmlEncode(title)}</th></tr>
              {content}
            </table>
            """;
    }

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
