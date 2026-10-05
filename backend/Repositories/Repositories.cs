using HutatmaBooking.API.Data;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace HutatmaBooking.API.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly AppDbContext _db;
    public BookingRepository(AppDbContext db) => _db = db;

    public async Task<Booking?> GetByIdAsync(int id) =>
        await _db.Bookings
            .Include(b => b.Venue)
            .Include(b => b.VenuePricing)
            .Include(b => b.Applicant)
            .Include(b => b.BankDetail)
            .Include(b => b.Payments)
            .Include(b => b.EquipmentItems)
            .Include(b => b.Receipts)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<Booking?> GetByBookingNumberAsync(string number) =>
        await _db.Bookings
            .Include(b => b.Venue)
            .Include(b => b.VenuePricing)
            .Include(b => b.Applicant)
            .Include(b => b.BankDetail)
            .Include(b => b.Payments)
            .Include(b => b.EquipmentItems)
            .Include(b => b.Receipts)
            .FirstOrDefaultAsync(b => b.BookingNumber == number);

    public async Task<List<Booking>> GetByMobileAsync(string mobile) =>
        await _db.Bookings
            .Include(b => b.Venue)
            .Include(b => b.VenuePricing)
            .Include(b => b.Applicant)
            .Include(b => b.BankDetail)
            .Include(b => b.Payments)
            .Include(b => b.EquipmentItems)
            .Include(b => b.Receipts)
            .Where(b => b.Applicant != null && b.Applicant.Mobile == mobile)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

    public async Task<List<Booking>> GetBookingsForDateRangeAsync(int venueId, DateTime from, DateTime to)
    {
        var fromDate = DateOnly.FromDateTime(from);
        var toDate   = DateOnly.FromDateTime(to);
        return await _db.Bookings
            .Where(b => b.VenueId == venueId
                     && b.FromDate <= toDate
                     && b.ToDate   >= fromDate)
            .ToListAsync();
    }

    public async Task<VenueMaster?> GetVenueCapacityAsync(int venueId) =>
        await _db.VenueMaster
            .Where(venue => venue.VenueId == venueId)
            .FirstOrDefaultAsync();

    public async Task<VenuePricing?> GetVenuePricingAsync(int venuePricingId) =>
        await _db.VenuePricing.Include(p => p.Venue).FirstOrDefaultAsync(p => p.Id == venuePricingId);

    public async Task<List<VenueEquipment>> GetEquipmentByIdsAsync(List<int> ids)
    {
        return await _db.VenueEquipment
            .Where(e => ids.Contains(e.Id) && e.IsActive)
            .ToListAsync();
    }

    public async Task<(List<Booking>, int)> GetAllAsync(BookingFilterDto filter)
    {
        var q = _db.Bookings
            .Include(b => b.Venue)
            .Include(b => b.VenuePricing)
            .Include(b => b.Applicant)
            .Include(b => b.Payments)
            .AsQueryable();

        if (!string.IsNullOrEmpty(filter.BookingNumber))
            q = q.Where(b => b.BookingNumber.Contains(filter.BookingNumber));
        if (!string.IsNullOrEmpty(filter.Status))
            q = q.Where(b => b.Status == filter.Status);
        if (!string.IsNullOrEmpty(filter.Mobile))
            q = q.Where(b => b.Applicant != null && b.Applicant.Mobile.Contains(filter.Mobile));
        if (!string.IsNullOrEmpty(filter.ApplicantName))
            q = q.Where(b => b.Applicant != null && b.Applicant.FullName.Contains(filter.ApplicantName));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(b => b.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Booking> CreateBookingAsync(Booking booking, Applicant applicant, BankDetail bankDetail, List<BookingEquipment>? equipmentItems = null)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
            try
            {
                var venue = await GetVenueCapacityAsync(booking.VenueId);
                if (venue == null || venue.MorningBookingCapacity <= 0 || venue.EveningBookingCapacity <= 0)
                    throw new InvalidOperationException("Booking capacity is not configured for the selected venue.");

                var existingBookings = await _db.Bookings
                    .Where(existing => existing.VenueId == booking.VenueId
                        && existing.Status != "Cancelled"
                        && existing.FromDate <= booking.ToDate
                        && existing.ToDate >= booking.FromDate)
                    .ToListAsync();
                if (HasCapacityConflict(
                    existingBookings,
                    booking.FromDate,
                    booking.ToDate,
                    booking.Session,
                    venue.MorningBookingCapacity,
                    venue.EveningBookingCapacity))
                    throw new InvalidOperationException("Selected session has reached its booking capacity for one or more dates.");

                _db.Bookings.Add(booking);
                await _db.SaveChangesAsync();

                applicant.BookingId  = booking.Id;
                bankDetail.BookingId = booking.Id;

                _db.Applicants.Add(applicant);
                _db.BankDetails.Add(bankDetail);

                if (equipmentItems != null && equipmentItems.Any())
                {
                    foreach (var item in equipmentItems)
                    {
                        item.BookingId = booking.Id;
                        _db.BookingEquipment.Add(item);
                    }
                }

                // Create initial Payment Pending
                _db.Payments.Add(new Payment
                {
                    BookingId = booking.Id,
                    Amount    = booking.GrandTotal,
                    Status    = "Pending"
                });

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return (await GetByIdAsync(booking.Id))!;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        });
    }

    public async Task UpdateAsync(Booking booking)
    {
        booking.UpdatedAt = DateTime.UtcNow;
        _db.Bookings.Update(booking);
        await _db.SaveChangesAsync();
    }

    public async Task<int> GetCountForYearAsync(int year) =>
        await _db.Bookings.CountAsync(b => b.CreatedAt.Year == year);

    private static bool HasCapacityConflict(
        IEnumerable<Booking> bookings,
        DateOnly fromDate,
        DateOnly toDate,
        string session,
        int morningCapacity,
        int eveningCapacity)
    {
        var activeBookings = bookings.Where(booking => booking.Status != "Cancelled").ToList();
        if (activeBookings.Any(booking => booking.Session.Equals("FullDay", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (session.Equals("FullDay", StringComparison.OrdinalIgnoreCase))
            return activeBookings.Count > 0;

        var capacity = session.Equals("Morning", StringComparison.OrdinalIgnoreCase)
            ? morningCapacity
            : eveningCapacity;

        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            var bookingsForSession = activeBookings.Count(booking =>
                booking.Session.Equals(session, StringComparison.OrdinalIgnoreCase)
                && booking.FromDate <= date
                && booking.ToDate >= date);
            if (bookingsForSession >= capacity) return true;
        }
        return false;
    }
}

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public async Task<User?> GetByEmailAsync(string email) =>
        await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Email == email);

    public async Task<User?> GetAdminByMobileAsync(string mobile) =>
        await _db.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Mobile == mobile && (u.Role.Name == "Admin" || u.Role.Name == "Staff"));

    public async Task<User?> GetByIdAsync(int id) =>
        await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);

    public async Task<List<User>> GetAllAsync() =>
        await _db.Users.Include(u => u.Role).ToListAsync();

    public async Task<User> CreateAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }
}

public class HolidayRepository : IHolidayRepository
{
    private readonly AppDbContext _db;
    public HolidayRepository(AppDbContext db) => _db = db;

    public async Task<List<Holiday>> GetAllAsync() =>
        await _db.Holidays.OrderBy(h => h.HolidayDate).ToListAsync();

    public async Task<List<Holiday>> GetHolidaysInRangeAsync(DateTime from, DateTime to)
    {
        var f = DateOnly.FromDateTime(from);
        var t = DateOnly.FromDateTime(to);
        return await _db.Holidays
            .Where(h => h.IsActive && h.HolidayDate >= f && h.HolidayDate <= t)
            .ToListAsync();
    }

    public async Task<Holiday> CreateAsync(Holiday h) { _db.Holidays.Add(h); await _db.SaveChangesAsync(); return h; }
    public async Task UpdateAsync(Holiday h)          { _db.Holidays.Update(h); await _db.SaveChangesAsync(); }
    public async Task DeleteAsync(int id)             { var h = await _db.Holidays.FindAsync(id); if (h != null) { _db.Holidays.Remove(h); await _db.SaveChangesAsync(); } }
}

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _db;
    public PaymentRepository(AppDbContext db) => _db = db;

    public async Task<Payment?> GetByIdAsync(int id) => await _db.Payments.FindAsync(id);

    public async Task<List<Payment>> GetByBookingAsync(int bookingId) =>
        await _db.Payments.Where(p => p.BookingId == bookingId).ToListAsync();

    public async Task<Payment> CreateAsync(Payment p) { _db.Payments.Add(p); await _db.SaveChangesAsync(); return p; }
    public async Task UpdateAsync(Payment p) { p.UpdatedAt = DateTime.UtcNow; _db.Payments.Update(p); await _db.SaveChangesAsync(); }
}

public class GalleryRepository : IGalleryRepository
{
    private readonly AppDbContext _db;
    public GalleryRepository(AppDbContext db) => _db = db;

    public async Task<List<GalleryItem>> GetAllAsync(string? type) =>
        await _db.Gallery
            .Where(g => g.IsActive && (type == null || g.MediaType == type))
            .OrderBy(g => g.DisplayOrder)
            .ToListAsync();

    public async Task<GalleryItem> CreateAsync(GalleryItem item) { _db.Gallery.Add(item); await _db.SaveChangesAsync(); return item; }
    public async Task DeleteAsync(int id) { var g = await _db.Gallery.FindAsync(id); if (g != null) { g.IsActive = false; await _db.SaveChangesAsync(); } }
}

public class NoticeRepository : INoticeRepository
{
    private readonly AppDbContext _db;
    public NoticeRepository(AppDbContext db) => _db = db;

    public async Task<List<Notice>> GetActiveAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await _db.Notices
            .Where(n => n.IsActive && n.PublishDate <= today && (n.ExpiryDate == null || n.ExpiryDate >= today))
            .OrderByDescending(n => n.IsImportant)
            .ThenByDescending(n => n.PublishDate)
            .ToListAsync();
    }

    public async Task<List<Notice>> GetAllAsync() =>
        await _db.Notices.OrderByDescending(n => n.CreatedAt).ToListAsync();

    public async Task<Notice> CreateAsync(Notice n) { _db.Notices.Add(n); await _db.SaveChangesAsync(); return n; }
    public async Task UpdateAsync(Notice n)         { _db.Notices.Update(n); await _db.SaveChangesAsync(); }
    public async Task DeleteAsync(int id)           { var n = await _db.Notices.FindAsync(id); if (n != null) { _db.Notices.Remove(n); await _db.SaveChangesAsync(); } }
}
