using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HutatmaBooking.API.Data;

public sealed class TemporarySchemaFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(local);Database=HutatmaBookingSchema;Integrated Security=True;TrustServerCertificate=True")
            .Options;
        return new AppDbContext(options);
    }
}
