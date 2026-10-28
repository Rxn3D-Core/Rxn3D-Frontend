// components/ChangeDateModal.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  X,
  Info,
  CalendarIcon,
  Clock,
  ChevronDown,
  User,
  Layers,
} from "lucide-react";
import { format, parse } from "date-fns";
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { cn } from "@/lib/utils";

const EMPTY_HISTORY: CustomDeliveryDateEntry[] = [];

// Generates HH:MM slots every 30 minutes
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
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

interface ChangeDateModalProps {
  open: boolean;
  onClose: () => void;
  patient: string;
  stage: string;
  /** Display text for the "Current:" chip; defaults to the formatted delivery date. */
  currentDate?: string;
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
  history = EMPTY_HISTORY,
  onSave,
  onSaved,
}: ChangeDateModalProps) {
  const { toast } = useToast();
  const wasOpenRef = useRef(false);

  // Calculate default date: 2 days from today if no deliveryDate provided
  const defaultDate = useMemo(() => {
    if (deliveryDate) {
      return deliveryDate;
    }
    const today = new Date();
    const date = new Date(today);
    date.setDate(today.getDate() + 2);
    return date.toISOString().split("T")[0];
  }, [deliveryDate]);

  // The slip's saved delivery date (not today); null when absent or unparseable.
  const currentDeliveryDate = useMemo(() => {
    if (!deliveryDate) return null;
    const parsed = parse(deliveryDate, "yyyy-MM-dd", new Date());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  >(history);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);

  // Reset form only when the modal transitions closed → open (not on every re-render)
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setDate(defaultDate);
    setTime(initialTime);
    setReason("");
    setHistoryOpen(false);
    setDatePopoverOpen(false);
    setTimePopoverOpen(false);
    if (!slipId) {
      setCustomDeliveryDates(history);
    }
  }, [open, defaultDate, initialTime, slipId, history]);

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
      console.error("Error loading delivery date history:", error);
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
          error instanceof Error
            ? error.message
            : "Failed to save custom delivery date",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = !canEditDueDate || !reason.trim() || !date || !time || saving;
  const historyCount = customDeliveryDates.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl",
          // Mobile: bottom sheet; desktop: centered compact card
          "fixed left-0 right-0 top-auto bottom-0 translate-x-0 translate-y-0",
          "w-full max-w-none rounded-t-2xl max-h-[92dvh]",
          "sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto",
          "sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:w-[calc(100%-2rem)] sm:max-w-xl sm:rounded-2xl sm:max-h-[min(90vh,720px)]",
          "md:max-w-2xl lg:max-w-3xl"
        )}
      >
        {/* Drag handle — mobile affordance */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <DialogHeader className="shrink-0 space-y-0 border-b border-gray-100 px-4 pb-3 pt-1 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2AA6DE]/15 via-[#82298D]/10 to-[#C9539F]/15">
                <SlipListingCalendarIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-base font-semibold tracking-tight text-gray-900">
                  Change dates
                </DialogTitle>
                <DialogDescription className="mt-0.5 truncate text-xs text-gray-500">
                  Update delivery date &amp; time
                </DialogDescription>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {/* Context chips */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              <User className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate font-medium">{patient || "—"}</span>
            </span>
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              <Layers className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate">{stage || "—"}</span>
            </span>
            {currentDate || currentDeliveryDate ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-800">
                <CalendarIcon className="h-3 w-3 shrink-0 text-violet-500" />
                <span className="truncate">Current:{" "}
                  {currentDate ||
                    (currentDeliveryDate &&
                      format(currentDeliveryDate, "dd/MM/yyyy"))}</span>
              </span>
            ) : null}
          </div>

          {/* Type badge — delivery only for now */}
          <div className="mb-4">
            <span className="inline-flex items-center rounded-lg bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] px-3 py-1.5 text-xs font-medium text-white shadow-sm">
              Delivery Date
            </span>
          </div>

          {/* Date + time */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-900">
                New delivery
              </label>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                      aria-label="About default delivery date"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    <p className="text-xs leading-relaxed">
                      Defaults to 2 days from today when no date is set. Adjust
                      as needed.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEditDueDate}
                    className="h-11 w-full justify-start rounded-xl border-gray-200 bg-white px-3 text-sm font-normal shadow-sm hover:bg-gray-50"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-[#82298D]" />
                    <span className="truncate">
                      {date
                        ? format(parse(date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
                        : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  sideOffset={6}
                >
                  <Calendar
                    mode="single"
                    // Open on the slip's delivery month, not today's month.
                    defaultMonth={
                      date
                        ? parse(date, "yyyy-MM-dd", new Date())
                        : currentDeliveryDate ?? undefined
                    }
                    selected={
                      date ? parse(date, "yyyy-MM-dd", new Date()) : undefined
                    }
                    // Today is not highlighted; the slip's current delivery date is.
                    modifiers={{ currentDelivery: currentDeliveryDate ?? [] }}
                    modifiersClassNames={{
                      currentDelivery:
                        "ring-2 ring-inset ring-[#82298D]/40 rounded-md",
                    }}
                    classNames={{ day_today: "" }}
                    onSelect={(d) => {
                      if (!d) return;
                      setDate(format(d, "yyyy-MM-dd"));
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover open={timePopoverOpen} onOpenChange={setTimePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEditDueDate}
                    className="h-11 w-full justify-start rounded-xl border-gray-200 bg-white px-3 text-sm font-normal shadow-sm hover:bg-gray-50"
                  >
                    <Clock className="mr-2 h-4 w-4 shrink-0 text-[#2AA6DE]" />
                    <span className="truncate">{formatTimeDisplay(time)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-0" align="start" sideOffset={6}>
                  <ScrollArea className="h-56">
                    <div className="py-1">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            setTime(slot);
                            setTimePopoverOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2.5 text-left text-sm transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            "active:bg-accent",
                            time === slot &&
                              "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-white hover:text-white"
                          )}
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

          {/* Reason */}
          <div className="mb-4">
            <label
              htmlFor="change-date-reason"
              className="mb-1.5 block text-sm font-medium text-gray-900"
            >
              Reason <span className="text-rose-500">*</span>
            </label>
            <Textarea
              id="change-date-reason"
              placeholder="Why are you changing this date?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!canEditDueDate}
              className="min-h-[88px] resize-none rounded-xl border-gray-200 p-3 text-sm shadow-sm focus-visible:ring-[#82298D]/30"
              required
            />
            {!canEditDueDate ? (
              <p className="mt-1.5 text-xs text-amber-700">
                Only lab users can change due dates.
              </p>
            ) : null}
          </div>

          {/* Collapsible history */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/80">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              aria-expanded={historyOpen}
            >
              <span className="text-sm font-medium text-gray-800">
                History
                {historyCount > 0 ? (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-700">
                    {historyCount}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-400 transition-transform duration-200",
                  historyOpen && "rotate-180"
                )}
              />
            </button>

            {historyOpen ? (
              <div className="max-h-40 space-y-2 overflow-y-auto border-t border-gray-100 px-3 py-2.5">
                {loadingHistory ? (
                  <p className="py-2 text-xs text-gray-500">Loading…</p>
                ) : customDeliveryDates.length > 0 ? (
                  customDeliveryDates.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-gray-100"
                    >
                      <p className="text-xs leading-relaxed text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()} ·{" "}
                        {item.created_by.name}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-800">
                        → {item.formatted_delivery_date}
                        {(item.formatted_delivery_time ??
                          normalizeDeliveryTimeForInput(item.delivery_time)) &&
                          ` at ${
                            item.formatted_delivery_time ??
                            normalizeDeliveryTimeForInput(item.delivery_time)
                          }`}
                      </p>
                      {item.notes ? (
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-xs text-gray-500">No changes yet.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Sticky actions */}
        <div
          className={cn(
            "shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-11 flex-1 rounded-xl border-gray-200 text-sm font-medium text-gray-700 sm:flex-none sm:px-5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="h-11 flex-[1.4] rounded-xl bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] text-sm font-medium text-white shadow-md hover:brightness-110 disabled:opacity-50 sm:flex-1 sm:px-6"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
