using HutatmaBooking.API.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HutatmaBooking.API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261006104500_AddAfternoonSlotAndMultiSlotBookings")]
    public partial class AddAfternoonSlotAndMultiSlotBookings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AfternoonBookingCapacity",
                table: "VenueMaster",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AlterColumn<string>(
                name: "Session",
                table: "Bookings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Session",
                table: "Bookings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.DropColumn(
                name: "AfternoonBookingCapacity",
                table: "VenueMaster");
        }
    }
}