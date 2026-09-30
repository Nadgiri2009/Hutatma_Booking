using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;

namespace HutatmaBooking.API.Services.Interfaces;

public interface IAuthService
{
    Task RequestAdminOtpAsync(string email);
    Task<LoginResponseDto?> VerifyAdminOtpAsync(string email, string otp);
}

public interface IBookingService
{
    Task<AvailabilityResponseDto>         CheckAvailabilityAsync(AvailabilityRequestDto req);
    Task<bool>                            HasConflictAsync(int venueId, DateOnly from, DateOnly to, string session);
    Task<BookingSummaryDto>               CalculateSummaryAsync(BookingSummaryRequestDto req);
    Task<BookingResponseDto>              CreateBookingAsync(CreateBookingDto dto);
    Task<BookingResponseDto?>             GetByBookingNumberAsync(string number);
    Task<List<BookingResponseDto>>        GetByMobileAsync(string mobile);
    Task<PagedResult<BookingResponseDto>> GetAllAsync(BookingFilterDto filter);
    
}

public interface IHolidayService
{
    Task<List<HolidayDto>> GetAllAsync();
    Task<HolidayDto>       CreateAsync(HolidayDto dto);
    Task<HolidayDto>       UpdateAsync(int id, HolidayDto dto);
    Task<bool>             DeleteAsync(int id);
}

public interface IPaymentService
{
    Task<PaymentDto>               VerifyPaymentAsync(VerifyPaymentDto dto, int adminUserId);
    Task<PaymentInitiationResponseDto> InitiatePaymentAsync(InitiatePaymentDto dto);
    Task<PaymentDto>               CompleteGatewayPaymentAsync(CompleteGatewayPaymentDto dto);
    Task<List<PaymentDto>>         GetByBookingAsync(int bookingId);
}

public interface IGalleryService
{
    Task<List<GalleryItemDto>> GetAllAsync(string? type = null);
    Task<GalleryItemDto>       CreateAsync(GalleryItemDto dto);
    Task<bool>                 DeleteAsync(int id);
}

public interface INoticeService
{
    Task<List<NoticeDto>> GetActiveAsync();
    Task<List<NoticeDto>> GetAllAsync();
    Task<NoticeDto>       CreateAsync(NoticeDto dto);
    Task<NoticeDto>       UpdateAsync(int id, NoticeDto dto);
    Task<bool>            DeleteAsync(int id);
}

public interface IReceiptService
{
    Task<string> GenerateReceiptAsync(int bookingId);
}

public interface INotificationService
{
    Task SendBookingPaymentNotificationAsync(Booking booking, Payment payment, string receiptNumber);
    Task SendOneTimeCodeAsync(string mobile, string otp, string purpose);
}

public interface IAuditService
{
    Task LogAsync(string action, string table, int? recordId, string? oldVal, string? newVal);
}

// Additional DTOs needed by services
public class VenuePricingUpdateDto
{
    public decimal Amount                 { get; set; }
    public decimal RefundableDeposit      { get; set; }
    public decimal HolidaySurchargeAmount { get; set; }
    public decimal CGSTPercent            { get; set; }
    public decimal SGSTPercent            { get; set; }
    public bool    IsActive               { get; set; } = true;
}

public class VenueStatusUpdateDto
{
    public string Status { get; set; } = "Active";
}

public class HolidayDto
{
    public int     Id          { get; set; }
    public DateOnly HolidayDate { get; set; }
    public string  Name        { get; set; } = "";
    public string? Description { get; set; }
    public bool    IsActive    { get; set; } = true;
}

public class PaymentDto
{
    public int      Id            { get; set; }
    public int      BookingId     { get; set; }
    public string   BookingNumber { get; set; } = "";
    public decimal  Amount        { get; set; }
    public string   PaymentMethod { get; set; } = "";
    public string?  TransactionRef { get; set; }
    public DateOnly? PaymentDate  { get; set; }
    public string   Status        { get; set; } = "";
    public string?  Remarks       { get; set; }
    public string   ReceiptNumber { get; set; } = "";
}

public class GalleryItemDto
{
    public int     Id           { get; set; }
    public string  Title        { get; set; } = "";
    public string? Description  { get; set; }
    public string  MediaType    { get; set; } = "Photo";
    public string? FilePath     { get; set; }
    public string? VideoURL     { get; set; }
    public string? ThumbnailPath { get; set; }
    public int     DisplayOrder { get; set; }
    public bool    IsActive     { get; set; } = true;
}

public class NoticeDto
{
    public int     Id          { get; set; }
    public string  Title       { get; set; } = "";
    public string  Content     { get; set; } = "";
    public bool    IsImportant { get; set; }
    public DateOnly PublishDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public bool    IsActive    { get; set; } = true;
}
