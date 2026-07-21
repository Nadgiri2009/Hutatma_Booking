using HutatmaBooking.API.Models;
using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Data;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;

namespace HutatmaBooking.API.Services;

public class HolidayService : IHolidayService
{
    private readonly IHolidayRepository _repo;
    public HolidayService(IHolidayRepository repo) => _repo = repo;

    public async Task<List<HolidayDto>> GetAllAsync()
    {
        var h = await _repo.GetAllAsync();
        return h.Select(Map).ToList();
    }

    public async Task<HolidayDto> CreateAsync(HolidayDto dto)
    {
        var h = new Holiday
        {
            HolidayDate = dto.HolidayDate,
            Name        = dto.Name,
            Description = dto.Description,
            IsActive    = dto.IsActive,
        };
        return Map(await _repo.CreateAsync(h));
    }

    public async Task<HolidayDto> UpdateAsync(int id, HolidayDto dto)
    {
        var all = await _repo.GetAllAsync();
        var h   = all.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException("Holiday not found.");
        h.HolidayDate = dto.HolidayDate;
        h.Name        = dto.Name;
        h.Description = dto.Description;
        h.IsActive    = dto.IsActive;
        await _repo.UpdateAsync(h);
        return Map(h);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await _repo.DeleteAsync(id);
        return true;
    }

    private static HolidayDto Map(Holiday h) => new()
    {
        Id = h.Id, HolidayDate = h.HolidayDate,
        Name = h.Name, Description = h.Description, IsActive = h.IsActive,
    };
}

// ── Payment Service ───────────────────────────────────────────────────────────
public class PaymentService : IPaymentService
{
    private readonly IPaymentRepository  _payRepo;
    private readonly IBookingRepository  _bookRepo;
    private readonly IBookingService      _bookingSvc;
    private readonly IAuditService       _audit;
    private readonly INotificationService _notifications;
    private readonly IConfiguration _config;
    private readonly AppDbContext        _db;
    private readonly IHttpClientFactory  _httpFactory;

    public PaymentService(
        IPaymentRepository payRepo,
        IBookingRepository bookRepo,
        IBookingService bookingSvc,
        IAuditService audit,
        INotificationService notifications,
        IConfiguration config,
        AppDbContext db,
        IHttpClientFactory httpFactory)
    {
        _payRepo  = payRepo;
        _bookRepo = bookRepo;
        _bookingSvc = bookingSvc;
        _audit    = audit;
        _notifications = notifications;
        _config = config;
        _db       = db;
        _httpFactory = httpFactory;
    }

    public async Task<PaymentInitiationResponseDto> InitiatePaymentAsync(InitiatePaymentDto dto)
    {
        var provider = _config["PaymentGateway:Provider"] ?? "Mock";
        var transactionRef = $"{provider.ToUpperInvariant()}-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var paymentMethod = dto.PaymentMethod switch
        {
            "UPI" => "UPI",
            "Card" => "Card",
            _ => "Card"
        };

        // If Razorpay provider, create an order via Razorpay API and return order details
        if (provider == "Razorpay")
        {
            var rKey = _config["PaymentGateway:Razorpay:Key"] ?? _config["PaymentGateway:Key"] ?? "";
            var rSecret = _config["PaymentGateway:Razorpay:Secret"] ?? _config["PaymentGateway:Secret"] ?? "";
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                           ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                           ?? "Production";

            if (string.IsNullOrWhiteSpace(rKey) || string.IsNullOrWhiteSpace(rSecret) ||
                rKey.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase) ||
                rSecret.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Razorpay API credentials are not configured for environment '{environment}'. " +
                    "Set PaymentGateway:Razorpay:Key and PaymentGateway:Razorpay:Secret in appsettings.{environment}.json or environment variables.");
            }

            var client = _httpFactory.CreateClient();
            var req = new
            {
                amount = (int)(dto.Amount * 100), // paise
                currency = "INR",
                receipt = transactionRef,
                payment_capture = 1
            };
            var content = new StringContent(JsonSerializer.Serialize(req), Encoding.UTF8, "application/json");
            var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{rKey}:{rSecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
            var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Razorpay order creation failed: {resp.StatusCode} {body}");
            }
            var respBody = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(respBody);
            var orderId = doc.RootElement.GetProperty("id").GetString() ?? "";
            var amount = doc.RootElement.GetProperty("amount").GetInt32();

            return new PaymentInitiationResponseDto
            {
                Success = true,
                PaymentMethod = paymentMethod,
                TransactionRef = transactionRef,
                Message = "Razorpay order created",
                GatewayKey = rKey,
                GatewayOrderId = orderId,
                Amount = amount,
                Currency = "INR",
                CustomerName = dto.CustomerName,
                CustomerEmail = dto.CustomerEmail,
                CustomerMobile = dto.CustomerMobile
            };
        }

        return new PaymentInitiationResponseDto
        {
            Success = true,
            PaymentMethod = paymentMethod,
            TransactionRef = transactionRef,
            Message = "Payment initiation started. Use the callback to complete the payment.",
            GatewayUrl = provider == "Mock" ? "/payment/complete" : null
        };
    }

    public async Task<PaymentDto> CompleteGatewayPaymentAsync(CompleteGatewayPaymentDto dto)
    {
        // If provider is Razorpay, verify signature
        var provider = _config["PaymentGateway:Provider"] ?? "Mock";
        if (provider == "Razorpay")
        {
            var secret = _config["PaymentGateway:Razorpay:Secret"] ?? _config["PaymentGateway:Secret"] ?? "";
            if (string.IsNullOrEmpty(secret)) throw new InvalidOperationException("Razorpay secret not configured.");
            var payload = $"{dto.GatewayOrderId}|{dto.GatewayPaymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computed = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            var provided = (dto.GatewaySignature ?? "").ToLowerInvariant();
            if (computed != provided)
                throw new InvalidOperationException("Invalid payment signature.");
        }

        var bookingResult = await _bookingSvc.CreateBookingAsync(dto.Booking);
        var booking = await _bookRepo.GetByIdAsync(bookingResult.Id)
            ?? throw new InvalidOperationException("Created booking could not be loaded.");

        var payments = await _payRepo.GetByBookingAsync(booking.Id);
        var payment = payments.FirstOrDefault(p => p.Status == "Pending")
            ?? throw new InvalidOperationException("No pending payment found for the created booking.");

        payment.TransactionRef = dto.TransactionRef;
        if (!string.IsNullOrEmpty(dto.GatewayOrderId)) payment.GatewayOrderId = dto.GatewayOrderId;
        if (!string.IsNullOrEmpty(dto.GatewayPaymentId)) payment.GatewayPaymentId = dto.GatewayPaymentId;
        if (!string.IsNullOrEmpty(dto.GatewaySignature)) payment.GatewaySignature = dto.GatewaySignature;
        payment.PaymentDate = dto.PaymentDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        payment.PaymentMethod = dto.PaymentMethod;
        payment.Status = "Paid";
        payment.Remarks = "Completed through gateway";
        payment.VerifiedAt = DateTime.UtcNow;

        await _payRepo.UpdateAsync(payment);

        var receiptCount = _db.Receipts.Count() + 1;
        var receipt = new Receipt
        {
            ReceiptNumber = $"RCP-{DateTime.UtcNow.Year}-{receiptCount:D5}",
            BookingId = booking.Id,
            PaymentId = payment.Id,
            GeneratedBy = null,
        };
        _db.Receipts.Add(receipt);

        booking.Status = "Confirmed";
        booking.UpdatedAt = DateTime.UtcNow;
        _db.Bookings.Update(booking);
        await _db.SaveChangesAsync();

        await _notifications.SendBookingPaymentNotificationAsync(booking, payment, receipt.ReceiptNumber);
        await _audit.LogAsync("GatewayPaymentCompleted", "Payments", payment.Id, "Pending", "Paid");

        return new PaymentDto
        {
            Id = payment.Id,
            BookingId = bookingResult.Id,
            BookingNumber = bookingResult.BookingNumber,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            TransactionRef = payment.TransactionRef,
            PaymentDate = payment.PaymentDate,
            Status = payment.Status,
            ReceiptNumber = receipt.ReceiptNumber,
        };
    }

    public async Task<PaymentDto> VerifyPaymentAsync(VerifyPaymentDto dto, int adminUserId)
    {
        var booking = await _bookRepo.GetByIdAsync(dto.BookingId)
            ?? throw new KeyNotFoundException("Booking not found.");

        if (booking.Status != "PendingPayment")
            throw new InvalidOperationException("Booking is not in a payable state.");

        var payments = await _payRepo.GetByBookingAsync(dto.BookingId);
        var payment  = payments.FirstOrDefault(p => p.Status == "Pending")
            ?? new Payment { BookingId = dto.BookingId, Amount = booking.GrandTotal };

        payment.TransactionRef = dto.TransactionRef;
        payment.PaymentDate    = dto.PaymentDate;
        payment.Status         = "Paid";
        payment.Remarks        = dto.Remarks;
        payment.VerifiedBy     = adminUserId;
        payment.VerifiedAt     = DateTime.UtcNow;

        if (payment.Id == 0)
            await _payRepo.CreateAsync(payment);
        else
            await _payRepo.UpdateAsync(payment);

        var receiptCount = _db.Receipts.Count() + 1;
        var receipt = new Receipt
        {
            ReceiptNumber = $"RCP-{DateTime.UtcNow.Year}-{receiptCount:D5}",
            BookingId     = booking.Id,
            PaymentId     = payment.Id,
            GeneratedBy   = adminUserId,
        };
        _db.Receipts.Add(receipt);
        booking.Status = "Confirmed";
        booking.UpdatedAt = DateTime.UtcNow;
        _db.Bookings.Update(booking);
        await _db.SaveChangesAsync();

        await _notifications.SendBookingPaymentNotificationAsync(booking, payment, receipt.ReceiptNumber);
        await _audit.LogAsync("VerifyPayment", "Payments", payment.Id, "Pending", "Paid");

        return new PaymentDto
        {
            Id = payment.Id, BookingId = booking.Id,
            BookingNumber = booking.BookingNumber,
            Amount = payment.Amount, PaymentMethod = payment.PaymentMethod,
            TransactionRef = payment.TransactionRef, PaymentDate = payment.PaymentDate,
            Status = payment.Status,
            ReceiptNumber = receipt.ReceiptNumber,
        };
    }

    public async Task<List<PaymentDto>> GetByBookingAsync(int bookingId)
    {
        var payments = await _payRepo.GetByBookingAsync(bookingId);
        return payments.Select(p => new PaymentDto
        {
            Id = p.Id, BookingId = p.BookingId, Amount = p.Amount,
            PaymentMethod = p.PaymentMethod, TransactionRef = p.TransactionRef,
            PaymentDate = p.PaymentDate, Status = p.Status, Remarks = p.Remarks,
        }).ToList();
    }
}

// The remainder of services (NoticeService, GalleryService, ReceiptService) are defined
// in their original files; this file restores the core PaymentService and HolidayService.
