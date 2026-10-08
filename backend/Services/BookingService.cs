using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.Utils;

namespace HutatmaBooking.API.Services;

public class BookingService : IBookingService
{
    private readonly IBookingRepository  _bookingRepo;
    private readonly IHolidayRepository  _holidayRepo;
    private readonly IAuditService       _audit;

    public BookingService(
        IBookingRepository bookingRepo,
        IHolidayRepository holidayRepo,
        IAuditService      audit)
    {
        _bookingRepo = bookingRepo;
        _holidayRepo = holidayRepo;
        _audit       = audit;
    }

    // add logger for diagnostics
    private readonly ILogger<BookingService>? _logger;

    public BookingService(IBookingRepository bookingRepo, IHolidayRepository holidayRepo, IAuditService audit, ILogger<BookingService> logger)
        : this(bookingRepo, holidayRepo, audit)
    {
        _logger = logger;
    }

    // ─── AVAILABILITY ───────────────────────────────────────────────────────────

    private static int GetSelectedSlotsPerDay(string? session) => BookingSlots.CountPerDay(session ?? "");

    public async Task<AvailabilityResponseDto> CheckAvailabilityAsync(AvailabilityRequestDto req)
    {
        var venue = await _bookingRepo.GetVenueCapacityAsync(req.VenueId);
        if (venue == null || BookingSlots.OrderedSessions.Any(session => BookingSlots.CapacityFor(venue, session) <= 0))
            throw new InvalidOperationException("Booking capacity is not configured for the selected venue.");

        var existingBookings = await _bookingRepo.GetBookingsForDateRangeAsync(
            req.VenueId, req.FromDate, req.ToDate);

        var dateSlots = new List<DateSlotDto>();
        for (var d = req.FromDate; d <= req.ToDate; d = d.AddDays(1))
        {
            var day = DateOnly.FromDateTime(d);
            var bookingsForDay = existingBookings
                .Where(b => b.FromDate <= day && b.ToDate >= day)
                .ToList();

            var activeBookings = bookingsForDay.Where(BookingSlots.IsActiveBooking).ToList();
            var fullDayTaken = activeBookings.Any(booking =>
                BookingSlots.TryParse(booking.Session, out var selected)
                && selected.Count == BookingSlots.OrderedSessions.Length);
            var counts = BookingSlots.OrderedSessions.ToDictionary(
                session => session,
                session => activeBookings.Count(booking =>
                    BookingSlots.TryParse(booking.Session, out var bookedSessions)
                    && bookedSessions.Contains(session, StringComparer.OrdinalIgnoreCase)));
            var slotAvailability = BookingSlots.OrderedSessions.Select(session =>
            {
                var capacity = BookingSlots.CapacityFor(venue, session);
                var booked = fullDayTaken ? 1 : Math.Min(1, counts[session]);
                var available = fullDayTaken || booked > 0 || capacity <= 0 ? 0 : 1;
                return new SessionAvailabilityDto
                {
                    Session = session,
                    TotalSlots = capacity > 0 ? 1 : 0,
                    BookedSlots = booked,
                    AvailableSlots = available,
                    Status = available == 0 ? "Full" : "Available"
                };
            }).ToList();
            var fullDayUnavailable = activeBookings.Count > 0;
            slotAvailability.Add(new SessionAvailabilityDto
            {
                Session = "FullDay",
                TotalSlots = 1,
                BookedSlots = fullDayTaken ? 1 : 0,
                AvailableSlots = fullDayUnavailable ? 0 : 1,
                Status = fullDayTaken ? "Full" : fullDayUnavailable ? "Unavailable" : "Available",
            });
            var morning = slotAvailability[0];
            var afternoon = slotAvailability[1];
            var evening = slotAvailability[2];
            var bookedSlots = morning.BookedSlots + afternoon.BookedSlots + evening.BookedSlots;
            var totalSlots = BookingSlots.OrderedSessions.Count(session => BookingSlots.CapacityFor(venue, session) > 0);
            var availableSlots = totalSlots - bookedSlots;

            dateSlots.Add(new DateSlotDto
            {
                Date = d,
                MorningStatus = morning.AvailableSlots == 0 ? "Booked" : "Available",
                AfternoonStatus = afternoon.AvailableSlots == 0 ? "Booked" : "Available",
                EveningStatus = evening.AvailableSlots == 0 ? "Booked" : "Available",
                FullDayStatus = fullDayUnavailable ? "Booked" : "Available",
                TotalSlots = totalSlots,
                BookedSlots = bookedSlots,
                AvailableSlots = availableSlots,
                CancelledBookingCount = bookingsForDay.Count(b =>
                    b.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)
                    || b.Status.Equals("ForceCancelled", StringComparison.OrdinalIgnoreCase)
                    || b.Status.Equals("Force Cancelled", StringComparison.OrdinalIgnoreCase)),
                Sessions = slotAvailability,
            });
        }
        return new AvailabilityResponseDto { Slots = dateSlots };
    }

    // ─── CONFLICT VALIDATION ──────────────────────────────────────────────────
    // Conflicts are checked per Venue + Date + Session. A FullDay booking
    // blocks the entire date for that venue; a Morning booking only blocks the
    // Morning slot (an Evening booking on the same date is still allowed), and
    // vice versa. Two bookings for the same session on an overlapping date
    // always conflict.

    public async Task<bool> HasConflictAsync(int venueId, DateOnly fromDate, DateOnly toDate, string session)
    {
        var venue = await _bookingRepo.GetVenueCapacityAsync(venueId);
        if (venue == null || BookingSlots.OrderedSessions.Any(slot => BookingSlots.CapacityFor(venue, slot) <= 0)) return true;
        var existing = await _bookingRepo.GetBookingsForDateRangeAsync(
            venueId, fromDate.ToDateTime(TimeOnly.MinValue), toDate.ToDateTime(TimeOnly.MaxValue));
        return BookingSlots.HasCapacityConflict(existing, fromDate, toDate, session, venue);
    }

    // ─── SUMMARY CALCULATION ─────────────────────────────────────────────────

    public async Task<BookingSummaryDto> CalculateSummaryAsync(BookingSummaryRequestDto req)
    {
        _logger?.LogInformation("CalculateSummary: VenueId={VenueId}, VenuePricingId={VenuePricingId}, FromDate={FromDate}, ToDate={ToDate}", req.VenueId, req.VenuePricingId, req.FromDate, req.ToDate);
        var pricing = await _bookingRepo.GetVenuePricingAsync(req.VenuePricingId);
        if (pricing == null || pricing.VenueId != req.VenueId || !pricing.IsActive || pricing.Venue?.Status != "Active")
        {
            _logger?.LogWarning("No active pricing found for VenueId={VenueId}, VenuePricingId={VenuePricingId}", req.VenueId, req.VenuePricingId);
            throw new InvalidOperationException("No rate configured for the selected venue and price item.");
        }

        var fromDate = DateOnly.FromDateTime(req.FromDate);
        var toDate   = DateOnly.FromDateTime(req.ToDate);
        var totalDays = (toDate.DayNumber - fromDate.DayNumber) + 1;
        var selectedSlotsPerDay = GetSelectedSlotsPerDay(req.Session);
        var totalChargeableSlots = totalDays * selectedSlotsPerDay;

        // Count holiday days
        var holidays    = await _holidayRepo.GetHolidaysInRangeAsync(req.FromDate, req.ToDate);
        var holidayDays = holidays.Count;

        var baseRent        = pricing.Amount * totalChargeableSlots;
        var holidayCharge   = pricing.HolidaySurchargeAmount * holidayDays;
        var equipmentCharge = 0m;
        if (req.Equipment != null && req.Equipment.Any())
        {
            var equipmentIds = req.Equipment.Select(e => e.EquipmentId).Distinct().ToList();
            var equipmentList = await _bookingRepo.GetEquipmentByIdsAsync(equipmentIds);
            foreach (var item in req.Equipment)
            {
                var equipment = equipmentList.FirstOrDefault(e => e.Id == item.EquipmentId)
                    ?? throw new InvalidOperationException($"Equipment item {item.EquipmentId} not found.");
                var quantity = Math.Max(0, item.Quantity);
                var chargeQty = Math.Max(0, quantity - equipment.FreeQuantity);
                equipmentCharge += equipment.Amount * chargeQty;
            }
        }
        var securityDeposit = pricing.RefundableDeposit;

        var taxableAmount = baseRent + holidayCharge + equipmentCharge;
        var cgst          = Math.Round(taxableAmount * pricing.CGSTPercent / 100, 2);
        var sgst          = Math.Round(taxableAmount * pricing.SGSTPercent / 100, 2);
        var grandTotal    = taxableAmount + cgst + sgst + securityDeposit;

        return new BookingSummaryDto
        {
            TotalDays       = totalDays,
            PriceItemName   = pricing.PriceItemName,
            ChargeUnit      = pricing.ChargeUnit,
            BaseRent        = baseRent,
            HolidayCharge   = holidayCharge,
            EquipmentCharge = equipmentCharge,
            SecurityDeposit = securityDeposit,
            CGSTAmount      = cgst,
            SGSTAmount      = sgst,
            GrandTotal      = grandTotal,
            HolidayDays     = holidayDays,
            CGSTPercent     = pricing.CGSTPercent,
            SGSTPercent     = pricing.SGSTPercent
        };
    }

    // ─── CREATE BOOKING ───────────────────────────────────────────────────────

    public async Task<BookingResponseDto> CreateBookingAsync(CreateBookingDto dto)
    {
        var suppliedSession = string.IsNullOrWhiteSpace(dto.Session) ? "FullDay" : dto.Session;
        if (!BookingSlots.TryParse(suppliedSession, out var selectedSessions))
            throw new InvalidOperationException("Session must be Morning, Afternoon, Evening, FullDay, or a comma-separated combination of individual slots.");
        var session = BookingSlots.Normalize(selectedSessions);

        // Validate conflicts first (also re-checked here at submission time to
        // close the race-condition window between availability check and
        // submit — two applicants can't both be confirmed for the same
        // Venue + Date + Session).
        var fromDate = DateOnly.FromDateTime(dto.FromDate);
        var toDate   = DateOnly.FromDateTime(dto.ToDate);

        if (await HasConflictAsync(dto.VenueId, fromDate, toDate, session))
            throw new InvalidOperationException("Selected date/session conflicts with an existing booking for this venue.");

        // Calculate amounts
        var summary = await CalculateSummaryAsync(new BookingSummaryRequestDto
        {
            VenueId        = dto.VenueId,
            VenuePricingId = dto.VenuePricingId,
            FromDate       = dto.FromDate,
            ToDate         = dto.ToDate,
            Session        = session,
            Equipment      = dto.Equipment
        });

        // Generate booking number
        var bookingNumber = await GenerateBookingNumberAsync();

        var booking = new Booking
        {
            BookingNumber   = bookingNumber,
            VenueId         = dto.VenueId,
            VenuePricingId  = dto.VenuePricingId,
            FromDate        = fromDate,
            ToDate          = toDate,
            Session         = session,
            TotalDays       = summary.TotalDays,
            BaseRent        = summary.BaseRent,
            HolidayCharge   = summary.HolidayCharge,
            EquipmentCharge = summary.EquipmentCharge,
            SecurityDeposit = summary.SecurityDeposit,
            CGSTAmount      = summary.CGSTAmount,
            SGSTAmount      = summary.SGSTAmount,
            GrandTotal      = summary.GrandTotal,

            // No admin approval step: the booking instantly locks the
            // calendar slot (Venue + Date + Session) and is automatically
            // confirmed once payment is verified — see PaymentService.
            Status          = "PendingPayment"
        };

        var applicant = new Applicant
        {
            FullName        = dto.Applicant.FullName,
            Email           = dto.Applicant.Email,
            Mobile          = dto.Applicant.Mobile,
            AlternateMobile = dto.Applicant.AlternateMobile,
            Address         = dto.Applicant.Address,
            FunctionName    = dto.Applicant.FunctionName,
            FunctionType    = dto.Applicant.FunctionType,
            ExpectedGuests  = dto.Applicant.ExpectedGuests,
            IDProofType     = dto.Applicant.IDProofType,
            IDProofFile     = dto.Applicant.IDProofFile
        };

        var bankDetail = new BankDetail
        {
            BankName          = dto.BankDetail.BankName,
            AccountHolderName = dto.BankDetail.AccountHolderName,
            AccountNumber     = dto.BankDetail.AccountNumber,
            IFSCCode          = dto.BankDetail.IFSCCode,
            BranchName        = dto.BankDetail.BranchName,
            MICRCode          = dto.BankDetail.MICRCode
        };

        List<BookingEquipment>? bookingEquipment = null;
        if (dto.Equipment != null && dto.Equipment.Any())
        {
            var equipmentIds = dto.Equipment.Select(e => e.EquipmentId).Distinct().ToList();
            var equipmentList = await _bookingRepo.GetEquipmentByIdsAsync(equipmentIds);

            bookingEquipment = dto.Equipment.Select(e =>
            {
                var equipment = equipmentList.FirstOrDefault(x => x.Id == e.EquipmentId)
                    ?? throw new InvalidOperationException($"Equipment item {e.EquipmentId} not found.");
                var quantity = Math.Max(0, e.Quantity);
                var chargeQty = Math.Max(0, quantity - equipment.FreeQuantity);
                var unitPrice = equipment.Amount;
                return new BookingEquipment
                {
                    EquipmentId   = e.EquipmentId,
                    Quantity      = quantity,
                    EquipmentName = equipment.EquipmentName,
                    ChargeUnit    = equipment.ChargeUnit,
                    UnitPrice     = unitPrice,
                    TotalPrice    = unitPrice * chargeQty,
                };
            }).ToList();
        }

        var created = await _bookingRepo.CreateBookingAsync(booking, applicant, bankDetail, bookingEquipment);

        await _audit.LogAsync("CreateBooking", "Bookings", created.Id, null, bookingNumber);

        return MapToResponseDto(created);
    }

    // ─── SEARCH ───────────────────────────────────────────────────────────────

    public async Task<BookingResponseDto?> GetByBookingNumberAsync(string bookingNumber)
    {
        var b = await _bookingRepo.GetByBookingNumberAsync(bookingNumber);
        return b == null ? null : MapToResponseDto(b);
    }

    public async Task<List<BookingResponseDto>> GetByMobileAsync(string mobile)
    {
        var bookings = await _bookingRepo.GetByMobileAsync(mobile);
        return bookings.Select(MapToResponseDto).ToList();
    }

    public async Task<PagedResult<BookingResponseDto>> GetAllAsync(BookingFilterDto filter)
    {
        var (bookings, total) = await _bookingRepo.GetAllAsync(filter);
        return new PagedResult<BookingResponseDto>
        {
            Items      = bookings.Select(MapToResponseDto).ToList(),
            TotalCount = total,
            Page       = filter.Page,
            PageSize   = filter.PageSize
        };
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private async Task<string> GenerateBookingNumberAsync()
    {
        var year  = DateTime.UtcNow.Year;
        var count = await _bookingRepo.GetCountForYearAsync(year);
        return $"HSM-{year}-{(count + 1):D5}";
    }

    private static BookingResponseDto MapToResponseDto(Booking b) => new()
    {
        Id              = b.Id,
        BookingNumber   = b.BookingNumber,
        VenueName       = b.Venue?.VenueName ?? "",
        PriceItemName   = b.VenuePricing?.PriceItemName ?? "",
        ChargeUnit      = b.VenuePricing?.ChargeUnit ?? "",
        FromDate        = b.FromDate.ToDateTime(TimeOnly.MinValue),
        ToDate          = b.ToDate.ToDateTime(TimeOnly.MinValue),
        Session         = b.Session,
        TotalDays       = b.TotalDays,
        BaseRent        = b.BaseRent,
        HolidayCharge   = b.HolidayCharge,
        EquipmentCharge = b.EquipmentCharge,
        SecurityDeposit = b.SecurityDeposit,
        CGSTAmount      = b.CGSTAmount,
        SGSTAmount      = b.SGSTAmount,
        GrandTotal      = b.GrandTotal,
        Status          = b.Status,
        CreatedAt       = b.CreatedAt,
        ReceiptNumber   = b.Receipts.OrderByDescending(r => r.GeneratedAt).FirstOrDefault()?.ReceiptNumber ?? string.Empty,
        ApplicantName   = b.Applicant?.FullName ?? "",
        ApplicantMobile = b.Applicant?.Mobile ?? "",
        ApplicantAlternateMobile = b.Applicant?.AlternateMobile,
        ApplicantEmail  = b.Applicant?.Email ?? "",
        ApplicantAddress = b.Applicant?.Address ?? "",
        FunctionName    = b.Applicant?.FunctionName ?? "",
        FunctionType    = b.Applicant?.FunctionType ?? "",
        ExpectedGuests  = b.Applicant?.ExpectedGuests ?? 0,
        IDProofType     = b.Applicant?.IDProofType ?? "",
        BankDetail = b.BankDetail == null ? null : new BankDetailDto
        {
            BankName = b.BankDetail.BankName,
            AccountHolderName = b.BankDetail.AccountHolderName,
            AccountNumber = b.BankDetail.AccountNumber,
            IFSCCode = b.BankDetail.IFSCCode,
            BranchName = b.BankDetail.BranchName,
            MICRCode = b.BankDetail.MICRCode,
        },
        PaymentTransactionRef = b.Payments.OrderByDescending(p => p.Id).FirstOrDefault(p => p.Status == "Paid")?.TransactionRef,
        PaymentMethod         = b.Payments.OrderByDescending(p => p.Id).FirstOrDefault()?.PaymentMethod,
        PaymentDate           = b.Payments.OrderByDescending(p => p.Id).FirstOrDefault(p => p.Status == "Paid")?.PaymentDate,
        PaymentStatus          = b.Payments.OrderByDescending(p => p.Id).FirstOrDefault()?.Status,
        EquipmentItems  = b.EquipmentItems.Select(item => new BookingEquipmentResponseDto
        {
            EquipmentId   = item.EquipmentId,
            EquipmentName = item.EquipmentName,
            ChargeUnit    = item.ChargeUnit,
            UnitPrice     = item.UnitPrice,
            Quantity      = item.Quantity,
            TotalPrice    = item.TotalPrice,
        }).ToList()
    };
}