using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;

namespace HutatmaBooking.API.Services;

public class ReceiptService : IReceiptService
{
    private static readonly CultureInfo IndianCulture = CultureInfo.GetCultureInfo("en-IN");
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
            ("Venue", booking.Venue?.VenueName ?? "N/A"),
            ("Price Item", booking.VenuePricing?.PriceItemName ?? "N/A"),
            ("Booking Dates", $"{booking.FromDate:dd MMM yyyy} to {booking.ToDate:dd MMM yyyy}"),
            ("Session", booking.Session == "FullDay" ? "Full Day" : booking.Session),
            ("Total Days", booking.TotalDays.ToString(CultureInfo.InvariantCulture)),
            ("Booking Status", booking.Status),
            ("Base Rent", FormatAmount(booking.BaseRent)),
            ("Holiday Charges", FormatAmount(booking.HolidayCharge)),
            ("Equipment Charges", FormatAmount(booking.EquipmentCharge))
        };

        var equipmentItems = booking.EquipmentItems
            .Where(item => item.Quantity > 0)
            .OrderBy(item => item.EquipmentName)
            .Select(item => $"{item.EquipmentName}: {item.Quantity} x {FormatAmount(item.UnitPrice)} = {FormatAmount(item.TotalPrice)}")
            .ToList();
        if (equipmentItems.Count > 0)
            bookingDetails.Add(("Equipment", string.Join("; ", equipmentItems)));

        bookingDetails.AddRange(
        [
            ("Security Deposit", FormatAmount(booking.SecurityDeposit)),
            ("CGST", FormatAmount(booking.CGSTAmount)),
            ("SGST", FormatAmount(booking.SGSTAmount)),
            ("TOTAL PAID", FormatAmount(payment.Amount))
        ]);

        var applicant = booking.Applicant;
        var applicantDetails = new List<(string Label, string Value)>
        {
            ("Applicant Name", applicant?.FullName ?? "N/A"),
            ("Mobile", applicant?.Mobile ?? "N/A"),
            ("Alternate Mobile", applicant?.AlternateMobile ?? "N/A"),
            ("Email", applicant?.Email ?? "N/A"),
            ("Address", applicant?.Address ?? "N/A"),
            ("Function", $"{applicant?.FunctionName ?? "N/A"} ({applicant?.FunctionType ?? "N/A"})"),
            ("Expected Guests", applicant?.ExpectedGuests.ToString(CultureInfo.InvariantCulture) ?? "N/A"),
            ("ID Proof Type", applicant?.IDProofType ?? "N/A")
        };

        var bank = booking.BankDetail;
        var paymentAndBankDetails = new List<(string Label, string Value)>
        {
            ("Payment Status", payment.Status),
            ("Payment Method", payment.PaymentMethod),
            ("Transaction Reference", payment.TransactionRef ?? payment.GatewayPaymentId ?? "N/A"),
            ("Payment Date", payment.PaymentDate?.ToString("dd MMM yyyy", CultureInfo.InvariantCulture) ?? "N/A"),
            ("Account Holder", bank?.AccountHolderName ?? "N/A"),
            ("Bank Name", bank?.BankName ?? "N/A"),
            ("Account Number", bank?.AccountNumber ?? "N/A"),
            ("Branch", bank?.BranchName ?? "N/A"),
            ("IFSC Code", bank?.IFSCCode ?? "N/A"),
            ("MICR Code", bank?.MICRCode ?? "N/A")
        };

        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        var logoBytes = File.ReadAllBytes(Path.Combine(webRoot, "SMC.png"));

        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(34);
                page.MarginVertical(28);
                page.DefaultTextStyle(style => style.FontFamily("Arial").FontSize(8.5f).FontColor(Colors.Grey.Darken4));
                page.Header().PaddingBottom(9).BorderBottom(1.5f).BorderColor(Colors.Purple.Darken2).Row(row =>
                {
                    row.RelativeItem().Column(header =>
                    {
                        header.Item().Text("HUTATMA SMRUTI MANDIR")
                            .FontSize(17).FontColor(Colors.Purple.Darken2).SemiBold();
                        header.Item().PaddingTop(2).Text("OFFICIAL VENUE BOOKING PAYMENT RECEIPT")
                            .FontSize(8).SemiBold().FontColor(Colors.Grey.Darken2);
                        header.Item().PaddingTop(5).Text($"Receipt No: {receiptNumber}  |  Issued: {DateTime.Now:dd MMM yyyy}")
                            .FontSize(8).FontColor(Colors.Grey.Darken2);
                    });
                    row.ConstantItem(76).Height(68).AlignRight().AlignMiddle()
                        .Image(logoBytes).FitArea();
                });
                page.Content().ShowEntire().PaddingTop(12).Column(content =>
                {
                    content.Spacing(10);
                    content.Item().Row(sections =>
                    {
                        sections.RelativeItem(0.9f).Column(section =>
                            ComposeSection(section, "SECTION 1 - APPLICATION DETAILS", applicantDetails, pairRows: false));
                        sections.ConstantItem(18);
                        sections.RelativeItem(1.1f).Column(section =>
                            ComposeSection(section, "SECTION 2 - BOOKING AND CHARGES DETAILS", bookingDetails, pairRows: false));
                    });
                    ComposeSection(content, "SECTION 3 - PAYMENT AND BANK DETAILS", paymentAndBankDetails);
                    content.Item().PaddingTop(10).BorderTop(0.75f).BorderColor(Colors.Grey.Lighten1)
                        .PaddingTop(8).Text("This receipt confirms payment recorded by Hutatma Smruti Mandir. Please retain it for your records.")
                        .FontSize(9).FontColor(Colors.Grey.Darken2);
                });
            });
        }).GeneratePdf();
    }

    private static string FormatAmount(decimal amount) =>
        $"INR {amount.ToString("N2", IndianCulture)}";

    private static void ComposeSection(
        ColumnDescriptor column,
        string title,
        IReadOnlyList<(string Label, string Value)> rows,
        bool pairRows = true)
    {
        column.Item().PaddingTop(8).PaddingBottom(6).PaddingHorizontal(8)
            .Background(Colors.Purple.Lighten5).BorderLeft(2).BorderColor(Colors.Purple.Medium)
            .PaddingLeft(6).Text(title).FontSize(10).FontColor(Colors.Purple.Darken2).SemiBold();

        var rowStep = pairRows ? 2 : 1;
        for (var index = 0; index < rows.Count; index += rowStep)
        {
            var left = rows[index];
            var hasRight = pairRows && index + 1 < rows.Count;
            var right = hasRight ? rows[index + 1] : default;
            column.Item().PaddingVertical(pairRows ? 5 : 4).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Row(row =>
            {
                ComposeFact(row.RelativeItem(), left);
                if (hasRight)
                {
                    row.ConstantItem(12);
                    ComposeFact(row.RelativeItem(), right);
                }
            });
        }
    }

    private static void ComposeFact(IContainer container, (string Label, string Value) fact)
    {
        container.Row(row =>
        {
            row.ConstantItem(78).Text(fact.Label).FontSize(8.5f).FontColor(Colors.Grey.Darken2);
            var value = row.RelativeItem().Text(fact.Value).FontSize(9).SemiBold();
            if (fact.Label == "TOTAL PAID")
                value.FontColor(Colors.Purple.Darken2);
        });
    }
}
