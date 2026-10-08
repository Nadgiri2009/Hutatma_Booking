using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using Microsoft.AspNetCore.Hosting;

namespace HutatmaBooking.API.Services;

public class ReceiptService : IReceiptService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;

    static ReceiptService() => QuestPDF.Settings.License = LicenseType.Community;

    public ReceiptService(AppDbContext db, IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    public async Task<string> GenerateReceiptAsync(int bookingId)
    {
        var receipt = await _db.Receipts.FirstOrDefaultAsync(item => item.BookingId == bookingId);
        return receipt?.ReceiptNumber ?? string.Empty;
    }

    public byte[] GenerateReceiptPdf(Booking booking, Payment payment, string receiptNumber)
    {
        var bookingDetails = new List<(string Label, string Value)>
        {
            ("Booking ID", booking.BookingNumber),
            ("Venue", booking.Venue?.VenueName ?? "Venue"),
            ("Price Item", booking.VenuePricing?.PriceItemName ?? "Booking"),
            ("Charge Unit", booking.VenuePricing?.ChargeUnit ?? "N/A"),
            ("Booking Dates", $"{booking.FromDate:dd MMM yyyy} to {booking.ToDate:dd MMM yyyy}"),
            ("Session", booking.Session == "FullDay" ? "Full Day" : booking.Session),
            ("Total Days", booking.TotalDays.ToString(CultureInfo.InvariantCulture)),
            ("Booking Status", booking.Status)
        };
        var applicantDetails = new List<(string Label, string Value)>
        {
            ("Applicant", booking.Applicant?.FullName ?? "N/A"),
            ("Mobile", booking.Applicant?.Mobile ?? "N/A"),
            ("Alternate Mobile", booking.Applicant?.AlternateMobile ?? "N/A"),
            ("Email", booking.Applicant?.Email ?? "N/A"),
            ("Address", booking.Applicant?.Address ?? "N/A"),
            ("Function", $"{booking.Applicant?.FunctionName ?? "N/A"} ({booking.Applicant?.FunctionType ?? "N/A"})"),
            ("Expected Guests", booking.Applicant?.ExpectedGuests.ToString(CultureInfo.InvariantCulture) ?? "N/A"),
            ("ID Proof Type", booking.Applicant?.IDProofType ?? "N/A")
        };
        var equipmentItems = booking.EquipmentItems
            .Where(item => item.Quantity > 0)
            .OrderBy(item => item.EquipmentName)
            .ToList();
        var chargeDetails = new List<(string Label, string Value)>
        {
            ("Base Rent", FormatAmount(booking.BaseRent)),
            ("Holiday Charges", FormatAmount(booking.HolidayCharge)),
            ("Equipment Charges", FormatAmount(booking.EquipmentCharge)),
            ("Security Deposit", FormatAmount(booking.SecurityDeposit)),
            ("CGST", FormatAmount(booking.CGSTAmount)),
            ("SGST", FormatAmount(booking.SGSTAmount)),
            ("TOTAL PAID", FormatAmount(payment.Amount))
        };
        var paymentDetails = new List<(string Label, string Value)>
        {
            ("Payment Status", payment.Status),
            ("Payment Method", payment.PaymentMethod),
            ("Transaction Reference", payment.TransactionRef ?? payment.GatewayPaymentId ?? "N/A"),
            ("Payment Date", payment.PaymentDate?.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) ?? "N/A")
        };
        var logoPath = Path.Combine(_environment.WebRootPath, "SMC.png");
        var logoBytes = File.Exists(logoPath) ? File.ReadAllBytes(logoPath) : null;

        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(style => style.FontFamily("Arial").FontSize(10));
                page.Header().PaddingBottom(12).BorderBottom(2).BorderColor(Colors.Purple.Medium).Row(row =>
                {
                    if (logoBytes != null)
                        row.ConstantItem(82).Height(66).Image(logoBytes).FitArea();
                    row.RelativeItem().Column(header =>
                    {
                        header.Item().Text("Hutatma Smruti Mandir").FontSize(18).FontColor(Colors.Purple.Darken2).SemiBold();
                        header.Item().Text("OFFICIAL VENUE BOOKING PAYMENT RECEIPT").FontSize(10).SemiBold();
                        header.Item().PaddingTop(5).Text($"Receipt Number: {receiptNumber}").SemiBold();
                        header.Item().Text($"Receipt Date: {DateTime.Now:dd MMM yyyy}");
                    });
                });
                page.Content().PaddingVertical(14).Column(content =>
                {
                    content.Spacing(5);
                    ComposeSection(content, "BOOKING DETAILS", bookingDetails);
                    ComposeSection(content, "APPLICANT DETAILS", applicantDetails);
                    if (equipmentItems.Count > 0)
                    {
                        ComposeSection(content, "EQUIPMENT", equipmentItems.Select(item =>
                            (item.EquipmentName, $"{item.Quantity} x {FormatAmount(item.UnitPrice)} = {FormatAmount(item.TotalPrice)}")));
                    }
                    ComposeSection(content, "CHARGES (INR)", chargeDetails);
                    ComposeSection(content, "PAYMENT DETAILS", paymentDetails);
                    content.Item().PaddingTop(12).Text("This receipt confirms payment recorded by Hutatma Smruti Mandir. Please retain it for your records.");
                });
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                });
            });
        }).GeneratePdf();
    }

    private static string FormatAmount(decimal amount) =>
        amount.ToString("N2", CultureInfo.GetCultureInfo("en-IN"));

    private static void ComposeSection(
        ColumnDescriptor column,
        string title,
        IEnumerable<(string Label, string Value)> rows)
    {
        column.Item().PaddingTop(10).PaddingBottom(3).Text(title).FontSize(11).FontColor(Colors.Purple.Darken2).SemiBold();
        foreach (var (label, value) in rows)
        {
            column.Item().PaddingVertical(3).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Row(row =>
            {
                var labelText = row.ConstantItem(155).Text(label);
                if (label == "TOTAL PAID")
                    labelText.SemiBold().FontColor(Colors.Purple.Darken2);
                else
                    labelText.FontColor(Colors.Grey.Darken2);
                row.RelativeItem().Text(value);
            });
        }
    }
}
