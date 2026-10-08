using System;
using System.Configuration;
using System.Web.UI;

namespace HutatmaBooking.WebForms
{
    public partial class Site : Page
    {
        protected string Screen { get; private set; }
        protected string ApiBaseUrl { get; private set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            Screen = Convert.ToString(Page.RouteData.Values["screen"]) ?? "home";
            ApiBaseUrl = (ConfigurationManager.AppSettings["ApiBaseUrl"] ?? "http://localhost:5001/api").TrimEnd('/');
            Title = "Hutatma Smruti Mandir — Venue Booking";
        }
    }
}
