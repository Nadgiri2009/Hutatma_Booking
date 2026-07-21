// ── Core Types ─────────────────────────────────────────────────────────────────

export interface User {
  id:        number;
  fullName:  string;
  email:     string;
  mobile:    string;
  roleId:    number;
  roleName:  string;
  isActive:  boolean;
  createdAt: string;
}

export interface Venue {
  venueId: number;
  venueName: string;
  description: string | null;
  capacity: number | null;
  location: string | null;
  status: string;
  primaryImageUrl: string | null;
  facilities: string[];
}

export interface VenueFacility {
  id: number;
  facilityName: string;
  description: string | null;
}

export interface VenueRule {
  id: number;
  ruleTitle: string;
  ruleText: string;
}

export interface VenuePricing {
  id: number;
  priceItemName: string;
  chargeUnit: string;
  amount: number;
  refundableDeposit: number;
  holidaySurchargeAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface VenueDetails extends Omit<Venue, 'facilities'> {
  facilities: VenueFacility[];
  images: Array<{
    id: number;
    imageUrl: string;
    caption: string | null;
    isPrimary: boolean;
  }>;
  rules: VenueRule[];
  pricing: VenuePricing[];
}

export interface Holiday {
  id:          number;
  holidayDate: string;
  name:        string;
  description: string | null;
  isActive:    boolean;
}

export type BookingStatus = 'PendingPayment' | 'Confirmed' | 'Cancelled';
export type SessionType   = 'Morning' | 'Evening' | 'FullDay';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Booking {
  id:              number;
  bookingNumber:   string;
  venueId:         number;
  venueName:       string;
  venuePricingId:  number;
  priceItemName:   string;
  chargeUnit:      string;
  fromDate:        string;
  toDate:          string;
  session:         SessionType;
  totalDays:       number;
  baseRent:        number;
  holidayCharge:   number;
  securityDeposit: number;
  cgstAmount:      number;
  sgstAmount:      number;
  grandTotal:      number;
  equipmentCharge: number;
  equipment:       BookingEquipmentItem[];
  status:          BookingStatus;
  createdAt:       string;
  applicantName:   string;
  applicantMobile: string;
  applicantEmail:  string;
  applicantAddress: string;
  functionName:    string;
  receiptNumber?:  string;
  paymentTransactionRef?: string | null;
  paymentDate?:    string | null;
  paymentStatus?:  string | null;
}

export interface ApplicantDetails {
  fullName:        string;
  email:           string;
  mobile:          string;
  alternateMobile: string;
  address:         string;
  functionName:    string;
  functionType:    string;
  expectedGuests:  number;
  idProofType:     string;
  idProofFile:     string;
}

export interface BankDetails {
  bankName:          string;
  accountHolderName: string;
  accountNumber:     string;
  ifscCode:          string;
  branchName:        string;
  micrCode:          string;
}

export interface BookingEquipmentItem {
  equipmentId:   number;
  equipmentName: string;
  chargeUnit:    string;
  unitPrice:     number;
  quantity:      number;
  totalPrice:    number;
}

export interface VenueEquipment {
  id:            number;
  equipmentName: string;
  chargeUnit:    string;
  amount:        number;
  freeQuantity:  number;
}

export interface BookingSummary {
  totalDays:       number;
  priceItemName:   string;
  chargeUnit:      string;
  baseRent:        number;
  holidayCharge:   number;
  equipmentCharge: number;
  securityDeposit: number;
  cgstAmount:      number;
  sgstAmount:      number;
  grandTotal:      number;
  holidayDays:     number;
  cgstPercent:     number;
  sgstPercent:     number;
}

export interface DateSlot {
  date:           string;
  morningStatus:  'Available' | 'Booked' | 'Unavailable';
  eveningStatus:  'Available' | 'Booked' | 'Unavailable';
  fullDayStatus:  'Available' | 'Booked' | 'Unavailable';
}

export interface Payment {
  id:             number;
  bookingId:      number;
  bookingNumber:  string;
  amount:         number;
  paymentMethod:  string;
  transactionRef: string | null;
  paymentDate:    string | null;
  status:         PaymentStatus;
  remarks:        string | null;
}

export interface GalleryItem {
  id:           number;
  title:        string;
  description:  string | null;
  mediaType:    'Photo' | 'Video';
  filePath:     string | null;
  videoURL:     string | null;
  thumbnailPath: string | null;
  displayOrder: number;
  isActive:     boolean;
}

export interface Notice {
  id:          number;
  title:       string;
  content:     string;
  isImportant: boolean;
  publishDate: string;
  expiryDate:  string | null;
  isActive:    boolean;
}

export interface Complaint {
  id:            number;
  bookingId:     number | null;
  applicantName: string;
  mobile:        string;
  email:         string | null;
  subject:       string;
  description:   string;
  status:        'Open' | 'InProgress' | 'Resolved' | 'Closed';
  resolution:    string | null;
  createdAt:     string;
}

export interface Cancellation {
  id:           number;
  bookingId:    number;
  reason:       string;
  requestedBy:  string;
  refundAmount: number;
  refundStatus: 'Pending' | 'Processed' | 'Rejected';
  createdAt:    string;
}

export interface DashboardStats {
  totalBookings:          number;
  pendingPaymentBookings: number;
  confirmedBookings:      number;
  cancelledBookings:      number;
  totalRevenue:           number;
  totalComplaints:        number;
  recentBookings:         Booking[];
}

export interface PagedResult<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface LoginResponse {
  token:     string;
  fullName:  string;
  role:      string;
  expiresAt: string;
}
