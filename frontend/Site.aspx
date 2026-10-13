<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Site.aspx.cs" Inherits="HutatmaBooking.WebForms.Site" EnableViewState="false" %>
<!DOCTYPE html>
<html lang="en">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#50175d" />
    <title><%= PageTitle %></title>
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/site-attached.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/site.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/booking-progress.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/availability-step.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/booking-summary-step.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/bank-details-step.css?v=20261013-2") %>" />
    <link rel="stylesheet" href="<%= ResolveUrl("~/Content/booking/steps/booking-confirmation-step.css?v=20261013-2") %>" />
</head>
<body>
    <%= BodyHtml %>
</body>
</html>
