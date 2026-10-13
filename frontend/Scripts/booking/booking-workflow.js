  export function renderAvailability(target, context) {
    target.className = "availability-step";
    var state = context.state, api = context.api, esc = context.esc, money = context.money, checkedValues = context.checkedValues, formValue = context.formValue, toast = context.toast, messageBox = context.messageBox, drawBookStep = context.drawBookStep, selectField = context.selectField, venueOptions = context.venueOptions;

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

  export async function renderBookingSummary(target, context) {
    target.className = "booking-summary-step";
    var state = context.state, api = context.api, esc = context.esc, money = context.money, fmtDate = context.fmtDate, messageBox = context.messageBox, drawBookStep = context.drawBookStep;

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

  export function renderBankDetails(target, context) {
    target.className = "bank-details-step";
    var state = context.state, esc = context.esc, field = context.field, formValue = context.formValue, toast = context.toast, drawBookStep = context.drawBookStep;

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

  export function renderBookingConfirmation(target, context) {
    target.className = "booking-confirmation-step";
    var state = context.state, api = context.api, esc = context.esc, money = context.money, fmtDate = context.fmtDate, messageBox = context.messageBox, toast = context.toast, drawBookStep = context.drawBookStep;

    var b=state.booking, s=b.summary || {}, bank=b.bankDetail || {};
    target.innerHTML = '<div class="grid cols-2"><section class="card"><h2>Booking Details</h2><p>'+esc(b.venueName)+' · '+esc(b.priceItemName)+'</p><p>'+fmtDate(b.fromDate)+' – '+fmtDate(b.toDate)+' · '+esc(b.session)+'</p><strong>Grand Total: '+money(s.grandTotal)+'</strong></section><section class="card"><h2>Bank Details</h2><p>'+esc(bank.bankName)+' · '+esc(bank.accountHolderName)+'</p><p>Account ending in '+esc(String(bank.accountNumber || "").slice(-4))+'</p><p>'+esc(bank.ifscCode)+'</p></section></div><div class="alert warning"><strong>Important Notice</strong><br>Submitting reserves your selected date and session. Booking is confirmed automatically once the payment gateway completes successfully. Do not pay unauthorized accounts.</div><div class="actions"><button class="secondary" id="confirm-back">Back</button><button id="pay-now">Make Payment</button></div><div id="payment-error"></div>';
    document.getElementById("confirm-back").onclick=function(){state.bookStep=2;drawBookStep();};
    document.getElementById("pay-now").onclick=function(){submitBookingPayment(context);};
  }
  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise(function(resolve) {
      var script=document.createElement("script"); script.src="https://checkout.razorpay.com/v1/checkout.js";
      script.onload=function(){resolve(true);}; script.onerror=function(){resolve(false);}; document.body.appendChild(script);
    });
  }
  async function submitBookingPayment(context) {
    var state = context.state, api = context.api, drawBookStep = context.drawBookStep, messageBox = context.messageBox, toast = context.toast;
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

export function renderBookingStep(target, context) {
  if (context.state.bookStep === 0) return renderAvailability(target, context);
  if (context.state.bookStep === 1) return renderBookingSummary(target, context);
  if (context.state.bookStep === 2) return renderBankDetails(target, context);
  return renderBookingConfirmation(target, context);
}
