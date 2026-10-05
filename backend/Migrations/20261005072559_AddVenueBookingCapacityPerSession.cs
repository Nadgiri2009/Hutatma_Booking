using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HutatmaBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddVenueBookingCapacityPerSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BookingCapacityPerSession",
                table: "VenueMaster",
                type: "int",
                nullable: false,
                defaultValue: 30);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BookingCapacityPerSession",
                table: "VenueMaster");
        }
    }
}
