using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.Data;
using Microsoft.EntityFrameworkCore;

namespace HutatmaBooking.API.Services;

public class ReceiptService : IReceiptService
{
    private readonly AppDbContext _db;
    public ReceiptService(AppDbContext db) => _db = db;

    public async Task<string> GenerateReceiptAsync(int bookingId)
    {
        var receipt = await _db.Receipts.FirstOrDefaultAsync(r => r.BookingId == bookingId);
        return receipt?.ReceiptNumber ?? string.Empty;
    }
}
