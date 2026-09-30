using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;

namespace HutatmaBooking.API.Repositories.Interfaces;

public interface IBookingRepository
{
    Task<Booking?>             GetByIdAsync(int id);
    Task<Booking?>             GetByBookingNumberAsync(string number);
    Task<List<Booking>>        GetByMobileAsync(string mobile);
    Task<List<Booking>>        GetBookingsForDateRangeAsync(int venueId, DateTime from, DateTime to);
    Task<List<VenueEquipment>> GetEquipmentByIdsAsync(List<int> ids);
    Task<VenuePricing?>        GetVenuePricingAsync(int venuePricingId);
    Task<(List<Booking>, int)> GetAllAsync(BookingFilterDto filter);
    Task<Booking>              CreateBookingAsync(Booking booking, Applicant applicant, BankDetail bankDetail, List<BookingEquipment>? equipmentItems = null);
    Task                       UpdateAsync(Booking booking);
    Task<int>                  GetCountForYearAsync(int year);
}

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetAdminByMobileAsync(string mobile);
    Task<User?> GetByIdAsync(int id);
    Task<List<User>> GetAllAsync();
    Task<User>   CreateAsync(User user);
    Task         UpdateAsync(User user);
}

public interface IHolidayRepository
{
    Task<List<Holiday>> GetAllAsync();
    Task<List<Holiday>> GetHolidaysInRangeAsync(DateTime from, DateTime to);
    Task<Holiday>       CreateAsync(Holiday holiday);
    Task                UpdateAsync(Holiday holiday);
    Task                DeleteAsync(int id);
}

public interface IPaymentRepository
{
    Task<Payment?>      GetByIdAsync(int id);
    Task<List<Payment>> GetByBookingAsync(int bookingId);
    Task<Payment>       CreateAsync(Payment payment);
    Task                UpdateAsync(Payment payment);
}

public interface IGalleryRepository
{
    Task<List<GalleryItem>> GetAllAsync(string? type);
    Task<GalleryItem>       CreateAsync(GalleryItem item);
    Task                    DeleteAsync(int id);
}

public interface INoticeRepository
{
    Task<List<Notice>> GetActiveAsync();
    Task<List<Notice>> GetAllAsync();
    Task<Notice>       CreateAsync(Notice notice);
    Task               UpdateAsync(Notice notice);
    Task               DeleteAsync(int id);
}
