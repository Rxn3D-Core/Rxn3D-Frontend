export interface Connection {
  id: string
  name: string
  address: string
  type: "Practice" | "Lab" | "User" | "Doctor"
  phoneNumber: string
  emailAddress: string
  date: string
  status: "Connected" | "Requested" | "Pending"
}

export interface LabData {
  name: string
  type: string
  email: string
  address: string
  phone: string
  id: string
  number: string
  website: string
  contactName: string
  contactEmail: string
  contactNumber: string
  joiningDate: string
  position: string
}

export interface CalendarEvent {
  id: string
  title: string
  type: "Birthday" | "Holiday" | "Appointment"
  date: string
  time?: string
  user?: string
  location?: string
  description?: string
  allDay?: boolean
  timezone?: string
  is_recurring?: boolean
}

export interface ProfileData {
  type: "practice" | "lab" | "user"
  name: string
  address: string
  contactPerson: string
  position: string
  contactNumber: string
  emailAddress: string
  businessHours?: {
    [key: string]: string
  }
  notes?: string
  mainLab?: string
}

// Driver Slip Types
export interface DriverSlipLocation {
  id: number;
  name: string;
}

export interface DriverSlipData {
  id: number;
  slip_number: string;
  current_location: DriverSlipLocation;
}

export interface DriverHistoryEntry {
  id: number;
  timestamp: string;
  location: string;
  user: string;
  receiver?: string;
  notes?: string;
}

export interface DriverSlipResponse {
  success: boolean;
  message: string;
  data: {
    slip: DriverSlipData;
    driver_history: DriverHistoryEntry[];
  };
}

// Extractions API Types - Now using Zod schemas from schemas.ts
// Import types from schemas.ts instead of defining here
