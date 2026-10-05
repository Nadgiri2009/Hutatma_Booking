using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HutatmaBooking.API.Models;

public class Role
{
    public int Id { get; set; }
    [MaxLength(50)]  public string Name        { get; set; } = "";
    [MaxLength(200)] public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Users { get; set; } = new List<User>();
}

public class User
{
    public int Id { get; set; }
    [MaxLength(150)] public string FullName     { get; set; } = "";
    [MaxLength(200)] public string Email        { get; set; } = "";
    [MaxLength(15)]  public string Mobile       { get; set; } = "";
    [MaxLength(500)] public string PasswordHash { get; set; } = "";
    public int    RoleId    { get; set; }
    public bool   IsActive  { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    [ForeignKey("RoleId")] public Role Role { get; set; } = null!;
}

[Table("VenueMaster")]
public class VenueMaster
{
    [Key]
    public int VenueId { get; set; }
    [MaxLength(150)] public string VenueName { get; set; } = "";
    public string? Description { get; set; }
    public int? Capacity { get; set; }
    public int MorningBookingCapacity { get; set; } = 30;
    public int EveningBookingCapacity { get; set; } = 30;
    [MaxLength(200)] public string? Location { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Active";
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<VenueFacility> Facilities { get; set; } = new List<VenueFacility>();
    public ICollection<VenueImage> Images { get; set; } = new List<VenueImage>();
    public ICollection<VenueRule> Rules { get; set; } = new List<VenueRule>();
    public ICollection<VenuePricing> Pricing { get; set; } = new List<VenuePricing>();
}

[Table("VenueFacilities")]
public class VenueFacility
{
    public int Id { get; set; }
    public int VenueId { get; set; }
    [MaxLength(150)] public string FacilityName { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    [ForeignKey("VenueId")] public VenueMaster Venue { get; set; } = null!;
}

[Table("VenueImages")]
public class VenueImage
{
    public int Id { get; set; }
    public int VenueId { get; set; }
    [MaxLength(500)] public string ImageUrl { get; set; } = "";
    [MaxLength(200)] public string? Caption { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    [ForeignKey("VenueId")] public VenueMaster Venue { get; set; } = null!;
}

[Table("VenueRules")]
public class VenueRule
{
    public int Id { get; set; }
    public int VenueId { get; set; }
    [MaxLength(200)] public string RuleTitle { get; set; } = "";
    public string RuleText { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    [ForeignKey("VenueId")] public VenueMaster Venue { get; set; } = null!;
}

[Table("VenuePricing")]
public class VenuePricing
{
    public int Id { get; set; }
    public int VenueId { get; set; }
    [MaxLength(150)] public string PriceItemName { get; set; } = "";
    [MaxLength(50)] public string ChargeUnit { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal RefundableDeposit { get; set; }
    public decimal HolidaySurchargeAmount { get; set; } = 0;
    public decimal CGSTPercent { get; set; } = 9;
    public decimal SGSTPercent { get; set; } = 9;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    [ForeignKey("VenueId")] public VenueMaster Venue { get; set; } = null!;
}

[Table("VenueEquipment")]
public class VenueEquipment
{
    public int Id { get; set; }
    [MaxLength(150)] public string EquipmentName { get; set; } = "";
    [MaxLength(50)] public string ChargeUnit { get; set; } = "";
    public decimal Amount { get; set; }
    public int FreeQuantity { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class BookingEquipment
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = "";
    public string ChargeUnit { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
    [ForeignKey("EquipmentId")] public VenueEquipment Equipment { get; set; } = null!;
}

public class Holiday
{
    public int      Id          { get; set; }
    public DateOnly HolidayDate { get; set; }
    [MaxLength(150)] public string Name        { get; set; } = "";
    [MaxLength(500)] public string? Description { get; set; }
    public bool     IsActive    { get; set; } = true;
    public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;
}

public class Booking
{
    public int      Id            { get; set; }
    [MaxLength(20)] public string BookingNumber { get; set; } = "";
    public int      VenueId       { get; set; }
    public int      VenuePricingId { get; set; }
    public DateOnly FromDate      { get; set; }
    public DateOnly ToDate        { get; set; }
    // Morning | Evening | FullDay — used for same-day conflict checks so a venue
    // can be booked for a Morning slot and an Evening slot on the same date,
    // while a FullDay booking blocks the entire date for that venue.
    [MaxLength(20)] public string Session       { get; set; } = "FullDay";
    public int      TotalDays     { get; set; }
    public decimal  BaseRent      { get; set; }
    public decimal  HolidayCharge { get; set; }
    public decimal  EquipmentCharge { get; set; }
    public decimal  SecurityDeposit { get; set; }
    public decimal  CGSTAmount    { get; set; }
    public decimal  SGSTAmount    { get; set; }
    public decimal  GrandTotal    { get; set; }
    [MaxLength(30)] public string Status         { get; set; } = "PendingPayment";
    [MaxLength(500)] public string? CancelReason    { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt    { get; set; }
    [ForeignKey("VenueId")] public VenueMaster Venue   { get; set; } = null!;
    [ForeignKey("VenuePricingId")] public VenuePricing VenuePricing   { get; set; } = null!;
    public Applicant?    Applicant    { get; set; }
    public BankDetail?   BankDetail   { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
    public ICollection<BookingEquipment> EquipmentItems { get; set; } = new List<BookingEquipment>();
}

public class Applicant
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    [MaxLength(150)] public string  FullName        { get; set; } = "";
    [MaxLength(200)] public string  Email           { get; set; } = "";
    [MaxLength(15)]  public string  Mobile          { get; set; } = "";
    [MaxLength(15)]  public string? AlternateMobile { get; set; }
    public string    Address         { get; set; } = "";
    [MaxLength(200)] public string  FunctionName    { get; set; } = "";
    [MaxLength(100)] public string  FunctionType    { get; set; } = "";
    public int       ExpectedGuests  { get; set; }
    [MaxLength(50)]  public string  IDProofType     { get; set; } = "";
    [MaxLength(500)] public string? IDProofFile     { get; set; }
    public DateTime  CreatedAt       { get; set; } = DateTime.UtcNow;
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
}

public class BankDetail
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    [MaxLength(150)] public string  BankName          { get; set; } = "";
    [MaxLength(150)] public string  AccountHolderName { get; set; } = "";
    [MaxLength(30)]  public string  AccountNumber     { get; set; } = "";
    [MaxLength(15)]  public string  IFSCCode          { get; set; } = "";
    [MaxLength(150)] public string  BranchName        { get; set; } = "";
    [MaxLength(15)]  public string? MICRCode          { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
}

public class Payment
{
    public int      Id            { get; set; }
    public int      BookingId     { get; set; }
    public decimal  Amount        { get; set; }
    [MaxLength(50)]  public string  PaymentMethod  { get; set; } = "BankTransfer";
    [MaxLength(200)] public string? TransactionRef { get; set; }
    [MaxLength(100)] public string? GatewayOrderId { get; set; }
    [MaxLength(100)] public string? GatewayPaymentId { get; set; }
    [MaxLength(200)] public string? GatewaySignature { get; set; }
    public DateOnly? PaymentDate  { get; set; }
    [MaxLength(30)]  public string  Status         { get; set; } = "Pending";
    [MaxLength(500)] public string? Remarks        { get; set; }
    public int?     VerifiedBy    { get; set; }
    public DateTime? VerifiedAt   { get; set; }
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt    { get; set; }
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
    public Receipt Receipt { get; set; } = null!;
}

public class Receipt
{
    public int      Id            { get; set; }
    [MaxLength(20)] public string ReceiptNumber { get; set; } = "";
    public int      BookingId     { get; set; }
    public int      PaymentId     { get; set; }
    public DateTime GeneratedAt   { get; set; } = DateTime.UtcNow;
    public int?     GeneratedBy   { get; set; }
    [MaxLength(500)] public string? FilePath { get; set; }
    [ForeignKey("BookingId")] public Booking Booking  { get; set; } = null!;
    [ForeignKey("PaymentId")] public Payment Payment  { get; set; } = null!;
}

public class GalleryItem
{
    public int Id { get; set; }
    [MaxLength(200)] public string  Title         { get; set; } = "";
    public string?   Description    { get; set; }
    [MaxLength(10)]  public string  MediaType     { get; set; } = "Photo";
    [MaxLength(500)] public string? FilePath      { get; set; }
    [MaxLength(500)] public string? VideoURL      { get; set; }
    [MaxLength(500)] public string? ThumbnailPath { get; set; }
    public int       DisplayOrder   { get; set; }
    public bool      IsActive       { get; set; } = true;
    public DateTime  CreatedAt      { get; set; } = DateTime.UtcNow;
}

public class Notice
{
    public int Id { get; set; }
    [MaxLength(300)] public string Title       { get; set; } = "";
    public string    Content      { get; set; } = "";
    public bool      IsImportant  { get; set; }
    public DateOnly  PublishDate  { get; set; }
    public DateOnly? ExpiryDate   { get; set; }
    public bool      IsActive     { get; set; } = true;
    public int?      CreatedBy    { get; set; }
    public DateTime  CreatedAt    { get; set; } = DateTime.UtcNow;
}

public class Complaint
{
    public int Id { get; set; }
    public int?      BookingId     { get; set; }
    [MaxLength(150)] public string  ApplicantName { get; set; } = "";
    [MaxLength(15)]  public string  Mobile        { get; set; } = "";
    [MaxLength(200)] public string? Email         { get; set; }
    [MaxLength(300)] public string  Subject       { get; set; } = "";
    public string    Description   { get; set; } = "";
    [MaxLength(30)]  public string  Status        { get; set; } = "Open";
    public string?   Resolution    { get; set; }
    public int?      AssignedTo    { get; set; }
    public DateTime? ResolvedAt    { get; set; }
    public DateTime  CreatedAt     { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt     { get; set; }
}

public class Cancellation
{
    public int Id { get; set; }
    public int      BookingId    { get; set; }
    public string   Reason       { get; set; } = "";
    [MaxLength(150)] public string RequestedBy  { get; set; } = "";
    public decimal  RefundAmount { get; set; }
    [MaxLength(30)] public string RefundStatus  { get; set; } = "Pending";
    public int?     ProcessedBy  { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
}

public class RefundRequest
{
    public int Id { get; set; }
    [MaxLength(40)] public string RefundRequestNumber { get; set; } = "";
    public int BookingId { get; set; }
    public decimal? RefundAmount { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Requested";
    [MaxLength(500)] public string? RejectionReason { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? VerifiedBy { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int? ProcessedBy { get; set; }
    public DateTime? ProcessedAt { get; set; }
    [ForeignKey("BookingId")] public Booking Booking { get; set; } = null!;
}

public class AdminLoginOtp
{
    [Key, MaxLength(15)] public string Mobile { get; set; } = "";
    [MaxLength(32)] public byte[] OtpHash { get; set; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? UsedAt { get; set; }
}

public class RefundOtpChallenge
{
    [Key] public int BookingId { get; set; }
    [MaxLength(15)] public string Mobile { get; set; } = "";
    [MaxLength(32)] public byte[] OtpHash { get; set; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? UsedAt { get; set; }
}

public class CancellationOtpChallenge
{
    [Key] public int BookingId { get; set; }
    [MaxLength(15)] public string Mobile { get; set; } = "";
    [MaxLength(32)] public byte[] OtpHash { get; set; } = Array.Empty<byte>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? UsedAt { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int?     UserId    { get; set; }
    [MaxLength(100)] public string  Action    { get; set; } = "";
    [MaxLength(100)] public string  TableName { get; set; } = "";
    public int?     RecordId  { get; set; }
    public string?  OldValues { get; set; }
    public string?  NewValues { get; set; }
    [MaxLength(50)]  public string? IPAddress { get; set; }
    [MaxLength(500)] public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
