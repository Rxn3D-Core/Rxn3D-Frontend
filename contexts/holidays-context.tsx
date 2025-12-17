"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { Holiday, HolidayCreatePayload, HolidayUpdatePayload } from "@/types/holidays";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface HolidaysContextValue {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  fetchHolidays: () => Promise<void>;
  createHoliday: (payload: HolidayCreatePayload) => Promise<Holiday | null>;
  updateHoliday: (id: number, payload: HolidayUpdatePayload) => Promise<Holiday | null>;
  deleteHoliday: (id: number) => Promise<boolean>;
}

const HolidaysContext = createContext<HolidaysContextValue | undefined>(undefined);

interface HolidaysProviderProps {
  children: ReactNode;
}

export function HolidaysProvider({ children }: HolidaysProviderProps) {
  const { user } = useAuth();
  const customerId =
    user?.customers?.find((c: any) => c.is_primary)?.id ??
    user?.customers?.[0]?.id;

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      let token = "";
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token") || "";
      }
      const res = await fetch(`${API_BASE_URL}/holidays?customer_id=${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setHolidays(data.data);
      } else {
        setError(data.message || "Failed to fetch holidays");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const createHoliday = useCallback(async (payload: HolidayCreatePayload) => {
    setLoading(true);
    setError(null);
    try {
      let token = "";
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token") || "";
      }
      // Always include customer_id from context
      const fullPayload = { ...payload, customer_id: customerId };
      const res = await fetch(`${API_BASE_URL}/holidays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(fullPayload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHolidays((prev) => [...prev, data.data]);
        return data.data;
      } else {
        setError(data.message || "Failed to create holiday");
        return null;
      }
    } catch (err: any) {
      setError(err.message || "Failed to create holiday");
      return null;
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const updateHoliday = useCallback(async (id: number, payload: HolidayUpdatePayload) => {
    setLoading(true);
    setError(null);
    try {
      let token = "";
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token") || "";
      }
      // Always include customer_id from context if backend requires it
      const fullPayload = { ...payload, customer_id: customerId };
      const res = await fetch(`${API_BASE_URL}/holidays/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(fullPayload),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHolidays((prev) => prev.map((h) => (h.id === id ? data.data : h)));
        return data.data;
      } else {
        setError(data.message || "Failed to update holiday");
        return null;
      }
    } catch (err: any) {
      setError(err.message || "Failed to update holiday");
      return null;
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const deleteHoliday = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      let token = "";
      if (typeof window !== "undefined") {
        token = localStorage.getItem("token") || "";
      }
      const res = await fetch(`${API_BASE_URL}/holidays/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setHolidays((prev) => prev.filter((h) => h.id !== id));
        return true;
      } else {
        setError(data.message || "Failed to delete holiday");
        return false;
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete holiday");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchHolidays();
    }
  }, [fetchHolidays, customerId]);

  return (
    <HolidaysContext.Provider
      value={{ holidays, loading, error, fetchHolidays, createHoliday, updateHoliday, deleteHoliday }}
    >
      {children}
    </HolidaysContext.Provider>
  );
}

export function useHolidays() {
  const ctx = useContext(HolidaysContext);
  if (!ctx) throw new Error("useHolidays must be used within a HolidaysProvider");
  return ctx;
}