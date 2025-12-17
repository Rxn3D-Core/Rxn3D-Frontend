// components/ChangeDateModal.tsx

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as LucideCalendar, Clock, X, MoreVertical, Info } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useSlipContext } from "@/app/lab-case-management/SlipContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChangeDateHistoryItem {
  id: number;
  slip_id: number;
  delivery_date: string;
  delivery_time: string;
  notes: string;
  created_at: string;
  formatted_delivery_date: string;
  formatted_delivery_time: string;
  created_by: {
    id: number;
    name: string;
    email: string;
  };
}

interface ChangeDateModalProps {
  open: boolean;
  onClose: () => void;
  patient: string;
  stage: string;
  currentDate: string;
  deliveryDate: string;
  deliveryTime: string;
  slipId?: number;
  history?: ChangeDateHistoryItem[]; // Keep for backward compatibility but we'll fetch our own
  onSave?: (date: string, time: string, reason: string) => void; // Keep for backward compatibility
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
  history = [], // Keep for backward compatibility
  onSave, // Keep for backward compatibility
}: ChangeDateModalProps) {
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
  const [time, setTime] = useState(deliveryTime || "17:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [customDeliveryDates, setCustomDeliveryDates] = useState<ChangeDateHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { createCustomDeliveryDate, fetchCustomDeliveryDates } = useSlipContext();

  // Update date when modal opens or deliveryDate changes
  useEffect(() => {
    if (open) {
      setDate(defaultDate);
    }
  }, [open, defaultDate]);

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
      const response = await fetchCustomDeliveryDates(slipId);
      if (response && response.success && Array.isArray(response.data)) {
        setCustomDeliveryDates(response.data);
      }
    } catch (error) {
      console.error('Error loading delivery date history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
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
      const res = await createCustomDeliveryDate(slipId, date, time, reason);
      if (res && res.success) {
        setReason("");
        // Reload history after successful save
        await loadHistory();
        // Don't close the modal - just reset the form
      }
    } catch (error) {
      console.error('Error saving custom delivery date:', error);
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = !reason || !date || !time || saving;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl p-0 overflow-visible rounded-lg border-0"
        style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)" }}
      >
        <DialogHeader className="px-8 pt-8 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 rounded-lg p-2.5 flex">
                <LucideCalendar className="w-6 h-6 text-white" />
              </span>
              <DialogTitle className="text-xl font-semibold">
                Change dates
              </DialogTitle>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="mt-0.5 h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-8 pt-6 pb-0">
          <div className="flex items-center justify-between mb-8">
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
              <LucideCalendar className="w-5 h-5" />
              <span className="text-lg">{currentDate}</span>
            </div>
          </div>

          <div className="flex gap-6 mb-10 justify-center">
            <Button
              variant="outline"
              disabled
              className="rounded-xl border-gray-300 font-medium text-gray-400 bg-gray-50 cursor-not-allowed px-8 py-4 text-lg min-w-[180px]"
            >
              Pick up Date
            </Button>
            <Button
              variant="default"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 font-medium px-8 py-4 text-lg min-w-[180px]"
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
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pr-12 h-12 rounded-lg border-gray-300 text-base"
                />
                <LucideCalendar className="w-5 h-5 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative flex-1">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pr-12 h-12 rounded-lg border-gray-300 text-base"
                  step="300"
                />
                <Clock className="w-5 h-5 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <Textarea
            placeholder="Please provide reason for change *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-8 min-h-[100px] resize-none rounded-lg border-gray-300 text-base p-4"
            required
          />

          <div className="flex justify-end gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-3 font-medium text-gray-600 hover:bg-gray-100 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg text-base"
            >
              Save Dates
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
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
                  className="bg-gray-100 p-5 relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-base text-gray-500 leading-relaxed italic">
                      {new Date(item.created_at).toLocaleDateString()} @ {item.created_by.name} changed delivery date to {item.formatted_delivery_date} at {new Date(item.delivery_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-gray-600"
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