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
