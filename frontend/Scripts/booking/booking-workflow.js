import { renderAvailability } from "./steps/availability-step.js";
import { renderBookingSummary } from "./steps/booking-summary-step.js";
import { renderBankDetails } from "./steps/bank-details-step.js";
import { renderBookingConfirmation } from "./steps/booking-confirmation-step.js";

export function renderBookingStep(target, context) {
  if (context.state.bookStep === 0) return renderAvailability(target, context);
  if (context.state.bookStep === 1) return renderBookingSummary(target, context);
  if (context.state.bookStep === 2) return renderBankDetails(target, context);
  return renderBookingConfirmation(target, context);
}
