using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;

namespace HutatmaBooking.API.Services;

public class GalleryService : IGalleryService
{
    private readonly IGalleryRepository _repo;
    public GalleryService(IGalleryRepository repo) => _repo = repo;

    public async Task<List<GalleryItemDto>> GetAllAsync(string? type = null)
    {
        var items = await _repo.GetAllAsync(type);
        return items.Select(i => new GalleryItemDto
        {
            Id = i.Id,
            Title = i.Title,
            Description = i.Description,
            FilePath = i.FilePath,
            MediaType = i.MediaType,
            VideoURL = i.VideoURL,
            ThumbnailPath = i.ThumbnailPath,
            DisplayOrder = i.DisplayOrder,
            IsActive = i.IsActive
        }).ToList();
    }

    public async Task<GalleryItemDto> CreateAsync(GalleryItemDto dto)
    {
        var item = new GalleryItem
        {
            Title = dto.Title,
            Description = dto.Description,
            FilePath = dto.FilePath,
            MediaType = dto.MediaType,
            VideoURL = dto.VideoURL,
            ThumbnailPath = dto.ThumbnailPath,
            DisplayOrder = dto.DisplayOrder,
            IsActive = dto.IsActive
        };
        var created = await _repo.CreateAsync(item);
        dto.Id = created.Id;
        return dto;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await _repo.DeleteAsync(id);
        return true;
    }
}
