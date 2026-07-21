import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BookingEquipmentItem } from '../../types/types';

// ─── Booking Slice ───────────────────────────────────────────────────────────
export interface BookingWizardState {
  step: number;
  // Step 1
  venueId:         number | null;
  venueName:       string;
  venuePricingId:  number | null;
  priceItemName:   string;
  chargeUnit:      string;
  fromDate:    string;
  toDate:      string;
  session:     'Morning' | 'Evening' | 'FullDay';
  // Step 2 (summary)
  totalDays:       number;
  baseRent:        number;
  holidayCharge:   number;
  equipmentCharge: number;
  grandTotal:      number;
  securityDeposit: number;
  cgstAmount:      number;
  sgstAmount:      number;
  equipment:       BookingEquipmentItem[];
  // Step 3 (applicant)
  applicant: {
    fullName:       string;
    email:          string;
    mobile:         string;
    alternateMobile: string;
    address:        string;
    functionName:   string;
    functionType:   string;
    expectedGuests: number;
    idProofType:    string;
    idProofFile:    string;
  };
  // Step 4 (bank)
  bankDetail: {
    bankName:          string;
    accountHolderName: string;
    accountNumber:     string;
    ifscCode:          string;
    branchName:        string;
    micrCode:          string;
  };
  // Result
  bookingNumber: string;
  bookingId:     number | null;
}

const initialState: BookingWizardState = {
  step: 0,
  venueId: null, venueName: '', venuePricingId: null, priceItemName: '', chargeUnit: '',
  fromDate: '', toDate: '', session: 'FullDay',
  totalDays: 0, baseRent: 0, holidayCharge: 0,
  equipmentCharge: 0, grandTotal: 0, securityDeposit: 0, cgstAmount: 0, sgstAmount: 0,
  equipment: [],
  applicant: {
    fullName: '', email: '', mobile: '', alternateMobile: '',
    address: '', functionName: '', functionType: '',
    expectedGuests: 0, idProofType: '', idProofFile: '',
  },
  bankDetail: {
    bankName: '', accountHolderName: '', accountNumber: '',
    ifscCode: '', branchName: '', micrCode: '',
  },
  bookingNumber: '',
  bookingId: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<number>) { state.step = action.payload; },
    nextStep(state) { state.step += 1; },
    prevStep(state) { state.step -= 1; },
    setAvailability(state, action: PayloadAction<Partial<BookingWizardState>>) {
      return { ...state, ...action.payload };
    },
    setSummary(state, action: PayloadAction<Partial<BookingWizardState>>) {
      return { ...state, ...action.payload };
    },
    setApplicant(state, action: PayloadAction<BookingWizardState['applicant']>) {
      state.applicant = action.payload;
    },
    setBankDetail(state, action: PayloadAction<BookingWizardState['bankDetail']>) {
      state.bankDetail = action.payload;
    },
    setBookingResult(state, action: PayloadAction<{ bookingNumber: string; bookingId: number }>) {
      state.bookingNumber = action.payload.bookingNumber;
      state.bookingId     = action.payload.bookingId;
    },
    resetBooking() { return initialState; },
  },
});

export const {
  setStep, nextStep, prevStep, setAvailability, setSummary,
  setApplicant, setBankDetail, setBookingResult, resetBooking,
} = bookingSlice.actions;
export default bookingSlice.reducer;
