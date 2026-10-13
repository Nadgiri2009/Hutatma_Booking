# Phase 0 — Migration inventory and proposed map

**Status: Phase 0 approved; Phase 1 schema script statically reviewed, not executed.**

This map is based on the checked-out repository at the time of inspection, including the current working-tree changes. It is an inventory and proposed destination map, not a statement that the proposed pages or replacement behavior already exist.

## 0.1 Verified repository state and assumptions

- The active backend project is `backend/HutatmaBooking.API.csproj`, targets `net8.0`, and references EF Core SQL Server, JWT bearer authentication, BCrypt.Net-Next, QuestPDF, AutoMapper, Serilog and Swashbuckle. See [the API project](./backend/HutatmaBooking.API.csproj) and [Program.cs](./backend/Program.cs).
- The actual migration directory contains **12 migration classes** plus the EF model snapshot: `InitialCreate`; `RemoveApprovalAddBookingSession`; `AddRazorpayPaymentFields`; `AddRefundRequests`; `AddRefundRequestUpdatedAt`; `SetAdminLoginMobile`; `PersistAdminLoginOtp`; `AddRefundOtpChallenges`; `AddVenueBookingCapacityPerSession`; `AddSessionSpecificBookingCapacities`; `AddCancellationOtpChallenges`; `AddAfternoonSlotAndMultiSlotBookings`. It is not 15+ migration classes. The snapshot, not the old scripts under `database/`, is the schema baseline.
- The Web Forms project targets .NET Framework 4.8. In the current worktree, `Site.aspx` is a minimal shell, `Site.aspx.cs` has a partial direct-SQL replacement, and the original tracked `frontend/Scripts/app.js` and `frontend/Scripts/booking/booking-workflow.js` are deleted from the worktree. The original versions remain available in `HEAD` for inventory and recovery. Current edits are not treated as approved production behavior.
- Current Web Forms connection string `HutatmaBooking` is blank. Existing local test data, API uploads, and ignored build output are not considered migration inputs.
- Assumption A (whole application, including citizen flows, with public mobile/OTP flows retained) is used for this map. The user selected Web Forms pages with normal postbacks rather than restoring the original AJAX implementation.
- Assumption B (the host Department Panel authenticates staff) is used. Proposed keys are placeholders only: `Session["DeptUserId"]`, `Session["DeptId"]`, and `Session["DeptRole"]`. The host must set them after authentication; the exact allowed roles and department-identity rules need approval before implementation. No staff login page is proposed.
- The applicant profile source is not present in the repository. The current Web Forms code deliberately disables booking/payment without it, whereas the original API booking DTO accepted applicant fields. The source and contract for citizen identity/profile data remain an open blocker.

## 0.2 Existing booking steps and proposed Web Forms replacement

`frontend/Scripts/app.js` (tracked in `HEAD`) contains the booking entry flow, booking state, four-step navigation, and step dispatch: `renderBook` initializes the flow, `bookStepNav` renders the four labels, `drawBookStep` selects the active step, and `bookingStepContext` passes shared booking state. It delegates each step's form and detailed behavior to `renderBookingStep` and the step renderers in `frontend/Scripts/booking/booking-workflow.js`. So the complete booking flow is coordinated in `app.js`, with the step implementations split into the imported booking-workflow module. The selected replacement keeps the original four-step order and fields, but uses `.aspx` pages/postbacks. The existing CSS under `frontend/Content/booking/` is in use by the current shell and should be retained.

| Original step | Proposed Web Forms page and server events | Fields and behavior visible in original source |
|---|---|---|
| Availability | `Pages/Booking/Availability.aspx`; `Page_Load`, venue/pricing selection `SelectedIndexChanged`, date/session postback handlers, `CheckAvailability_Click`, `Continue_Click` | Venue; sub-venue/rate item; calendar month navigation and date range (`fromDate`, `toDate`); sessions Morning, Afternoon, Evening, FullDay; per-session availability across all selected days; equipment quantities; server-side availability recheck. Original source also has “Select a start date, then an end date. Click the same date twice for a one-day booking.” Original tracked JS: `renderAvailability` at lines 1–359; booking step routing at line 472. |
| Booking Summary | `Pages/Booking/Summary.aspx`; `Page_Load`, `Back_Click`, `Continue_Click` | Read-only venue, sub-venue, date range, selected session(s), equipment and cost breakdown (total days, base rent, holiday charges, equipment charges, deposit, CGST, SGST, grand total). Summary is recalculated server-side from master values; client-provided totals are not trusted. Original tracked JS: `renderBookingSummary` at lines 361–383. |
| Bank Details | `Pages/Booking/BankDetails.aspx`; `Page_Load`, `Back_Click`, `Continue_Click` | Bank Name (required); Account Holder Name (required); Account Number (required, 9–18 digits); IFSC Code (required, 11 characters, pattern `[A-Z]{4}0[A-Z0-9]{6}`); Branch Name (required); MICR Code (optional). These client-side rules must be revalidated server-side. Original tracked JS: `renderBankDetails` at lines 384–408. |
| Confirm & Submit | `Pages/Booking/Confirm.aspx`; `Page_Load`, `Back_Click`, `MakePayment_Click` | Booking and bank detail review; warning that submission reserves chosen date/session and payment confirms booking; Razorpay Checkout opens from a server-created order; callback posts to `Pages/Booking/PaymentCallback.aspx`. Original applicant-data guard blocks payment unless valid real profile information has been loaded. Original tracked JS: `renderBookingConfirmation` at lines 409–471. |
| Payment result | `Pages/Booking/PaymentCallback.aspx`; `Page_Load`/POST handler | Validate callback fields and Razorpay HMAC-SHA256 signature server-side, bind result to the persisted pending order/booking, make completion idempotent, then show confirmed booking and receipt. Current service does not establish this idempotency and creates a booking during payment completion; this must be resolved before coding. |

The page map above is proposed. No new pages or fields have been created in this phase.

## 0.3 API endpoint → proposed Web Forms replacement and role

Policy meanings from `Program.cs`: **AdminOnly** = Admin; **StaffPlus** = Admin or Staff; **RefundReviewers** = Admin or Clerk; **ClerkOnly** = Clerk. Endpoints without an authorization attribute are currently anonymous/public unless noted. “Host …” means the module must validate the host session contract on every request; it must not create a second login.

| Existing method and route | Proposed page / event handler | Existing access |
|---|---|---|
| `POST /api/auth/request-otp` | No replacement: remove standalone staff sign-in entry | Public staff OTP login; intentionally removed |
| `POST /api/auth/verify-otp` | No replacement: remove standalone staff sign-in entry | Public staff OTP login; intentionally removed |
| `GET /api/venues` | `Pages/Venues.aspx` `Page_Load`; availability page data-binding | Public |
| `GET /api/venues/{id}` | `Pages/Venues/Details.aspx` `Page_Load` | Public |
| `GET /api/venues/{id}/details` | Venue details data-binding / booking rate display | Public |
| `GET /api/venues/equipment` | Availability page equipment data-binding | Public |
| `GET /api/venues/admin/all` | `Pages/Department/Venues.aspx` `Page_Load` | StaffPlus + valid host session |
| `PUT /api/venues/pricing/{id}` | `Pages/Department/Venues.aspx` `SavePricing_Click` | AdminOnly + valid host session |
| `PUT /api/venues/{id}/booking-capacity` | `Pages/Department/Venues.aspx` `SaveCapacity_Click` | AdminOnly + valid host session |
| `POST /api/venues/admin` | `Pages/Department/Venues.aspx` `CreateVenue_Click` | AdminOnly + valid host session |
| `POST /api/venues/{venueId}/pricing` | `Pages/Department/Venues.aspx` `CreatePricing_Click` | AdminOnly + valid host session |
| `DELETE /api/venues/{id}` | `Pages/Department/Venues.aspx` `DeleteVenue_Click` (POST only) | AdminOnly + valid host session |
| `DELETE /api/venues/pricing/{id}` | `Pages/Department/Venues.aspx` `DeletePricing_Click` (POST only) | AdminOnly + valid host session |
| `PUT /api/venues/{id}/status` | `Pages/Department/Venues.aspx` `SetVenueStatus_Click` | AdminOnly + valid host session |
| `POST /api/bookings/availability` | `Pages/Booking/Availability.aspx` `CheckAvailability_Click` | Public |
| `POST /api/bookings/summary` | `Pages/Booking/Summary.aspx` `Page_Load`/`Continue_Click` | Public |
| `POST /api/bookings` | Booking flow `Confirm.aspx` / `MakePayment_Click` or the transactional pre-payment handler | Public citizen flow; profile and OTP contract unresolved |
| `POST /api/bookings/admin` | `Pages/Department/Bookings.aspx` `CreateBooking_Click` | AdminOnly + valid host session |
| `PUT /api/bookings/{id}/date` | `Pages/Department/Bookings.aspx` `ChangeDate_Click` | AdminOnly + valid host session |
| `POST /api/bookings/{id}/force-cancel` | `Pages/Department/Bookings.aspx` `ForceCancel_Click` (POST only) | AdminOnly + valid host session |
| `GET /api/bookings/number/{number}` | `Pages/Bookings/Lookup.aspx` `FindBooking_Click` | Public |
| `GET /api/bookings/mobile/{mobile}` | `Pages/Bookings/Lookup.aspx` `FindBooking_Click` | Public |
| `GET /api/bookings` | `Pages/Department/Bookings.aspx` `Page_Load`/`Search_Click` | StaffPlus + valid host session |
| `POST /api/payments/initiate` | `Pages/Booking/Confirm.aspx` `MakePayment_Click` | Public citizen flow |
| `POST /api/payments/complete` | `Pages/Booking/PaymentCallback.aspx` POST handler | Public gateway callback; verify signature and replay handling |
| `GET /api/payments/booking/{bookingId}` | `Pages/Department/Payments.aspx` booking-payment view | StaffPlus + valid host session |
| `POST /api/payments/verify` | `Pages/Department/Payments.aspx` `VerifyPayment_Click` | StaffPlus + valid host session |
| `GET /api/refunds/lookup` | `Pages/Refunds/Apply.aspx` `FindBooking_Click` | Public citizen flow |
| `GET /api/refunds/track` | `Pages/Refunds/Track.aspx` `Track_Click` | Public citizen flow |
| `POST /api/refunds/{bookingId}/request-otp` | `Pages/Refunds/Apply.aspx` `RequestOtp_Click` | Public citizen OTP |
| `POST /api/refunds/{bookingId}/apply-verified` | `Pages/Refunds/Apply.aspx` `SubmitVerified_Click` | Public citizen OTP |
| `POST /api/refunds` | No replacement action; retain OTP-verified `apply-verified` path | Public legacy action always returns 409 instructing client to verify registered mobile with OTP |
| `POST /api/refunds/{bookingId}/admin-apply` | `Pages/Department/Refunds.aspx` `CreateRefund_Click` | AdminOnly + valid host session |
| `GET /api/refunds` | `Pages/Department/Refunds.aspx` `Page_Load`/`Filter_Click` | RefundReviewers + valid host session |
| `GET /api/refunds/{id}/history` | `Pages/Department/Refunds.aspx` `ViewHistory_Click` | RefundReviewers + valid host session |
| `PUT /api/refunds/{id}/verify` | `Pages/Department/Refunds.aspx` `VerifyRefund_Click` | ClerkOnly + valid host session |
| `PUT /api/refunds/{id}/review` | `Pages/Department/Refunds.aspx` `ReviewRefund_Click` | ClerkOnly + valid host session |
| `PUT /api/refunds/{id}/approve` | `Pages/Department/Refunds.aspx` `ApproveRefund_Click` | AdminOnly + valid host session |
| `PUT /api/refunds/{id}/reject` | `Pages/Department/Refunds.aspx` `RejectRefund_Click` | AdminOnly + valid host session |
| `PUT /api/refunds/{id}/start-processing` | `Pages/Department/Refunds.aspx` `StartProcessing_Click` | ClerkOnly + valid host session |
| `PUT /api/refunds/{id}/process` | `Pages/Department/Refunds.aspx` `ProcessRefund_Click` | ClerkOnly + valid host session |
| `GET /api/cancellations` | `Pages/Department/Cancellations.aspx` `Page_Load` | StaffPlus + valid host session |
| `POST /api/cancellations/{bookingId}/request-otp` | `Pages/Cancellations/Apply.aspx` `RequestOtp_Click` | Public citizen OTP |
| `POST /api/cancellations/{bookingId}/apply-verified` | `Pages/Cancellations/Apply.aspx` `SubmitVerified_Click` | Public citizen OTP |
| `POST /api/cancellations` | No replacement action; retain OTP-verified `apply-verified` path | Public legacy action always returns 409 instructing client to verify registered mobile with OTP |
| `PUT /api/cancellations/{id}/process` | `Pages/Department/Cancellations.aspx` `ProcessCancellation_Click` | StaffPlus + valid host session |
| `POST /api/upload` | `Pages/Booking/Applicant.aspx` `UploadIdProof_Click` (the applicant step/page still needs a decision) | Currently public; validate MIME/extension/size and store outside web root |
| `GET /api/users/roles` | `Pages/Department/Users.aspx` role dropdown data-binding | AdminOnly + valid host session |
| `GET /api/users` | `Pages/Department/Users.aspx` `Page_Load` | AdminOnly + valid host session |
| `POST /api/users` | `Pages/Department/Users.aspx` `CreateUser_Click` | AdminOnly + valid host session |
| `PUT /api/users/{id}` | `Pages/Department/Users.aspx` `UpdateUser_Click` | AdminOnly + valid host session |
| `GET /api/complaints` | `Pages/Department/Complaints.aspx` `Page_Load`/`Filter_Click` | StaffPlus + valid host session |
| `POST /api/complaints` | `Pages/Contact.aspx` `SubmitComplaint_Click` | Public |
| `PUT /api/complaints/{id}/resolve` | `Pages/Department/Complaints.aspx` `Resolve_Click` | StaffPlus + valid host session |
| `GET /api/holidays` | `Pages/Department/Holidays.aspx` / booking calendar data-binding | Public |
| `POST /api/holidays` | `Pages/Department/Holidays.aspx` `CreateHoliday_Click` | StaffPlus + valid host session |
| `PUT /api/holidays/{id}` | `Pages/Department/Holidays.aspx` `UpdateHoliday_Click` | StaffPlus + valid host session |
| `DELETE /api/holidays/{id}` | `Pages/Department/Holidays.aspx` `DeleteHoliday_Click` (POST only) | StaffPlus + valid host session |
| `GET /api/gallery` | `Pages/Gallery.aspx` `Page_Load` | Public |
| `POST /api/gallery` | `Pages/Department/Gallery.aspx` `CreateGalleryItem_Click` | StaffPlus + valid host session |
| `DELETE /api/gallery/{id}` | `Pages/Department/Gallery.aspx` `DeleteGalleryItem_Click` (POST only) | StaffPlus + valid host session |
| `GET /api/notices/active` | `Pages/Notices.aspx` / public home `Page_Load` | Public |
| `GET /api/notices` | `Pages/Department/Notices.aspx` `Page_Load` | StaffPlus + valid host session |
| `POST /api/notices` | `Pages/Department/Notices.aspx` `CreateNotice_Click` | StaffPlus + valid host session |
| `PUT /api/notices/{id}` | `Pages/Department/Notices.aspx` `UpdateNotice_Click` | StaffPlus + valid host session |
| `DELETE /api/notices/{id}` | `Pages/Department/Notices.aspx` `DeleteNotice_Click` (POST only) | StaffPlus + valid host session |
| `GET /api/dashboard` | `Pages/Department/Dashboard.aspx` `Page_Load` | StaffPlus + valid host session |
| `GET /api/receipts/booking/{bookingId}` | `Pages/Department/Receipts.aspx` booking lookup | StaffPlus + valid host session (receipts controller default) |
| `GET /api/receipts/number/{bookingNumber}/pdf` | `Pages/Receipts/Download.aspx`/authorized response handler | Anonymous exception currently; verify registered mobile/booking authorization before exposing |
| `POST /api/receipts/number/{bookingNumber}/email` | `Pages/Bookings/Lookup.aspx` `SendReceipt_Click` | Anonymous exception currently; verify registered mobile/booking authorization |
| `GET /api/audit-logs` | `Pages/Department/Audit.aspx` `Page_Load`/`Search_Click` | AdminOnly + valid host session |

The mappings are one-handler-per-operation candidates, not a promise to create an endpoint-shaped page for every route. Where a route is a mutation, the Web Forms equivalent must be a POST-backed control event and must re-check role, input, state and eligibility before the SQL transaction.

## 0.4 Original JavaScript function → proposed server-side equivalent

The original files in `HEAD` use a shared `api()` wrapper around `fetch`; none of those API calls are to be retained. Synchronous helper functions below move to ordinary server controls, C# formatting/encoding or page-local private methods. Anonymous callback functions and DOM handlers are represented by the corresponding page event handlers.

| Original function(s) | Proposed replacement |
|---|---|
| `esc`, `money`, `fmtDate`, `toast`, `api`, `formValue`, `checkedValues`, `field`, `selectField`, `textarea`, `messageBox` | Web Forms output encoding, server-side culture formatting, validation/status labels, `Request.Form`/server controls and DB-bound `DropDownList`/`CheckBoxList`; no shared client API helper |
| `footer`, `publicShell`, `pageTitle`, `publicEnd`, `setBookingMenuOpen`, `badge` | `Site.Master` layout/navigation, server-side title/content placeholders, CSS status classes |
| `receiptMarkup` | `Pages/Receipts/Receipt.aspx` server-rendered receipt |
| `renderAbout` | `Pages/About.aspx` |
| `renderGallery`, `loadGallery` | `Pages/Gallery.aspx` `Page_Load` and DB-bound repeater |
| `renderContact` | `Pages/Contact.aspx` `SubmitComplaint_Click` |
| `renderPrintBooking` | `Pages/Bookings/Lookup.aspx` `FindBooking_Click`, receipt email/download handlers |
| `renderBook`, `bookStepNav`, `drawBookStep`, `bookingStepContext`, `venueOptions` | Booking-step pages and normal navigation/postback; venue/rate/equipment DB binding; receipt success view |
| `lookupForm`, `renderRefundApplication`, `renderCancellationApplication`, `renderTrackRefund` | `Pages/Refunds/Apply.aspx`, `Pages/Cancellations/Apply.aspx`, `Pages/Refunds/Track.aspx` citizen handlers |
| `renderAdminShell`, `renderLogin` | Department `Site.Master` navigation plus host-session authorization guard; **no login page** |
| `renderDashboard` | `Pages/Department/Dashboard.aspx` |
| `bookingTable`, `loadAdminBookings`, `showBookingDetail`, `renderBookings` | `Pages/Department/Bookings.aspx` grid, filter, paging and detail postbacks |
| `drawAdminBookingCreate`, `selectedAdminSession`, `selectedAdminEquipment` | Admin booking controls and validated `CreateBooking_Click` |
| `renderSlotAvailability`, `renderPayments` (including its local `load`) | `Pages/Department/SlotAvailability.aspx`, `Pages/Department/Payments.aspx` |
| `renderVenues` (including its local `load`) | `Pages/Department/Venues.aspx` |
| `renderHolidays` (including its local `load`) | `Pages/Department/Holidays.aspx` |
| `renderGalleryAdmin` (`drawItems`, `load`) | `Pages/Department/Gallery.aspx` |
| `renderNoticesAdmin` (`load`, `editNotice`) | `Pages/Department/Notices.aspx` |
| `renderComplaints` (`load`) | `Pages/Department/Complaints.aspx` |
| `renderCancellationsAdmin` | `Pages/Department/Cancellations.aspx` |
| `renderRefundsAdmin` (`load`) | `Pages/Department/Refunds.aspx` |
| `showModal` | Server-side edit view/panel or ordinary postback modal state; exact existing admin UI to preserve |
| `renderUsers` (`load`), `userForm` | `Pages/Department/Users.aspx` |
| `renderAudit` (`load`) | `Pages/Department/Audit.aspx` |
| `renderReceipts` | `Pages/Department/Receipts.aspx` |
| `dispatch` | `Global.asax` route map / `Site.Master` navigation; login dispatch removed |
| `renderAvailability`, `dateKey`, `dateLabel`, `chosenSessions`, `sessionStatus`, `availableSessions`, `hasAvailability`, `dayHasAvailability`, `formatMonth`, `updateRangeLabel`, `updateSessionChoices`, `loadMonth`, `renderCalendar`, `loadPricing` | `Pages/Booking/Availability.aspx`; server calendar state, bound session choices, `SelectedIndexChanged`/date postbacks and availability re-check |
| `renderBookingSummary` | `Pages/Booking/Summary.aspx` `Page_Load`/`Continue_Click`; server recalculates |
| `renderBankDetails` | `Pages/Booking/BankDetails.aspx` `Continue_Click` plus server validation |
| `renderBookingConfirmation`, `loadRazorpay`, `submitBookingPayment`, nested `complete` | `Pages/Booking/Confirm.aspx` `MakePayment_Click` and `Pages/Booking/PaymentCallback.aspx` POST handler; server-created Razorpay order and server signature verification |
| `renderBookingStep` | No dispatcher; direct normal navigation between the four step pages |

The source function inventory is from original `frontend/Scripts/app.js` and `frontend/Scripts/booking/booking-workflow.js` in `HEAD`; the files are currently deleted in the working tree. The original workflow's UI fields are recorded in §0.2.

## 0.5 EF model/schema inventory

The authoritative final model is `backend/Migrations/AppDbContextModelSnapshot.cs` (EF Core 8 SQL Server provider). Entity property inventory below is cross-checked against `backend/Models/Models.cs` and the snapshot. Unless marked nullable, the property is required/non-nullable. EF conventions create `int` identity primary keys for numeric `Id` keys; OTP challenge keys are natural/non-identity. DateOnly properties map to SQL `date`; DateTime to `datetime2`; decimal values are configured as `decimal(12,2)` in `AppDbContext.OnModelCreating`.

| SQL table / entity | Columns (SQL type/length; `?` means nullable) |
|---|---|
| `Roles` / Role | `Id int IDENTITY PK`; `Name nvarchar(50)`; `Description nvarchar(200)?`; `CreatedAt datetime2` |
| `Users` / User | `Id int IDENTITY PK`; `FullName nvarchar(150)`; `Email nvarchar(200)`; `Mobile nvarchar(15)`; `PasswordHash nvarchar(500)`; `RoleId int`; `IsActive bit`; `CreatedAt datetime2`; `UpdatedAt datetime2?` |
| `VenueMaster` / VenueMaster | `VenueId int IDENTITY PK`; `VenueName nvarchar(150)`; `Description nvarchar(max)?`; `Capacity int?`; `MorningBookingCapacity int`; `AfternoonBookingCapacity int`; `EveningBookingCapacity int`; `Location nvarchar(200)?`; `Status nvarchar(30)`; `DisplayOrder int`; `CreatedAt datetime2`; `UpdatedAt datetime2?` |
| `VenueFacilities` / VenueFacility | `Id int IDENTITY PK`; `VenueId int`; `FacilityName nvarchar(150)`; `Description nvarchar(max)?`; `IsActive bit`; `DisplayOrder int` |
| `VenueImages` / VenueImage | `Id int IDENTITY PK`; `VenueId int`; `ImageUrl nvarchar(500)`; `Caption nvarchar(200)?`; `IsPrimary bit`; `IsActive bit`; `DisplayOrder int` |
| `VenueRules` / VenueRule | `Id int IDENTITY PK`; `VenueId int`; `RuleTitle nvarchar(200)`; `RuleText nvarchar(max)`; `IsActive bit`; `DisplayOrder int` |
| `VenuePricing` / VenuePricing | `Id int IDENTITY PK`; `VenueId int`; `PriceItemName nvarchar(150)`; `ChargeUnit nvarchar(50)`; `Amount decimal(12,2)`; `RefundableDeposit decimal(12,2)`; `HolidaySurchargeAmount decimal(12,2)`; `CGSTPercent decimal(12,2)`; `SGSTPercent decimal(12,2)`; `EffectiveFrom date`; `EffectiveTo date?`; `IsActive bit`; `DisplayOrder int` |
| `VenueEquipment` / VenueEquipment | `Id int IDENTITY PK`; `EquipmentName nvarchar(150)`; `ChargeUnit nvarchar(50)`; `Amount decimal(12,2)`; `FreeQuantity int`; `IsActive bit`; `DisplayOrder int` |
| `Holidays` / Holiday | `Id int IDENTITY PK`; `HolidayDate date`; `Name nvarchar(150)`; `Description nvarchar(500)?`; `IsActive bit`; `CreatedAt datetime2` |
| `Bookings` / Booking | `Id int IDENTITY PK`; `BookingNumber nvarchar(20)`; `VenueId int`; `VenuePricingId int`; `FromDate date`; `ToDate date`; `Session nvarchar(20)`; `TotalDays int`; `BaseRent`, `HolidayCharge`, `EquipmentCharge`, `SecurityDeposit`, `CGSTAmount`, `SGSTAmount`, `GrandTotal decimal(12,2)`; `Status nvarchar(30)`; `CancelReason nvarchar(500)?`; `CreatedAt datetime2`; `UpdatedAt datetime2?` |
| `Applicants` / Applicant | `Id int IDENTITY PK`; `BookingId int`; `FullName nvarchar(150)`; `Email nvarchar(200)`; `Mobile nvarchar(15)`; `AlternateMobile nvarchar(15)?`; `Address nvarchar(max)`; `FunctionName nvarchar(200)`; `FunctionType nvarchar(100)`; `ExpectedGuests int`; `IDProofType nvarchar(50)`; `IDProofFile nvarchar(500)?`; `CreatedAt datetime2` |
| `BankDetails` / BankDetail | `Id int IDENTITY PK`; `BookingId int`; `BankName nvarchar(150)`; `AccountHolderName nvarchar(150)`; `AccountNumber nvarchar(30)`; `IFSCCode nvarchar(15)`; `BranchName nvarchar(150)`; `MICRCode nvarchar(15)?`; `CreatedAt datetime2` |
| `BookingEquipment` / BookingEquipment | `Id int IDENTITY PK`; `BookingId int`; `EquipmentId int`; `EquipmentName nvarchar(max)`; `ChargeUnit nvarchar(max)`; `UnitPrice decimal(12,2)`; `Quantity int`; `TotalPrice decimal(12,2)` |
| `Payments` / Payment | `Id int IDENTITY PK`; `BookingId int`; `Amount decimal(12,2)`; `PaymentMethod nvarchar(50)`; `TransactionRef nvarchar(200)?`; `GatewayOrderId nvarchar(100)?`; `GatewayPaymentId nvarchar(100)?`; `GatewaySignature nvarchar(200)?`; `PaymentDate date?`; `Status nvarchar(30)`; `Remarks nvarchar(500)?`; `VerifiedBy int?`; `VerifiedAt datetime2?`; `CreatedAt datetime2`; `UpdatedAt datetime2?` |
| `Receipts` / Receipt | `Id int IDENTITY PK`; `ReceiptNumber nvarchar(20)`; `BookingId int`; `PaymentId int`; `GeneratedAt datetime2`; `GeneratedBy int?`; `FilePath nvarchar(500)?` |
| `Gallery` / GalleryItem | `Id int IDENTITY PK`; `Title nvarchar(200)`; `Description nvarchar(max)?`; `MediaType nvarchar(10)`; `FilePath nvarchar(500)?`; `VideoURL nvarchar(500)?`; `ThumbnailPath nvarchar(500)?`; `DisplayOrder int`; `IsActive bit`; `CreatedAt datetime2` |
| `Notices` / Notice | `Id int IDENTITY PK`; `Title nvarchar(300)`; `Content nvarchar(max)`; `IsImportant bit`; `PublishDate date`; `ExpiryDate date?`; `IsActive bit`; `CreatedBy int?`; `CreatedAt datetime2` |
| `Complaints` / Complaint | `Id int IDENTITY PK`; `BookingId int?`; `ApplicantName nvarchar(150)`; `Mobile nvarchar(15)`; `Email nvarchar(200)?`; `Subject nvarchar(300)`; `Description nvarchar(max)`; `Status nvarchar(30)`; `Resolution nvarchar(max)?`; `AssignedTo int?`; `ResolvedAt datetime2?`; `CreatedAt datetime2`; `UpdatedAt datetime2?` |
| `Cancellations` / Cancellation | `Id int IDENTITY PK`; `BookingId int`; `Reason nvarchar(max)`; `RequestedBy nvarchar(150)`; `RefundAmount decimal(12,2)`; `RefundStatus nvarchar(30)`; `ProcessedBy int?`; `ProcessedAt datetime2?`; `CreatedAt datetime2` |
| `RefundRequests` / RefundRequest | `Id int IDENTITY PK`; `RefundRequestNumber nvarchar(40)`; `BookingId int`; `RefundAmount decimal(12,2)?`; `Status nvarchar(30)`; `RejectionReason nvarchar(500)?`; `RequestedAt datetime2`; `UpdatedAt datetime2?`; `VerifiedBy int?`; `VerifiedAt datetime2?`; `ApprovedBy int?`; `ApprovedAt datetime2?`; `ProcessedBy int?`; `ProcessedAt datetime2?` |
| `AdminLoginOtps` / AdminLoginOtp | `Mobile nvarchar(15) PK`; `OtpHash varbinary(32)`; `CreatedAt datetime2`; `ExpiresAt datetime2`; `FailedAttempts int`; `UsedAt datetime2?` |
| `RefundOtpChallenges` / RefundOtpChallenge | `BookingId int PK`; `Mobile nvarchar(15)`; `OtpHash varbinary(32)`; `CreatedAt datetime2`; `ExpiresAt datetime2`; `FailedAttempts int`; `UsedAt datetime2?` |
| `CancellationOtpChallenges` / CancellationOtpChallenge | `BookingId int PK`; `Mobile nvarchar(15)`; `OtpHash varbinary(32)`; `CreatedAt datetime2`; `ExpiresAt datetime2`; `FailedAttempts int`; `UsedAt datetime2?` |
| `AuditLogs` / AuditLog | `Id int IDENTITY PK`; `UserId int?`; `Action nvarchar(100)`; `TableName nvarchar(100)`; `RecordId int?`; `OldValues nvarchar(max)?`; `NewValues nvarchar(max)?`; `IPAddress nvarchar(50)?`; `UserAgent nvarchar(500)?`; `CreatedAt datetime2` |

**Indexes (from initial/follow-up migrations and final model):**

- Unique: `IX_VenueMaster_VenueName`; `IX_Applicants_BookingId`; `IX_BankDetails_BookingId`; `IX_Receipts_PaymentId`; `IX_RefundRequests_BookingId`; `IX_RefundRequests_RefundRequestNumber`.
- Non-unique: `IX_Users_RoleId`; `IX_BookingEquipment_BookingId`; `IX_BookingEquipment_EquipmentId`; `IX_Bookings_VenuePricingId`; `IX_Cancellations_BookingId`; `IX_Payments_BookingId`; `IX_Receipts_BookingId`; `IX_VenueFacilities_VenueId`; `IX_VenueImages_VenueId`; `IX_VenuePricing_VenueId`; `IX_VenueRules_VenueId`; composite `IX_Bookings_VenueId_FromDate_ToDate_Session`.
- The final snapshot does not have a standalone `IX_Bookings_VenueId`; the composite venue/date/session index is ordinary and does not itself enforce no-overlap/slot uniqueness.

**Foreign keys (snapshot/model):**

- `Users.RoleId → Roles.Id` (cascade).
- `VenueFacilities.VenueId`, `VenueImages.VenueId`, `VenueRules.VenueId`, `VenuePricing.VenueId → VenueMaster.VenueId` (cascade).
- `Bookings.VenueId → VenueMaster.VenueId` and `Bookings.VenuePricingId → VenuePricing.Id` (restrict).
- `Applicants.BookingId → Bookings.Id`, `BankDetails.BookingId → Bookings.Id` (unique one-to-one; cascade).
- `BookingEquipment.BookingId → Bookings.Id` and `EquipmentId → VenueEquipment.Id` (convention cascade).
- `Payments.BookingId → Bookings.Id` (convention cascade).
- `Receipts.BookingId → Bookings.Id` and `PaymentId → Payments.Id` (restrict).
- `Cancellations.BookingId → Bookings.Id` (cascade).
- `RefundRequests.BookingId → Bookings.Id` (cascade).
- `RefundOtpChallenges.BookingId` and `CancellationOtpChallenges.BookingId → Bookings.Id` (cascade).
- Complaint/notice/audit actor IDs are nullable scalar fields without configured FKs in the model.

**Defaults and migration-seeded data:**

- `Bookings.Status = PendingPayment`; `Payments.Status = Pending`.
- `VenueMaster.CreatedAt = GETUTCDATE()`; capacities for Morning/Afternoon/Evening are `30`; `VenueEquipment.IsActive`, `VenueFacilities.IsActive`, `VenuePricing.IsActive`, and `VenueRules.IsActive` default true.
- Model CLR defaults additionally set venue status Active, venue pricing surcharge 0 and CGST/SGST 9, booking session FullDay, payment method BankTransfer and several timestamps. These CLR defaults are not all SQL column defaults; the final snapshot is authoritative for DDL defaults.
- Role lookup seed: IDs 1/2/3 = Admin/Staff/User. The snapshot also seeds an Admin user with a baked password hash and hard-coded identity values. This conflicts with the no-hardcoded credentials rule and must not be copied into a new setup script without explicit approval/security disposition.
- `DbInitializer` can add a Clerk role and performs additional SQL/seed operations; examine it separately before authoring Phase 1 scripts. Do not infer any master seed solely from historical `database/` scripts.

## 0.6 Business rules, validations and state transitions found

| Area | Rule/behavior found in source | Source |
|---|---|---|
| Availability/session | Ordered sessions are Morning, Afternoon, Evening; FullDay means all three. Reject empty/unknown/duplicate sessions; normalize selection order; each configured capacity must be positive. **Despite integer capacity columns, the current implementation treats a slot as binary: any one matching booking blocks that session, rather than allowing up to the configured capacity.** Cancelled/ForceCancelled bookings no longer occupy slots. FullDay conflicts with any overlapping active booking; individual sessions conflict only with matching occupied sessions. Availability is queried for each date in the inclusive range. | [BookingSlots.cs:7](./backend/Utils/BookingSlots.cs#L7), [BookingSlots.cs:9](./backend/Utils/BookingSlots.cs#L9), [BookingSlots.cs:31](./backend/Utils/BookingSlots.cs#L31), [BookingSlots.cs:53](./backend/Utils/BookingSlots.cs#L53), [BookingSlots.cs:61](./backend/Utils/BookingSlots.cs#L61), [BookingSlots.cs:66](./backend/Utils/BookingSlots.cs#L66), [BookingService.cs:38](./backend/Services/BookingService.cs#L38), [BookingService.cs:48](./backend/Services/BookingService.cs#L48) |
| Booking creation | Rechecks conflicts during submission; uses active pricing tied to selected venue; date range inclusive; total chargeable slots = inclusive days × selected sessions/day. Generates a booking number with UTC year and sequence. Creates PendingPayment booking with applicant/bank/equipment details; payment later confirms. Repository creation uses Serializable transaction and in-transaction conflict check. | [BookingService.cs:132](./backend/Services/BookingService.cs#L132), [BookingService.cs:195](./backend/Services/BookingService.cs#L195), [BookingService.cs:224](./backend/Services/BookingService.cs#L224), [Repositories.cs:105](./backend/Repositories/Repositories.cs#L105), [Repositories.cs:110](./backend/Repositories/Repositories.cs#L110), [Repositories.cs:126](./backend/Repositories/Repositories.cs#L126) |
| Pricing | Base rent = item amount × total chargeable slots; holiday surcharge = surcharge × number of active holidays in the inclusive date range; equipment charge = `max(0, quantity - FreeQuantity) × Amount`; taxable = rent + holiday + equipment; CGST/SGST rounded to 2 decimals using default `Math.Round`; grand total adds refundable deposit. Pricing must be active, match venue, and venue status Active. Although EffectiveFrom/EffectiveTo are stored, this summary validation does not compare them to booking dates. It also does not itself add a Saturday/Sunday surcharge, apply the seed rule's 20% local-artist discount, or add the seed rule's extra-time charge. | [BookingService.cs:132](./backend/Services/BookingService.cs#L132), [BookingService.cs:135](./backend/Services/BookingService.cs#L135), [BookingService.cs:141](./backend/Services/BookingService.cs#L141), [BookingService.cs:154](./backend/Services/BookingService.cs#L154), [BookingService.cs:171](./backend/Services/BookingService.cs#L171), [BookingService.cs:172](./backend/Services/BookingService.cs#L172), [Repositories.cs:223](./backend/Repositories/Repositories.cs#L223), [DbInitializer.cs:86](./backend/Data/DbInitializer.cs#L86), [DbInitializer.cs:157](./backend/Data/DbInitializer.cs#L157) |
| Payment | Gateway signature is lowercase HMAC-SHA256 over `orderId|paymentId`; payment becomes Paid, booking Confirmed, a receipt is created, and notifications are sent. Manual staff verification also confirms. Existing `CompleteGatewayPaymentAsync` creates the booking during callback, then finds a pending payment and processes it; it has no atomic duplicate-callback guard. The requested Web Forms design must settle pre-payment state and add idempotency. No webhook/reconciliation endpoint was found in controller routes. | [RemainingServices.cs:173](./backend/Services/RemainingServices.cs#L173), [RemainingServices.cs:185](./backend/Services/RemainingServices.cs#L185), [RemainingServices.cs:190](./backend/Services/RemainingServices.cs#L190), [RemainingServices.cs:220](./backend/Services/RemainingServices.cs#L220), [RemainingServices.cs:248](./backend/Services/RemainingServices.cs#L248), [RemainingServices.cs:276](./backend/Services/RemainingServices.cs#L276) |
| Booking transitions | Initial PendingPayment; payment completion confirms automatically. Migration normalized legacy Approved→Confirmed and Rejected→Cancelled. Admin date change preserves duration/session, blocks moving a cancelled booking or choosing the same start date, and rechecks conflicts under Serializable transaction. Force cancellation requires active booking, no prior cancellation/refund and a positive paid total; it sets ForceCancelled, creates a Requested refund for total paid and a Pending cancellation record. | [AppDbContext.cs:138](./backend/Data/AppDbContext.cs#L138), [RemainingServices.cs:220](./backend/Services/RemainingServices.cs#L220), [BookingsController.cs:63](./backend/Controllers/BookingsController.cs#L63), [BookingsController.cs:69](./backend/Controllers/BookingsController.cs#L69), [BookingsController.cs:120](./backend/Controllers/BookingsController.cs#L120), [BookingsController.cs:145](./backend/Controllers/BookingsController.cs#L145), migration [`20260622060000_RemoveApprovalAddBookingSession.cs`](./backend/Migrations/20260622060000_RemoveApprovalAddBookingSession.cs) |
| Cancellation OTP/refund | Citizen mobile must match registered mobile; only Confirmed booking with a Paid payment is eligible. OTP is 6 digits, SHA-256 hashed, 30-second request cooldown, 5-minute expiry, 5 failed attempts; successful OTP verification is transactional, marks booking Cancelled and creates pending refund/cancellation. Refund at cancellation time is: 90% if event date ≥ cancellation date + 2 calendar months; otherwise 80% if ≥ +1 month; otherwise 50% if at least 7 days away; otherwise SecurityDeposit. Each percentage result is rounded to 2 decimals AwayFromZero. Processing requires supplied amount to equal policy amount and changes Pending→Processed. | [RemainingControllers.cs:167](./backend/Controllers/RemainingControllers.cs#L167), [RemainingControllers.cs:270](./backend/Controllers/RemainingControllers.cs#L270), [RemainingControllers.cs:316](./backend/Controllers/RemainingControllers.cs#L316), [RemainingControllers.cs:352](./backend/Controllers/RemainingControllers.cs#L352), [RemainingControllers.cs:383](./backend/Controllers/RemainingControllers.cs#L383), [RemainingControllers.cs:388](./backend/Controllers/RemainingControllers.cs#L388), [RemainingControllers.cs:390](./backend/Controllers/RemainingControllers.cs#L390), [RemainingControllers.cs:392](./backend/Controllers/RemainingControllers.cs#L392), [RemainingControllers.cs:402](./backend/Controllers/RemainingControllers.cs#L402) |
| Refund OTP/review | Registered mobile match and refund eligibility; one refund request per booking; 30-second cooldown, 5-minute expiry, 5 attempts, SHA-256 OTP hash and Serializable verification. Flow: Requested → Under Verification → Clerk Processed → Approved → Processing → Processed; rejection records Rejected/reason. Clerk/Admin policy split must be preserved. | [RefundsController.cs:19](./backend/Controllers/RefundsController.cs#L19), [RefundsController.cs:179](./backend/Controllers/RefundsController.cs#L179), [RefundsController.cs:328](./backend/Controllers/RefundsController.cs#L328), [RefundsController.cs:386](./backend/Controllers/RefundsController.cs#L386), [RefundsController.cs:416](./backend/Controllers/RefundsController.cs#L416), [RefundsController.cs:460](./backend/Controllers/RefundsController.cs#L460), [RefundsController.cs:494](./backend/Controllers/RefundsController.cs#L494), [RefundsController.cs:521](./backend/Controllers/RefundsController.cs#L521), [RefundsController.cs:531](./backend/Controllers/RefundsController.cs#L531) |
| Applicant/contact validation | Admin OTP request validates mobile and eligible active Admin/Staff/Clerk account; authentication OTP expiry 5 min, cooldown 30 sec, max 5 attempts. DTO-level mobile/OTP patterns are 10-digit mobile and 6-digit OTP. Citizen applicant fields and remaining booking validation are in DTOs/original JS; profile-provider behavior is unresolved. | [AuthService.cs:18](./backend/Services/AuthService.cs#L18), [AuthService.cs:54](./backend/Services/AuthService.cs#L54), [AuthService.cs:68](./backend/Services/AuthService.cs#L68), [AuthService.cs:107](./backend/Services/AuthService.cs#L107), [DTOs.cs](./backend/DTOs/DTOs.cs) |
| Validation baseline | DTOs define required/regex validation for staff OTP only; booking/applicant/bank DTOs have no comparable annotation rules. Booking business checks therefore come from service logic and original browser validation. The Web Forms handlers must add server checks for the form rules without treating HTML/JavaScript validation or posted calculated values as authoritative. | [DTOs.cs:4](./backend/DTOs/DTOs.cs#L4), [DTOs.cs:11](./backend/DTOs/DTOs.cs#L11), [BookingService.cs:198](./backend/Services/BookingService.cs#L198), original `booking-workflow.js` lines 384–408 |
| Receipts/notifications | Receipt PDF contains applicant, booking, charge, payment and bank facts; payment notification emails PDF and sends SMS if configured. Email/SMS failures are logged without undoing confirmed payment. | [ReceiptService.cs](./backend/Services/ReceiptService.cs); [NotificationService.cs](./backend/Services/NotificationService.cs) |
| Uploads | Current API accepts `.pdf`, `.jpg`, `.jpeg`, `.png`, max size config default 5 MB, generated GUID filename; stores under web-root `uploads/idproofs`, while static request pipeline blocks direct access. Target requires extension + MIME/signature checks, outside-webroot/non-executable storage and authorized download; this improves security but changes storage/serving contract. | [RemainingControllers.cs:28](./backend/Controllers/RemainingControllers.cs#L28), [RemainingControllers.cs:34](./backend/Controllers/RemainingControllers.cs#L34), [RemainingControllers.cs:42](./backend/Controllers/RemainingControllers.cs#L42), [Program.cs](./backend/Program.cs) |
| Public lookup | Booking lookup by number and by mobile are separate public routes; refund lookup/track support multiple matching records depending on input. Current Web Forms migration changed lookup semantics to require booking number + mobile together. Do not treat that partial migration behavior as the API source of truth. | [BookingsController.cs:213](./backend/Controllers/BookingsController.cs#L213), [BookingsController.cs:221](./backend/Controllers/BookingsController.cs#L221), [RefundsController.cs](./backend/Controllers/RefundsController.cs); [Site.aspx.cs](./frontend/Site.aspx.cs) |

The working-tree `Site.aspx.cs` currently implements only a subset of these behaviors: direct SQL catalogue/availability estimate, contact insert, paired booking-number/mobile lookup, refund read-only lookup and read-only admin tables. Its booking payment continuation is deliberately disabled; it does not represent complete parity.

## 0.7 External dependency and compatibility inventory

| Existing dependency/integration | Current use | Proposed .NET Framework 4.8 direction / compatibility |
|---|---|---|
| ASP.NET Core 8 Web API | All API routes above | Remove after each approved vertical slice has a Web Forms equivalent; do not remove before dependent flow has been migrated and tested. |
| EF Core SQL Server + migrations | Persistence/schema management | Replace with parameterized `SqlConnection`/`SqlCommand` operations and idempotent SQL scripts. Migration snapshot is the schema reference; live DB must be inspected before script execution. |
| DI, repositories, service layers | `Program.cs` service registrations and backend layers | Page-local code-behind plus only justified shared helper methods; no DI/repositories/services per instruction. |
| AutoMapper | Registered in Program; no mapping profile was confirmed in this inventory | Replace with explicit mapping in the relevant page handler; verify no other mapping configuration before removal. |
| JWT bearer / `[Authorize]` | Admin/staff API authorization | Replace department-side checks with host panel session contract; citizen OTP remains separate. JWT claims and login endpoints are removed only after verified equivalence. |
| BCrypt.Net-Next | User password hashing on user CRUD; admin sign-in itself uses OTP | Do not port unused local password login. If stored password hashes remain operationally required, confirm whether host panel owns identity and how existing hashes are handled before selecting a .NET Framework-compatible BCrypt version. |
| Serilog | Console and rolling log files | `System.Diagnostics.Trace`/Event Log or a small file logger configured outside web root. Do not log secrets/OTP values. |
| Swashbuckle/Swagger | Development API docs | No replacement in deployed Web Forms module; remove with API after migration. |
| QuestPDF 2025.12.3 | Generates receipt PDF; config sets Community license | Candidate: PDFsharp **1.50.5147**. [NuGet package metadata](https://api.nuget.org/v3-flatcontainer/pdfsharp/1.50.5147/pdfsharp.nuspec) lists `lib/net20`, compatible with .NET Framework 4.8. Current [upstream PDFsharp LICENSE](https://raw.githubusercontent.com/empira/PDFsharp/master/LICENSE) states MIT, but this legacy package nuspec has only a stale license URL rather than an SPDX license expression, and its exact archived license text was not independently verified. Thus it is not yet an approved dependency: verify that exact package license with legal/procurement and build/test on net48 before adding it. Do not assume latest PDFsharp or QuestPDF supports net48. |
| Razorpay REST API + Checkout | Creates order through HTTP; client Checkout; signature verification HMAC-SHA256 | .NET Framework `HttpClient` for server-created orders and Razorpay Checkout browser SDK, with server-rendered order ID and normal callback URL POST as requested. Validate the callback contract, amount/currency/order association, signature, replay/idempotency and failure paths. |
| SMS/OTP provider (ACL gateway, DLT config) | OTP and payment SMS; credentials/template IDs via config | .NET Framework `HttpClient`/`WebRequest` plus `Web.config` placeholders; preserve gateway request and DLT templates. Never log codes, credentials or response secrets. Provider credentials/contracts not included in source. |
| SMTP | `System.Net.Mail`/SMTP receipt emails with PDF attachment | .NET Framework already supports `System.Net.Mail`; configure host/port/TLS/credentials in deployment config outside source. |
| Upload filesystem | ASP.NET `IFormFile`, GUID file name, currently web-root path | `FileUpload` control, streaming validation and generated file name under configured non-webroot directory; authenticated download handler/page. MIME sniffing and allowed sizes need explicit test vectors. |

## 0.8 Open questions and risks — approval required before implementation

1. **Database ownership/mode:** Is the destination an existing EF-managed live DB, or a new database? If existing, obtain schema-only access/backup and compare it with the snapshot. Phase 1 scripts must not be run until this is resolved. Fresh-vs-existing and `__EFMigrationsHistory` handling needs an agreed path.
2. **Applicant identity/profile:** Which citizen system supplies verified name, email, mobile, address, event/function type, guest count, and ID proof? Who owns the applicant mobile OTP (the requirement says keep citizen OTP, but the current code has refund/cancellation OTP and admin login OTP; no booking applicant OTP endpoint was found)?
3. **Departments/session contract:** Confirm exact session key names, user ID type, department ID meaning, allowed role strings/role-to-operation matrix, login expiry/logout behavior and host redirect URL. Proposed placeholder keys alone are not an authorization implementation.
4. **Public access / verification:** The unverified legacy refund and cancellation POST actions return 409 and are not mutation paths; do not add separate replacement actions. Upload, public booking lookup, and anonymous receipt email/PDF require review before direct port. Approve the expected citizen verification for document upload and receipt access.
5. **Payment data model:** Existing completion creates the booking as part of callback and may create duplicate bookings/receipts on replay. Define the pre-payment reservation model, callback idempotency key, gateway failure/abandonment expiry and reconciliation expectations.
6. **Capacity guarantee:** Existing conflict index is not a uniqueness/exclusion constraint for overlapping ranges. Preserve Serializable/locking behavior through ADO.NET transactions and run two-concurrent-user collision tests. Decide whether capacities are binary-per-slot despite integer capacity fields.
7. **Cancellation/refund policy:** Confirm exact refund formula/time cutoffs and whether those dates use UTC or local time; ensure source lines/formula can be treated as authoritative.
8. **Master-rule discrepancy:** The seeded Main Hall rule text says weekends/public holidays carry an additional Rs. 500 surcharge and mentions local-artist discount/extra time, but the seeded pricing has `HolidaySurchargeAmount = 0` and `BookingService` applies only active `Holidays` rows; no local-artist or extra-time input/calculation was found in this booking summary path. Confirm whether the calculation code or the master-rule text/rates is authoritative before a booking slice.
9. **File retention and access:** Specify production upload root, public/private document retention, backup policy, malware scanning and authorized serving contract.
10. **PDF:** NuGet metadata for PDFsharp 1.50.5147 contains `lib/net20`, compatible with .NET Framework 4.8. The current upstream PDFsharp LICENSE states MIT, but the legacy package nuspec has only a stale license URL rather than a license expression, and its exact archived license text was not independently verified. Keep PDFsharp as a candidate, not an approved dependency: verify the exact package license and do a net48 build plus visual parity test before adding it.
11. **Master data:** `DbInitializer` and EF seed include role/admin seeds and rate-chart-derived venue data. Confirm which existing DB master tables/data are authoritative and whether any new environment must be seeded. Do not use deprecated scripts or dummy values. The default seed contains a hard-coded Admin identity/password hash; the current payment service also supports a Mock provider (default when configuration is absent). Neither is proposed for the migrated module.
12. **Migration-map scope:** Backend controllers include functions outside the current Web Forms shell and some code files may contain dormant/template Phase 5/6 code excluded by the project file. Decide whether unsupported/unreferenced template features are excluded or must be brought into scope.

## 0.9 Phase 0 approval record

The user approved Phase 0 and directed continuation to Phase 1. The open questions in §0.8 remain unresolved implementation risks; Phase 1 therefore authors a non-destructive schema/seed script only. `database/Tables.sql` has been statically reviewed against the final snapshot's tables, columns, types, indexes, foreign keys, delete behavior, and defaults, and against the current model/initializer seed values. It creates missing objects and inserts missing master rows only; it does not alter or remove existing rows. No SQL has been run against a database. Configuration, code-behind, and page implementation remain out of scope until subsequent phases.
