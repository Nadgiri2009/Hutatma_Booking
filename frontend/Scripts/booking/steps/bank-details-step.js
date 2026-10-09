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
