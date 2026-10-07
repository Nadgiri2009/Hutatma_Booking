namespace HutatmaBooking.API.DTOs;

// ── Auth ──────────────────────────────────────────────────────────────────────
public class AdminOtpRequestDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";
}
public class AdminOtpVerifyDto
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{10}$")]
    public string Mobile { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.RegularExpression(@"^\d{6}$")]
    public string Otp { get; set; } = "";
}
public class LoginResponseDto
{
    public string Token    { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Role     { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
}

// ── Availability ──────────────────────────────────────────────────────────────
public class AvailabilityRequestDto
{
    public int      VenueId   { get; set; }
    public DateTime FromDate  { get; set; }
    public DateTime ToDate    { get; set; }
}
public class AvailabilityResponseDto
{
    public List<DateSlotDto> Slots { get; set; } = new();
}
public class DateSlotDto
{
    public DateTime Date          { get; set; }
    public string   MorningStatus { get; set; } = "";
    public string   AfternoonStatus { get; set; } = "";
    public string   EveningStatus { get; set; } = "";
    public string   FullDayStatus { get; set; } = "";
    public int      TotalSlots    { get; set; }
    public int      BookedSlots   { get; set; }
    public int      AvailableSlots { get; set; }
    public int      CancelledBookingCount { get; set; }
    public List<SessionAvailabilityDto> Sessions { get; set; } = new();
}
public class SessionAvailabilityDto
{
    public string Session { get; set; } = "";
    public int TotalSlots { get; set; }
    public int BookedSlots { get; set; }
    public int AvailableSlots { get; set; }
    public string Status { get; set; } = "";
}

// ── Booking Summary ───────────────────────────────────────────────────────────
public class BookingSummaryRequestDto
{
    public int      VenueId        { get; set; }
    public int      VenuePricingId { get; set; }
    public DateTime FromDate  { get; set; }
    public DateTime ToDate    { get; set; }
    public string   Session   { get; set; } = "FullDay";
    public List<BookingEquipmentRequestDto>? Equipment { get; set; }
}
public class BookingSummaryDto
{
    public int     TotalDays       { get; set; }
    public string  PriceItemName   { get; set; } = "";
    public string  ChargeUnit      { get; set; } = "";
    public decimal BaseRent        { get; set; }
    public decimal HolidayCharge   { get; set; }
    public decimal EquipmentCharge { get; set; }
    public decimal SecurityDeposit { get; set; }
    public decimal CGSTAmount      { get; set; }
    public decimal SGSTAmount      { get; set; }
    public decimal GrandTotal      { get; set; }
    public int     HolidayDays     { get; set; }
    public decimal CGSTPercent     { get; set; }
    public decimal SGSTPercent     { get; set; }
}

public class BookingEquipmentRequestDto
{
    public int EquipmentId { get; set; }
    public int Quantity { get; set; }
}

public class BookingEquipmentResponseDto
{
    public int      EquipmentId   { get; set; }
    public string   EquipmentName { get; set; } = "";
    public string   ChargeUnit    { get; set; } = "";
    public decimal  UnitPrice     { get; set; }
    public int      Quantity      { get; set; }
    public decimal  TotalPrice    { get; set; }
}

// ── Create Booking ────────────────────────────────────────────────────────────
public class CreateBookingDto
{
    public int      VenueId        { get; set; }
    public int      VenuePricingId { get; set; }
    public DateTime FromDate    { get; set; }
    public DateTime ToDate      { get; set; }
    public string   Session     { get; set; } = "FullDay";
    public List<BookingEquipmentRequestDto>? Equipment { get; set; }
    public ApplicantDto  Applicant  { get; set; } = new();
    public BankDetailDto BankDetail { get; set; } = new();
}

public class ChangeBookingDateDto
{
    public DateTime NewFromDate { get; set; }
}

public class ApplicantDto
{
    public string  FullName        { get; set; } = "";
    public string  Email           { get; set; } = "";
    public string  Mobile          { get; set; } = "";
    public string? AlternateMobile { get; set; }
    public string  Address         { get; set; } = "";
    public string  FunctionName    { get; set; } = "";
    public string  FunctionType    { get; set; } = "";
    public int     ExpectedGuests  { get; set; }
    public string  IDProofType     { get; set; } = "";
    public string? IDProofFile     { get; set; }
}
public class BankDetailDto
{
    public string  BankName          { get; set; } = "";
    public string  AccountHolderName { get; set; } = "";
    public string  AccountNumber     { get; set; } = "";
    public string  IFSCCode          { get; set; } = "";
    public string  BranchName        { get; set; } = "";
    public string? MICRCode          { get; set; }
}

// ── Booking Response ──────────────────────────────────────────────────────────
public class BookingResponseDto
{
    public int      Id              { get; set; }
    public string   BookingNumber   { get; set; } = "";
    public string   VenueName       { get; set; } = "";
    public string   PriceItemName   { get; set; } = "";
    public string   ChargeUnit      { get; set; } = "";
    public DateTime FromDate        { get; set; }
    public DateTime ToDate          { get; set; }
    public string   Session         { get; set; } = "";
    public int      TotalDays       { get; set; }
    public decimal  BaseRent        { get; set; }
    public decimal  HolidayCharge   { get; set; }
    public decimal  EquipmentCharge { get; set; }
    public decimal  SecurityDeposit { get; set; }
    public decimal  CGSTAmount      { get; set; }
    public decimal  SGSTAmount      { get; set; }
    public decimal  GrandTotal      { get; set; }
    public string   Status          { get; set; } = "";
    public DateTime CreatedAt       { get; set; }
    public string   ReceiptNumber   { get; set; } = "";
    public string   ApplicantName   { get; set; } = "";
    public string   ApplicantMobile { get; set; } = "";
    public string   ApplicantEmail  { get; set; } = "";
    public string   ApplicantAddress { get; set; } = "";
    public string   FunctionName    { get; set; } = "";
    public BankDetailDto? BankDetail { get; set; }
    public string?  PaymentTransactionRef { get; set; }
    public string?  PaymentMethod   { get; set; }
    public DateOnly? PaymentDate    { get; set; }
    public string?  PaymentStatus   { get; set; }
    public List<BookingEquipmentResponseDto> EquipmentItems { get; set; } = new();
}

// ── Filter / Paged ────────────────────────────────────────────────────────────
public class BookingFilterDto
{
    public string? BookingNumber { get; set; }
    public string? Mobile        { get; set; }
    public string? ApplicantName { get; set; }
    public string? Status        { get; set; }
    public int     Page          { get; set; } = 1;
    public int     PageSize      { get; set; } = 20;
}
public class PagedResult<T>
{
    public List<T> Items      { get; set; } = new();
    public int     TotalCount { get; set; }
    public int     Page       { get; set; }
    public int     PageSize   { get; set; }
    public int     TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
public class DashboardDto
{
    public int     TotalBookings         { get; set; }
    public int     PendingPaymentBookings { get; set; }
    public int     ConfirmedBookings     { get; set; }
    public int     CancelledBookings     { get; set; }
    public decimal TotalRevenue          { get; set; }
    public int     TotalComplaints       { get; set; }
    public List<BookingResponseDto> RecentBookings { get; set; } = new();
}

// ── Payment ───────────────────────────────────────────────────────────────────
public class VerifyPaymentDto
{
    public int    BookingId     { get; set; }
    public string TransactionRef { get; set; } = "";
    public DateOnly PaymentDate { get; set; }
    public string? Remarks      { get; set; }
}

public class InitiatePaymentDto
{
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Card";
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerMobile { get; set; }
}

public class CompleteGatewayPaymentDto
{
    public string TransactionRef { get; set; } = "";
    public string PaymentMethod { get; set; } = "Card";
    public DateOnly? PaymentDate { get; set; }
    public string? GatewayPaymentId { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewaySignature { get; set; }
    public CreateBookingDto Booking { get; set; } = new();
}

public class PaymentInitiationResponseDto
{
    public bool Success { get; set; }
    public string PaymentMethod { get; set; } = "Card";
    public string TransactionRef { get; set; } = "";
    public string Message { get; set; } = "";
    public string? GatewayUrl { get; set; }
    public string? GatewayKey { get; set; }
    public string? GatewayOrderId { get; set; }
    public int? Amount { get; set; }
    public string? Currency { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerMobile { get; set; }
}
