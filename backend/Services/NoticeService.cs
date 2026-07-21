using HutatmaBooking.API.Repositories.Interfaces;
using HutatmaBooking.API.Services.Interfaces;
using HutatmaBooking.API.DTOs;
using HutatmaBooking.API.Models;

namespace HutatmaBooking.API.Services;

public class NoticeService : INoticeService
{
    private readonly INoticeRepository _repo;
    public NoticeService(INoticeRepository repo) => _repo = repo;

    public async Task<List<NoticeDto>> GetActiveAsync()
    {
        var items = await _repo.GetActiveAsync();
        return items.Select(n => new NoticeDto
        {
            Id = n.Id, Title = n.Title, Content = n.Content,
            IsImportant = n.IsImportant, PublishDate = n.PublishDate,
            ExpiryDate = n.ExpiryDate, IsActive = n.IsActive
        }).ToList();
    }

    public async Task<List<NoticeDto>> GetAllAsync()
    {
        var items = await _repo.GetAllAsync();
        return items.Select(n => new NoticeDto
        {
            Id = n.Id, Title = n.Title, Content = n.Content,
            IsImportant = n.IsImportant, PublishDate = n.PublishDate,
            ExpiryDate = n.ExpiryDate, IsActive = n.IsActive
        }).ToList();
    }

    public async Task<NoticeDto> CreateAsync(NoticeDto dto)
    {
        var n = new Notice
        {
            Title = dto.Title, Content = dto.Content, IsImportant = dto.IsImportant,
            PublishDate = dto.PublishDate, ExpiryDate = dto.ExpiryDate, IsActive = dto.IsActive
        };
        var created = await _repo.CreateAsync(n);
        dto.Id = created.Id;
        return dto;
    }

    public async Task<NoticeDto> UpdateAsync(int id, NoticeDto dto)
    {
        var all = await _repo.GetAllAsync();
        var n = all.FirstOrDefault(x => x.Id == id) ?? throw new KeyNotFoundException("Notice not found.");
        n.Title = dto.Title; n.Content = dto.Content; n.IsImportant = dto.IsImportant;
        n.PublishDate = dto.PublishDate; n.ExpiryDate = dto.ExpiryDate; n.IsActive = dto.IsActive;
        await _repo.UpdateAsync(n);
        dto.Id = n.Id;
        return dto;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await _repo.DeleteAsync(id);
        return true;
    }
}
