export interface Holiday {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  is_recurring: boolean;
  description: string;
  customer_id: number;
  created_at: string;
  updated_at: string;
}

export interface HolidayCreatePayload {
  customer_id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  description: string;
}

export interface HolidayUpdatePayload {
  name: string;
  date: string;
  is_recurring: boolean;
  description: string;
} 