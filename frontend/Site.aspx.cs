using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.UI;

namespace HutatmaBooking.WebForms
{
    public partial class Site : Page
    {
        private string _screen;
        private string _notice;
        private string _noticeType = "warning";
        protected string PageTitle { get; private set; }
        protected string BodyHtml { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            _screen = Convert.ToString(Page.RouteData.Values["screen"]) ?? "book";
            PageTitle = "Hutatma Smruti Mandir — Venue Booking";
            try
            {
                if (Request.HttpMethod == "POST") HandlePost();
                BodyHtml = IsAdminScreen(_screen) ? RenderAdmin() : RenderPublic();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError("Hutatma WebForms request failed: {0}", ex);
                _notice = "The request could not be completed. Check the SQL Server connection and required database schema, then try again.";
                _noticeType = "error";
                BodyHtml = IsAdminScreen(_screen) ? RenderAdmin() : RenderPublic();
            }
        }

        private void HandlePost()
        {
            if (!ValidFormToken())
            {
                _notice = "This form has expired. Reload the page and try again.";
                _noticeType = "error";
                return;
            }

            var action = Request.Form["action"] ?? "";
            if (action == "contact")
            {
                    var name = FormValue("name");
                    var mobile = FormValue("mobile");
                    var email = FormValue("email");
                    var subject = FormValue("subject");
                    var message = FormValue("message");
                if (name.Length == 0 || mobile.Length == 0 || subject.Length == 0 || message.Length == 0)
                    throw new InvalidOperationException("Name, mobile, subject, and message are required.");
                if (name.Length > 150 || mobile.Length > 15 || email.Length > 200 || subject.Length > 300)
                    throw new InvalidOperationException("One or more fields exceed the allowed length.");
                SqlStore.Execute(
                    "INSERT INTO dbo.Complaints (ApplicantName, Mobile, Email, Subject, Description, Status, CreatedAt) VALUES (@name,@mobile,@email,@subject,@description,N'Open',SYSUTCDATETIME())",
                    SqlStore.Parameter("@name", SqlDbType.NVarChar, name, 150),
                    SqlStore.Parameter("@mobile", SqlDbType.NVarChar, mobile, 15),
                    SqlStore.Parameter("@email", SqlDbType.NVarChar, EmptyToNull(email), 200),
                    SqlStore.Parameter("@subject", SqlDbType.NVarChar, subject, 300),
                    SqlStore.Parameter("@description", SqlDbType.NVarChar, message, -1));
                _notice = "Your message was recorded successfully.";
                _noticeType = "success";
            }
            else if (action == "availability" || action == "summary")
            {
                var result = CheckAvailabilityAndMaybeCalculate(action == "summary");
                _notice = result;
                _noticeType = result.StartsWith("Selected dates", StringComparison.OrdinalIgnoreCase) ? "success" : "warning";
            }
            else if (action == "book")
            {
                _notice = "Booking submission and payment are disabled until the configured host citizen-profile provider returns the applicant's real, required identity data. No booking or payment has been created.";
                _noticeType = "warning";
            }
            else if (action == "lookup")
            {
                _notice = LookupBooking();
                _noticeType = "success";
            }
            else if (action == "track-refund")
            {
                _notice = TrackRefund();
                _noticeType = "success";
            }
            else if (action.StartsWith("admin-", StringComparison.Ordinal))
            {
                if (!HasDepartmentAccess(_screen))
                {
                    Response.StatusCode = 403;
                    _notice = "Access denied. Sign in through the host department application; this site does not provide a standalone staff login.";
                    _noticeType = "error";
                }
                else
                {
                    _notice = "This management action is not enabled in the direct-SQL Web Forms migration yet. No data was changed.";
                    _noticeType = "warning";
                }
            }
        }

        private string CheckAvailabilityAndMaybeCalculate(bool includeSummary)
        {
            int venueId;
            int pricingId;
            DateTime from;
            DateTime to;
            if (!Int32.TryParse(FormValue("venueId"), out venueId) ||
                !Int32.TryParse(FormValue("pricingId"), out pricingId) ||
                !DateTime.TryParseExact(FormValue("fromDate"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out from) ||
                !DateTime.TryParseExact(FormValue("toDate"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out to) ||
                to.Date < from.Date || (to.Date - from.Date).TotalDays > 30)
                throw new InvalidOperationException("Choose a venue, rate, and valid date range of at most 31 days.");

            var session = FormValue("session");
            var selected = NormalizeSessions(session);
            if (selected.Count == 0) throw new InvalidOperationException("Choose at least one time slot.");

            var data = SqlStore.Query(
                "SELECT b.FromDate,b.ToDate,b.Session,b.Status FROM dbo.Bookings b WHERE b.VenueId=@venue AND b.FromDate<=@toDate AND b.ToDate>=@fromDate",
                SqlStore.Parameter("@venue", SqlDbType.Int, venueId, 0),
                SqlStore.Parameter("@toDate", SqlDbType.Date, to.Date, 0),
                SqlStore.Parameter("@fromDate", SqlDbType.Date, from.Date, 0));
            for (var day = from.Date; day <= to.Date; day = day.AddDays(1))
            {
                foreach (DataRow row in data.Rows)
                {
                    var status = Convert.ToString(row["Status"]);
                    if (status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                        status.Equals("ForceCancelled", StringComparison.OrdinalIgnoreCase) ||
                        status.Equals("Force Cancelled", StringComparison.OrdinalIgnoreCase)) continue;
                    var start = Convert.ToDateTime(row["FromDate"]).Date;
                    var end = Convert.ToDateTime(row["ToDate"]).Date;
                    if (day < start || day > end) continue;
                    var existing = NormalizeSessions(Convert.ToString(row["Session"]));
                    if (selected.Any(s => existing.Contains(s)))
                        return "Selected dates are unavailable: a requested slot already has an active booking.";
                }
            }

            if (!includeSummary) return "Selected dates and slots are available at the time of checking; availability is rechecked when a booking integration is enabled.";
            var prices = SqlStore.Query(
                "SELECT p.PriceItemName,p.ChargeUnit,p.Amount,p.RefundableDeposit,p.HolidaySurchargeAmount,p.CGSTPercent,p.SGSTPercent FROM dbo.VenuePricing p INNER JOIN dbo.VenueMaster v ON v.VenueId=p.VenueId WHERE p.Id=@pricing AND p.VenueId=@venue AND p.IsActive=1 AND v.Status=N'Active' AND p.EffectiveFrom<=@date AND (p.EffectiveTo IS NULL OR p.EffectiveTo>=@date)",
                SqlStore.Parameter("@pricing", SqlDbType.Int, pricingId, 0),
                SqlStore.Parameter("@venue", SqlDbType.Int, venueId, 0),
                SqlStore.Parameter("@date", SqlDbType.Date, from.Date, 0));
            if (prices.Rows.Count == 0) throw new InvalidOperationException("No current rate is configured for this venue and price item.");
            var holidays = SqlStore.Query(
                "SELECT COUNT(*) AS HolidayCount FROM dbo.Holidays WHERE IsActive=1 AND HolidayDate BETWEEN @fromDate AND @toDate",
                SqlStore.Parameter("@fromDate", SqlDbType.Date, from.Date, 0),
                SqlStore.Parameter("@toDate", SqlDbType.Date, to.Date, 0));
            var item = prices.Rows[0];
            var days = (to.Date - from.Date).Days + 1;
            var holidayCount = Convert.ToInt32(holidays.Rows[0]["HolidayCount"]);
            var rent = Convert.ToDecimal(item["Amount"]) * days * selected.Count;
            var surcharge = Convert.ToDecimal(item["HolidaySurchargeAmount"]) * holidayCount;
            var taxable = rent + surcharge;
            var cgst = Decimal.Round(taxable * Convert.ToDecimal(item["CGSTPercent"]) / 100m, 2);
            var sgst = Decimal.Round(taxable * Convert.ToDecimal(item["SGSTPercent"]) / 100m, 2);
            var deposit = Convert.ToDecimal(item["RefundableDeposit"]);
            var total = taxable + cgst + sgst + deposit;
            return String.Format(CultureInfo.InvariantCulture,
                "Estimate for {0} day(s), {1} slot(s)/day: rent ₹{2:N2}, holiday surcharge ₹{3:N2}, CGST ₹{4:N2}, SGST ₹{5:N2}, refundable deposit ₹{6:N2}; estimated total ₹{7:N2}. Equipment is not selected in this step.",
                days, selected.Count, rent, surcharge, cgst, sgst, deposit, total);
        }

        private string LookupBooking()
        {
            var number = FormValue("bookingNumber");
            var mobile = FormValue("mobile");
            if (number.Length == 0 || mobile.Length == 0) throw new InvalidOperationException("Enter the booking number and registered mobile number.");
            var result = SqlStore.Query(
                "SELECT b.BookingNumber,v.VenueName,b.FromDate,b.ToDate,b.Session,b.Status,b.GrandTotal,a.FullName,r.ReceiptNumber FROM dbo.Bookings b INNER JOIN dbo.Applicants a ON a.BookingId=b.Id INNER JOIN dbo.VenueMaster v ON v.VenueId=b.VenueId LEFT JOIN dbo.Receipts r ON r.BookingId=b.Id WHERE b.BookingNumber=@number AND a.Mobile=@mobile",
                SqlStore.Parameter("@number", SqlDbType.NVarChar, number, 20),
                SqlStore.Parameter("@mobile", SqlDbType.NVarChar, mobile, 15));
            if (result.Rows.Count == 0) return "No booking matched both supplied details.";
            var row = result.Rows[0];
            return String.Format(CultureInfo.InvariantCulture,
                "Booking {0}: {1}, {2:dd MMM yyyy}–{3:dd MMM yyyy}, {4}, status {5}, total ₹{6:N2}{7}.",
                E(row["BookingNumber"]), E(row["VenueName"]), row["FromDate"], row["ToDate"], E(row["Session"]), E(row["Status"]),
                Convert.ToDecimal(row["GrandTotal"]), row["ReceiptNumber"] == DBNull.Value ? "" : "; receipt " + E(row["ReceiptNumber"]));
        }

        private string TrackRefund()
        {
            var number = FormValue("bookingNumber");
            var mobile = FormValue("mobile");
            if (number.Length == 0 || mobile.Length == 0) throw new InvalidOperationException("Enter the booking number and registered mobile number.");
            var data = SqlStore.Query(
                "SELECT rr.RefundRequestNumber,rr.Status,rr.RefundAmount,rr.RequestedAt FROM dbo.RefundRequests rr INNER JOIN dbo.Bookings b ON b.Id=rr.BookingId INNER JOIN dbo.Applicants a ON a.BookingId=b.Id WHERE b.BookingNumber=@number AND a.Mobile=@mobile",
                SqlStore.Parameter("@number", SqlDbType.NVarChar, number, 20),
                SqlStore.Parameter("@mobile", SqlDbType.NVarChar, mobile, 15));
            if (data.Rows.Count == 0) return "No refund request matched both supplied details.";
            var row = data.Rows[0];
            return String.Format(CultureInfo.InvariantCulture, "Refund request {0}: {1}; amount {2}; requested {3:dd MMM yyyy}.",
                E(row["RefundRequestNumber"]), E(row["Status"]),
                row["RefundAmount"] == DBNull.Value ? "to be determined" : "₹" + Convert.ToDecimal(row["RefundAmount"]).ToString("N2", CultureInfo.InvariantCulture),
                row["RequestedAt"]);
        }

        private string RenderPublic()
        {
            var html = new StringBuilder();
            html.Append("<header class='topbar'><a class='brand' href='/book'><span class='brand-mark'>✦</span><span>Hutatma Smruti Mandir<small>Venue Booking</small></span></a><nav class='nav'>");
            html.Append(Nav("/book", "Book a Venue")).Append(Nav("/about", "About Venue")).Append(Nav("/gallery", "Gallery"))
                .Append(Nav("/contact", "Contact Us")).Append(Nav("/print-booking", "Booking Details"))
                .Append(Nav("/cancel-booking", "Cancellation")).Append(Nav("/refunds", "Refunds")).Append(Nav("/track-refund", "Track Refund"))
                .Append("</nav></header>");
            html.Append("<main class='container section'>");
            if (!String.IsNullOrEmpty(_notice)) html.Append(Alert(_notice, _noticeType));
            try
            {
                switch (_screen)
                {
                    case "home":
                    case "book": html.Append(RenderBooking()); break;
                    case "about": html.Append(RenderAbout()); break;
                    case "gallery": html.Append(RenderGallery()); break;
                    case "contact": html.Append(RenderContact()); break;
                    case "print-booking": html.Append(RenderLookup(false)); break;
                    case "refunds": html.Append(RenderRestrictedTransaction("Refund application")); break;
                    case "cancel-booking": html.Append(RenderRestrictedTransaction("Cancellation application")); break;
                    case "track-refund": html.Append(RenderLookup(true)); break;
                    default: Response.StatusCode = 404; html.Append("<section class='panel'><h1>Page not found</h1><p>The requested page does not exist.</p><a class='button' href='/book'>Return to bookings</a></section>"); break;
                }
            }
            catch (SqlException)
            {
                html.Append(Alert("SQL Server could not be reached or the required current schema is missing. No sample data is shown. Contact the system administrator.", "error"));
            }
            catch (InvalidOperationException ex)
            {
                html.Append(Alert(E(ex.Message), _noticeType));
            }
            html.Append("</main><footer class='footer'><div class='container'><p>Hutatma Smruti Mandir</p><p>Booking and transaction requests are handled by the configured host services.</p></div></footer>");
            return html.ToString();
        }

        private string RenderBooking()
        {
            var venues = SqlStore.Query("SELECT VenueId,VenueName,Description,Capacity,Location FROM dbo.VenueMaster WHERE Status=N'Active' ORDER BY DisplayOrder,VenueName");
            var prices = SqlStore.Query("SELECT p.Id,p.VenueId,p.PriceItemName,p.ChargeUnit,p.Amount FROM dbo.VenuePricing p INNER JOIN dbo.VenueMaster v ON v.VenueId=p.VenueId WHERE p.IsActive=1 AND v.Status=N'Active' AND p.EffectiveFrom<=CONVERT(date,SYSUTCDATETIME()) AND (p.EffectiveTo IS NULL OR p.EffectiveTo>=CONVERT(date,SYSUTCDATETIME())) ORDER BY p.DisplayOrder,p.PriceItemName");
            var html = new StringBuilder();
            html.Append("<section class='hero'><div><h1>Book Hutatma Smruti Mandir</h1><p>Explore venues and check dates, sessions, and current rates.</p><a class='button' href='#booking'>Check availability</a></div></section><section id='booking' class='section'><div class='narrow'><h1>Venue availability and estimate</h1>");
            if (venues.Rows.Count == 0) html.Append(Alert("No active venue records are available.", "warning"));
            html.Append("<div class='grid cols-2'>");
            foreach (DataRow venue in venues.Rows)
            {
                html.Append("<article class='card'><h2>").Append(E(venue["VenueName"])).Append("</h2><p>").Append(E(venue["Description"])).Append("</p><p class='muted'>Capacity: ").Append(E(venue["Capacity"])).Append(" · ").Append(E(venue["Location"])).Append("</p></article>");
            }
            html.Append("</div><div class='panel'><form method='post' action=''><input type='hidden' name='formToken' value='").Append(FormToken()).Append("'/>");
            html.Append("<div class='field'><label for='venueId'>Venue</label><select required id='venueId' name='venueId'>");
            foreach (DataRow venue in venues.Rows) html.Append("<option value='").Append(E(venue["VenueId"])).Append("'>").Append(E(venue["VenueName"])).Append("</option>");
            html.Append("</select></div><div class='field'><label for='pricingId'>Rate item</label><select required id='pricingId' name='pricingId'>");
            foreach (DataRow price in prices.Rows) html.Append("<option value='").Append(E(price["Id"])).Append("'>").Append(E(price["PriceItemName"])).Append(" — ₹").Append(Convert.ToDecimal(price["Amount"]).ToString("N2", CultureInfo.InvariantCulture)).Append(" / ").Append(E(price["ChargeUnit"])).Append("</option>");
            html.Append("</select></div><div class='form-row'><div class='field'><label for='fromDate'>From date</label><input required type='date' name='fromDate' id='fromDate' /></div><div class='field'><label for='toDate'>To date</label><input required type='date' name='toDate' id='toDate' /></div></div>");
            html.Append("<fieldset class='field'><legend>Sessions</legend><label><input type='checkbox' name='session' value='Morning'/> Morning</label><label><input type='checkbox' name='session' value='Afternoon'/> Afternoon</label><label><input type='checkbox' name='session' value='Evening'/> Evening</label></fieldset>");
            html.Append("<div class='actions'><button name='action' value='availability'>Check availability</button><button class='secondary' name='action' value='summary'>Calculate estimate</button><button disabled title='Requires the configured host citizen profile integration' name='action' value='book'>Continue to payment</button></div></form><div class='alert warning'><strong>Booking guard:</strong> applicant details are not collected or fabricated. Booking creation and payment remain disabled until a configured host profile provider supplies real required data.</div></div></div></section>");
            return html.ToString();
        }

        private string RenderAbout()
        {
            return "<section class='panel'><h1>About the venue</h1><p>Hutatma Smruti Mandir serves as a community venue for events and functions. Active venue descriptions, capacity and location are displayed from the SQL Server venue catalogue.</p><p>Review the applicable venue rules and current charges before submitting a booking request.</p><a class='button' href='/book'>Check venues and rates</a></section>";
        }

        private string RenderGallery()
        {
            var items = SqlStore.Query("SELECT Title,Description,MediaType,FilePath,VideoURL,ThumbnailPath FROM dbo.Gallery WHERE IsActive=1 ORDER BY DisplayOrder,CreatedAt DESC");
            var html = new StringBuilder("<h1>Gallery</h1><div class='grid cols-3'>");
            foreach (DataRow item in items.Rows)
            {
                var image = Convert.ToString(item["ThumbnailPath"]);
                if (String.IsNullOrWhiteSpace(image)) image = Convert.ToString(item["FilePath"]);
                html.Append("<article class='card'>");
                if (!String.IsNullOrWhiteSpace(image)) html.Append("<img loading='lazy' alt='").Append(E(item["Title"])).Append("' src='").Append(E(ResolveUrl(image))).Append("' style='width:100%;height:220px;object-fit:cover'/>");
                html.Append("<h2>").Append(E(item["Title"])).Append("</h2><p>").Append(E(item["Description"])).Append("</p>");
                if (item["MediaType"].ToString().Equals("Video", StringComparison.OrdinalIgnoreCase) && item["VideoURL"] != DBNull.Value)
                    html.Append("<a rel='noopener noreferrer' target='_blank' href='").Append(E(item["VideoURL"])).Append("'>View video</a>");
                html.Append("</article>");
            }
            html.Append("</div>");
            if (items.Rows.Count == 0) html.Append(Alert("There are no published gallery items.", "warning"));
            return html.ToString();
        }

        private string RenderContact()
        {
            return "<section class='narrow panel'><h1>Contact us</h1><p>Send a message to the venue administration.</p><form method='post' action=''><input type='hidden' name='formToken' value='" + FormToken() + "'/>" +
                Input("Full name", "name", "text", 150, true) + Input("Mobile", "mobile", "tel", 15, true) +
                Input("Email", "email", "email", 200, false) + Input("Subject", "subject", "text", 300, true) +
                "<div class='field'><label for='message'>Message</label><textarea required maxlength='4000' id='message' name='message' rows='5'></textarea></div><button name='action' value='contact'>Send message</button></form></section>";
        }

        private string RenderLookup(bool refundOnly)
        {
            if (refundOnly) return "<section class='narrow panel'><h1>Track refund request</h1><p>Enter the booking number and the registered mobile number. The result is only shown for a matching applicant record.</p><form method='post'><input type='hidden' name='formToken' value='" + FormToken() + "'/>" + Input("Booking number", "bookingNumber", "text", 20, true) + Input("Registered mobile", "mobile", "tel", 15, true) + "<button name='action' value='track-refund'>Find refund</button></form></section>";
            return "<section class='narrow panel'><h1>Booking details and receipt</h1><p>Enter the booking number and registered mobile number to retrieve the booking record.</p><form method='post'><input type='hidden' name='formToken' value='" + FormToken() + "'/>" + Input("Booking number", "bookingNumber", "text", 20, true) + Input("Registered mobile", "mobile", "tel", 15, true) + "<button name='action' value='lookup'>Find booking</button></form><p class='muted'>Receipt downloads and email delivery require the configured receipt/notification providers.</p></section>";
        }

        private string RenderRestrictedTransaction(string title)
        {
            return "<section class='narrow panel'><h1>" + E(title) + "</h1><div class='alert warning'>This transaction requires the existing verified OTP provider. A transaction will not be accepted or represented as submitted unless the OTP integration is configured and verified.</div><p>Use <a href='/track-refund'>Track Refund</a> or <a href='/print-booking'>Booking Details</a> for read-only lookup.</p></section>";
        }

        private string RenderAdmin()
        {
            if (!HasDepartmentAccess(_screen))
            {
                Response.StatusCode = 403;
                return "<header class='topbar'><a class='brand' href='/book'>Hutatma Smruti Mandir<small>Department area</small></a></header><main class='narrow section'><section class='panel'><h1>Department access required</h1>" +
                    Alert("This department screen is denied by default. Sign in through the host department application and configure its authenticated session contract as described in INTEGRATION_GUIDE.md. No standalone login is provided.", "error") +
                    "<a class='button' href='/book'>Return to public site</a></section></main>";
            }

            var lookup = AdminQuery(_screen);
            var html = new StringBuilder("<header class='topbar'><a class='brand' href='/admin'>Hutatma Smruti Mandir<small>Host-authenticated department views</small></a><nav class='nav'>");
            foreach (var item in AdminNavigation()) html.Append(Nav(item.Item1, item.Item2));
            html.Append(Nav("/book", "Public site")).Append("</nav></header><main class='container section'>");
            html.Append("<h1>").Append(E(ScreenTitle(_screen))).Append("</h1>");
            if (!String.IsNullOrEmpty(_notice)) html.Append(Alert(_notice, _noticeType));
            if (lookup == null) html.Append(Alert("This screen is not available in the current direct-SQL release.", "warning"));
            else html.Append(RenderTable(lookup));
            html.Append("<p class='muted'>These screens are read-only. Management writes are intentionally disabled until the relevant Web Forms workflow is ported and tested.</p></main>");
            return html.ToString();
        }

        private DataTable AdminQuery(string screen)
        {
            switch (screen)
            {
                case "admin/dashboard":
                    return SqlStore.Query("SELECT (SELECT COUNT(*) FROM dbo.Bookings) AS TotalBookings,(SELECT COUNT(*) FROM dbo.Bookings WHERE Status=N'PendingPayment') AS PendingPayment,(SELECT COUNT(*) FROM dbo.RefundRequests WHERE Status NOT IN (N'Processed',N'Rejected')) AS OpenRefunds,(SELECT COUNT(*) FROM dbo.Complaints WHERE Status=N'Open') AS OpenComplaints");
                case "admin/bookings":
                    return SqlStore.Query("SELECT TOP (200) b.BookingNumber,v.VenueName,a.FullName AS Applicant,a.Mobile,b.FromDate,b.ToDate,b.Session,b.Status,b.GrandTotal FROM dbo.Bookings b JOIN dbo.VenueMaster v ON v.VenueId=b.VenueId LEFT JOIN dbo.Applicants a ON a.BookingId=b.Id ORDER BY b.CreatedAt DESC");
                case "admin/slot-availability":
                    return SqlStore.Query("SELECT TOP (200) b.BookingNumber,v.VenueName,b.FromDate,b.ToDate,b.Session,b.Status FROM dbo.Bookings b JOIN dbo.VenueMaster v ON v.VenueId=b.VenueId WHERE b.ToDate>=CONVERT(date,SYSUTCDATETIME()) ORDER BY b.FromDate,v.DisplayOrder");
                case "admin/payments":
                    return SqlStore.Query("SELECT TOP (200) b.BookingNumber,p.Amount,p.PaymentMethod,p.TransactionRef,p.Status,p.PaymentDate,p.CreatedAt FROM dbo.Payments p JOIN dbo.Bookings b ON b.Id=p.BookingId ORDER BY p.CreatedAt DESC");
                case "admin/venues":
                    return SqlStore.Query("SELECT v.VenueId,v.VenueName,v.Capacity,v.MorningBookingCapacity,v.AfternoonBookingCapacity,v.EveningBookingCapacity,v.Status,p.PriceItemName,p.Amount,p.ChargeUnit,p.EffectiveFrom,p.EffectiveTo FROM dbo.VenueMaster v LEFT JOIN dbo.VenuePricing p ON p.VenueId=v.VenueId ORDER BY v.DisplayOrder,v.VenueName,p.DisplayOrder");
                case "admin/holidays":
                    return SqlStore.Query("SELECT TOP (500) HolidayDate,Name,Description,IsActive FROM dbo.Holidays ORDER BY HolidayDate DESC");
                case "admin/gallery":
                    return SqlStore.Query("SELECT TOP (500) Title,MediaType,FilePath,VideoURL,DisplayOrder,IsActive,CreatedAt FROM dbo.Gallery ORDER BY DisplayOrder,CreatedAt DESC");
                case "admin/notices":
                    return SqlStore.Query("SELECT TOP (500) Title,IsImportant,PublishDate,ExpiryDate,IsActive,CreatedAt FROM dbo.Notices ORDER BY PublishDate DESC");
                case "admin/complaints":
                    return SqlStore.Query("SELECT TOP (500) Id,ApplicantName,Mobile,Subject,Status,CreatedAt FROM dbo.Complaints ORDER BY CreatedAt DESC");
                case "admin/cancellations":
                    return SqlStore.Query("SELECT TOP (500) c.Id,b.BookingNumber,c.RequestedBy,c.Reason,c.RefundAmount,c.RefundStatus,c.CreatedAt FROM dbo.Cancellations c JOIN dbo.Bookings b ON b.Id=c.BookingId ORDER BY c.CreatedAt DESC");
                case "admin/refunds":
                    return SqlStore.Query("SELECT TOP (500) rr.RefundRequestNumber,b.BookingNumber,rr.RefundAmount,rr.Status,rr.RequestedAt,rr.UpdatedAt FROM dbo.RefundRequests rr JOIN dbo.Bookings b ON b.Id=rr.BookingId ORDER BY rr.RequestedAt DESC");
                case "admin/users":
                    return SqlStore.Query("SELECT u.Id,u.FullName,u.Email,u.Mobile,r.Name AS Role,u.IsActive,u.CreatedAt FROM dbo.Users u JOIN dbo.Roles r ON r.Id=u.RoleId ORDER BY u.FullName");
                case "admin/receipts":
                    return SqlStore.Query("SELECT TOP (200) r.ReceiptNumber,b.BookingNumber,p.Amount,r.GeneratedAt,r.FilePath FROM dbo.Receipts r JOIN dbo.Bookings b ON b.Id=r.BookingId JOIN dbo.Payments p ON p.Id=r.PaymentId ORDER BY r.GeneratedAt DESC");
                case "admin/audit":
                    return SqlStore.Query("SELECT TOP (500) Id,Action,Entity,EntityId,PerformedBy,IpAddress,CreatedAt FROM dbo.AuditLogs ORDER BY CreatedAt DESC");
                default: return null;
            }
        }

        private bool HasDepartmentAccess(string screen)
        {
            var authenticatedKey = Setting("HostAuthAuthenticatedSessionKey", "");
            var roleKey = Setting("HostAuthRoleSessionKey", "");
            if (String.IsNullOrWhiteSpace(authenticatedKey) || String.IsNullOrWhiteSpace(roleKey) ||
                Session[authenticatedKey] == null || Session[roleKey] == null) return false;
            bool authenticated;
            if (!Boolean.TryParse(Convert.ToString(Session[authenticatedKey]), out authenticated) || !authenticated) return false;
            var role = Convert.ToString(Session[roleKey]);
            var roles = Setting("HostAuthAllowedRoles", "Admin,Staff").Split(',').Select(r => r.Trim()).Where(r => r.Length > 0);
            if (!roles.Contains(role, StringComparer.OrdinalIgnoreCase)) return false;
            if (role.Equals("Staff", StringComparison.OrdinalIgnoreCase))
            {
                var staffScreens = Setting("HostAuthStaffScreens", "admin/bookings,admin/slot-availability,admin/payments,admin/complaints,admin/cancellations,admin/refunds,admin/receipts");
                return staffScreens.Split(',').Select(r => r.Trim()).Contains(screen, StringComparer.OrdinalIgnoreCase);
            }
            return true;
        }

        private IEnumerable<Tuple<string, string>> AdminNavigation()
        {
            return new[] {
                Tuple.Create("/admin/dashboard","Dashboard"), Tuple.Create("/admin/bookings","Bookings"),
                Tuple.Create("/admin/slot-availability","Availability"), Tuple.Create("/admin/payments","Payments"),
                Tuple.Create("/admin/venues","Venues"), Tuple.Create("/admin/holidays","Holidays"),
                Tuple.Create("/admin/gallery","Gallery"), Tuple.Create("/admin/notices","Notices"),
                Tuple.Create("/admin/complaints","Complaints"), Tuple.Create("/admin/cancellations","Cancellations"),
                Tuple.Create("/admin/refunds","Refunds"), Tuple.Create("/admin/users","Users"),
                Tuple.Create("/admin/receipts","Receipts"), Tuple.Create("/admin/audit","Audit")
            };
        }

        private string RenderTable(DataTable table)
        {
            if (table == null || table.Columns.Count == 0) return Alert("No data is available.", "warning");
            var html = new StringBuilder("<div class='table-wrap'><table><thead><tr>");
            foreach (DataColumn column in table.Columns) html.Append("<th>").Append(E(column.ColumnName)).Append("</th>");
            html.Append("</tr></thead><tbody>");
            foreach (DataRow row in table.Rows)
            {
                html.Append("<tr>");
                foreach (DataColumn column in table.Columns)
                {
                    var value = row[column] == DBNull.Value ? "" : Convert.ToString(row[column], CultureInfo.InvariantCulture);
                    if (row[column] is DateTime) value = ((DateTime)row[column]).ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);
                    if (row[column] is decimal) value = "₹" + ((decimal)row[column]).ToString("N2", CultureInfo.InvariantCulture);
                    html.Append("<td>").Append(E(value)).Append("</td>");
                }
                html.Append("</tr>");
            }
            html.Append("</tbody></table></div>");
            if (table.Rows.Count == 0) html.Append("<p class='muted'>No records.</p>");
            return html.ToString();
        }

        private static bool IsAdminScreen(string screen) { return screen.StartsWith("admin/", StringComparison.Ordinal); }
        private static string ScreenTitle(string screen) { return screen.Replace("admin/", "").Replace("-", " ").ToUpperInvariant(); }
        private static string FormValue(string name) { return (HttpContext.Current.Request.Form[name] ?? "").Trim(); }
        private static object EmptyToNull(string value) { return String.IsNullOrWhiteSpace(value) ? (object)DBNull.Value : value; }
        private static string Setting(string key, string fallback) { return ConfigurationManager.AppSettings[key] ?? fallback; }
        private static string E(object value) { return HttpUtility.HtmlEncode(Convert.ToString(value, CultureInfo.InvariantCulture) ?? ""); }
        private string Nav(string url, string title) { return "<a" + (Request.Url.AbsolutePath.Equals(url, StringComparison.OrdinalIgnoreCase) ? " class='active'" : "") + " href='" + E(url) + "'>" + E(title) + "</a>"; }
        private static string Alert(string text, string type) { return "<div class='alert " + E(type) + "' role='status'>" + text + "</div>"; }
        private static string Input(string label, string name, string type, int maxLength, bool required)
        {
            return "<div class='field'><label for='" + E(name) + "'>" + E(label) + "</label><input id='" + E(name) + "' name='" + E(name) + "' type='" + E(type) + "' maxlength='" + maxLength + "'" + (required ? " required" : "") + " /></div>";
        }
        private static List<string> NormalizeSessions(string value)
        {
            var selected = (value ?? "").Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
            if (selected.Contains("FullDay", StringComparer.OrdinalIgnoreCase)) return new List<string> { "Morning", "Afternoon", "Evening" };
            return selected.Where(s => new[] { "Morning", "Afternoon", "Evening" }.Contains(s, StringComparer.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }
        private string FormToken()
        {
            if (Session["HsmFormToken"] == null)
            {
                var bytes = new byte[32];
                using (var random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
                Session["HsmFormToken"] = Convert.ToBase64String(bytes);
            }
            return E(Session["HsmFormToken"]);
        }
        private bool ValidFormToken()
        {
            var expected = Convert.ToString(Session["HsmFormToken"]);
            var actual = Request.Form["formToken"];
            return !String.IsNullOrEmpty(expected) && !String.IsNullOrEmpty(actual) &&
                FixedTimeEquals(expected, actual);
        }
        private static bool FixedTimeEquals(string left, string right)
        {
            var difference = left.Length ^ right.Length;
            var length = Math.Max(left.Length, right.Length);
            for (var i = 0; i < length; i++)
                difference |= (i < left.Length ? left[i] : 0) ^ (i < right.Length ? right[i] : 0);
            return difference == 0;
        }
    }
}
