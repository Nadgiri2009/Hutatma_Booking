using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HutatmaBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionSpecificBookingCapacities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BookingCapacityPerSession",
                table: "VenueMaster",
                newName: "MorningBookingCapacity");

            migrationBuilder.AddColumn<int>(
                name: "EveningBookingCapacity",
                table: "VenueMaster",
                type: "int",
                nullable: false,
                defaultValue: 30);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EveningBookingCapacity",
                table: "VenueMaster");

            migrationBuilder.RenameColumn(
                name: "MorningBookingCapacity",
                table: "VenueMaster",
                newName: "BookingCapacityPerSession");
        }
    }
}
