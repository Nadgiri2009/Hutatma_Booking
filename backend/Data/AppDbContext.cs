using HutatmaBooking.API.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace HutatmaBooking.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role>         Roles         => Set<Role>();
    public DbSet<User>         Users         => Set<User>();
    public DbSet<VenueMaster>  VenueMaster   => Set<VenueMaster>();
    public DbSet<VenueFacility> VenueFacilities => Set<VenueFacility>();
    public DbSet<VenueImage>   VenueImages   => Set<VenueImage>();
    public DbSet<VenueRule>    VenueRules    => Set<VenueRule>();
    public DbSet<VenuePricing> VenuePricing  => Set<VenuePricing>();
    public DbSet<VenueEquipment> VenueEquipment => Set<VenueEquipment>();
    public DbSet<Holiday>      Holidays      => Set<Holiday>();
    public DbSet<Booking>      Bookings      => Set<Booking>();
    public DbSet<Applicant>    Applicants    => Set<Applicant>();
    public DbSet<BankDetail>   BankDetails   => Set<BankDetail>();
    public DbSet<Payment>      Payments      => Set<Payment>();
    public DbSet<Receipt>      Receipts      => Set<Receipt>();
    public DbSet<BookingEquipment> BookingEquipment => Set<BookingEquipment>();
    public DbSet<GalleryItem>  Gallery       => Set<GalleryItem>();
    public DbSet<Notice>       Notices       => Set<Notice>();
    public DbSet<Complaint>    Complaints    => Set<Complaint>();
    public DbSet<Cancellation> Cancellations => Set<Cancellation>();
    public DbSet<RefundRequest> RefundRequests => Set<RefundRequest>();
    public DbSet<AuditLog>     AuditLogs     => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        mb.Entity<Receipt>()
            .HasOne(r => r.Booking)
            .WithMany(b => b.Receipts)
            .HasForeignKey(r => r.BookingId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Receipt>()
            .HasOne(r => r.Payment)
            .WithOne(p => p.Receipt)
            .HasForeignKey<Receipt>(r => r.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<VenueMaster>()
            .HasIndex(v => v.VenueName)
            .IsUnique();

        mb.Entity<VenueFacility>()
            .HasOne(f => f.Venue)
            .WithMany(v => v.Facilities)
            .HasForeignKey(f => f.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VenueImage>()
            .HasOne(i => i.Venue)
            .WithMany(v => v.Images)
            .HasForeignKey(i => i.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VenueRule>()
            .HasOne(r => r.Venue)
            .WithMany(v => v.Rules)
            .HasForeignKey(r => r.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<VenuePricing>()
            .HasOne(p => p.Venue)
            .WithMany(v => v.Pricing)
            .HasForeignKey(p => p.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Booking>()
            .HasOne(b => b.Venue)
            .WithMany()
            .HasForeignKey(b => b.VenueId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Booking>()
            .HasOne(b => b.VenuePricing)
            .WithMany()
            .HasForeignKey(b => b.VenuePricingId)
            .OnDelete(DeleteBehavior.Restrict);

        mb.Entity<Booking>()
            .HasIndex(b => new { b.VenueId, b.FromDate, b.ToDate, b.Session });

        mb.Entity<RefundRequest>()
            .HasIndex(r => r.BookingId)
            .IsUnique();

        mb.Entity<RefundRequest>()
            .HasIndex(r => r.RefundRequestNumber)
            .IsUnique();

        mb.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin", Description = "System Administrator", CreatedAt = new DateTime(2026, 7, 7, 17, 23, 36, 249, DateTimeKind.Utc).AddTicks(5981) },
            new Role { Id = 2, Name = "Staff", Description = "Office Staff", CreatedAt = new DateTime(2026, 7, 7, 17, 23, 36, 249, DateTimeKind.Utc).AddTicks(5990) },
            new Role { Id = 3, Name = "User", Description = "Public User", CreatedAt = new DateTime(2026, 7, 7, 17, 23, 36, 249, DateTimeKind.Utc).AddTicks(5992) }
        );

        // Seed default admin user (password: Admin@123)
        
        mb.Entity<User>().HasData(
            new User
            {
                Id = 1,
                FullName = "Admin",
                Email = "admin@hutatmamandir.org",
                Mobile = "",
                PasswordHash = "$2a$11$ae3/pgwmbVxQLGVEO8GrluWuCll2rnKltPvVbZ5HadGl0vRnx7VpK",
                RoleId = 1,
                IsActive = true,
                CreatedAt = new DateTime(2026, 6, 17)
            }
        );

        mb.Entity<Booking>()
            .Property(b => b.Status)
            .HasDefaultValue("PendingPayment");

        mb.Entity<Payment>()
            .Property(p => p.Status)
            .HasDefaultValue("Pending");

        // --- NEW CONFIGURATIONS TO FIX SQL SEEDING ERRORS ---
        mb.Entity<VenueMaster>()
            .Property(v => v.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        mb.Entity<VenueEquipment>()
            .Property(e => e.IsActive)
            .HasDefaultValue(true);
            
        mb.Entity<VenueFacility>()
            .Property(f => f.IsActive)
            .HasDefaultValue(true);
            
        mb.Entity<VenuePricing>()
            .Property(p => p.IsActive)
            .HasDefaultValue(true);
            
        mb.Entity<VenueRule>()
            .Property(r => r.IsActive)
            .HasDefaultValue(true);
        // ----------------------------------------------------

        // Decimal precision
        foreach (var et in mb.Model.GetEntityTypes())
            foreach (var prop in et.GetProperties()
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
                prop.SetColumnType("decimal(12,2)");
    }
}