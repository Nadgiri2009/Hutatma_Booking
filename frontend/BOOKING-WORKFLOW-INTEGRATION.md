# Booking workflow integration

This handoff contains the four existing booking steps extracted from `Scripts/app.js`. It keeps the current vanilla-JavaScript/Web Forms stack; it does not add React, a bundler, or package dependencies.

## Files to share

Copy these files, preserving their relative paths:

```text
Scripts/
└── booking/
    ├── booking-workflow.js
    └── steps/
        ├── availability-step.js
        ├── booking-summary-step.js
        ├── bank-details-step.js
        └── booking-confirmation-step.js
Content/
└── booking/
    ├── booking-progress.css
    └── steps/
        ├── availability-step.css
        ├── booking-summary-step.css
        ├── bank-details-step.css
        └── booking-confirmation-step.css
```

## Step sequence and responsibilities

1. **Availability** — loads venue pricing details and availability, renders the date calendar, validates the selected date range and sessions, collects equipment quantities, and rechecks availability before continuing.
2. **Booking Summary** — requests the server-calculated summary and displays the booking details and cost breakdown.
3. **Bank Details** — validates and stores the bank details in the shared booking state.
4. **Confirm & Submit** — displays the booking/bank summary and runs the existing payment initiation/completion flow, including Razorpay callbacks and receipt state.

The step modules share one state object. They do not create duplicate state or API clients. The existing parent application continues to own route selection, initial venue/equipment loading, the progress indicator, receipt rendering, and the shared API/form/formatting helpers.

## Component-to-CSS mapping

| Component | Stylesheet |
| --- | --- |
| `renderAvailability` in `Scripts/booking/steps/availability-step.js` | `Content/booking/steps/availability-step.css` |
| `renderBookingSummary` in `Scripts/booking/steps/booking-summary-step.js` | `Content/booking/steps/booking-summary-step.css` |
| `renderBankDetails` in `Scripts/booking/steps/bank-details-step.js` | `Content/booking/steps/bank-details-step.css` |
| `renderBookingConfirmation` in `Scripts/booking/steps/booking-confirmation-step.js` | `Content/booking/steps/booking-confirmation-step.css` |
| Shared booking progress indicator | `Content/booking/booking-progress.css` |

The step styles are scoped to the class that the matching component applies to its target element. The application must also provide its existing base styles for shared utility classes such as `.panel`, `.card`, `.field`, `.grid`, `.actions`, `.alert`, `.muted`, `.calendar`, and the design tokens in `site.css`. Reuse the main application's existing shared stylesheet rather than copying it from this handoff.

## Integration instructions

1. Copy the files above into the corresponding `Scripts/` and `Content/` folders under the frontend source root.
2. Import the lightweight workflow dispatcher into the existing application entry module:

   ```js
   import { renderBookingStep } from "./booking/booking-workflow.js";
   ```

3. In the existing booking-step renderer, call it with the current shared state, API client, and helpers:

   ```js
   renderBookingStep(document.getElementById("book-content"), {
     state: state,
     api: api,
     esc: esc,
     money: money,
     fmtDate: fmtDate,
     toast: toast,
     formValue: formValue,
     checkedValues: checkedValues,
     field: field,
     selectField: selectField,
     messageBox: messageBox,
     drawBookStep: drawBookStep,
     venueOptions: venueOptions
   });
   ```

   The `state` object must retain the existing `bookStep` index (`0`–`3`), `booking` data, and `receipt`. `drawBookStep` must redraw the parent booking view after a step updates state. The helpers must have the same behavior/signatures as the existing application helpers.
4. Load the CSS after the application's base stylesheet:

   ```html
   <link rel="stylesheet" href="/Content/booking/booking-progress.css">
   <link rel="stylesheet" href="/Content/booking/steps/availability-step.css">
   <link rel="stylesheet" href="/Content/booking/steps/booking-summary-step.css">
   <link rel="stylesheet" href="/Content/booking/steps/bank-details-step.css">
   <link rel="stylesheet" href="/Content/booking/steps/booking-confirmation-step.css">
   ```

5. Load the application entry point as a JavaScript module (`<script type="module" ...>`), because the dispatcher and step files use native ES module imports/exports.
6. If the destination Web Forms project uses explicit content includes, add each new `.js` and `.css` file to its project file so deployment publishes them.

## Shared dependencies and integration requirements

- **Existing application utilities:** `api`, `esc`, `money`, `fmtDate`, `toast`, `formValue`, `checkedValues`, `field`, `selectField`, and `messageBox`. The API client itself owns its API base URL.
- **Existing application callbacks/data:** shared `state`, `drawBookStep`, and `venueOptions`.
- **API:** the existing API client/base URL and its current booking endpoints: venue detail/availability, booking availability and summary, and payment initiate/complete. The modules do not change endpoint paths or payload contracts.
- **Base styling:** the destination app's existing global stylesheet and CSS variables. The files in this handoff only supply booking-step and progress-indicator styling.
- **Packages/assets:** no additional npm packages, local images, fonts, or other assets are required by these extracted step files. Razorpay's checkout script continues to be loaded by the existing payment flow when needed.
- **Applicant profile:** the original applicant-entry step remains removed. The confirmation component retains the existing guard that blocks payment until applicant data has been loaded from the citizen database. The external profile API/schema integration is still required before production bookings can be submitted.
- **Web Forms deployment:** use native module-capable browsers and publish the new static files. No routing or API contract changes are required by this extraction.

## Verification scope

The modules are wired into this repository's existing entry point and registered as Web Forms content. Validation covers JavaScript syntax/import resolution, the frontend Release build, and whitespace/diff checks. Live API/payment operations and integration into a separate main application are not represented as tested.
