// components/ChangeDateModal.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, MoreVertical, Info, CalendarIcon, Clock } from "lucide-react";
import { format, parse } from "date-fns";

// Generates HH:MM slots every 30 minutes
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function formatTimeDisplay(val: string) {
  if (!val) return "Pick a time";
  const [h, m] = val.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon";
import { useState, useEffect, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  createSlipCustomDeliveryDate,
  getSlipCustomDeliveryDates,
  normalizeDeliveryTimeForInput,
  type CustomDeliveryDateEntry,
} from "@/lib/api/slip-custom-delivery-dates";
import {
  canChangeSlipDueDate,
  getStoredSlipUserRole,
} from "@/lib/slip-user-role";

interface ChangeDateModalProps {
  open: boolean;
  onClose: () => void;
  patient: string;
  stage: string;
  currentDate: string;
  deliveryDate: string;
  deliveryTime: string;
  slipId?: number;
  /** Raw delivery time from slip API (optional; falls back to deliveryTime display string). */
  deliveryTimeRaw?: string;
  history?: CustomDeliveryDateEntry[];
  onSave?: (date: string, time: string, reason: string) => void;
  /** Called after a successful API save (e.g. refresh virtual slip). */
  onSaved?: () => void;
}

export default function ChangeDateModal({
  open,
  onClose,
  patient,
  stage,
  currentDate,
  deliveryDate,
  deliveryTime,
  slipId,
  deliveryTimeRaw,
  history = [],
  onSave,
  onSaved,
}: ChangeDateModalProps) {
  const { toast } = useToast();
  // Calculate default date: 2 days from today if no deliveryDate provided
  const defaultDate = useMemo(() => {
    if (deliveryDate) {
      return deliveryDate;
    }
    const today = new Date();
    const date = new Date(today);
    date.setDate(today.getDate() + 2);
    return date.toISOString().split('T')[0];
  }, [deliveryDate]);

  const [date, setDate] = useState(defaultDate);
  const initialTime = useMemo(
    () => normalizeDeliveryTimeForInput(deliveryTimeRaw ?? deliveryTime),
    [deliveryTimeRaw, deliveryTime]
  );
  const [time, setTime] = useState(initialTime);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [customDeliveryDates, setCustomDeliveryDates] = useState<
    CustomDeliveryDateEntry[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Update date when modal opens or deliveryDate changes
  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setTime(initialTime);
    }
  }, [open, defaultDate, initialTime]);

  // Fetch history when modal opens and slipId is available
  useEffect(() => {
    if (open && slipId) {
      loadHistory();
    }
  }, [open, slipId]);

  const loadHistory = async () => {
    if (!slipId) return;
    
    setLoadingHistory(true);
    try {
      const response = await getSlipCustomDeliveryDates(slipId);
      if (Array.isArray(response.data)) {
        setCustomDeliveryDates(response.data);
      }
    } catch (error) {
      console.error('Error loading delivery date history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const canEditDueDate = canChangeSlipDueDate(getStoredSlipUserRole());

  const handleSave = async () => {
    if (!canEditDueDate) {
      toast({
        title: "Not allowed",
        description: "Only lab users can change due dates.",
        variant: "destructive",
      });
      return;
    }

    if (!slipId) {
      // Fallback to old onSave if slipId not provided
      if (onSave) {
        setSaving(true);
        await onSave(date, time, reason);
        setSaving(false);
        setReason("");
        onClose();
      }
      return;
    }

    setSaving(true);
    try {
      const res = await createSlipCustomDeliveryDate(slipId, {
        delivery_date: date,
        delivery_time: time,
        notes: reason,
      });
      setReason("");
      await loadHistory();
      onSaved?.();
      toast({
        title: "Saved",
        description: res.message || "Custom delivery date created",
      });
      onClose();
    } catch (error) {
      console.error("Error saving custom delivery date:", error);
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Failed to save custom delivery date",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = !canEditDueDate || !reason || !date || !time || saving;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-4xl p-0 overflow-y-auto rounded-lg border-0"
        style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)" }}
      >
        <DialogHeader className="px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <SlipListingCalendarIcon className="h-8 w-8" />
              <DialogTitle className="text-xl font-semibold">
                Change dates
              </DialogTitle>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="mt-0.5 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-8 pt-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div className="text-base">
              <div className="mb-2">
                <span className="font-medium">Patient:</span>{" "}
                <span className="text-lg">{patient}</span>
              </div>
              <div>
                <span className="font-medium">Stage:</span> <span className="text-lg">{stage}</span>
              </div>
            </div>
            <div className="text-base text-muted-foreground flex items-center gap-2 font-medium">
              <SlipListingCalendarIcon className="h-5 w-5" />
              <span className="text-lg">{currentDate}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-8 sm:mb-10 sm:justify-center">
            <Button
              variant="outline"
              disabled
              className="rounded-xl border-gray-300 font-medium text-gray-400 bg-gray-50 cursor-not-allowed px-8 py-4 text-lg w-full sm:min-w-[180px] sm:w-auto"
            >
              Pick up Date
            </Button>
            <Button
              variant="default"
              className="rounded-xl bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 font-medium px-8 py-4 text-lg w-full sm:min-w-[180px] sm:w-auto"
            >
              Delivery Date
            </Button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delivery Date</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      By default, 2 days are added to the current date to calculate the due date.
                      You can adjust this date as needed. The system automatically sets the delivery
                      date to 2 days from today when no specific date is provided.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!canEditDueDate}
                      className="w-full h-12 justify-start rounded-lg border-gray-300 text-base font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                      {date ? format(parse(date, "yyyy-MM-dd", new Date()), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
                      onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!canEditDueDate}
                      className="w-full h-12 justify-start rounded-lg border-gray-300 text-base font-normal"
                    >
                      <Clock className="mr-2 h-4 w-4 text-gray-400" />
                      {formatTimeDisplay(time)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-0" align="start">
                    <ScrollArea className="h-64">
                      <div className="py-1">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setTime(slot)}
                            className={`w-full px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors ${
                              time === slot ? "bg-primary text-primary-foreground" : ""
                            }`}
                          >
                            {formatTimeDisplay(slot)}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Textarea
            placeholder="Please provide reason for change *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={!canEditDueDate}
            className="mb-6 sm:mb-8 min-h-[100px] resize-none rounded-lg border-gray-300 text-base p-4"
            required
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-3 font-medium text-gray-600 hover:bg-gray-100 text-base w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white font-medium px-8 py-3 rounded-lg text-base w-full sm:w-auto"
            >
              Save Dates
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 px-4 sm:px-8 py-6 border-t border-gray-200">
          <div className="font-bold text-xl text-black mb-6">Change Date History</div>
          <div className="space-y-0 max-h-60 overflow-y-auto">
            {loadingHistory ? (
              <div className="text-base text-gray-500 p-4">
                Loading history...
              </div>
            ) : customDeliveryDates.length > 0 ? (
              customDeliveryDates.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-100 p-4 sm:p-5 relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-sm sm:text-base text-gray-500 leading-relaxed italic pr-2">
                      {new Date(item.created_at).toLocaleDateString()} @ {item.created_by.name} changed delivery date to {item.formatted_delivery_date} at {item.formatted_delivery_time ?? normalizeDeliveryTimeForInput(item.delivery_time)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="text-base text-black font-normal leading-relaxed">{item.notes}</div>
                </div>
              ))
            ) : (
              <div className="text-base text-gray-500 p-4">
                No change history.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}