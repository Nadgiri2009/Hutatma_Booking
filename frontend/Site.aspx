<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Site.aspx.cs" Inherits="HutatmaBooking.WebForms.Site" %>
<!DOCTYPE html>
<html lang="en">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#50175d" />
    <title>Hutatma Smruti Mandir — Venue Booking</title>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/site-attached.css?v=20261009-1") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/site.css?v=20261009-4") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/booking-progress.css?v=20261009-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/availability-step.css?v=20261009-1") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/booking-summary-step.css?v=20261009-1") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/bank-details-step.css?v=20261009-1") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/booking-confirmation-step.css?v=20261009-1") %>" />
    <script type="module" src="<%= ResolveUrl("~/Scripts/app.js?v=20261009-2") %>"></script>
</head>
<body>
    <div id="app" data-screen="<%= Server.HtmlEncode(Screen) %>" data-api-base="<%= Server.HtmlEncode(ApiBaseUrl) %>">
        <div class="loading">Loading Hutatma Smruti Mandir…</div>
    </div>
</body>
</html>
