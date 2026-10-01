using HutatmaBooking.API.Data;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/venues")]
public class VenuesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public VenuesController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var venues = await _db.VenueMaster
            .AsNoTracking()
            .Where(v => v.Status == "Active")
            .OrderBy(v => v.DisplayOrder)
            .Select(v => new VenueListDto
            {
                VenueId = v.VenueId,
                VenueName = v.VenueName,
                Description = v.Description,
                Capacity = v.Capacity,
                Location = v.Location,
                Status = v.Status,
                PrimaryImageUrl = v.Images
                    .Where(i => i.IsActive)
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.DisplayOrder)
                    .Select(i => i.ImageUrl)
                    .FirstOrDefault(),
                Facilities = v.Facilities
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.DisplayOrder)
                    .Select(f => f.FacilityName)
                    .ToList()
            })
            .ToListAsync();

        return Ok(venues);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var venue = await _db.VenueMaster
            .AsNoTracking()
            .Where(v => v.VenueId == id && v.Status == "Active")
            .Select(v => new VenueListDto
            {
                VenueId = v.VenueId,
                VenueName = v.VenueName,
                Description = v.Description,
                Capacity = v.Capacity,
                Location = v.Location,
                Status = v.Status,
                PrimaryImageUrl = v.Images
                    .Where(i => i.IsActive)
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.DisplayOrder)
                    .Select(i => i.ImageUrl)
                    .FirstOrDefault(),
                Facilities = v.Facilities
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.DisplayOrder)
                    .Select(f => f.FacilityName)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return venue == null ? NotFound() : Ok(venue);
    }

    [HttpGet("{id:int}/details")]
    public async Task<IActionResult> GetDetails(int id)
    {
        var venue = await _db.VenueMaster
            .AsNoTracking()
            .Where(v => v.VenueId == id && v.Status == "Active")
            .Select(v => new VenueDetailsDto
            {
                VenueId = v.VenueId,
                VenueName = v.VenueName,
                Description = v.Description,
                Capacity = v.Capacity,
                Location = v.Location,
                Status = v.Status,
                Facilities = v.Facilities
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.DisplayOrder)
                    .Select(f => new VenueFacilityDto
                    {
                        Id = f.Id,
                        FacilityName = f.FacilityName,
                        Description = f.Description
                    })
                    .ToList(),
                Images = v.Images
                    .Where(i => i.IsActive)
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.DisplayOrder)
                    .Select(i => new VenueImageDto
                    {
                        Id = i.Id,
                        ImageUrl = i.ImageUrl,
                        Caption = i.Caption,
                        IsPrimary = i.IsPrimary
                    })
                    .ToList(),
                Rules = v.Rules
                    .Where(r => r.IsActive)
                    .OrderBy(r => r.DisplayOrder)
                    .Select(r => new VenueRuleDto
                    {
                        Id = r.Id,
                        RuleTitle = r.RuleTitle,
                        RuleText = r.RuleText
                    })
                    .ToList(),
                Pricing = v.Pricing
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.DisplayOrder)
                    .Select(p => new VenuePricingDto
                    {
                        Id = p.Id,
                        PriceItemName = p.PriceItemName,
                        ChargeUnit = p.ChargeUnit,
                        Amount = p.Amount,
                        RefundableDeposit = p.RefundableDeposit,
                        HolidaySurchargeAmount = p.HolidaySurchargeAmount,
                        CGSTPercent = p.CGSTPercent,
                        SGSTPercent = p.SGSTPercent,
                        IsActive = p.IsActive,
                        EffectiveFrom = p.EffectiveFrom,
                        EffectiveTo = p.EffectiveTo
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return venue == null ? NotFound() : Ok(venue);
    }

    [HttpGet("equipment")]
    public async Task<IActionResult> GetEquipment()
    {
        var equipment = await _db.VenueEquipment
            .AsNoTracking()
            .Where(e => e.IsActive)
            .OrderBy(e => e.DisplayOrder)
            .Select(e => new VenueEquipmentDto
            {
                Id = e.Id,
                EquipmentName = e.EquipmentName,
                ChargeUnit = e.ChargeUnit,
                Amount = e.Amount,
                FreeQuantity = e.FreeQuantity,
            })
            .ToListAsync();
        return Ok(equipment);
    }

    // ── Admin: pricing & venue status management ────────────────────────────
    // Replaces the old PremisesController/RatesController. Pricing lives in
    // VenuePricing (seeded from the verified rate chart) rather than free-form
    // admin-entered rows, so editing here updates the actual rate the public
    // booking flow charges.

    [Authorize(Policy = "StaffPlus")]
    [HttpGet("admin/all")]
    public async Task<IActionResult> GetAllForAdmin()
    {
        var venues = await _db.VenueMaster
            .AsNoTracking()
            .OrderBy(v => v.DisplayOrder)
            .Select(v => new VenueDetailsDto
            {
                VenueId = v.VenueId,
                VenueName = v.VenueName,
                Description = v.Description,
                Capacity = v.Capacity,
                Location = v.Location,
                Status = v.Status,
                Pricing = v.Pricing
                    .OrderBy(p => p.DisplayOrder)
                    .Select(p => new VenuePricingDto
                    {
                        Id = p.Id,
                        PriceItemName = p.PriceItemName,
                        ChargeUnit = p.ChargeUnit,
                        Amount = p.Amount,
                        RefundableDeposit = p.RefundableDeposit,
                        HolidaySurchargeAmount = p.HolidaySurchargeAmount,
                        CGSTPercent = p.CGSTPercent,
                        SGSTPercent = p.SGSTPercent,
                        EffectiveFrom = p.EffectiveFrom,
                        EffectiveTo = p.EffectiveTo
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(venues);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("pricing/{id:int}")]
    public async Task<IActionResult> UpdatePricing(int id, [FromBody] VenuePricingUpdateDto dto)
    {
        var pricing = await _db.VenuePricing.FindAsync(id);
        if (pricing == null) return NotFound();
        var oldValues = JsonSerializer.Serialize(pricing);

        pricing.Amount = dto.Amount;
        pricing.RefundableDeposit = dto.RefundableDeposit;
        pricing.HolidaySurchargeAmount = dto.HolidaySurchargeAmount;
        pricing.CGSTPercent = dto.CGSTPercent;
        pricing.SGSTPercent = dto.SGSTPercent;
        pricing.IsActive = dto.IsActive;
        if (!string.IsNullOrWhiteSpace(dto.PriceItemName)) pricing.PriceItemName = dto.PriceItemName;
        if (!string.IsNullOrWhiteSpace(dto.ChargeUnit)) pricing.ChargeUnit = dto.ChargeUnit;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("Updated", "VenuePricing", pricing.Id, oldValues, JsonSerializer.Serialize(pricing));
        return Ok(new VenuePricingDto
        {
            Id = pricing.Id,
            PriceItemName = pricing.PriceItemName,
            ChargeUnit = pricing.ChargeUnit,
            Amount = pricing.Amount,
            RefundableDeposit = pricing.RefundableDeposit,
            HolidaySurchargeAmount = pricing.HolidaySurchargeAmount,
            CGSTPercent = pricing.CGSTPercent,
            SGSTPercent = pricing.SGSTPercent,
            IsActive = pricing.IsActive,
            EffectiveFrom = pricing.EffectiveFrom,
            EffectiveTo = pricing.EffectiveTo
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("admin")]
    public async Task<IActionResult> CreateVenue([FromBody] VenueCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VenueName)) return BadRequest("Venue name is required.");
        var rate = dto.InitialPricing;
        if (string.IsNullOrWhiteSpace(rate.PriceItemName) || string.IsNullOrWhiteSpace(rate.ChargeUnit))
            return BadRequest("Initial price item name and charge unit are required.");
        if (rate.Amount < 0 || rate.RefundableDeposit < 0 || rate.HolidaySurchargeAmount < 0 || rate.CGSTPercent < 0 || rate.SGSTPercent < 0)
            return BadRequest("Pricing values cannot be negative.");
        if (await _db.VenueMaster.AnyAsync(v => v.VenueName == dto.VenueName.Trim()))
            return Conflict("A venue with this name already exists.");

        var venue = new Models.VenueMaster
        {
            VenueName = dto.VenueName.Trim(),
            Description = dto.Description?.Trim(),
            Capacity = dto.Capacity,
            Location = dto.Location?.Trim(),
            Status = "Active",
            DisplayOrder = (await _db.VenueMaster.MaxAsync(v => (int?)v.DisplayOrder) ?? 0) + 1
        };
        venue.Pricing.Add(new Models.VenuePricing
        {
            PriceItemName = rate.PriceItemName.Trim(),
            ChargeUnit = rate.ChargeUnit.Trim(),
            Amount = rate.Amount,
            RefundableDeposit = rate.RefundableDeposit,
            HolidaySurchargeAmount = rate.HolidaySurchargeAmount,
            CGSTPercent = rate.CGSTPercent,
            SGSTPercent = rate.SGSTPercent,
            EffectiveFrom = rate.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow),
            EffectiveTo = rate.EffectiveTo,
            DisplayOrder = 1,
            IsActive = true
        });
        _db.VenueMaster.Add(venue);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("Created", "VenueMaster", venue.VenueId, null, JsonSerializer.Serialize(venue));
        var initialPricing = venue.Pricing.Single();
        await _audit.LogAsync("Created", "VenuePricing", initialPricing.Id, null, JsonSerializer.Serialize(initialPricing));
        return CreatedAtAction(nameof(GetById), new { id = venue.VenueId }, new { venue.VenueId, venue.VenueName, venue.Status, PricingId = initialPricing.Id });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("{venueId:int}/pricing")]
    public async Task<IActionResult> CreatePricing(int venueId, [FromBody] VenuePricingCreateDto dto)
    {
        var venue = await _db.VenueMaster.FindAsync(venueId);
        if (venue == null || venue.Status == "Removed") return NotFound("Venue not found.");
        if (string.IsNullOrWhiteSpace(dto.PriceItemName) || string.IsNullOrWhiteSpace(dto.ChargeUnit))
            return BadRequest("Price item name and charge unit are required.");
        if (dto.Amount < 0 || dto.RefundableDeposit < 0 || dto.HolidaySurchargeAmount < 0 || dto.CGSTPercent < 0 || dto.SGSTPercent < 0)
            return BadRequest("Pricing values cannot be negative.");

        var pricing = new Models.VenuePricing
        {
            VenueId = venueId,
            PriceItemName = dto.PriceItemName.Trim(),
            ChargeUnit = dto.ChargeUnit.Trim(),
            Amount = dto.Amount,
            RefundableDeposit = dto.RefundableDeposit,
            HolidaySurchargeAmount = dto.HolidaySurchargeAmount,
            CGSTPercent = dto.CGSTPercent,
            SGSTPercent = dto.SGSTPercent,
            EffectiveFrom = dto.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow),
            EffectiveTo = dto.EffectiveTo,
            DisplayOrder = (await _db.VenuePricing.Where(p => p.VenueId == venueId).MaxAsync(p => (int?)p.DisplayOrder) ?? 0) + 1,
            IsActive = true
        };
        _db.VenuePricing.Add(pricing);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("Created", "VenuePricing", pricing.Id, null, JsonSerializer.Serialize(pricing));
        return Ok(new VenuePricingDto
        {
            Id = pricing.Id,
            PriceItemName = pricing.PriceItemName,
            ChargeUnit = pricing.ChargeUnit,
            Amount = pricing.Amount,
            RefundableDeposit = pricing.RefundableDeposit,
            HolidaySurchargeAmount = pricing.HolidaySurchargeAmount,
            CGSTPercent = pricing.CGSTPercent,
            SGSTPercent = pricing.SGSTPercent,
            IsActive = pricing.IsActive,
            EffectiveFrom = pricing.EffectiveFrom,
            EffectiveTo = pricing.EffectiveTo
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> RemoveVenue(int id)
    {
        var venue = await _db.VenueMaster.Include(v => v.Pricing).FirstOrDefaultAsync(v => v.VenueId == id);
        if (venue == null) return NotFound();
        if (venue.Status == "Removed") return NoContent();

        var oldStatus = venue.Status;
        venue.Status = "Removed";
        venue.UpdatedAt = DateTime.UtcNow;
        foreach (var pricing in venue.Pricing) pricing.IsActive = false;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("Removed", "VenueMaster", venue.VenueId, oldStatus, "Removed; associated pricing deactivated");
        return NoContent();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("pricing/{id:int}")]
    public async Task<IActionResult> RemovePricing(int id)
    {
        var pricing = await _db.VenuePricing.FindAsync(id);
        if (pricing == null) return NotFound();
        if (!pricing.IsActive) return NoContent();

        pricing.IsActive = false;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("Removed", "VenuePricing", pricing.Id, "Active", "Inactive");
        return NoContent();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] VenueStatusUpdateDto dto)
    {
        if (dto.Status != "Active" && dto.Status != "Closed") return BadRequest("Status must be Active or Closed.");
        var venue = await _db.VenueMaster.FindAsync(id);
        if (venue == null) return NotFound();

        var oldStatus = venue.Status;
        venue.Status = dto.Status;
        venue.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("StatusChanged", "VenueMaster", venue.VenueId, oldStatus, venue.Status);
        return Ok(new { venue.VenueId, venue.Status });
    }
}

public class VenueEquipmentDto
{
    public int Id { get; set; }
    public string EquipmentName { get; set; } = "";
    public string ChargeUnit { get; set; } = "";
    public decimal Amount { get; set; }
    public int FreeQuantity { get; set; }
}

public class VenueListDto
{
    public int VenueId { get; set; }
    public string VenueName { get; set; } = "";
    public string? Description { get; set; }
    public int? Capacity { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = "";
    public string? PrimaryImageUrl { get; set; }
    public List<string> Facilities { get; set; } = new();
}

public class VenueDetailsDto : VenueListDto
{
    public new List<VenueFacilityDto> Facilities { get; set; } = new();
    public List<VenueImageDto> Images { get; set; } = new();
    public List<VenueRuleDto> Rules { get; set; } = new();
    public List<VenuePricingDto> Pricing { get; set; } = new();
}

public class VenueFacilityDto
{
    public int Id { get; set; }
    public string FacilityName { get; set; } = "";
    public string? Description { get; set; }
}

public class VenueImageDto
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = "";
    public string? Caption { get; set; }
    public bool IsPrimary { get; set; }
}

public class VenueRuleDto
{
    public int Id { get; set; }
    public string RuleTitle { get; set; } = "";
    public string RuleText { get; set; } = "";
}

public class VenuePricingDto
{
    public int Id { get; set; }
    public string PriceItemName { get; set; } = "";
    public string ChargeUnit { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal RefundableDeposit { get; set; }
    public decimal HolidaySurchargeAmount { get; set; }
    public decimal CGSTPercent { get; set; }
    public decimal SGSTPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
}

public class VenueCreateDto
{
    public string VenueName { get; set; } = "";
    public string? Description { get; set; }
    public int? Capacity { get; set; }
    public string? Location { get; set; }
    public VenuePricingCreateDto InitialPricing { get; set; } = new();
}

public class VenuePricingCreateDto
{
    public string PriceItemName { get; set; } = "";
    public string ChargeUnit { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal RefundableDeposit { get; set; }
    public decimal HolidaySurchargeAmount { get; set; }
    public decimal CGSTPercent { get; set; }
    public decimal SGSTPercent { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
}
