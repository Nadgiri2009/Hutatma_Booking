using HutatmaBooking.API.Data;
using HutatmaBooking.API.Models;
using HutatmaBooking.API.Services.Interfaces;

namespace HutatmaBooking.API.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _http;

    public AuditService(AppDbContext db, IHttpContextAccessor http)
    {
        _db   = db;
        _http = http;
    }

    public async Task LogAsync(string action, string table, int? recordId, string? oldVal, string? newVal)
    {
        var userIdStr = _http.HttpContext?.User?.FindFirst("sub")?.Value;
        int.TryParse(userIdStr, out var userId);

        _db.AuditLogs.Add(new AuditLog
        {
            UserId    = userId == 0 ? null : userId,
            Action    = action,
            TableName = table,
            RecordId  = recordId,
            OldValues = oldVal,
            NewValues = newVal,
            IPAddress = _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _http.HttpContext?.Request.Headers.UserAgent.ToString()
        });
        await _db.SaveChangesAsync();
    }
}
