(function () {
  "use strict";

  var root = document.getElementById("app");
  var screen = root.getAttribute("data-screen") || "book";
  var apiBase = (root.getAttribute("data-api-base") || "").replace(/\/+$/, "");
  var state = { venues: [], equipment: [], booking: {}, bookStep: 0, receipt: null, adminBookings: [], page: 1 };
  var navItems = [
    ["About Venue", "/about"], ["Gallery", "/gallery"],
    ["Contact Us", "/contact"]
  ];
  var bookingNavItems = [
    ["Apply for Cancellation", "/cancel-booking"],
    ["Apply Refund", "/refunds"],
    ["Track Refund", "/track-refund"],
    ["Print Booking Details", "/print-booking"]
  ];
  var adminItems = [
    ["Main", [["Dashboard", "/admin/dashboard"], ["Bookings", "/admin/bookings"], ["Slot Availability", "/admin/slot-availability"], ["Payments", "/admin/payments"]]],
    ["Management", [["Venues & Pricing", "/admin/venues"], ["Holidays", "/admin/holidays"], ["Gallery", "/admin/gallery"], ["Notices", "/admin/notices"]]],
    ["Transactions", [["Complaints", "/admin/complaints"], ["Cancellations", "/admin/cancellations"], ["Refund Requests", "/admin/refunds"], ["Users", "/admin/users"], ["Audit Report", "/admin/audit"], ["Print Receipt", "/admin/receipts"]]]
  ];
  var titles = {
    "admin/dashboard":"Dashboard","admin/bookings":"Bookings","admin/slot-availability":"Slot Availability",
    "admin/payments":"Payments","admin/venues":"Venues & Pricing","admin/holidays":"Holidays",
    "admin/gallery":"Gallery Management","admin/notices":"Notices","admin/complaints":"Complaints",
    "admin/cancellations":"Cancellations","admin/refunds":"Refund Requests","admin/users":"User Management",
    "admin/audit":"Audit Report","admin/receipts":"Print Receipt"
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(value) {
    if (!value) return "—";
    var d = new Date(value);
    return isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString("en-IN");
  }
  function toast(message, type) {
    var old = document.querySelector(".toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "toast " + (type || "info");
    el.textContent = message || "Request completed.";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 5000);
  }
  async function api(path, options) {
    options = options || {};
    var headers = new Headers(options.headers || {});
    var token = localStorage.getItem("hsm_token");
    if (token) headers.set("Authorization", "Bearer " + token);
    var body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    var response;
    try {
      response = await fetch(apiBase + path, { method: options.method || "GET", headers: headers, body: body });
    } catch (error) {
      throw new Error("The server could not be reached. Check the API address and try again.");
    }
    var text = await response.text();
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = text; }
    }
    if (response.status === 401) {
      ["hsm_token", "hsm_fullName", "hsm_role"].forEach(function (key) { localStorage.removeItem(key); });
      if (screen.indexOf("admin/") === 0) location.href = "/admin/login";
    }
    if (!response.ok) {
      var message = data && (data.error || data.message || data.title);
      if (!message && typeof data === "string") message = data;
      throw new Error(message || ("Request failed (" + response.status + ")."));
    }
    return data;
  }
  function formValue(form, name) {
    var element = form.elements[name];
    return element ? element.value.trim() : "";
  }
  function checkedValues(name) {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="' + name + '"]:checked')).map(function (item) { return item.value; });
  }
  function field(label, name, type, attrs) {
    return '<div class="field"><label for="' + esc(name) + '">' + esc(label) + '</label><input id="' + esc(name) + '" name="' + esc(name) + '" type="' + (type || "text") + '" ' + (attrs || "") + '></div>';
  }
  function selectField(label, name, options) {
    return '<div class="field"><label for="' + esc(name) + '">' + esc(label) + '</label><select id="' + esc(name) + '" name="' + esc(name) + '">' + options + '</select></div>';
  }
  function textarea(label, name, attrs) {
    return '<div class="field"><label for="' + esc(name) + '">' + esc(label) + '</label><textarea id="' + esc(name) + '" name="' + esc(name) + '" ' + (attrs || "") + '></textarea></div>';
  }
  function messageBox(text, type) {
    return text ? '<div class="alert ' + (type || "") + '">' + esc(text) + '</div>' : "";
  }
  function footer() {
    return '<footer class="footer"><div class="container split"><div><strong>Hutatma Smruti Mandir</strong><br><span class="muted">Venue Booking System</span></div><div><a href="/about">About</a> · <a href="/gallery">Gallery</a> · <a href="/contact">Contact</a></div></div></footer>';
  }
  function publicShell(content) {
    var links = navItems.map(function (item) {
      return '<a href="' + item[1] + '" class="' + (location.pathname === item[1] ? "active" : "") + '">' + esc(item[0]) + '</a>';
    }).join("");
    var activeBookingLink = bookingNavItems.some(function (item) { return location.pathname === item[1]; });
    var bookingLinks = bookingNavItems.map(function (item) {
      return '<a href="' + item[1] + '" class="' + (location.pathname === item[1] ? "active" : "") + '">' + esc(item[0]) + '</a>';
    }).join("");
    root.innerHTML = '<header class="topbar"><div class="brand"><span class="brand-mark">🏛</span><span>Hutatma Smruti Mandir<small>Venue Booking System</small></span></div><button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="public-nav">☰</button><nav class="nav" id="public-nav">' + links + '<div class="nav-dropdown' + (activeBookingLink ? " active" : "") + '"><button type="button" class="nav-dropdown-toggle' + (activeBookingLink ? " active" : "") + '" id="booking-nav-toggle" aria-expanded="false" aria-haspopup="true" aria-controls="booking-nav-menu">Booking Services <span aria-hidden="true">▾</span></button><div class="nav-dropdown-menu" id="booking-nav-menu" hidden>' + bookingLinks + '</div></div><a class="book-now" data-terms href="/book">Book Now</a><a href="/admin/login">Login</a></nav></header>' + content +
      '<div id="terms-modal" class="modal hidden"><section class="modal-content"><h2>नियम व अटी</h2><p>कृपया खालील नियम आणि अटी वाचा आणि स्वीकारा.</p><ul><li>बुकिंग करण्यापूर्वी, वेबसाइटवरील सर्व माहिती पूर्ण व अचूक असल्याची खात्री करा.</li><li>बुकिंग पुष्टीकरणासाठी देयक वेळेत जमा करणे आवश्यक आहे.</li><li>बुकिंग रद्द अथवा बदल करण्यासाठी संस्थेने निर्धारित नियम व शुल्क लागू होतील.</li><li>बुकिंग अधिकृत झाल्यानंतर कोणतीही तांत्रिक किंवा प्रशासकीय मुदत असल्यास तात्काळ कळवा.</li><li>फक्त अधिकृत बँक खात्यावरच देयक करावे; अनधिकृत खात्यांना पैसे देऊ नका.</li></ul><div class="actions"><button class="secondary" id="terms-cancel">Cancel</button><button id="terms-accept">I accept the terms and conditions</button></div></section></div>' + footer();
    var publicNav = document.getElementById("public-nav");
    var mobileToggle = document.getElementById("nav-toggle");
    var bookingToggle = document.getElementById("booking-nav-toggle");
    var bookingMenu = document.getElementById("booking-nav-menu");
    mobileToggle.addEventListener("click", function () {
      var isOpen = publicNav.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
    });
    function setBookingMenuOpen(isOpen) {
      bookingMenu.hidden = !isOpen;
      bookingToggle.setAttribute("aria-expanded", String(isOpen));
    }
    bookingToggle.addEventListener("click", function () {
      setBookingMenuOpen(bookingMenu.hidden);
    });
    bookingToggle.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setBookingMenuOpen(true);
        bookingMenu.querySelector("a").focus();
      }
    });
    bookingMenu.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setBookingMenuOpen(false);
        bookingToggle.focus();
      }
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".nav-dropdown")) setBookingMenuOpen(false);
    });
    document.querySelectorAll("[data-terms]").forEach(function(link){link.onclick=function(event){event.preventDefault();document.getElementById("terms-modal").classList.remove("hidden");};});
    document.getElementById("terms-cancel").onclick=function(){document.getElementById("terms-modal").classList.add("hidden");};
    document.getElementById("terms-accept").onclick=function(){location.href="/book";};
  }
  function pageTitle(title, subtitle) {
    return '<div class="section"><div class="narrow"><h1>' + esc(title) + '</h1>' + (subtitle ? '<p class="muted">' + esc(subtitle) + '</p>' : "");
  }
  function publicEnd() { return "</div></div>"; }
  function badge(value) {
    var type = value === "Confirmed" || value === "Paid" || value === "Active" || value === "Processed" ? "good" :
      value === "PendingPayment" || value === "Pending" || value === "Requested" ? "warn" :
      value === "Cancelled" || value === "Rejected" || value === "Failed" ? "bad" : "";
    return '<span class="badge ' + type + '">' + esc(value || "—") + '</span>';
  }
  function receiptMarkup(booking, payment) {
    var rows = [
      ["Booking ID", booking.bookingNumber || booking.applicationNumber],
      ["Receipt Number", booking.receiptNumber],
      ["Venue", booking.venueName || booking.venue],
      ["Price Item", booking.priceItemName],
      ["Booking Date", booking.fromDate === booking.toDate ? fmtDate(booking.fromDate) : fmtDate(booking.fromDate) + " to " + fmtDate(booking.toDate)],
      ["Charge Unit", booking.chargeUnit],
      ["Session", booking.session === "FullDay" ? "Full Day" : booking.session],
      ["Total Days", booking.totalDays],
      ["Applicant", booking.applicantName], ["Mobile", booking.applicantMobile || booking.contactNumber],
      ["Alternate Mobile", booking.applicantAlternateMobile],
      ["Email", booking.applicantEmail], ["Address", booking.applicantAddress],
      ["Function", [booking.functionName, booking.functionType].filter(Boolean).join(" — ")],
      ["Expected Guests", booking.expectedGuests],
      ["Status", booking.status || booking.bookingStatus], ["Base Rent", money(booking.baseRent)],
      ["Holiday Charges", money(booking.holidayCharge)], ["Equipment Charges", money(booking.equipmentCharge)],
      ["Security Deposit", money(booking.securityDeposit || booking.depositAmount)],
      ["CGST", money(booking.cgstAmount)], ["SGST", money(booking.sgstAmount)],
      ["Grand Total", money(booking.grandTotal || booking.bookingAmount)]
    ];
    (booking.equipmentItems || []).forEach(function (item) {
      rows.push(["Equipment: " + (item.equipmentName || item.name), (item.quantity || 0) + " × " + money(item.unitPrice) + " = " + money(item.totalPrice)]);
    });
    if (payment) rows.push(["Payment Status", payment.status], ["Payment Reference", payment.transactionRef || payment.gatewayPaymentId], ["Payment Date", fmtDate(payment.paymentDate)]);
    return '<article class="receipt"><h2>Hutatma Smruti Mandir</h2><p class="right">Venue Booking Receipt</p><table class="receipt-table"><tbody>' +
      rows.map(function (row) { return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1] || "—") + "</td></tr>"; }).join("") +
      '</tbody></table><p class="muted">This receipt is generated by the venue booking system.</p></article>';
  }
  function renderAbout() {
    publicShell('<section class="hero" style="min-height:300px"><div><h1>About Hutatma Smruti Mandir</h1><p>A tribute to the freedom fighters — a venue that serves the community with pride</p></div></section><section class="section white"><div class="narrow"><h2>A Legacy of Service</h2><p>Hutatma Smruti Mandir was established in honour of the brave freedom fighters (Hutatmas) who sacrificed their lives for the nation. The institution has been serving the local community for decades, providing a venue for cultural, social, and corporate events.</p><p>Managed under a public trust, the venue upholds transparency, integrity, and service excellence.</p><h2>Venue Specifications</h2><div id="about-venues" class="grid cols-3">Loading active venues…</div><h2 style="margin-top:32px">Rules &amp; Regulations</h2><ul><li>Booking must be made at least 7 days in advance.</li><li>Premises must be vacated by the specified time.</li><li>Illegal/anti-social activities are prohibited.</li><li>Applicant is responsible for event damages.</li><li>Alcohol consumption is strictly prohibited.</li><li>Decorations must not damage walls or fixtures.</li></ul><h2>Cancellation &amp; Refund Policy</h2><p>Refund eligibility and amount are reviewed under the current policy. Submit a cancellation or refund application to see the applicable process.</p><a class="button" href="/refunds">Apply for Refund</a></div></section>');
    api("/venues").then(function (venues) {
      document.getElementById("about-venues").innerHTML = venues.map(function (venue) {
        var facilities = (venue.facilities || []).map(esc).join(" · ");
        return '<article class="card"><h3>' + esc(venue.venueName) + '</h3><p>' + esc(venue.description || "") + '</p><p>Capacity: ' + esc(venue.capacity || "—") + '</p><p class="muted">' + facilities + '</p></article>';
      }).join("") || "No active venues.";
    }).catch(function (error) { toast(error.message, "error"); });
  }
  async function renderGallery() {
    publicShell(pageTitle("Gallery", "Photos and videos from Hutatma Smruti Mandir.") + '<div class="toolbar"><button class="secondary" data-gallery="Photo">Photos</button><button class="secondary" data-gallery="Video">Videos</button></div><div id="gallery-grid" class="grid cols-3">Loading gallery…</div>' + publicEnd());
    var type = "Photo";
    async function loadGallery() {
      var items = await api("/gallery?type=" + encodeURIComponent(type));
      document.getElementById("gallery-grid").innerHTML = items.map(function (item) {
        var media = item.mediaType === "Video" && item.videoURL
          ? '<video controls style="width:100%;max-height:240px" poster="' + esc(item.thumbnailPath || "") + '"><source src="' + esc(item.videoURL) + '"></video>'
          : item.filePath ? '<img src="' + esc(item.filePath) + '" alt="' + esc(item.title) + '" style="width:100%;height:220px;object-fit:cover;border-radius:6px">' : "";
        return '<article class="card">' + media + '<h3>' + esc(item.title) + '</h3><p>' + esc(item.description || "") + '</p></article>';
      }).join("") || '<p class="muted">No gallery items are available.</p>';
    }
    document.querySelectorAll("[data-gallery]").forEach(function (button) { button.onclick = function () { type = button.getAttribute("data-gallery"); loadGallery().catch(function (e) { toast(e.message, "error"); }); }; });
    loadGallery().catch(function (e) { document.getElementById("gallery-grid").textContent = e.message; });
  }
  function renderContact() {
    publicShell(pageTitle("Contact Us", "Send a message to the Hutatma Smruti Mandir team.") +
      '<div class="grid cols-2"><section class="card"><h2>Contact information</h2><p>Hutatma Smruti Mandir</p><p>Hutatma Chowk, Solapur, Maharashtra</p><p>For technical queries: admin@hutatmamandir.org</p></section><form id="contact-form" class="card"><h2>Send a message</h2><div class="form-row">' +
      field("Full name *", "applicantName", "text", "required minlength=\"3\"") + field("Mobile *", "mobile", "tel", "required pattern=\"[6-9][0-9]{9}\" maxlength=\"10\"") +
      field("Email", "email", "email") + field("Booking ID (optional)", "bookingId") + '</div>' +
      field("Subject *", "subject", "text", "required") + textarea("Message *", "description", "required minlength=\"10\" rows=\"5\"") +
      '<button type="submit">Submit Message</button></form></div>' + publicEnd());
    document.getElementById("contact-form").onsubmit = async function (event) {
      event.preventDefault();
      var f = event.currentTarget;
      var payload = { applicantName:formValue(f,"applicantName"), mobile:formValue(f,"mobile"), email:formValue(f,"email"), bookingId:Number(formValue(f,"bookingId")) || null, subject:formValue(f,"subject"), description:formValue(f,"description") };
      try { await api("/complaints", { method:"POST", body:payload }); f.reset(); toast("Your message has been submitted.", "success"); }
      catch (e) { toast(e.message, "error"); }
    };
  }
  function renderPrintBooking() {
    publicShell(pageTitle("Print Booking Details", "Search using your Booking ID or registered mobile number.") +
      '<form id="print-search" class="panel"><div class="form-row">' + field("Booking ID or Mobile Number", "search", "text", 'required placeholder="Enter booking ID or registered 10-digit mobile number" autocomplete="off"') + '</div><button type="submit">Search</button></form><div id="print-results"></div>' + publicEnd());
    document.getElementById("print-search").onsubmit = async function (event) {
      event.preventDefault();
      var f = event.currentTarget, target = document.getElementById("print-results");
      var searchValue = formValue(f, "search").trim();
      target.innerHTML = '<p class="muted">Searching…</p>';
      try {
        var mobile = searchValue.replace(/\D/g, "");
        var data = /^\d{10}$/.test(mobile)
          ? await api("/bookings/mobile/" + encodeURIComponent(mobile))
          : await api("/bookings/number/" + encodeURIComponent(searchValue));
        var bookings = Array.isArray(data) ? data : data ? [data] : [];
        target.innerHTML = bookings.map(function (booking) {
          var paid = booking.paymentStatus === "Paid" && booking.receiptNumber;
          var actions = paid
            ? '<a class="button no-print" href="' + esc(apiBase + "/receipts/number/" + encodeURIComponent(booking.bookingNumber) + "/pdf") + '" download="Receipt-' + esc(booking.receiptNumber) + '.pdf">Download PDF</a> <button class="secondary no-print" type="button" data-receipt-email="' + esc(booking.bookingNumber) + '">Send Receipt to Email</button>'
            : '<span class="muted no-print">Receipt download and email are available after payment.</span>';
          return '<section class="panel receipt-result"><div class="actions no-print">' + actions + ' <button class="secondary" type="button" onclick="window.print()">Print</button></div>' + receiptMarkup(booking) + '</section>';
        }).join("") || '<div class="alert">No bookings found.</div>';
        target.querySelectorAll("[data-receipt-email]").forEach(function (button) {
          button.onclick = async function () {
            button.disabled = true;
            button.textContent = "Sending…";
            try {
              await api("/receipts/number/" + encodeURIComponent(button.getAttribute("data-receipt-email")) + "/email", { method: "POST", body: {} });
              toast("The receipt was sent to the email address registered with the booking.", "success");
            } catch (error) {
              toast(error.message, "error");
              button.disabled = false;
              button.textContent = "Send Receipt to Email";
            }
          };
        });
      } catch (e) { target.innerHTML = '<div class="alert error">' + esc(e.message) + '</div>'; }
    };
    var initial = new URLSearchParams(location.search).get("bookingNumber");
    if (initial) { document.querySelector('#print-search [name="search"]').value = initial; document.getElementById("print-search").requestSubmit(); }
  }
  function renderBook() {
    state.booking = { equipment: [], applicant: {}, bankDetail: {} };
    state.bookStep = 0;
    state.receipt = null;
    publicShell('<section class="section"><div class="container"><h1 class="section-title">Book Your Venue</h1><p class="section-title muted">Complete all steps to submit your booking request.</p><div id="book-steps"></div><div id="book-content"></div></div></section>');
    Promise.all([api("/venues"), api("/venues/equipment")]).then(function (result) {
      state.venues = result[0] || [];
      state.equipment = result[1] || [];
      drawBookStep();
    }).catch(function (error) {
      document.getElementById("book-content").innerHTML = messageBox(error.message, "error");
    });
  }
  function bookStepNav() {
    var labels = ["Availability", "Booking Summary", "Bank Details", "Confirm & Submit"];
    var currentStep = Math.min(state.bookStep, labels.length - 1);
    document.getElementById("book-steps").innerHTML = '<ol class="booking-progress" aria-label="Booking progress">' + labels.map(function (label, i) {
      var status = i < currentStep ? "complete" : i === currentStep ? "current" : "upcoming";
      return '<li class="booking-progress-step ' + status + '" aria-current="' + (i === currentStep ? "step" : "false") + '"><span class="booking-progress-marker">' + (i < currentStep ? "&#10003;" : i + 1) + '</span><span class="booking-progress-label">' + esc(label) + '</span></li>';
    }).join("") + '</ol>';
  }
  function activeSessions() {
    return state.booking.session === "FullDay" ? ["Morning","Afternoon","Evening"] : String(state.booking.session || "").split(",").filter(Boolean);
  }
  function drawBookStep() {
    bookStepNav();
    var target = document.getElementById("book-content");
    if (state.receipt) {
      var receipt = state.receipt;
      var downloadUrl = apiBase + "/receipts/number/" + encodeURIComponent(receipt.bookingNumber) + "/pdf";
      target.innerHTML = '<div class="panel" style="text-align:center"><h1>Payment Successful — Booking Confirmed</h1><h2>Booking ID: ' + esc(receipt.bookingNumber) + '</h2><h3>Receipt Number: ' + esc(receipt.receiptNumber) + '</h3><p>Your payment has been verified and your booking is confirmed.</p><a class="button no-print" href="' + esc(downloadUrl) + '" download="Receipt-' + esc(receipt.receiptNumber) + '.pdf">Download Receipt PDF</a> <a class="button secondary no-print" href="/book">Start Another Booking</a>' + receiptMarkup(receipt.booking, receipt.payment) + '</div>';
      return;
    }
    if (state.bookStep === 0) drawAvailability(target);
    else if (state.bookStep === 1) drawSummary(target);
    else if (state.bookStep === 2) drawBank(target);
    else drawConfirmation(target);
  }
  function venueOptions(selected) {
    return '<option value="">Select venue</option>' + state.venues.filter(function (v) { return v.status === "Active"; }).map(function (v) {
      return '<option value="' + v.venueId + '" ' + (String(v.venueId) === String(selected) ? "selected" : "") + '>' + esc(v.venueName) + '</option>';
    }).join("");
  }
  function drawAvailability(target) {
    var b = state.booking;
    target.innerHTML = '<div class="panel"><h2>Check Availability</h2><form id="availability-form"><div class="form-row">' +
      selectField("Select Venue *", "venueId", venueOptions(b.venueId)) +
      selectField("Sub-Venue *", "venuePricingId", '<option value="">Select venue first</option>') + '</div>' +
      '<section class="booking-calendar" aria-label="Select booking dates"><div class="calendar-heading"><button class="secondary" type="button" id="calendar-previous" aria-label="Previous month">‹</button><h3 id="calendar-month"></h3><button class="secondary" type="button" id="calendar-next" aria-label="Next month">›</button></div><div id="calendar-help" class="muted" aria-live="polite">Select a venue and sub-venue to view date availability.</div><div id="booking-calendar-grid" class="calendar booking-calendar-grid"></div><div class="calendar-legend"><span><i class="available"></i>Available</span><span><i class="unavailable"></i>Unavailable</span><span><i class="pending"></i>Not selectable</span></div><div id="selected-date-range" class="selected-date-range" aria-live="polite">Select a start date, then an end date. Click the same date twice for a one-day booking.</div></section>' +
      '<input type="hidden" name="fromDate" value=""><input type="hidden" name="toDate" value="">' +
      '<fieldset class="booking-sessions" disabled><legend>Choose available session(s) *</legend><div class="grid cols-4">' +
      [["Morning","9:00 AM – 1:00 PM"],["Afternoon","2:00 PM – 5:00 PM"],["Evening","6:00 PM – 10:00 PM"],["FullDay","9:00 AM – 10:00 PM"]]
        .map(function (session) { return '<label class="session-option"><input type="checkbox" name="session" value="' + session[0] + '"> ' + session[0] + '<br><small>' + session[1] + '</small></label>'; }).join("") +
      '</div><p class="muted">Select dates first. Only sessions available for every selected date can be chosen. Full Day occupies all three slots.</p></fieldset>' +
      '<div id="availability-info" aria-live="polite"></div><div id="equipment-options" class="grid cols-3" style="margin-top:18px"></div>' +
      '<div class="actions"><button type="submit">Proceed to Summary</button></div></form></div>';
    var form = document.getElementById("availability-form");
    var venueSelect = form.elements.venueId, priceSelect = form.elements.venuePricingId;
    var sessionFieldset = form.querySelector(".booking-sessions");
    var calendarGrid = document.getElementById("booking-calendar-grid");
    var calendarHelp = document.getElementById("calendar-help");
    var monthLabel = document.getElementById("calendar-month");
    var rangeLabel = document.getElementById("selected-date-range");
    var currentMonth = new Date();
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    var monthData = null;
    var monthRequest = 0;
    var pricingRequest = 0;
    var rangeRequest = 0;
    var selectedStart = b.fromDate || "";
    var selectedEnd = b.toDate || "";
    var selectedSlots = [];
    if (selectedStart) {
      var selectedParts = selectedStart.split("-").map(Number);
      currentMonth = new Date(selectedParts[0], selectedParts[1] - 1, 1);
    }
    var indiaToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
    var minDate = indiaToday;

    function dateKey(date) {
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }
    function dateLabel(value) {
      if (!value) return "—";
      var parts = value.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    function chosenSessions() {
      var selected = checkedValues("session");
      return selected.indexOf("FullDay") >= 0 ? ["FullDay"] : selected;
    }
    function sessionStatus(day, session) {
      if (!day) return "";
      if (session === "FullDay") return day.fullDayStatus || "";
      var sessionSlot = (day.sessions || []).find(function (item) { return item.session === session; });
      return (sessionSlot && sessionSlot.status) ||
        day[session.charAt(0).toLowerCase() + session.slice(1) + "Status"] || "";
    }
    function availableSessions(slots) {
      if (!slots.length) return [];
      return ["Morning", "Afternoon", "Evening", "FullDay"].filter(function (session) {
        return slots.every(function (slot) { return sessionStatus(slot, session) === "Available"; });
      });
    }
    function hasAvailability(day, sessions) {
      if (!sessions.length || !day) return false;
      return sessions.every(function (session) { return sessionStatus(day, session) === "Available"; });
    }
    function dayHasAvailability(day) {
      return availableSessions(day ? [day] : []).length > 0;
    }
    function formatMonth(date) {
      return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    function updateRangeLabel() {
      form.elements.fromDate.value = selectedStart;
      form.elements.toDate.value = selectedEnd;
      rangeLabel.textContent = selectedStart
        ? "Selected dates: " + dateLabel(selectedStart) + (selectedEnd ? " to " + dateLabel(selectedEnd) : " — choose an end date")
        : "Select a start date, then an end date. Click the same date twice for a one-day booking.";
    }
    function updateSessionChoices(slots) {
      var available = availableSessions(slots);
      sessionFieldset.disabled = !selectedEnd;
      sessionFieldset.querySelectorAll('input[name="session"]').forEach(function (input) {
        var selected = chosenSessions();
        var fullDaySelected = selected.indexOf("FullDay") >= 0;
        var individualSelected = selected.some(function (session) { return session !== "FullDay"; });
        var conflictsWithSelection = (fullDaySelected && input.value !== "FullDay") ||
          (individualSelected && input.value === "FullDay");
        input.disabled = !selectedEnd || available.indexOf(input.value) < 0 || conflictsWithSelection;
        if (input.disabled) input.checked = false;
        else if (!chosenSessions().length && input.value === b.session) input.checked = true;
      });
      return available;
    }
    async function loadMonth() {
      var requestId = ++monthRequest;
      var venueId = Number(venueSelect.value);
      monthLabel.textContent = formatMonth(currentMonth);
      if (!venueId || !Number(priceSelect.value)) {
        monthData = null;
        calendarHelp.textContent = "Select a venue and sub-venue to view slot availability.";
        renderCalendar();
        return;
      }
      monthData = null;
      calendarHelp.textContent = "Loading availability…";
      renderCalendar();
      var firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      var lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      try {
        var result = await api("/bookings/availability", {
          method: "POST",
          body: { venueId: venueId, fromDate: dateKey(firstDay), toDate: dateKey(lastDay) }
        });
        if (requestId !== monthRequest) return;
        monthData = {};
        (result.slots || []).forEach(function (slot) {
          monthData[String(slot.date).slice(0, 10)] = slot;
        });
        calendarHelp.textContent = "Available time slots are shown on each date. Select a date or date range, then choose an available session.";
        renderCalendar();
      } catch (error) {
        if (requestId !== monthRequest) return;
        monthData = null;
        calendarHelp.textContent = "Could not load availability: " + error.message;
        renderCalendar();
      }
    }
    function renderCalendar() {
      monthLabel.textContent = formatMonth(currentMonth);
      calendarGrid.innerHTML = "";
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (day) {
        var header = document.createElement("span");
        header.className = "calendar-weekday";
        header.textContent = day;
        calendarGrid.appendChild(header);
      });
      var firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      var daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      var offset = (firstDay.getDay() + 6) % 7;
      for (var blank = 0; blank < offset; blank++) {
        var empty = document.createElement("span");
        empty.className = "calendar-empty";
        calendarGrid.appendChild(empty);
      }
      var sessions = chosenSessions();
      for (var number = 1; number <= daysInMonth; number++) {
        var key = dateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), number));
        var day = monthData && monthData[key];
        var available = sessions.length ? hasAvailability(day, sessions) : dayHasAvailability(day);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "calendar-day" + (available ? " available" : day ? " unavailable" : " pending");
        if (key === selectedStart || key === selectedEnd) button.classList.add("selected");
        else if (selectedStart && selectedEnd && key > selectedStart && key < selectedEnd) button.classList.add("in-range");
        var dateNumber = document.createElement("span");
        dateNumber.className = "calendar-day-number";
        dateNumber.textContent = String(number);
        button.appendChild(dateNumber);
        button.disabled = !venueSelect.value || !priceSelect.value || key < minDate || !available;
        button.setAttribute("aria-label", dateLabel(key) + (day ? ": " + [["Morning", "Morning"], ["Afternoon", "Afternoon"], ["Evening", "Evening"], ["FullDay", "Full Day"]].map(function (slot) {
          return slot[1] + " " + (sessionStatus(day, slot[0]) === "Available" ? "available" : "unavailable");
        }).join(", ") : ", availability not loaded"));
        button.title = day
          ? "Morning: " + (sessionStatus(day, "Morning") === "Available" ? "available" : "unavailable") +
            " · Afternoon: " + (sessionStatus(day, "Afternoon") === "Available" ? "available" : "unavailable") +
            " · Evening: " + (sessionStatus(day, "Evening") === "Available" ? "available" : "unavailable") +
            " · Full Day: " + (sessionStatus(day, "FullDay") === "Available" ? "available" : "unavailable")
          : "Availability not loaded";
        button.onclick = function (selectedDate) {
          return async function () {
            if (!venueSelect.value || !priceSelect.value) return;
            if (!selectedStart || selectedEnd || selectedDate < selectedStart) {
              rangeRequest++;
              selectedStart = selectedDate;
              selectedEnd = "";
              selectedSlots = [];
              b.session = "";
              updateRangeLabel();
              updateSessionChoices([]);
              calendarHelp.textContent = "Choose an end date. For a one-day booking, click the selected date again.";
              renderCalendar();
              return;
            }

            calendarHelp.textContent = "Checking slot availability across the selected dates…";
            var requestId = ++rangeRequest;
            try {
              var checked = await api("/bookings/availability", {
                method: "POST",
                body: { venueId: Number(venueSelect.value), fromDate: selectedStart, toDate: selectedDate }
              });
              if (requestId !== rangeRequest) return;
              var rangeSlots = checked.slots || [];
              var eligibleSessions = availableSessions(rangeSlots);
              if (!rangeSlots.length || !eligibleSessions.length) {
                calendarHelp.textContent = "There is no single session available for every date in that range. Choose a different date range.";
                return;
              }
              selectedEnd = selectedDate;
              selectedSlots = rangeSlots;
              updateRangeLabel();
              updateSessionChoices(selectedSlots);
              calendarHelp.textContent = "Available sessions for every selected date are enabled below.";
              renderCalendar();
            } catch (error) {
              if (requestId !== rangeRequest) return;
              calendarHelp.textContent = "Could not verify the selected date range: " + error.message;
            }
          };
        }(key);
        calendarGrid.appendChild(button);
      }
    }
    document.getElementById("calendar-previous").onclick = function () {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      loadMonth();
    };
    document.getElementById("calendar-next").onclick = function () {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      loadMonth();
    };
    sessionFieldset.addEventListener("change", function (event) {
      if (event.target.value === "FullDay" && event.target.checked) {
        sessionFieldset.querySelectorAll('input[name="session"]').forEach(function (input) {
          if (input.value !== "FullDay") input.checked = false;
        });
      } else if (event.target.checked) {
        var fullDay = sessionFieldset.querySelector('input[value="FullDay"]');
        if (fullDay) fullDay.checked = false;
      }
      b.session = chosenSessions().join(",");
      updateSessionChoices(selectedSlots);
      calendarHelp.textContent = chosenSessions().length
        ? "Selected session is available for every date in the chosen range."
        : "Choose one or more of the enabled sessions.";
      renderCalendar();
    });
    function loadPricing(id) {
      var requestId = ++pricingRequest;
      if (!id) { priceSelect.innerHTML = '<option value="">Select venue first</option>'; return Promise.resolve(); }
      return api("/venues/" + id + "/details").then(function (details) {
        if (requestId !== pricingRequest) return;
        priceSelect.innerHTML = '<option value="">Select Sub-Venue</option>' + (details.pricing || []).map(function (p) {
          return '<option value="' + p.id + '" data-charge-unit="' + esc(p.chargeUnit) + '">' + esc(p.priceItemName) + " — " + money(p.amount) + " (" + esc(p.chargeUnit) + ")</option>";
        }).join("");
        if (b.venuePricingId) priceSelect.value = String(b.venuePricingId);
      });
    }
    venueSelect.onchange = function () {
      rangeRequest++;
      b.venueId = venueSelect.value;
      b.venuePricingId = "";
      priceSelect.innerHTML = '<option value="">Loading sub-venues…</option>';
      b.session = "";
      selectedStart = "";
      selectedEnd = "";
      selectedSlots = [];
      sessionFieldset.querySelectorAll('input[name="session"]').forEach(function (input) {
        input.checked = false;
        input.disabled = true;
      });
      updateRangeLabel();
      loadPricing(b.venueId).then(function () {
        loadMonth();
      }).catch(function (error) { toast(error.message, "error"); });
      monthData = null;
      renderCalendar();
    };
    priceSelect.onchange = function () {
      rangeRequest++;
      b.venuePricingId = priceSelect.value;
      selectedStart = "";
      selectedEnd = "";
      selectedSlots = [];
      b.session = "";
      sessionFieldset.querySelectorAll('input[name="session"]').forEach(function (input) {
        input.checked = false;
        input.disabled = true;
      });
      updateRangeLabel();
      loadMonth();
    };
    loadPricing(b.venueId).then(async function () {
      if (b.venuePricingId) priceSelect.value = String(b.venuePricingId);
      await loadMonth();
      if (selectedStart && selectedEnd && venueSelect.value && priceSelect.value) {
        try {
          var initialRange = await api("/bookings/availability", {
            method: "POST",
            body: { venueId: Number(venueSelect.value), fromDate: selectedStart, toDate: selectedEnd }
          });
          selectedSlots = initialRange.slots || [];
          var eligible = updateSessionChoices(selectedSlots);
          String(b.session || "").split(",").forEach(function (session) {
            if (eligible.indexOf(session) >= 0) {
              var input = sessionFieldset.querySelector('input[value="' + session + '"]');
              if (input) input.checked = true;
            }
          });
          renderCalendar();
        } catch (error) {
          calendarHelp.textContent = "Could not restore the selected date range: " + error.message;
        }
      }
    }).catch(function(error){toast(error.message,"error");});
    updateRangeLabel();
    renderCalendar();
    document.getElementById("equipment-options").innerHTML = state.equipment.map(function (item) {
      var selected = (b.equipment || []).find(function (x) { return Number(x.equipmentId) === Number(item.id); });
      return '<article class="card"><strong>' + esc(item.equipmentName) + '</strong><p class="muted">' + esc(item.chargeUnit) + ' · ' + money(item.amount) + (item.freeQuantity ? ' · ' + item.freeQuantity + ' free' : "") + '</p><div class="field"><label>Quantity</label><input type="number" min="0" step="1" name="equipment-' + item.id + '" value="' + Number(selected && selected.quantity || 0) + '"></div></article>';
    }).join("") || '<p class="muted">No equipment options are available.</p>';
    form.onsubmit = async function (event) {
      event.preventDefault();
      var start = formValue(form, "fromDate"), end = formValue(form, "toDate"), venueId = Number(formValue(form, "venueId"));
      if (!venueId || !Number(formValue(form,"venuePricingId"))) return toast("Select a venue and price item.", "error");
      if (!start || !end || start < minDate || end < start) return toast("Choose an available start date and end date from the calendar.", "error");
      var selected = chosenSessions();
      if (!selected.length) return toast("Please select at least one time slot.", "error");
      if (selected.some(function (session) { return availableSessions(selectedSlots).indexOf(session) < 0; }))
        return toast("Choose a session that is available for every selected date.", "error");
      if (selected.length === 3) selected = ["FullDay"];
      var session = selected[0] === "FullDay" ? "FullDay" : ["Morning","Afternoon","Evening"].filter(function (s) { return selected.indexOf(s) >= 0; }).join(",");
      var equipment = state.equipment.map(function (item) {
        var quantity = Math.max(0, Math.floor(Number(form.elements["equipment-" + item.id].value || 0)));
        return quantity ? { equipmentId:item.id, equipmentName:item.equipmentName, chargeUnit:item.chargeUnit, unitPrice:item.amount, quantity:quantity, totalPrice:item.amount * quantity } : null;
      }).filter(Boolean);
      try {
        var info = document.getElementById("availability-info");
        info.innerHTML = '<div class="alert">Checking availability…</div>';
        var result = await api("/bookings/availability", { method:"POST", body:{ venueId:venueId, fromDate:start, toDate:end } });
        var slots = result.slots || [];
        var conflicting = !slots.length || slots.some(function (slot) {
          return session === "FullDay" ? slot.fullDayStatus !== "Available" :
            session.split(",").some(function (name) {
              var item = (slot.sessions || []).find(function (s) { return s.session === name; });
              return (item && item.status ? item.status : slot[name.charAt(0).toLowerCase()+name.slice(1)+"Status"]) !== "Available";
            });
        });
        if (conflicting) { info.innerHTML = messageBox("The selected session is already booked for one or more selected dates. Choose different dates or sessions.", "error"); return; }
        var venue = state.venues.find(function(v){return Number(v.venueId)===venueId;});
        var pricing = Array.prototype.slice.call(priceSelect.options).find(function(o){return o.value===String(formValue(form,"venuePricingId"));});
        b.venueId = venueId; b.venueName = venue ? venue.venueName : ""; b.venuePricingId = Number(formValue(form,"venuePricingId"));
        b.priceItemName = pricing ? pricing.text.split(" — ")[0] : ""; b.chargeUnit = pricing ? pricing.getAttribute("data-charge-unit") : "";
        b.fromDate = start; b.toDate = end; b.session = session; b.equipment = equipment;
        state.bookStep = 1; drawBookStep();
      } catch (error) {
        var info = document.getElementById("availability-info");
        info.innerHTML = messageBox(error.message || "Could not verify availability. Please try again.", "error");
      }
    };
  }
  async function drawSummary(target) {
    var b = state.booking;
    target.innerHTML = '<div class="panel">Calculating booking summary…</div>';
    try {
      var summary = await api("/bookings/summary", { method:"POST", body:{
        venueId:b.venueId, venuePricingId:b.venuePricingId, fromDate:b.fromDate, toDate:b.toDate,
        session:b.session, equipment:(b.equipment || []).map(function(item){return {equipmentId:item.equipmentId,quantity:item.quantity};})
      }});
      b.summary = summary;
      var rows = [["Venue",b.venueName],["Price Item",b.priceItemName],["From Date",fmtDate(b.fromDate)],["To Date",fmtDate(b.toDate)],["Session",b.session==="FullDay"?"Full Day":b.session],["Total Days",summary.totalDays + " day(s)"]];
      var charges = [["Base Rent",summary.baseRent],["Holiday Charges",summary.holidayCharge],["Equipment Charges",summary.equipmentCharge],["Security Deposit",summary.securityDeposit],["CGST ("+summary.cgstPercent+"%)",summary.cgstAmount],["SGST ("+summary.sgstPercent+"%)",summary.sgstAmount]];
      target.innerHTML = '<div class="grid cols-2"><section class="card"><h2>Booking Details</h2><table><tbody>' + rows.map(function(r){return '<tr><th>'+esc(r[0])+'</th><td>'+esc(r[1])+'</td></tr>';}).join("") + '</tbody></table></section><section class="card"><h2>Cost Breakdown</h2><table><tbody>' + charges.map(function(r){return '<tr><th>'+esc(r[0])+'</th><td>'+money(r[1])+'</td></tr>';}).join("") + '</tbody></table><h2>Grand Total: '+money(summary.grandTotal)+'</h2><p>You will receive your booking ID immediately. Payment is due to confirm your booking.</p></section></div><div class="actions split"><button class="secondary" id="book-back">Back</button><button id="book-next">Proceed to Bank Details</button></div>';
      document.getElementById("book-back").onclick = function(){state.bookStep=0;drawBookStep();};
      document.getElementById("book-next").onclick = function(){state.bookStep=2;drawBookStep();};
    } catch (error) {
      target.innerHTML = messageBox(error.message || "Failed to calculate booking summary.", "error") + '<button class="secondary" id="summary-back">Back</button>';
      document.getElementById("summary-back").onclick = function(){state.bookStep=0;drawBookStep();};
    }
  }
  function drawBank(target) {
    var b = state.booking.bankDetail || {};
    target.innerHTML = '<div class="panel"><h2>Bank Details</h2><p class="muted">Provide bank account information for any eligible refund.</p><form id="bank-form"><div class="form-row">' +
      field("Bank Name *","bankName","text",'required value="'+esc(b.bankName||"")+'"') +
      field("Account Holder Name *","accountHolderName","text",'required value="'+esc(b.accountHolderName||"")+'"') +
      field("Account Number *","accountNumber","text",'required minlength="9" maxlength="18" pattern="[0-9]{9,18}" value="'+esc(b.accountNumber||"")+'"') +
      field("IFSC Code *","ifscCode","text",'required pattern="[A-Z]{4}0[A-Z0-9]{6}" maxlength="11" value="'+esc(b.ifscCode||"")+'"') +
      field("Branch Name *","branchName","text",'required value="'+esc(b.branchName||"")+'"') +
      field("MICR Code","micrCode","text",'value="'+esc(b.micrCode||"")+'"') +
      '</div><div class="actions"><button class="secondary" type="button" id="bank-back">Back</button><button type="submit">Review &amp; Submit</button></div></form></div>';
    document.getElementById("bank-back").onclick = function(){state.bookStep=1;drawBookStep();};
    document.getElementById("bank-form").onsubmit = function(event) {
      event.preventDefault();
      var f=event.currentTarget, ifsc=formValue(f,"ifscCode").toUpperCase(), account=formValue(f,"accountNumber");
      if (!formValue(f,"bankName") || !formValue(f,"accountHolderName") || !formValue(f,"branchName") ||
          account.length < 9 || account.length > 18 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))
        return toast("Enter all required bank details and a valid IFSC code.", "error");
      state.booking.bankDetail={bankName:formValue(f,"bankName"),accountHolderName:formValue(f,"accountHolderName"),accountNumber:account,ifscCode:ifsc,branchName:formValue(f,"branchName"),micrCode:formValue(f,"micrCode")};
      state.bookStep=3; drawBookStep();
    };
  }
  function drawConfirmation(target) {
    var b=state.booking, s=b.summary || {}, bank=b.bankDetail || {};
    target.innerHTML = '<div class="grid cols-2"><section class="card"><h2>Booking Details</h2><p>'+esc(b.venueName)+' · '+esc(b.priceItemName)+'</p><p>'+fmtDate(b.fromDate)+' – '+fmtDate(b.toDate)+' · '+esc(b.session)+'</p><strong>Grand Total: '+money(s.grandTotal)+'</strong></section><section class="card"><h2>Bank Details</h2><p>'+esc(bank.bankName)+' · '+esc(bank.accountHolderName)+'</p><p>Account ending in '+esc(String(bank.accountNumber || "").slice(-4))+'</p><p>'+esc(bank.ifscCode)+'</p></section></div><div class="alert warning"><strong>Important Notice</strong><br>Submitting reserves your selected date and session. Booking is confirmed automatically once the payment gateway completes successfully. Do not pay unauthorized accounts.</div><div class="actions"><button class="secondary" id="confirm-back">Back</button><button id="pay-now">Make Payment</button></div><div id="payment-error"></div>';
    document.getElementById("confirm-back").onclick=function(){state.bookStep=2;drawBookStep();};
    document.getElementById("pay-now").onclick=submitBookingPayment;
  }
  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise(function(resolve) {
      var script=document.createElement("script"); script.src="https://checkout.razorpay.com/v1/checkout.js";
      script.onload=function(){resolve(true);}; script.onerror=function(){resolve(false);}; document.body.appendChild(script);
    });
  }
  async function submitBookingPayment() {
    var b=state.booking, a=b.applicant, payButton=document.getElementById("pay-now");
    if (!a || !a.fullName || !a.email || !a.mobile || !a.functionName || !a.functionType ||
        !Number(a.expectedGuests) || !a.idProofType || !a.idProofFile) {
      document.getElementById("payment-error").innerHTML = messageBox("Applicant details have not been loaded from the citizen database. Booking submission is unavailable until that integration is configured.", "error");
      return;
    }
    payButton.disabled=true; payButton.textContent="Processing…";
    try {
      var init=await api("/payments/initiate",{method:"POST",body:{amount:b.summary.grandTotal,paymentMethod:"Card",customerName:a.fullName,customerEmail:a.email,customerMobile:a.mobile}});
      var payload={
        venueId:b.venueId,venuePricingId:b.venuePricingId,fromDate:b.fromDate,toDate:b.toDate,session:b.session,
        equipment:(b.equipment||[]).map(function(item){return {equipmentId:item.equipmentId,quantity:item.quantity};}),
        applicant:a,bankDetail:b.bankDetail
      };
      async function complete(gateway) {
        var result=await api("/payments/complete",{method:"POST",body:Object.assign({
          transactionRef:init.transactionRef||"",paymentMethod:"Card",paymentDate:null,booking:payload
        },gateway||{})});
        state.receipt={
          booking:Object.assign({},result,{id:result.bookingId,bookingNumber:result.bookingNumber,receiptNumber:result.receiptNumber,venueName:b.venueName,priceItemName:b.priceItemName,chargeUnit:b.chargeUnit,fromDate:b.fromDate,toDate:b.toDate,session:b.session,totalDays:b.summary.totalDays,equipmentItems:b.equipment,baseRent:b.summary.baseRent,holidayCharge:b.summary.holidayCharge,equipmentCharge:b.summary.equipmentCharge,securityDeposit:b.summary.securityDeposit,cgstAmount:b.summary.cgstAmount,sgstAmount:b.summary.sgstAmount,grandTotal:b.summary.grandTotal,status:"Confirmed",applicantName:a.fullName,applicantMobile:a.mobile,applicantAlternateMobile:a.alternateMobile,applicantEmail:a.email,applicantAddress:a.address,functionName:a.functionName,functionType:a.functionType,expectedGuests:a.expectedGuests}),
          receiptNumber:result.receiptNumber,
          payment:{transactionRef:result.transactionRef,paymentDate:result.paymentDate,paymentMethod:result.paymentMethod,status:result.status,amount:result.amount}
        };
        drawBookStep();
      }
      if (init.gatewayOrderId && init.gatewayKey) {
        if (!await loadRazorpay()) throw new Error("Failed to load payment gateway script.");
        var gateway=new window.Razorpay({
          key:init.gatewayKey,amount:init.amount,currency:init.currency||"INR",name:"Hutatma Mandir",
          description:"Venue booking for "+a.fullName,order_id:init.gatewayOrderId,
          prefill:{name:init.customerName||a.fullName,email:init.customerEmail||a.email,contact:init.customerMobile||a.mobile},
          handler:function(response){complete({gatewayPaymentId:response.razorpay_payment_id,gatewayOrderId:response.razorpay_order_id,gatewaySignature:response.razorpay_signature}).catch(function(error){toast(error.message,"error");});},
          modal:{ondismiss:function(){toast("Payment was cancelled. Your booking remains pending until payment is completed.","info");}}
        });
        gateway.open();
        payButton.disabled=false; payButton.textContent="Make Payment";
      } else {
        await complete({});
      }
    } catch(error) {
      document.getElementById("payment-error").innerHTML=messageBox(error.message,"error");
      payButton.disabled=false; payButton.textContent="Make Payment";
    }
  }
  function lookupForm(title, subtitle, buttonText, id) {
    return pageTitle(title,subtitle)+'<form id="'+id+'" class="panel"><div class="form-row">'+field("Booking ID or registered mobile number","search")+'<div class="field"><label>&nbsp;</label><button type="submit">'+esc(buttonText)+'</button></div></div></form><div id="'+id+'-results"></div>'+publicEnd();
  }
  function renderRefundApplication() {
    publicShell(lookupForm("Apply Refund","Find a booking to submit a refund request or check its status.","Fetch Applications","refund-search"));
    var form=document.getElementById("refund-search"), target=document.getElementById("refund-search-results");
    form.onsubmit=async function(event) {
      event.preventDefault(); var value=formValue(form,"search");
      if(!value)return toast("Enter a Booking ID or registered mobile number.","error");
      target.innerHTML='<p>Searching…</p>';
      try {
        var qs=/^\+?\d{10,15}$/.test(value)?"mobile="+encodeURIComponent(value):"bookingNumber="+encodeURIComponent(value);
        var bookings=await api("/refunds/lookup?"+qs);
        target.innerHTML=(bookings||[]).map(function(b) {
          var eligible=b.eligibleForRefund && !b.refundRequest && !b.existingCancellation;
          return '<article class="card" style="margin-top:16px"><div class="split"><h3>'+esc(b.applicationNumber)+'</h3>'+badge(b.bookingStatus)+'</div><p>'+esc(b.applicantName)+' · '+esc(b.contactNumber)+'</p><p>'+esc(b.venue)+' · '+fmtDate(b.fromDate)+' – '+fmtDate(b.toDate)+' · '+esc(b.session)+'</p><p>Amount: '+money(b.bookingAmount)+' · Payment: '+esc(b.paymentStatus)+'</p>'+
            (b.refundRequest?'<p>Refund request '+esc(b.refundRequest.refundRequestNumber)+' · '+badge(b.refundRequest.status)+'</p>':
            b.existingCancellation?'<p>A cancellation request already exists.</p>':
            eligible?'<div class="actions"><button data-refund-otp="'+b.bookingId+'" data-mobile="'+esc(b.contactNumber)+'">Request verification code</button><input class="otp-input" id="refund-otp-'+b.bookingId+'" inputmode="numeric" maxlength="6" placeholder="6-digit code"><button data-refund-submit="'+b.bookingId+'" data-mobile="'+esc(b.contactNumber)+'">Verify &amp; Submit</button></div>':
            '<p class="alert warning">'+esc(b.eligibilityMessage||"This application is not eligible for a refund.")+'</p>')+'</article>';
        }).join("")||'<div class="alert">No application found.</div>';
        target.querySelectorAll("[data-refund-otp]").forEach(function(btn){btn.onclick=async function(){try{var r=await api("/refunds/"+btn.dataset.refundOtp+"/request-otp",{method:"POST",body:{mobile:btn.dataset.mobile}});toast(r.message,"success");}catch(e){toast(e.message,"error");}};});
        target.querySelectorAll("[data-refund-submit]").forEach(function(btn){btn.onclick=async function(){var otp=document.getElementById("refund-otp-"+btn.dataset.refundSubmit).value;if(!/^\d{6}$/.test(otp))return toast("Enter the six-digit verification code.","error");try{var r=await api("/refunds/"+btn.dataset.refundSubmit+"/apply-verified",{method:"POST",body:{mobile:btn.dataset.mobile,otp:otp}});toast("Refund request "+r.refundRequestNumber+" submitted.","success");form.requestSubmit();}catch(e){toast(e.message,"error");}};});
      }catch(e){target.innerHTML=messageBox(e.message,"error");}
    };
  }
  function renderCancellationApplication() {
    publicShell('<div class="alert">Submitting marks the booking as cancelled immediately. Any refund is processed separately by staff.</div>'+lookupForm("Apply for Cancellation","Find your confirmed booking and submit a cancellation reason.","Fetch Booking","cancel-search"));
    var form=document.getElementById("cancel-search"),target=document.getElementById("cancel-search-results");
    form.onsubmit=async function(event){
      event.preventDefault();var value=formValue(form,"search");
      if(!value)return toast("Enter a Booking ID or registered mobile number.","error");
      target.innerHTML="<p>Searching…</p>";
      try{
        var qs=/^\+?\d{10,15}$/.test(value)?"mobile="+encodeURIComponent(value):"bookingNumber="+encodeURIComponent(value);
        var bookings=await api("/refunds/lookup?"+qs);
        target.innerHTML=(bookings||[]).map(function(b){
          var eligible=!b.existingCancellation&&b.bookingStatus==="Confirmed"&&b.paymentStatus==="Paid";
          return '<article class="card" style="margin-top:16px"><h3>'+esc(b.applicationNumber)+'</h3><p>'+esc(b.applicantName)+' · '+esc(b.contactNumber)+'</p><p>'+esc(b.venue)+' · '+fmtDate(b.fromDate)+' – '+fmtDate(b.toDate)+' · '+esc(b.session)+'</p><p>Booking status: '+badge(b.bookingStatus)+' Payment: '+badge(b.paymentStatus)+'</p>'+
            (b.existingCancellation?'<div class="alert warning">A cancellation application already exists.</div>':eligible?
              '<div class="field"><label>Cancellation reason *</label><textarea id="cancel-reason-'+b.bookingId+'" minlength="3" required></textarea></div><div class="actions"><button data-cancel-otp="'+b.bookingId+'" data-mobile="'+esc(b.contactNumber)+'">Request verification code</button><input id="cancel-otp-'+b.bookingId+'" maxlength="6" placeholder="6-digit code"><button data-cancel-submit="'+b.bookingId+'" data-mobile="'+esc(b.contactNumber)+'">Verify &amp; Submit</button></div>':
              '<div class="alert warning">Cancellation is available only for confirmed bookings with recorded payment.</div>')+'</article>';
        }).join("")||'<div class="alert">No booking was found.</div>';
        target.querySelectorAll("[data-cancel-otp]").forEach(function(btn){btn.onclick=async function(){try{var r=await api("/cancellations/"+btn.dataset.cancelOtp+"/request-otp",{method:"POST",body:{mobile:btn.dataset.mobile}});toast(r.message,"success");}catch(e){toast(e.message,"error");}};});
        target.querySelectorAll("[data-cancel-submit]").forEach(function(btn){btn.onclick=async function(){var id=btn.dataset.cancelSubmit,otp=document.getElementById("cancel-otp-"+id).value,reason=document.getElementById("cancel-reason-"+id).value.trim();if(!/^\d{6}$/.test(otp)||!reason)return toast("Enter the six-digit verification code and cancellation reason.","error");try{var r=await api("/cancellations/"+id+"/apply-verified",{method:"POST",body:{mobile:btn.dataset.mobile,otp:otp,reason:reason}});toast("Cancellation submitted. Refund amount: "+money(r.refundAmount)+".","success");form.requestSubmit();}catch(e){toast(e.message,"error");}};});
      }catch(e){target.innerHTML=messageBox(e.message,"error");}
    };
  }
  function renderTrackRefund() {
    publicShell(pageTitle("Track Refund","Check the latest status of a submitted refund request.")+
      '<form id="track-form" class="panel"><div class="form-row">'+selectField("Search by","type",'<option value="refund">Refund Request Number</option><option value="booking">Booking ID or Mobile Number</option>')+field("Reference","value","text","required")+'</div><button type="submit">Track Status</button></form><div id="track-results"></div>'+publicEnd());
    var qs=new URLSearchParams(location.search), type=qs.get("type"), value=qs.get("value");
    if(value){document.querySelector('#track-form [name="type"]').value=type==="refund"?"refund":"booking";document.querySelector('#track-form [name="value"]').value=value;}
    document.getElementById("track-form").onsubmit=async function(event){
      event.preventDefault();var f=event.currentTarget,v=formValue(f,"value"),kind=formValue(f,"type"),params;
      if(!v)return toast("Enter a refund request number, Booking ID, or registered mobile number.","error");
      params=kind==="refund"?"refundRequestNumber="+encodeURIComponent(v):(/^\+?\d{10,15}$/.test(v)?"mobile="+encodeURIComponent(v):"bookingNumber="+encodeURIComponent(v));
      var target=document.getElementById("track-results");target.innerHTML="<p>Searching…</p>";
      try{
        var items=await api("/refunds/track?"+params);
        target.innerHTML=(items||[]).map(function(r){
          return '<article class="card" style="margin-top:16px"><div class="split"><div><small class="muted">Refund Request Number</small><h2>'+esc(r.refundRequestNumber)+'</h2></div>'+badge(r.status)+'</div><div class="grid cols-2"><p>Booking ID<br><strong>'+esc(r.applicationNumber)+'</strong></p><p>Applicant<br><strong>'+esc(r.applicantName)+'</strong></p><p>Mobile<br><strong>'+esc(r.mobile||"—")+'</strong></p><p>Venue / Date<br><strong>'+esc(r.venue)+' · '+esc(r.fromDate)+' – '+esc(r.toDate)+'</strong></p><p>Session<br><strong>'+esc(r.session)+'</strong></p><p>Refund Amount<br><strong>'+money(r.refundAmount)+'</strong></p><p>Requested<br><strong>'+fmtDate(r.requestedAt)+'</strong></p><p>Last Updated<br><strong>'+fmtDate(r.lastUpdatedAt)+'</strong></p></div><p>Progress: Requested → Under Verification → Approved → Processing → Processed</p>'+(r.rejectionReason?'<div class="alert error">Refund Rejected: '+esc(r.rejectionReason)+'</div>':"")+'</article>';
        }).join("")||'<div class="alert">No matching refund request was found.</div>';
      }catch(e){target.innerHTML=messageBox(e.message,"error");}
    };
    if(value)document.getElementById("track-form").requestSubmit();
  }
  function renderAdminShell(content, title) {
    var role=localStorage.getItem("hsm_role"), name=localStorage.getItem("hsm_fullName")||"Staff";
    if (!localStorage.getItem("hsm_token")) { location.replace("/admin/login"); return; }
    if (role==="Clerk" && screen!=="admin/refunds") { location.replace("/admin/refunds"); return; }
    var sections=role==="Clerk"?[["Refund Processing",[["Refund Requests","/admin/refunds"]]]]:adminItems;
    var links=sections.map(function(section){return '<div class="group">'+esc(section[0])+'</div>'+section[1].map(function(item){return '<a href="'+item[1]+'" class="'+(location.pathname===item[1]?"active":"")+'">'+esc(item[0])+'</a>';}).join("");}).join("");
    root.innerHTML='<header class="topbar"><button id="admin-menu" class="menu-button">☰</button><a class="brand" href="/admin/dashboard"><span class="brand-mark">HSM</span><span>Hutatma Smruti Mandir<small>Administration</small></span></a><div class="nav"><span>'+esc(name)+' · '+esc(role)+'</span><button class="secondary" id="admin-logout">Logout</button></div></header><div class="admin-layout"><aside class="sidebar" id="admin-sidebar">'+links+'<div class="group">Website</div><a href="/book">Public Booking</a></aside><main class="admin-main"><div class="split"><div><h1>'+esc(title||titles[screen]||"Administration")+'</h1></div><button class="secondary" id="admin-refresh">Refresh</button></div>'+content+'</main></div>';
    document.getElementById("admin-logout").onclick=function(){["hsm_token","hsm_fullName","hsm_role"].forEach(function(k){localStorage.removeItem(k);});location.href="/book";};
    document.getElementById("admin-menu").onclick=function(){document.getElementById("admin-sidebar").classList.toggle("open");};
    document.getElementById("admin-refresh").onclick=function(){location.reload();};
  }
  function renderLogin() {
    root.innerHTML='<main class="login"><section class="panel"><header class="login-head"><div style="font-size:38px">🏛</div><h1>Hutatma Smruti Mandir</h1><p>Admin &amp; Clerk Portal</p></header><form id="login-form"><h2 id="login-title">Admin / Staff Sign In</h2><div id="login-error"></div>'+field("Registered Admin / Staff / Clerk Mobile Number","mobile","tel",'required maxlength="10" pattern="[0-9]{10}" autocomplete="tel"')+'<div id="otp-wrap" class="hidden">'+field("Six-digit OTP","otp","text",'inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code"')+'</div><button id="login-submit" type="submit">Send OTP</button><button type="button" class="secondary" style="width:100%;margin-top:10px" onclick="location.href=\'/\'">Back to Public Website</button></form></section></main>';
    var requested=false,form=document.getElementById("login-form");
    form.onsubmit=async function(event){
      event.preventDefault();var mobile=formValue(form,"mobile"),otp=formValue(form,"otp"),error=document.getElementById("login-error");
      error.innerHTML="";
      if(!/^\d{10}$/.test(mobile))return error.innerHTML=messageBox("Enter the 10-digit mobile number registered to your account.","error");
      try{
        if(!requested){var result=await api("/auth/request-otp",{method:"POST",body:{mobile:mobile}});requested=true;form.elements.mobile.disabled=true;document.getElementById("otp-wrap").classList.remove("hidden");document.getElementById("login-title").textContent="Enter Verification Code";document.getElementById("login-submit").textContent="Verify OTP";toast(result.message,"info");}
        else{
          if(!/^\d{6}$/.test(otp))return error.innerHTML=messageBox("Enter the six-digit verification code.","error");
          var auth=await api("/auth/verify-otp",{method:"POST",body:{mobile:mobile,otp:otp}});
          localStorage.setItem("hsm_token",auth.token);localStorage.setItem("hsm_fullName",auth.fullName);localStorage.setItem("hsm_role",auth.role);
          location.href=auth.role==="Clerk"?"/admin/refunds":"/admin/dashboard";
        }
      }catch(e){error.innerHTML=messageBox(e.message,"error");}
    };
  }
  function renderDashboard() {
    renderAdminShell('<div id="dashboard-content">Loading dashboard…</div>');
    Promise.all([api("/dashboard"),api("/refunds")]).then(function(values){
      var d=values[0],refunds=values[1]||[];
      document.getElementById("dashboard-content").innerHTML='<div class="grid cols-4">'+
        [["Total Bookings",d.totalBookings],["Awaiting Payment",d.pendingPaymentBookings],["Confirmed",d.confirmedBookings],["Revenue",money(d.totalRevenue)]]
        .map(function(x){return '<article class="card"><div class="stat">'+esc(x[1])+'</div><p>'+esc(x[0])+'</p></article>';}).join("")+'</div>'+
        '<section class="card" style="margin-top:20px"><h2>Recent Bookings</h2>'+bookingTable(d.recentBookings||[])+'</section>'+
        '<section class="card" style="margin-top:20px"><h2>Open Refund Requests</h2><p>'+refunds.length+' request(s) in the refund queue.</p><a class="button" href="/admin/refunds">Review Refunds</a></section>';
    }).catch(function(e){document.getElementById("dashboard-content").innerHTML=messageBox(e.message,"error");});
  }
  function bookingTable(items, start) {
    start=start||0;
    return '<div class="table-wrap"><table><thead><tr><th>Booking ID</th><th>Applicant</th><th>Venue</th><th>Date / Slot</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'+
      (items||[]).map(function(b){return '<tr><td>'+esc(b.bookingNumber)+'</td><td>'+esc(b.applicantName)+'<br><small>'+esc(b.applicantMobile)+'</small></td><td>'+esc(b.venueName)+'<br><small>'+esc(b.priceItemName)+'</small></td><td>'+fmtDate(b.fromDate)+' – '+fmtDate(b.toDate)+'<br>'+esc(b.session)+'</td><td>'+money(b.grandTotal)+'</td><td>'+badge(b.status)+'</td><td><button class="secondary" data-detail="'+b.id+'">Details</button></td></tr>';}).join("")||
      '<tr><td colspan="7">No bookings found.</td></tr>'+'</tbody></table></div>';
  }
  function loadAdminBookings(container, filters) {
    filters=filters||{};
    var params=new URLSearchParams({page:String(state.page||1),pageSize:"15"});
    if(filters.search)params.set("bookingNumber",filters.search);
    if(filters.status)params.set("status",filters.status);
    container.innerHTML='<p>Loading bookings…</p>';
    api("/bookings?"+params.toString()).then(function(result){
      state.adminBookings=result.items||[];
      container.innerHTML=bookingTable(state.adminBookings,(state.page-1)*15)+'<div class="pagination"><button class="secondary" id="page-prev" '+(state.page<=1?"disabled":"")+'>Previous</button><span>Page '+state.page+' of '+(result.totalPages||1)+'</span><button class="secondary" id="page-next" '+(state.page>=(result.totalPages||1)?"disabled":"")+'>Next</button></div>';
      container.querySelectorAll("[data-detail]").forEach(function(button){button.onclick=function(){var booking=state.adminBookings.find(function(b){return Number(b.id)===Number(button.dataset.detail);});showBookingDetail(booking);};});
      document.getElementById("page-prev").onclick=function(){state.page=Math.max(1,state.page-1);loadAdminBookings(container,filters);};
      document.getElementById("page-next").onclick=function(){state.page++;loadAdminBookings(container,filters);};
    }).catch(function(e){container.innerHTML=messageBox(e.message,"error");});
  }
  function showBookingDetail(b) {
    var box=document.createElement("div");box.className="modal";
    box.innerHTML='<div class="modal-content"><div class="modal-header"><h2>Booking '+esc(b.bookingNumber)+'</h2><button class="secondary" data-close>Close</button></div>'+receiptMarkup(b)+
      '<div class="actions">'+(b.status!=="Cancelled"&&b.status!=="ForceCancelled"?'<button class="secondary" data-change>Change Date</button><button class="danger" data-force>Force Cancel</button>':'')+
      '<button class="secondary" data-admin-refund>Apply Refund</button><a class="button secondary" href="/admin/receipts?bookingNumber='+encodeURIComponent(b.bookingNumber)+'">Print Receipt</a></div></div>';
    document.body.appendChild(box);box.querySelector("[data-close]").onclick=function(){box.remove();};
    var change=box.querySelector("[data-change]");
    if(change)change.onclick=async function(){
      var date=prompt("Enter the new start date (YYYY-MM-DD):",String(b.fromDate).slice(0,10));if(!date)return;
      try{await api("/bookings/"+b.id+"/date",{method:"PUT",body:{newFromDate:date}});toast("Booking date changed.","success");box.remove();location.reload();}catch(e){toast(e.message,"error");}
    };
    var force=box.querySelector("[data-force]");
    if(force)force.onclick=async function(){if(!confirm("Force-cancel this paid booking and create a full refund request?"))return;try{var r=await api("/bookings/"+b.id+"/force-cancel",{method:"POST"});toast("Booking force-cancelled. Refund request "+r.refundRequestNumber+" created.","success");box.remove();location.reload();}catch(e){toast(e.message,"error");}};
    box.querySelector("[data-admin-refund]").onclick=async function(){var reason=prompt("Reason for admin-submitted refund application:","Admin-submitted refund application");if(reason===null)return;try{var r=await api("/refunds/"+b.id+"/admin-apply",{method:"POST",body:{reason:reason}});toast("Refund request "+r.refundRequestNumber+" submitted.","success");box.remove();}catch(e){toast(e.message,"error");}};
  }
  function renderBookings() {
    renderAdminShell('<div class="toolbar"><input id="booking-search" placeholder="Booking ID"><select id="booking-status"><option value="">All statuses</option><option>PendingPayment</option><option>Confirmed</option><option>Cancelled</option></select><button id="booking-filter">Search</button><button class="secondary" id="booking-create-open">Create booking</button></div><div id="booking-list"></div><div id="booking-create"></div>');
    var list=document.getElementById("booking-list"),filters={search:"",status:""};
    function reload(){filters={search:document.getElementById("booking-search").value.trim(),status:document.getElementById("booking-status").value};state.page=1;loadAdminBookings(list,filters);}
    document.getElementById("booking-filter").onclick=reload;
    document.getElementById("booking-search").onkeydown=function(e){if(e.key==="Enter")reload();};
    document.getElementById("booking-create-open").onclick=function(){drawAdminBookingCreate();};
    reload();
  }
  async function drawAdminBookingCreate() {
    var target=document.getElementById("booking-create");
    target.innerHTML='<div class="card"><h2>Create Booking for Customer</h2><p>Bookings created by staff use the same venue, slot, pricing, and applicant validations as public bookings.</p><div id="admin-create-form-wrap">Loading active venues…</div></div>';
    try{
      var venues=await api("/venues"),equipment=await api("/venues/equipment");
      target.dataset.equipment=JSON.stringify(equipment||[]);
      var active=venues||[];
      document.getElementById("admin-create-form-wrap").innerHTML='<form id="admin-create-form"><div class="form-row">'+selectField("Venue *","venueId",'<option value="">Select venue</option>'+active.map(function(v){return '<option value="'+v.venueId+'">'+esc(v.venueName)+'</option>';}).join(""))+
        selectField("Price item *","venuePricingId",'<option value="">Select a venue first</option>')+
        field("From Date *","fromDate","date",'required min="'+new Date().toISOString().slice(0,10)+'"')+
        field("To Date *","toDate","date",'required min="'+new Date().toISOString().slice(0,10)+'"')+
        '<fieldset><legend>Session(s) *</legend><label><input type="checkbox" name="admin-session" value="Morning"> Morning</label> <label><input type="checkbox" name="admin-session" value="Afternoon"> Afternoon</label> <label><input type="checkbox" name="admin-session" value="Evening"> Evening</label> <label><input type="checkbox" name="admin-session" value="FullDay"> Full Day</label></fieldset>'+
        field("Full Name *","fullName","text",'required minlength="3"')+field("Email *","email","email","required")+
        field("Mobile *","mobile","tel",'required pattern="[6-9][0-9]{9}" maxlength="10"')+
        field("Alternate Mobile","alternateMobile","tel",'pattern="[6-9][0-9]{9}" maxlength="10"')+
        field("Function Name *","functionName","text","required")+
        field("Expected Guests *","expectedGuests","number",'required min="1" max="10000"')+
        selectField("Function Type *","functionType",'<option value="">Select type</option>'+["Wedding","Reception","Birthday","Corporate Meeting","Conference","Exhibition","Cultural Event","Other"].map(function(x){return '<option>'+x+'</option>';}).join(""))+
        selectField("ID Proof Type *","idProofType",'<option value="">Select type</option><option>Aadhaar Card</option><option>PAN Card</option><option>Driving License</option>')+
        field("ID proof file * (PDF/JPG, max 5 MB)","idProof","file",'accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"')+
        textarea("Address","address",'rows="2"')+
        field("Bank Name *","bankName","text","required")+field("Account Holder Name *","accountHolderName","text","required")+
        field("Account Number *","accountNumber","text",'required minlength="9" maxlength="18"')+
        field("IFSC Code *","ifscCode","text",'required pattern="[A-Z]{4}0[A-Z0-9]{6}" maxlength="11"')+
        field("Branch Name *","branchName","text","required")+field("MICR Code","micrCode")+
        '</div><h3>Optional Equipment</h3><div id="admin-equipment" class="grid cols-3"></div><div class="actions"><button type="button" id="admin-create-summary" class="secondary">Calculate Amount</button><button type="submit" id="admin-create-submit" disabled>Create Booking</button><button type="button" class="secondary" id="admin-create-cancel">Close</button></div><div id="admin-create-result"></div></form>';
      var form=document.getElementById("admin-create-form"), venue=form.elements.venueId, prices=form.elements.venuePricingId, currentSummary=null;
      document.getElementById("admin-equipment").innerHTML=equipment.map(function(item){return '<div class="field"><label>'+esc(item.equipmentName)+' · '+money(item.amount)+' / '+esc(item.chargeUnit)+'</label><input type="number" name="equipment-'+item.id+'" min="0" step="1" value="0"></div>';}).join("");
      function selectedAdminSession(){
        var selected=checkedValues("admin-session");
        if(selected.indexOf("FullDay")>=0)return "FullDay";
        return ["Morning","Afternoon","Evening"].filter(function(item){return selected.indexOf(item)>=0;}).join(",");
      }
      function selectedAdminEquipment(){
        return equipment.map(function(item){var quantity=Math.max(0,Math.floor(Number(form.elements["equipment-"+item.id].value||0)));return quantity?{equipmentId:item.id,quantity:quantity}:null;}).filter(Boolean);
      }
      venue.onchange=async function(){try{var d=await api("/venues/"+venue.value+"/details");prices.innerHTML='<option value="">Select price item</option>'+(d.pricing||[]).map(function(p){return '<option value="'+p.id+'">'+esc(p.priceItemName)+' — '+money(p.amount)+'</option>';}).join("");currentSummary=null;document.getElementById("admin-create-submit").disabled=true;}catch(e){toast(e.message,"error");}};
      document.getElementById("admin-create-cancel").onclick=function(){target.innerHTML="";};
      document.getElementById("admin-create-summary").onclick=async function(){
        var session=selectedAdminSession();
        if(!venue.value||!prices.value||!formValue(form,"fromDate")||!formValue(form,"toDate")||formValue(form,"toDate")<formValue(form,"fromDate")||!session)return toast("Select venue, price, dates and at least one session.","error");
        try{
          var check=await api("/bookings/availability",{method:"POST",body:{venueId:Number(venue.value),fromDate:formValue(form,"fromDate"),toDate:formValue(form,"toDate")}});
          var slots=check.slots||[],sessions=session==="FullDay"?["FullDay"]:session.split(","),conflict=slots.some(function(s){return sessions.some(function(name){if(name==="FullDay")return s.fullDayStatus!=="Available";var x=(s.sessions||[]).find(function(t){return t.session===name;});return (x&&x.status||s[name.charAt(0).toLowerCase()+name.slice(1)+"Status"])!=="Available";});});
          if(conflict)throw new Error("Selected session is unavailable for one or more booking dates.");
          currentSummary=await api("/bookings/summary",{method:"POST",body:{venueId:Number(venue.value),venuePricingId:Number(prices.value),fromDate:formValue(form,"fromDate"),toDate:formValue(form,"toDate"),session:session,equipment:selectedAdminEquipment()}});
          document.getElementById("admin-create-result").innerHTML='<div class="alert success">Amount to be collected: <strong>'+money(currentSummary.grandTotal)+'</strong>. '+esc(currentSummary.totalDays)+' day(s).</div>';
          document.getElementById("admin-create-submit").disabled=false;
        }catch(e){document.getElementById("admin-create-result").innerHTML=messageBox(e.message,"error");}
      };
      form.onsubmit=async function(event){
        event.preventDefault();
        var mobile=formValue(form,"mobile"),email=formValue(form,"email"),name=formValue(form,"fullName"),address=formValue(form,"address")||"",proof=form.elements.idProof.files[0];
        if(name.length<3||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[6-9]\d{9}$/.test(mobile)||!formValue(form,"functionName")||!formValue(form,"functionType")||Number(formValue(form,"expectedGuests"))<1||Number(formValue(form,"expectedGuests"))>10000||!proof)return toast("Complete applicant details and attach an ID proof.","error");
        if(!["application/pdf","image/jpeg"].includes(proof.type)||proof.size>5*1024*1024)return toast("Attach a PDF or JPG ID proof of 5 MB or less.","error");
        if(!currentSummary)return toast("Calculate the amount and validate availability first.","error");
        try{
          var fd=new FormData();fd.append("file",proof);var uploaded=await api("/upload",{method:"POST",body:fd});
          var payload={venueId:Number(venue.value),venuePricingId:Number(prices.value),fromDate:formValue(form,"fromDate"),toDate:formValue(form,"toDate"),session:selectedAdminSession(),equipment:selectedAdminEquipment(),applicant:{fullName:name,email:email,mobile:mobile,alternateMobile:formValue(form,"alternateMobile"),address:address,functionName:formValue(form,"functionName"),functionType:formValue(form,"functionType"),expectedGuests:Number(formValue(form,"expectedGuests")),idProofType:formValue(form,"idProofType"),idProofFile:uploaded.filePath},bankDetail:{bankName:formValue(form,"bankName"),accountHolderName:formValue(form,"accountHolderName"),accountNumber:formValue(form,"accountNumber"),ifscCode:formValue(form,"ifscCode").toUpperCase(),branchName:formValue(form,"branchName"),micrCode:formValue(form,"micrCode")}};
          var result=await api("/bookings/admin",{method:"POST",body:payload});toast("Booking "+result.bookingNumber+" created. Payment remains pending.","success");target.innerHTML='<div class="alert success">Booking created: <strong>'+esc(result.bookingNumber)+'</strong> · '+badge(result.status)+'</div>';setTimeout(function(){location.reload();},1400);
        }catch(e){document.getElementById("admin-create-result").innerHTML=messageBox(e.message,"error");}
      };
    }catch(e){target.innerHTML=messageBox(e.message,"error");}
  }
  function renderSlotAvailability() {
    renderAdminShell('<div class="panel"><div class="form-row">'+selectField("Venue","venueId","<option>Loading…</option>")+field("From Date","fromDate","date",'value="'+new Date().toISOString().slice(0,10)+'"')+field("To Date","toDate","date",'value="'+new Date().toISOString().slice(0,10)+'"')+'</div><button id="check-slots">Check Availability</button><div id="slot-results"></div></div><section class="panel" style="margin-top:18px"><h2>Session Booking Capacity</h2><p class="muted">Changing capacities is restricted to Admin accounts. Full Day bookings remain exclusive.</p><div class="form-row">'+selectField("Session","capacitySession",'<option>Morning</option><option>Afternoon</option><option>Evening</option>')+field("Capacity","capacity","number",'min="1" value="30"')+'</div><button id="save-capacity">Update Capacity</button></section>');
    var venue=document.querySelector('.admin-main [name="venueId"]');
    api("/venues/admin/all").then(function(items){venue.innerHTML=(items||[]).filter(function(v){return v.status!=="Removed";}).map(function(v){return '<option value="'+v.venueId+'">'+esc(v.venueName)+'</option>';}).join("");});
    document.getElementById("check-slots").onclick=async function(){
      if(!venue.value)return toast("Select a venue.","error");
      try{var r=await api("/bookings/availability",{method:"POST",body:{venueId:Number(venue.value),fromDate:document.querySelector('.admin-main [name="fromDate"]').value,toDate:document.querySelector('.admin-main [name="toDate"]').value}});
        document.getElementById("slot-results").innerHTML='<div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Date</th><th>Morning</th><th>Afternoon</th><th>Evening</th><th>Full Day</th><th>Available / Booked</th></tr></thead><tbody>'+(r.slots||[]).map(function(s){return '<tr><td>'+fmtDate(s.date)+'</td><td>'+badge(s.morningStatus)+'</td><td>'+badge(s.afternoonStatus)+'</td><td>'+badge(s.eveningStatus)+'</td><td>'+badge(s.fullDayStatus)+'</td><td>'+esc(s.availableSlots)+' / '+esc(s.bookedSlots)+'</td></tr>';}).join("")+'</tbody></table></div>';
      }catch(e){document.getElementById("slot-results").innerHTML=messageBox(e.message,"error");}
    };
    document.getElementById("save-capacity").onclick=async function(){
      var role=localStorage.getItem("hsm_role");if(role!=="Admin")return toast("Only Admin users can change booking capacity.","error");
      try{await api("/venues/"+venue.value+"/booking-capacity",{method:"PUT",body:{session:document.querySelector('.admin-main [name="capacitySession"]').value,capacity:Number(document.querySelector('.admin-main [name="capacity"]').value)}});toast("Booking capacity updated.","success");}
      catch(e){toast(e.message,"error");}
    };
  }
  function renderPayments() {
    renderAdminShell('<div class="alert">Only bookings awaiting payment are shown. Verify the bank transaction before confirming; successful verification confirms the booking automatically.</div><div id="payments-list">Loading…</div>');
    async function load(page) {
      try{
        var r=await api("/bookings?page="+(page||1)+"&pageSize=15&status=PendingPayment"),items=r.items||[];
        document.getElementById("payments-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Booking ID</th><th>Applicant</th><th>Venue</th><th>Amount Due</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+items.map(function(b){return '<tr><td>'+esc(b.bookingNumber)+'</td><td>'+esc(b.applicantName)+'<br>'+esc(b.applicantMobile)+'</td><td>'+esc(b.venueName)+'<br>'+esc(b.priceItemName)+'</td><td>'+money(b.grandTotal)+'</td><td>'+badge("Pending")+'</td><td>'+fmtDate(b.createdAt)+'</td><td><button data-verify="'+b.id+'">Verify</button> <a class="button secondary" href="/admin/receipts?bookingNumber='+encodeURIComponent(b.bookingNumber)+'">Receipt</a></td></tr>';}).join("")||'<tr><td colspan="7">No bookings awaiting payment verification.</td></tr>'+'</tbody></table></div><div class="pagination">Page '+(page||1)+' of '+(r.totalPages||1)+' <button class="secondary" id="payments-next" '+((page||1)>=(r.totalPages||1)?"disabled":"")+'>Next</button></div>';
        document.querySelectorAll("[data-verify]").forEach(function(button){button.onclick=async function(){
          var ref=prompt("Transaction Reference Number (required):");if(ref===null||!ref.trim())return;
          var date=prompt("Payment Date (YYYY-MM-DD):",new Date().toISOString().slice(0,10));if(!date)return;
          var remarks=prompt("Remarks (optional):","")||"";
          try{await api("/payments/verify",{method:"POST",body:{bookingId:Number(button.dataset.verify),transactionRef:ref.trim(),paymentDate:date,remarks:remarks}});toast("Payment verified — booking confirmed automatically.","success");load(page);}
          catch(e){toast(e.message,"error");}
        };});
        document.getElementById("payments-next").onclick=function(){load((page||1)+1);};
      }catch(e){document.getElementById("payments-list").innerHTML=messageBox(e.message,"error");}
    }
    load(1);
  }
  function renderVenues() {
    renderAdminShell('<div class="toolbar"><button id="venue-add">Add Venue</button></div><div id="venues-list">Loading…</div>');
    async function load(){
      try{
        var items=await api("/venues/admin/all");
        document.getElementById("venues-list").innerHTML=(items||[]).map(function(v){
          return '<article class="card" style="margin-bottom:16px"><div class="split"><div><h2>'+esc(v.venueName)+'</h2><p>'+esc(v.description||"")+' · Capacity '+esc(v.capacity||"—")+' · '+badge(v.status)+'</p></div><div class="actions">'+(v.status==="Removed"?'<button data-restore="'+v.venueId+'">Restore</button>':'<button class="secondary" data-status="'+v.venueId+'" data-current="'+esc(v.status)+'">Change Status</button><button class="danger" data-remove="'+v.venueId+'">Remove Venue</button>')+'</div></div><div class="table-wrap"><table><thead><tr><th>Price Item</th><th>Unit</th><th>Amount</th><th>Deposit</th><th>Weekend Surcharge</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+(v.pricing||[]).map(function(p){return '<tr><td>'+esc(p.priceItemName)+'</td><td>'+esc(p.chargeUnit)+'</td><td>'+money(p.amount)+'</td><td>'+money(p.refundableDeposit)+'</td><td>'+money(p.holidaySurchargeAmount)+'</td><td>'+esc(p.cgstPercent)+'% + '+esc(p.sgstPercent)+'%</td><td>'+badge(p.isActive?"Active":"Inactive")+'</td><td><button class="secondary" data-price-edit="'+p.id+'" data-venue="'+v.venueId+'" data-pricing="'+esc(JSON.stringify(p))+'">Edit</button> <button class="secondary" data-price-toggle="'+p.id+'" data-active="'+p.isActive+'" data-pricing="'+esc(JSON.stringify(p))+'">'+(p.isActive?"Deactivate":"Activate")+'</button></td></tr>';}).join("")+'</tbody></table></div><button class="secondary" data-price-add="'+v.venueId+'">Add Price Item</button></article>';
        }).join("")||'<p>No venues found.</p>';
        document.querySelectorAll("[data-status]").forEach(function(btn){btn.onclick=async function(){var next=btn.dataset.current==="Active"?"Closed":"Active";try{await api("/venues/"+btn.dataset.status+"/status",{method:"PUT",body:{status:next}});load();}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-restore]").forEach(function(btn){btn.onclick=async function(){try{await api("/venues/"+btn.dataset.restore+"/status",{method:"PUT",body:{status:"Active"}});load();}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-remove]").forEach(function(btn){btn.onclick=async function(){if(!confirm("Remove this venue and deactivate its rates?"))return;try{await api("/venues/"+btn.dataset.remove,{method:"DELETE"});toast("Venue removed.","success");load();}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-price-toggle]").forEach(function(btn){btn.onclick=async function(){var active=btn.dataset.active==="true";if(active){try{await api("/venues/pricing/"+btn.dataset.priceToggle,{method:"DELETE"});load();}catch(e){toast(e.message,"error");}}else{var data=JSON.parse(btn.dataset.pricing||"{}");try{await api("/venues/pricing/"+btn.dataset.priceToggle,{method:"PUT",body:Object.assign(data,{isActive:true})});load();}catch(e){toast(e.message,"error");}}};});
        document.querySelectorAll("[data-price-edit]").forEach(function(btn){btn.onclick=async function(){var p=JSON.parse(btn.dataset.pricing),amount=prompt("Amount:",p.amount),deposit=prompt("Refundable deposit:",p.refundableDeposit),surcharge=prompt("Holiday surcharge:",p.holidaySurchargeAmount),cgst=prompt("CGST percentage:",p.cgstPercent),sgst=prompt("SGST percentage:",p.sgstPercent);if(amount===null||deposit===null||surcharge===null||cgst===null||sgst===null)return;var values=[amount,deposit,surcharge,cgst,sgst].map(Number);if(values.some(function(value){return !Number.isFinite(value)||value<0;}))return toast("Pricing values must be valid non-negative numbers.","error");try{await api("/venues/pricing/"+p.id,{method:"PUT",body:Object.assign(p,{amount:values[0],refundableDeposit:values[1],holidaySurchargeAmount:values[2],cgstPercent:values[3],sgstPercent:values[4]})});toast("Pricing updated.","success");load();}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-price-add]").forEach(function(btn){btn.onclick=async function(){var name=prompt("Price item name:");if(!name||!name.trim())return;var unit=prompt("Charge unit (for example Session or Day):","Session");if(!unit||!unit.trim())return;var amount=prompt("Amount:","0"),deposit=prompt("Refundable deposit:","0"),surcharge=prompt("Holiday surcharge:","0"),cgst=prompt("CGST percentage:","9"),sgst=prompt("SGST percentage:","9");if(amount===null||deposit===null||surcharge===null||cgst===null||sgst===null)return;var values=[amount,deposit,surcharge,cgst,sgst].map(Number);if(values.some(function(value){return !Number.isFinite(value)||value<0;}))return toast("Pricing values must be valid non-negative numbers.","error");try{await api("/venues/"+btn.dataset.priceAdd+"/pricing",{method:"POST",body:{priceItemName:name.trim(),chargeUnit:unit.trim(),amount:values[0],refundableDeposit:values[1],holidaySurchargeAmount:values[2],cgstPercent:values[3],sgstPercent:values[4]}});toast("Price item added.","success");load();}catch(e){toast(e.message,"error");}};});
      }catch(e){document.getElementById("venues-list").innerHTML=messageBox(e.message,"error");}
    }
    document.getElementById("venue-add").onclick=async function(){
      var venueName=prompt("Venue name:");if(!venueName||!venueName.trim())return;
      var description=prompt("Description:","")||"",capacity=prompt("Capacity (optional):",""),location=prompt("Location:","")||"";
      var priceItemName=prompt("Initial price item:");if(!priceItemName||!priceItemName.trim())return;
      var chargeUnit=prompt("Charge unit:","Per slot");if(!chargeUnit||!chargeUnit.trim())return;
      var amount=prompt("Amount:","0"),deposit=prompt("Refundable deposit:","0"),surcharge=prompt("Holiday surcharge:","0"),cgst=prompt("CGST percentage:","9"),sgst=prompt("SGST percentage:","9");
      if(amount===null||deposit===null||surcharge===null||cgst===null||sgst===null)return;
      var values=[amount,deposit,surcharge,cgst,sgst].map(Number),venueCapacity=capacity.trim()===""?null:Number(capacity);
      if(values.some(function(value){return !Number.isFinite(value)||value<0;})||(venueCapacity!==null&&(!Number.isInteger(venueCapacity)||venueCapacity<0)))return toast("Capacity and pricing values must be valid non-negative numbers.","error");
      try{await api("/venues/admin",{method:"POST",body:{venueName:venueName.trim(),description:description.trim(),capacity:venueCapacity,location:location.trim(),initialPricing:{priceItemName:priceItemName.trim(),chargeUnit:chargeUnit.trim(),amount:values[0],refundableDeposit:values[1],holidaySurchargeAmount:values[2],cgstPercent:values[3],sgstPercent:values[4]}}});toast("Venue created.","success");load();}catch(e){toast(e.message,"error");}
    };
    load();
  }
  function renderHolidays() {
    renderAdminShell('<div class="toolbar"><button id="holiday-add">Add Holiday</button></div><div id="holiday-list">Loading…</div>');
    async function load(){
      try{var items=await api("/holidays");document.getElementById("holiday-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+(items||[]).map(function(h){return '<tr><td>'+fmtDate(h.holidayDate)+'</td><td>'+esc(h.name)+'</td><td>'+esc(h.description)+'</td><td>'+badge(h.isActive?"Active":"Inactive")+'</td><td><button class="secondary" data-holiday-edit="'+h.id+'" data-holiday="'+esc(JSON.stringify(h))+'">Edit</button> <button class="danger" data-holiday-delete="'+h.id+'">Delete</button></td></tr>';}).join("")||'<tr><td colspan="5">No holidays.</td></tr>'+'</tbody></table></div>';
        document.querySelectorAll("[data-holiday-edit]").forEach(function(btn){btn.onclick=async function(){var h=JSON.parse(btn.dataset.holiday),name=prompt("Holiday name:",h.name),date=prompt("Holiday date (YYYY-MM-DD):",String(h.holidayDate).slice(0,10));if(name===null||date===null)return;var description=prompt("Description:",h.description||"");try{await api("/holidays/"+h.id,{method:"PUT",body:{name:name,holidayDate:date,description:description,isActive:h.isActive}});load();}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-holiday-delete]").forEach(function(btn){btn.onclick=async function(){if(!confirm("Delete this holiday?"))return;try{await api("/holidays/"+btn.dataset.holidayDelete,{method:"DELETE"});load();}catch(e){toast(e.message,"error");}};});
      }catch(e){document.getElementById("holiday-list").innerHTML=messageBox(e.message,"error");}
    }
    document.getElementById("holiday-add").onclick=async function(){var name=prompt("Holiday name:");if(!name)return;var date=prompt("Holiday date (YYYY-MM-DD):",new Date().toISOString().slice(0,10));if(!date)return;var description=prompt("Description:","")||"";try{await api("/holidays",{method:"POST",body:{name:name,holidayDate:date,description:description,isActive:true}});toast("Holiday added.","success");load();}catch(e){toast(e.message,"error");}};
    load();
  }
  function renderGalleryAdmin() {
    renderAdminShell('<div class="toolbar"><button class="secondary" data-gallery-filter="Photo">Photos</button><button class="secondary" data-gallery-filter="Video">Videos</button><button id="gallery-add">Add Gallery Item</button></div><div id="gallery-admin-list">Loading…</div>');
    var activeType="Photo",galleryItems=[];
    function drawItems(){
      var items=galleryItems.filter(function(item){return item.mediaType===activeType;});
      document.getElementById("gallery-admin-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Title</th><th>Description</th><th>Type</th><th>Media</th><th>Display Order</th><th>Active</th><th>Actions</th></tr></thead><tbody>'+(items.map(function(i){return '<tr><td>'+esc(i.title)+'</td><td>'+esc(i.description||"")+'</td><td>'+esc(i.mediaType)+'</td><td>'+esc(i.filePath||i.videoURL||"")+'</td><td>'+esc(i.displayOrder||0)+'</td><td>'+badge(i.isActive?"Active":"Inactive")+'</td><td><button class="danger" data-gallery-delete="'+i.id+'">Delete</button></td></tr>';}).join("")||'<tr><td colspan="7">No '+esc(activeType.toLowerCase())+'s available.</td></tr>')+'</tbody></table></div>';
      document.querySelectorAll("[data-gallery-delete]").forEach(function(btn){btn.onclick=async function(){if(!confirm("Delete this gallery item?"))return;try{await api("/gallery/"+btn.dataset.galleryDelete,{method:"DELETE"});toast("Gallery item deleted.","success");await load();}catch(e){toast(e.message,"error");}};});
    }
    async function load(){try{galleryItems=await api("/gallery")||[];drawItems();}catch(e){document.getElementById("gallery-admin-list").innerHTML=messageBox(e.message,"error");}}
    document.querySelectorAll("[data-gallery-filter]").forEach(function(button){button.onclick=function(){activeType=button.dataset.galleryFilter;drawItems();};});
    document.getElementById("gallery-add").onclick=async function(){
      var title=prompt("Title:");if(!title||!title.trim())return;
      var mediaType=prompt("Media type (Photo or Video):","Photo");if(!mediaType)return;
      mediaType=mediaType.trim();
      if(mediaType!=="Photo"&&mediaType!=="Video")return toast("Choose Photo or Video as the media type.","error");
      var url=prompt(mediaType==="Video"?"YouTube / video URL:":"Image file path / URL:");if(!url||!url.trim())return;
      var description=prompt("Description:","")||"",displayOrder=prompt("Display order:","0");
      if(displayOrder===null||!Number.isInteger(Number(displayOrder))||Number(displayOrder)<0)return toast("Display order must be a non-negative whole number.","error");
      try{await api("/gallery",{method:"POST",body:{title:title.trim(),mediaType:mediaType,description:description.trim(),filePath:mediaType==="Photo"?url.trim():null,videoURL:mediaType==="Video"?url.trim():null,thumbnailPath:null,displayOrder:Number(displayOrder),isActive:true}});toast("Gallery item added.","success");activeType=mediaType;await load();}catch(e){toast(e.message,"error");}
    };
    load();
  }
  function renderNoticesAdmin() {
    renderAdminShell('<div class="toolbar"><button id="notice-add">Publish Notice</button></div><div id="notice-list">Loading…</div>');
    async function load(){try{var items=await api("/notices");document.getElementById("notice-list").innerHTML=(items||[]).map(function(n){return '<article class="card" style="margin-bottom:12px"><div class="split"><h2>'+esc(n.title)+'</h2>'+badge(n.isActive?"Active":"Inactive")+'</div><p>'+esc(n.content)+'</p><p>'+ (n.isImportant?'<span class="badge bad">Important</span> ':"")+'<span class="muted">Published '+fmtDate(n.publishDate)+' · expires '+fmtDate(n.expiryDate)+'</span></p><button class="secondary" data-notice-edit="'+n.id+'" data-notice="'+esc(JSON.stringify(n))+'">Edit</button> <button class="danger" data-notice-delete="'+n.id+'">Delete</button></article>';}).join("")||'<p>No notices.</p>';document.querySelectorAll("[data-notice-edit]").forEach(function(btn){btn.onclick=function(){editNotice(JSON.parse(btn.dataset.notice));};});document.querySelectorAll("[data-notice-delete]").forEach(function(btn){btn.onclick=async function(){if(!confirm("Delete this notice?"))return;try{await api("/notices/"+btn.dataset.noticeDelete,{method:"DELETE"});toast("Notice deleted.","success");await load();}catch(e){toast(e.message,"error");}};});}catch(e){document.getElementById("notice-list").innerHTML=messageBox(e.message,"error");}}
    function editNotice(notice){
      var item=notice||{title:"",content:"",isImportant:false,publishDate:new Date().toISOString().slice(0,10),expiryDate:"",isActive:true};
      showModal('<h2>'+(notice?"Edit Notice":"Publish Notice")+'</h2><form id="notice-form"><div class="form-row">'+field("Notice Title *","title","text",'required value="'+esc(item.title||"")+'"')+field("Publish Date *","publishDate","date",'required value="'+esc(String(item.publishDate||"").slice(0,10))+'"')+field("Expiry Date","expiryDate","date",'value="'+esc(String(item.expiryDate||"").slice(0,10))+'"')+'</div>'+textarea("Content *","content",'required minlength="1" rows="5"')+'<div class="form-row"><label><input type="checkbox" name="isImportant" '+(item.isImportant?"checked":"")+'> Mark as important</label><label><input type="checkbox" name="isActive" '+(item.isActive?"checked":"")+'> Active</label></div><div class="actions"><button type="submit">'+(notice?"Update Notice":"Publish Notice")+'</button></div></form>');
      var form=document.getElementById("notice-form");form.elements.content.value=item.content||"";
      form.onsubmit=async function(event){event.preventDefault();var title=formValue(form,"title"),content=formValue(form,"content"),publishDate=formValue(form,"publishDate"),expiryDate=formValue(form,"expiryDate");if(!title||!content||!publishDate||(expiryDate&&expiryDate<publishDate))return toast("Enter a title, content, valid publish date, and an expiry date on or after the publish date.","error");var payload={title:title,content:content,isImportant:form.elements.isImportant.checked,publishDate:publishDate,expiryDate:expiryDate||null,isActive:form.elements.isActive.checked};try{await api("/notices"+(notice?"/"+notice.id:""),{method:notice?"PUT":"POST",body:payload});document.querySelector(".modal").remove();toast(notice?"Notice updated.":"Notice published.","success");await load();}catch(e){toast(e.message,"error");}};
    }
    document.getElementById("notice-add").onclick=function(){editNotice(null);};
    load();
  }
  function renderComplaints() {
    renderAdminShell('<div class="toolbar"><select id="complaint-filter"><option value="">All statuses</option><option>Open</option><option>InProgress</option><option>Resolved</option><option>Closed</option></select><button id="complaint-refresh">Refresh</button></div><div id="complaints-list">Loading…</div>');
    async function load(){try{var status=document.getElementById("complaint-filter").value,items=await api("/complaints"+(status?"?status="+encodeURIComponent(status):""));document.getElementById("complaints-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Booking ID</th><th>Subject</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead><tbody>'+(items||[]).map(function(c){return '<tr><td>'+esc(c.applicantName)+'<br>'+esc(c.mobile)+'</td><td>'+esc(c.bookingId||"N/A")+'</td><td>'+esc(c.subject)+'<br><small>'+esc(c.description)+'</small></td><td>'+badge(c.status)+'</td><td>'+fmtDate(c.createdAt)+'</td><td>'+(c.status==="Resolved"||c.status==="Closed"?esc(c.resolution||"Resolved"):'<button data-complaint="'+c.id+'">Resolve</button>')+'</td></tr>';}).join("")||'<tr><td colspan="6">No complaints.</td></tr>'+'</tbody></table></div>';document.querySelectorAll("[data-complaint]").forEach(function(btn){btn.onclick=async function(){var resolution=prompt("Resolution details:");if(!resolution||!resolution.trim())return;try{await api("/complaints/"+btn.dataset.complaint+"/resolve",{method:"PUT",body:{resolution:resolution.trim()}});toast("Complaint resolved.","success");load();}catch(e){toast(e.message,"error");}};});}catch(e){document.getElementById("complaints-list").innerHTML=messageBox(e.message,"error");}}
    document.getElementById("complaint-filter").onchange=load;document.getElementById("complaint-refresh").onclick=load;load();
  }
  function renderCancellationsAdmin() {
    renderAdminShell('<div id="cancellations-list">Loading…</div>');
    api("/cancellations").then(function(items){
      document.getElementById("cancellations-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Booking ID</th><th>Requested By</th><th>Reason</th><th>Refund Amount</th><th>Status</th><th>Request Date</th><th></th></tr></thead><tbody>'+(items||[]).map(function(c){return '<tr><td>'+esc(c.booking&&c.booking.bookingNumber||c.bookingId)+'</td><td>'+esc(c.requestedBy)+'</td><td>'+esc(c.reason)+'</td><td>'+money(c.refundAmount)+'</td><td>'+badge(c.refundStatus)+'</td><td>'+fmtDate(c.createdAt)+'</td><td>'+(c.refundStatus==="Pending"?'<button data-cancellation-process="'+c.id+'" data-amount="'+c.refundAmount+'">Process</button>':"")+'</td></tr>';}).join("")||'<tr><td colspan="7">No cancellations.</td></tr>'+'</tbody></table></div>';
      document.querySelectorAll("[data-cancellation-process]").forEach(function(btn){btn.onclick=async function(){var amount=prompt("Refund amount:",btn.dataset.amount||"0");if(amount===null)return;try{await api("/cancellations/"+btn.dataset.cancellationProcess+"/process",{method:"PUT",body:{refundAmount:Number(amount)}});toast("Cancellation processed.","success");location.reload();}catch(e){toast(e.message,"error");}};});
    }).catch(function(e){document.getElementById("cancellations-list").innerHTML=messageBox(e.message,"error");});
  }
  function renderRefundsAdmin() {
    var role=localStorage.getItem("hsm_role");
    renderAdminShell('<div class="alert">'+(role==="Clerk"?"Review and recommend refund applications for Admin decision.":"Approve or reject refund applications after Clerk review.")+'</div><div id="refund-admin-list">Loading…</div>');
    async function load(){
      try{
        var items=await api("/refunds");
        document.getElementById("refund-admin-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Refund Request</th><th>Application</th><th>Applicant / Contact</th><th>Venue / Booking</th><th>Amount</th><th>Request Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+(items||[]).map(function(r){
          var actions='<button class="secondary" data-refund-view="'+r.id+'">Details</button>';
          if(role==="Clerk"&&r.status==="Requested")actions+=' <button data-refund-action="verify" data-id="'+r.id+'">Start Review</button>';
          if(role==="Clerk"&&r.status==="Under Verification")actions+=' <button data-refund-action="review" data-id="'+r.id+'" data-amount="'+(r.refundAmount||0)+'">Process &amp; Recommend</button>';
          if(role==="Admin"&&r.status==="Clerk Processed")actions+=' <button data-refund-action="approve" data-id="'+r.id+'" data-amount="'+(r.refundAmount||0)+'">Approve</button> <button class="danger" data-refund-action="reject" data-id="'+r.id+'">Reject</button>';
          if(role==="Clerk"&&r.status==="Approved")actions+=' <button data-refund-action="start-processing" data-id="'+r.id+'">Start Processing</button>';
          if(role==="Clerk"&&r.status==="Processing")actions+=' <button data-refund-action="process" data-id="'+r.id+'">Mark Processed</button>';
          return '<tr><td>'+esc(r.refundRequestNumber)+'</td><td>'+esc(r.applicationNumber)+'</td><td>'+esc(r.applicantName)+'<br>'+esc(r.contactNumber)+'</td><td>'+esc(r.venue)+'<br>'+fmtDate(r.fromDate)+' · '+esc(r.session)+'</td><td>'+money(r.refundAmount)+'</td><td>'+fmtDate(r.requestedAt)+'</td><td>'+badge(r.status)+'</td><td>'+actions+'</td></tr>';
        }).join("")||'<tr><td colspan="8">No refund requests.</td></tr>'+'</tbody></table></div>';
        document.querySelectorAll("[data-refund-view]").forEach(function(btn){btn.onclick=async function(){var id=btn.dataset.refundView,r=(items||[]).find(function(x){return String(x.id)===String(id);});try{var history=await api("/refunds/"+id+"/history");showModal('<h2>Refund Request '+esc(r.refundRequestNumber)+'</h2><div class="grid cols-2"><p>Applicant<br><strong>'+esc(r.applicantName)+'</strong></p><p>Contact<br><strong>'+esc(r.contactNumber)+'</strong></p><p>Venue<br><strong>'+esc(r.venue)+'</strong></p><p>Booking Date / Session<br><strong>'+fmtDate(r.fromDate)+' – '+fmtDate(r.toDate)+' · '+esc(r.session)+'</strong></p><p>Booking Amount<br><strong>'+money(r.bookingAmount)+'</strong></p><p>Refund Amount<br><strong>'+money(r.refundAmount)+'</strong></p><p>Status<br><strong>'+esc(r.status)+'</strong></p><p>Bank Details<br><strong>'+esc(r.bankDetails&&r.bankDetails.bankName||"—")+' · '+esc(r.bankDetails&&r.bankDetails.accountHolderName||"")+' · '+esc(r.bankDetails&&r.bankDetails.accountNumber||"")+'</strong></p></div><h3>Payment References</h3><pre>'+esc(JSON.stringify(r.paymentReferences||[],null,2))+'</pre><h3>Status History</h3><pre>'+esc(JSON.stringify(history||[],null,2))+'</pre>');}catch(e){toast(e.message,"error");}};});
        document.querySelectorAll("[data-refund-action]").forEach(function(btn){btn.onclick=async function(){
          var id=btn.dataset.id,action=btn.dataset.refundAction,body={},amount;
          try{
            if(action==="review"){amount=prompt("Recommended refund amount:",btn.dataset.amount);if(amount===null)return;body={refundAmount:Number(amount),recommendation:prompt("Recommendation:","")||""};}
            if(action==="approve"){amount=prompt("Approved refund amount:",btn.dataset.amount);if(amount===null)return;body={refundAmount:Number(amount)};}
            if(action==="reject"){body={reason:prompt("Rejection reason:","")||""};if(!body.reason.trim())return toast("A rejection reason is required.","error");}
            if(action==="verify")await api("/refunds/"+id+"/verify",{method:"PUT"});
            else if(action==="review")await api("/refunds/"+id+"/review",{method:"PUT",body:body});
            else if(action==="approve")await api("/refunds/"+id+"/approve",{method:"PUT",body:body});
            else if(action==="reject")await api("/refunds/"+id+"/reject",{method:"PUT",body:body});
            else if(action==="start-processing")await api("/refunds/"+id+"/start-processing",{method:"PUT"});
            else if(action==="process"){var ref=prompt("Refund transaction reference (optional):","")||"";await api("/refunds/"+id+"/process",{method:"PUT",body:{refundTransactionReference:ref}});}
            toast("Refund request updated.","success");load();
          }catch(e){toast(e.message,"error");}
        };});
      }catch(e){document.getElementById("refund-admin-list").innerHTML=messageBox(e.message,"error");}
    }
    load();
  }
  function showModal(html) {
    var box=document.createElement("div");box.className="modal";box.innerHTML='<div class="modal-content"><div class="right"><button class="secondary" data-close>Close</button></div>'+html+'</div>';document.body.appendChild(box);box.querySelector("[data-close]").onclick=function(){box.remove();};box.onclick=function(e){if(e.target===box)box.remove();};
  }
  function renderUsers() {
    renderAdminShell('<div class="toolbar"><button id="user-add">Add User</button></div><div id="users-list">Loading…</div>');
    async function load(){try{var values=await Promise.all([api("/users"),api("/users/roles")]),users=values[0],roles=values[1];document.getElementById("users-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Mobile</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>'+(users||[]).map(function(u){return '<tr><td>'+esc(u.fullName)+'</td><td>'+esc(u.email)+'</td><td>'+esc(u.mobile)+'</td><td>'+esc(u.roleName||u.role&&u.role.name)+'</td><td>'+badge(u.isActive?"Active":"Inactive")+'</td><td>'+fmtDate(u.createdAt)+'</td><td><button class="secondary" data-user-edit="'+u.id+'" data-user="'+esc(JSON.stringify(u))+'">Edit</button> <button data-user-toggle="'+u.id+'" data-user="'+esc(JSON.stringify(u))+'">'+(u.isActive?"Deactivate":"Activate")+'</button></td></tr>';}).join("")||'<tr><td colspan="7">No users.</td></tr>'+'</tbody></table></div>';
      document.querySelectorAll("[data-user-toggle]").forEach(function(btn){btn.onclick=async function(){var u=JSON.parse(btn.dataset.user);try{await api("/users/"+u.id,{method:"PUT",body:{fullName:u.fullName,mobile:u.mobile,roleId:u.roleId,isActive:!u.isActive}});load();}catch(e){toast(e.message,"error");}};});
      document.querySelectorAll("[data-user-edit]").forEach(function(btn){btn.onclick=function(){var u=JSON.parse(btn.dataset.user);userForm(roles,u,load);};});
    }catch(e){document.getElementById("users-list").innerHTML=messageBox(e.message,"error");}}
    function userForm(roles,user,reload){
      var isEdit=!!user,formHtml='<form id="user-form"><div class="form-row">'+field("Full Name *","fullName","text","required")+field("Email *","email","email","required")+field("Mobile *","mobile","tel","required")+
        selectField("Role *","roleId",(roles||[]).map(function(r){return '<option value="'+r.id+'" '+(Number(user&&user.roleId)===Number(r.id)?"selected":"")+'>'+esc(r.name)+'</option>';}).join(""))+
        (isEdit?"":field("Password * (min 8 characters)","password","password",'required minlength="8"'))+'</div><div class="actions"><button type="submit">'+(isEdit?"Update":"Create User")+'</button></div></form>';
      showModal(formHtml);var f=document.getElementById("user-form");
      if(user){f.elements.fullName.value=user.fullName;f.elements.email.value=user.email;f.elements.mobile.value=user.mobile;}
      f.onsubmit=async function(e){e.preventDefault();var payload={fullName:formValue(f,"fullName"),email:formValue(f,"email"),mobile:formValue(f,"mobile"),roleId:Number(formValue(f,"roleId")),isActive:user?user.isActive:true};if(!isEdit)payload.password=formValue(f,"password");try{await api("/users"+(isEdit?"/"+user.id:""),{method:isEdit?"PUT":"POST",body:payload});toast(isEdit?"User updated.":"User created.","success");document.querySelector(".modal").remove();reload();}catch(error){toast(error.message,"error");}};
    }
    document.getElementById("user-add").onclick=async function(){try{var roles=await api("/users/roles");userForm(roles,null,load);}catch(e){toast(e.message,"error");}};
    load();
  }
  function renderAudit() {
    renderAdminShell('<form class="toolbar" id="audit-form"><input name="fromDate" type="date" aria-label="From date"><input name="toDate" type="date" aria-label="To date"><input name="tableName" placeholder="Table"><input name="action" placeholder="Action"><input name="search" placeholder="Search"><button>Apply Filters</button></form><div id="audit-list">Loading…</div>');
    var form=document.getElementById("audit-form"),page=1;
    async function load(){var p=new URLSearchParams({page:String(page),pageSize:"25"});["fromDate","toDate","tableName","action","search"].forEach(function(k){if(form.elements[k].value)p.set(k,form.elements[k].value);});try{var r=await api("/audit-logs?"+p.toString()),items=r.items||[];document.getElementById("audit-list").innerHTML='<div class="table-wrap"><table><thead><tr><th>Date / User</th><th>Action</th><th>Table</th><th>Record</th><th>Old Values</th><th>New Values</th><th>IP Address</th></tr></thead><tbody>'+(items||[]).map(function(a){return '<tr><td>'+fmtDate(a.createdAt)+'<br>'+esc(a.userName)+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.tableName)+'</td><td>'+esc(a.recordId||"—")+'</td><td><pre>'+esc(a.oldValues||"—")+'</pre></td><td><pre>'+esc(a.newValues||"—")+'</pre></td><td>'+esc(a.ipAddress||"—")+'</td></tr>';}).join("")||'<tr><td colspan="7">No audit records.</td></tr>'+'</tbody></table></div><div class="pagination"><button class="secondary" id="audit-prev" '+(page<=1?"disabled":"")+'>Previous</button> Page '+page+' <button class="secondary" id="audit-next" '+(items.length<25?"disabled":"")+'>Next</button></div>';document.getElementById("audit-prev").onclick=function(){page=Math.max(1,page-1);load();};document.getElementById("audit-next").onclick=function(){page++;load();};}catch(e){document.getElementById("audit-list").innerHTML=messageBox(e.message,"error");}}
    form.onsubmit=function(e){e.preventDefault();page=1;load();};load();
  }
  function renderReceipts() {
    renderAdminShell('<form id="receipt-search" class="panel"><div class="form-row">'+field("Booking ID","bookingNumber")+'<div class="field"><label>&nbsp;</label><button>Search</button></div></div></form><div id="receipt-result"></div>');
    var form=document.getElementById("receipt-search"),target=document.getElementById("receipt-result"),initial=new URLSearchParams(location.search).get("bookingNumber");
    form.onsubmit=async function(e){e.preventDefault();var number=formValue(form,"bookingNumber");if(!number)return toast("Enter a booking ID.","error");target.innerHTML="<p>Loading…</p>";try{var b=await api("/bookings/number/"+encodeURIComponent(number)),payments=[];try{payments=await api("/payments/booking/"+b.id);}catch(_){}target.innerHTML='<div class="right no-print"><button id="receipt-print">Print Receipt</button></div>'+receiptMarkup(b,payments&&payments[0]);document.getElementById("receipt-print").onclick=function(){window.print();};}catch(error){target.innerHTML=messageBox(error.message,"error");}};
    if(initial){form.elements.bookingNumber.value=initial;form.requestSubmit();}
  }
  function dispatch() {
    if(screen==="not-found"){publicShell(pageTitle("Page not found","The requested page is unavailable.")+'<a class="button" href="/book">Go to Booking</a>'+publicEnd());return;}
    if(screen==="about")return renderAbout();
    if(screen==="gallery")return renderGallery();
    if(screen==="contact")return renderContact();
    if(screen==="print-booking")return renderPrintBooking();
    if(screen==="book")return renderBook();
    if(screen==="refunds")return renderRefundApplication();
    if(screen==="cancel-booking")return renderCancellationApplication();
    if(screen==="track-refund")return renderTrackRefund();
    if(screen==="admin/login")return renderLogin();
    if(screen==="admin/dashboard")return renderDashboard();
    if(screen==="admin/bookings")return renderBookings();
    if(screen==="admin/slot-availability")return renderSlotAvailability();
    if(screen==="admin/payments")return renderPayments();
    if(screen==="admin/venues")return renderVenues();
    if(screen==="admin/holidays")return renderHolidays();
    if(screen==="admin/gallery")return renderGalleryAdmin();
    if(screen==="admin/notices")return renderNoticesAdmin();
    if(screen==="admin/complaints")return renderComplaints();
    if(screen==="admin/cancellations")return renderCancellationsAdmin();
    if(screen==="admin/refunds")return renderRefundsAdmin();
    if(screen==="admin/users")return renderUsers();
    if(screen==="admin/audit")return renderAudit();
    if(screen==="admin/receipts")return renderReceipts();
    publicShell(pageTitle("Page not found","The requested page is unavailable.")+'<a class="button" href="/book">Go to Booking</a>'+publicEnd());
  }
  dispatch();
}());
