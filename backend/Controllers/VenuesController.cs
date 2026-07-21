using HutatmaBooking.API.Data;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HutatmaBooking.API.Controllers;

[ApiController]
[Route("api/venues")]
public class VenuesController : ControllerBase
{
    private readonly AppDbContext _db;

    public VenuesController(AppDbContext db) => _db = db;

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

        pricing.Amount = dto.Amount;
        pricing.RefundableDeposit = dto.RefundableDeposit;
        pricing.HolidaySurchargeAmount = dto.HolidaySurchargeAmount;
        pricing.CGSTPercent = dto.CGSTPercent;
        pricing.SGSTPercent = dto.SGSTPercent;
        pricing.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
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
            EffectiveFrom = pricing.EffectiveFrom,
            EffectiveTo = pricing.EffectiveTo
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] VenueStatusUpdateDto dto)
    {
        var venue = await _db.VenueMaster.FindAsync(id);
        if (venue == null) return NotFound();

        venue.Status = dto.Status;
        venue.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
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
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
}
