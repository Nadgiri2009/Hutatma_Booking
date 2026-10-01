using HutatmaBooking.API.Data;
using HutatmaBooking.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "AdminOnly")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? tableName, [FromQuery] string? action, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (fromDate.HasValue) query = query.Where(log => log.CreatedAt >= fromDate.Value.Date);
        if (toDate.HasValue) query = query.Where(log => log.CreatedAt < toDate.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(tableName)) query = query.Where(log => log.TableName.Contains(tableName));
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(log => log.Action.Contains(action));
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(log => log.TableName.Contains(search)
                || log.Action.Contains(search)
                || (log.OldValues != null && log.OldValues.Contains(search))
                || (log.NewValues != null && log.NewValues.Contains(search)));
        }

        var totalCount = await query.CountAsync();
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 10000);
        var items = await query.OrderByDescending(log => log.CreatedAt)
            .ThenByDescending(log => log.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new AuditReportRowDto
            {
                Id = log.Id,
                UserName = log.UserId == null ? "System" : _db.Users
                    .Where(user => user.Id == log.UserId)
                    .Select(user => user.FullName)
                    .FirstOrDefault() ?? "Unknown",
                Action = log.Action,
                TableName = log.TableName,
                RecordId = log.RecordId,
                OldValues = log.OldValues,
                NewValues = log.NewValues,
                IPAddress = log.IPAddress,
                CreatedAt = log.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<AuditReportRowDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }
}

public class AuditReportRowDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = "";
    public string Action { get; set; } = "";
    public string TableName { get; set; } = "";
    public int? RecordId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IPAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}
