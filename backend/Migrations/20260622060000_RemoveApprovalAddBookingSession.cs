using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HutatmaBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveApprovalAddBookingSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The admin "approve / reject" workflow has been removed from the
            // application (see BookingService / PaymentService / AdminBookingsPage).
            // Bookings are now confirmed automatically as soon as payment is
            // verified. Normalise any legacy rows left over from the old workflow
            // so existing data keeps working with the new status values:
            //   "Approved" -> "Confirmed"
            //   "Rejected" -> "Cancelled"
            migrationBuilder.Sql("UPDATE Bookings SET Status = 'Confirmed' WHERE Status = 'Approved';");
            migrationBuilder.Sql("UPDATE Bookings SET Status = 'Cancelled' WHERE Status = 'Rejected';");

            // Session (Morning / Evening / FullDay) is now tracked per booking so
            // the same venue can be booked for a Morning slot and an Evening slot
            // on the same date, while a FullDay booking blocks the whole date.
            // Existing bookings made before this change occupied the whole day,
            // so they're backfilled as "FullDay".
            migrationBuilder.AddColumn<string>(
                name: "Session",
                table: "Bookings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "FullDay");

            // Speeds up the Venue + Date + Session conflict/availability checks.
            migrationBuilder.CreateIndex(
                name: "IX_Bookings_VenueId_FromDate_ToDate_Session",
                table: "Bookings",
                columns: new[] { "VenueId", "FromDate", "ToDate", "Session" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_VenueId_FromDate_ToDate_Session",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Session",
                table: "Bookings");

            // Note: legacy Approved/Rejected status values are not restored.
        }
    }
}
