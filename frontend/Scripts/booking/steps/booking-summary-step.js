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
