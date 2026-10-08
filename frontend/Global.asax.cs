using System.Collections.Generic;
using System.Web;
using System.Web.Routing;

namespace HutatmaBooking.WebForms
{
    public class Global : HttpApplication
    {
        protected void Application_Start()
        {
            RouteTable.Routes.Ignore("{resource}.axd/{*pathInfo}");
            AddRoute("", "home");
            AddRoute("about", "about");
            AddRoute("gallery", "gallery");
            AddRoute("contact", "contact");
            AddRoute("print-booking", "print-booking");
            AddRoute("refunds", "refunds");
            AddRoute("cancel-booking", "cancel-booking");
            AddRoute("track-refund", "track-refund");
            AddRoute("book", "book");
            AddRoute("admin/login", "admin/login");
            AddRoute("clerk/login", "admin/login");
            AddRoute("admin", "admin/dashboard");
            AddRoute("admin/dashboard", "admin/dashboard");
            AddRoute("admin/slot-availability", "admin/slot-availability");
            AddRoute("admin/bookings", "admin/bookings");
            AddRoute("admin/payments", "admin/payments");
            AddRoute("admin/venues", "admin/venues");
            AddRoute("admin/holidays", "admin/holidays");
            AddRoute("admin/gallery", "admin/gallery");
            AddRoute("admin/notices", "admin/notices");
            AddRoute("admin/complaints", "admin/complaints");
            AddRoute("admin/cancellations", "admin/cancellations");
            AddRoute("admin/refunds", "admin/refunds");
            AddRoute("admin/users", "admin/users");
            AddRoute("admin/receipts", "admin/receipts");
            AddRoute("admin/audit", "admin/audit");
            RouteTable.Routes.MapPageRoute("not-found", "{*path}", "~/Site.aspx",
                false, new RouteValueDictionary { { "screen", "not-found" } });
        }

        private static void AddRoute(string url, string screen)
        {
            var name = string.IsNullOrEmpty(url) ? "home" : url.Replace('/', '-');
            RouteTable.Routes.MapPageRoute(name, url, "~/Site.aspx", false,
                new RouteValueDictionary { { "screen", screen } });
        }
    }
}
