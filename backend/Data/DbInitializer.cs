using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using System;

namespace HutatmaBooking.API.Data
{
    public static class DbInitializer
    {
        public static void Initialize(IServiceProvider serviceProvider)
        {
            var context = serviceProvider.GetRequiredService<AppDbContext>();

            // 1. Automatically handle migrations
            context.Database.Migrate();

            // 2. Safely seed data if tables are empty
            try
            {
                context.Database.ExecuteSqlRaw(@"
                    DECLARE @EffectiveFrom DATE = '2023-09-12';
                    DECLARE @Venues TABLE (
                        VenueName NVARCHAR(150), Description NVARCHAR(MAX), Capacity INT NULL, Location NVARCHAR(200), Status NVARCHAR(30), DisplayOrder INT
                    );
                    INSERT INTO @Venues VALUES
                    ('Main Hall', 'Main auditorium/hall booking categories charged per 3-hour slot as per HSM rate chart dated 12/09/2023.', NULL, 'Hutatma Smruti Mandir', 'Active', 1),
                    ('Open Space in Front of VIP Room', 'Open space measuring 60 x 40, charged per day.', NULL, 'In front of VIP Room', 'Active', 2),
                    ('Parking-side Space 25 x 40', 'Parking-side open space measuring 25 x 40, charged per day.', NULL, 'Parking side', 'Active', 3),
                    ('Parking-side Space Complete', 'Complete parking-side open space, charged per day.', NULL, 'Parking side', 'Active', 4),
                    ('Front Porch Space', 'Front porch space available with hall booking, charged per slot.', NULL, 'Front porch', 'Active', 5),
                    ('Residential Rooms 1-5', 'Residential rooms 1 to 5 for outstation artists, charged per day.', NULL, 'Residential rooms', 'Active', 6),
                    ('Residential Room 6', 'Residential room 6 for outstation artists, charged per day.', NULL, 'Residential rooms', 'Active', 7),
                    ('Dining Hall', 'Dining hall charged per hour.', NULL, 'Dining hall', 'Active', 8),
                    ('Shubhrai Art Gallery', 'Art gallery listed in the source rate chart; currently closed for renovation.', NULL, 'Hutatma Smruti Mandir', 'Closed', 9);
                    
                    INSERT INTO dbo.VenueMaster (VenueName, Description, Capacity, Location, Status, DisplayOrder)
                    SELECT v.VenueName, v.Description, v.Capacity, v.Location, v.Status, v.DisplayOrder
                    FROM @Venues v
                    WHERE NOT EXISTS (SELECT 1 FROM dbo.VenueMaster m WHERE m.VenueName = v.VenueName);

                    DECLARE @MainHall INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Main Hall');
                    DECLARE @OpenVip INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Open Space in Front of VIP Room');
                    DECLARE @ParkingPartial INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Parking-side Space 25 x 40');
                    DECLARE @ParkingFull INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Parking-side Space Complete');
                    DECLARE @Porch INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Front Porch Space');
                    DECLARE @Rooms15 INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Residential Rooms 1-5');
                    DECLARE @Room6 INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Residential Room 6');
                    DECLARE @Dining INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Dining Hall');
                    DECLARE @Gallery INT = (SELECT VenueId FROM dbo.VenueMaster WHERE VenueName = 'Shubhrai Art Gallery');

                    DECLARE @Facilities TABLE (VenueId INT, FacilityName NVARCHAR(150), Description NVARCHAR(MAX), DisplayOrder INT);
                    INSERT INTO @Facilities VALUES
                    (@MainHall, 'Main auditorium stage', 'Main hall/stage available for public and private programs.', 1),
                    (@MainHall, 'VIP room', 'VIP room available as an add-on service charged hourly.', 2),
                    (@MainHall, 'Lighting support', 'Spot, PAR, LED, screen and building illumination services are listed separately in equipment master.', 3),
                    (@OpenVip, 'Open space', '60 x 40 open space in front of VIP room.', 1),
                    (@ParkingPartial, 'Open space', '25 x 40 parking-side open space.', 1),
                    (@ParkingFull, 'Open space', 'Complete parking-side open space.', 1),
                    (@Porch, 'Front porch', 'Front porch space available with hall booking.', 1),
                    (@Rooms15, 'Residential rooms', 'Rooms 1 to 5 for outstation artists.', 1),
                    (@Room6, 'Residential room', 'Room 6 for outstation artists.', 1),
                    (@Dining, 'Dining hall', 'Dining hall charged hourly.', 1),
                    (@Gallery, 'Art gallery', 'Art gallery space, currently closed for renovation.', 1);
                    
                    INSERT INTO dbo.VenueFacilities (VenueId, FacilityName, Description, DisplayOrder)
                    SELECT f.VenueId, f.FacilityName, f.Description, f.DisplayOrder
                    FROM @Facilities f
                    WHERE f.VenueId IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM dbo.VenueFacilities x
                          WHERE x.VenueId = f.VenueId AND x.FacilityName = f.FacilityName
                      );

                    DECLARE @Pricing TABLE (
                        VenueId INT, PriceItemName NVARCHAR(150), ChargeUnit NVARCHAR(50), Amount DECIMAL(12,2), RefundableDeposit DECIMAL(12,2), DisplayOrder INT
                    );
                    INSERT INTO @Pricing VALUES
                    (@MainHall, 'Gathering - Private / School', 'Per 3-hour slot', 20000, 12000, 1),
                    (@MainHall, 'Govt / Semi-Govt / ZP / Entertainment', 'Per 3-hour slot', 10000, 12000, 2),
                    (@MainHall, 'Ceremony / Conference', 'Per 3-hour slot', 12000, 12000, 3),
                    (@MainHall, 'Lecture', 'Per 3-hour slot', 7500, 12000, 4),
                    (@MainHall, 'Orchestra / Gazal / Singing', 'Per 3-hour slot', 7500, 12000, 5),
                    (@MainHall, 'Lavni / Dance / Fashion Show', 'Per 3-hour slot', 15000, 12000, 6),
                    (@MainHall, 'Drama / Magic', 'Per 3-hour slot', 8000, 12000, 7),
                    (@MainHall, 'Children Drama / Balnatya', 'Per 3-hour slot', 3000, 12000, 8),
                    (@MainHall, 'Rehearsal - Stage Only', 'Per 3-hour slot', 3000, 12000, 9),
                    (@OpenVip, 'Open Space in Front of VIP Room 60 x 40', 'Per day', 7500, 0, 10),
                    (@ParkingPartial, 'Parking-side Space 25 x 40', 'Per day', 6000, 0, 11),
                    (@ParkingFull, 'Parking-side Space - Complete', 'Per day', 12000, 0, 12),
                    (@Porch, 'Front Porch Space - with Hall Booking', 'Per slot', 4000, 0, 13),
                    (@Rooms15, 'Residential Rooms 1-5 - Outstation Artists', 'Per day', 250, 0, 14),
                    (@Room6, 'Residential Room 6 - Outstation Artists', 'Per day', 300, 0, 15),
                    (@Dining, 'Dining Hall', 'Per hour', 100, 0, 16),
                    (@Gallery, 'Shubhrai Art Gallery', 'Per day', 10000, 12000, 17);
                    
                    INSERT INTO dbo.VenuePricing (
    VenueId, PriceItemName, ChargeUnit, Amount, RefundableDeposit, HolidaySurchargeAmount, CGSTPercent, SGSTPercent, EffectiveFrom, DisplayOrder
)
SELECT p.VenueId, p.PriceItemName, p.ChargeUnit, p.Amount, p.RefundableDeposit, 0, 9, 9, @EffectiveFrom, p.DisplayOrder
                    FROM @Pricing p
                    WHERE p.VenueId IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM dbo.VenuePricing x
                          WHERE x.VenueId = p.VenueId AND x.PriceItemName = p.PriceItemName AND x.EffectiveFrom = @EffectiveFrom
                      );

                    DECLARE @Equipment TABLE (
                        EquipmentName NVARCHAR(150), ChargeUnit NVARCHAR(50), Amount DECIMAL(12,2), FreeQuantity INT, DisplayOrder INT
                    );
                    INSERT INTO @Equipment VALUES
                    ('Spot Light - SMC', 'Per piece', 100, 4, 1),
                    ('Spot / PAR / LED Light - Company', 'Per piece', 50, 4, 2),
                    ('LED Screen up to 10 x 10 ft', 'Per slot', 500, 0, 3),
                    ('LED Screen up to 10 x 20 ft', 'Per slot', 1000, 0, 4),
                    ('Flat Screen - Municipal', 'Per slot', 500, 0, 5),
                    ('Generator Rent - organiser provides diesel', 'Per hour', 1500, 0, 6),
                    ('VIP Room Rent', 'Per hour', 200, 0, 7),
                    ('Video Shooting up to 2 cameras', 'Per slot', 1000, 0, 8),
                    ('Building Lighting - Illumination', 'Per slot', 1500, 0, 9),
                    ('Level Rent', 'Per level', 75, 4, 10),
                    ('Sound System - External', 'Per slot', 500, 0, 11),
                    ('Change in Program', 'Flat', 1000, 0, 12),
                    ('Rangoli Making', 'Per slot', 200, 0, 13);
                    
                    INSERT INTO dbo.VenueEquipment (EquipmentName, ChargeUnit, Amount, FreeQuantity, DisplayOrder)
                    SELECT e.EquipmentName, e.ChargeUnit, e.Amount, e.FreeQuantity, e.DisplayOrder
                    FROM @Equipment e
                    WHERE NOT EXISTS (SELECT 1 FROM dbo.VenueEquipment x WHERE x.EquipmentName = e.EquipmentName);

                    DECLARE @Rules TABLE (VenueId INT, RuleTitle NVARCHAR(200), RuleText NVARCHAR(MAX), DisplayOrder INT);
                    INSERT INTO @Rules VALUES
                    (@MainHall, 'GST', 'CGST 9% and SGST 9% are applicable on chargeable rent and add-on services.', 1),
                    (@MainHall, 'Holiday surcharge', 'Saturday, Sunday and public holiday bookings carry an additional Rs. 500 surcharge.', 2),
                    (@MainHall, 'Extra time', 'Extra time beyond a 3-hour hall slot is charged at Rs. 2,500 per hour plus applicable GST.', 3),
                    (@MainHall, 'Local artist discount', 'Local Solapur artists are eligible for 20% discount where applicable.', 4),
                    (@MainHall, 'Refundable deposit', 'Main hall bookings carry a refundable security deposit of Rs. 12,000.', 5),
                    (@MainHall, 'Staff responsibility', 'Door keeper and seating indicator staff are the responsibility of the organiser.', 6),
                    (@MainHall, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 7),
                    (@OpenVip, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1),
                    (@ParkingPartial, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1),
                    (@ParkingFull, 'Open space electricity', 'Light bill for open spaces is charged as per actual use.', 1),
                    (@Gallery, 'Status', 'Currently closed for renovation as per the source rate chart.', 1);
                    
                    INSERT INTO dbo.VenueRules (VenueId, RuleTitle, RuleText, DisplayOrder)
                    SELECT r.VenueId, r.RuleTitle, r.RuleText, r.DisplayOrder
                    FROM @Rules r
                    WHERE r.VenueId IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM dbo.VenueRules x
                          WHERE x.VenueId = r.VenueId AND x.RuleTitle = r.RuleTitle
                      );
                ");
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Database seeding skipped or failed. Tables might already contain data.");
            }
        }
    }
}