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
