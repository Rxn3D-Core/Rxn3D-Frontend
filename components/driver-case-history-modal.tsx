"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Truck, Zap, User, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// EXAMPLE INTERFACE (adapt as needed)
interface SlipHistoryItem {
  slipNumber: string;
  stage: string;
  deliveryDate: string; // formatted
  isRush?: boolean;
}

interface DriverHistoryRow {
  timestamp: string;
  location: string;
  user: string;
  receiver: string;
}

interface DriverHistoryModalProps {
  open: boolean;
  onClose: () => void;
  office: string;
  code: string;
  patient: string;
  pan: string;
  caseNo: string;
  slipHistories: SlipHistoryItem[];
  timeline: DriverHistoryRow[];
  onSubmitSignature?: (signature: string) => void;
}

export default function DriverHistoryModal({
  open,
  onClose,
  office,
  code,
  patient,
  pan,
  caseNo,
  slipHistories,
  timeline,
  onSubmitSignature
}: DriverHistoryModalProps) {
  const [signature, setSignature] = useState("");

  const handleSubmit = () => {
    if (onSubmitSignature) onSubmitSignature(signature);
    setSignature("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full mx-4 rounded-xl p-0 overflow-hidden bg-white shadow-2xl border-0">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Driver History</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-8 py-6">
          {/* Case Info - Two Column Layout */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 mb-8">
            <div className="space-y-4">
              <div className="flex">
                <span className="text-gray-700 font-medium w-20">Office:</span>
                <span className="text-gray-900 font-semibold">{office}</span>
              </div>
              <div className="flex">
                <span className="text-gray-700 font-medium w-20">Code:</span>
                <span className="text-gray-900 font-semibold">{code}</span>
              </div>
              <div className="flex">
                <span className="text-gray-700 font-medium w-20">Patient:</span>
                <span className="text-gray-900 font-semibold">{patient}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex">
                <span className="text-gray-700 font-medium w-20">Pan #:</span>
                <span className="text-gray-900 font-semibold">{pan || "----"}</span>
              </div>
              <div className="flex">
                <span className="text-gray-700 font-medium w-20">Case #:</span>
                <span className="text-gray-900 font-semibold">{caseNo}</span>
              </div>
            </div>
          </div>

          {/* Slip Histories - Horizontal Cards with Arrow */}
          <div className="space-y-3 mb-8">
            {slipHistories.map((s, i) => (
              <div key={s.slipNumber} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-1">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  <div className="flex items-center gap-4 ml-2">
                    <div className="bg-gray-100 px-4 py-2 rounded-full">
                      <span className="text-sm font-medium text-gray-700">Slip #: {s.slipNumber}</span>
                    </div>
                    <div className="bg-gray-100 px-4 py-2 rounded-full">
                      <span className="text-sm font-medium text-gray-700">{s.stage}</span>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2",
                      s.isRush 
                        ? "bg-red-50 text-red-600" 
                        : "bg-gray-100 text-gray-700"
                    )}>
                      {s.isRush && <Zap className="w-4 h-4 text-red-600" />}
                      {s.deliveryDate}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 font-semibold text-gray-900 text-base">Timestamp</th>
                  <th className="text-left py-4 font-semibold text-gray-900 text-base">Location</th>
                  <th className="text-left py-4 font-semibold text-gray-900 text-base">User</th>
                  <th className="text-left py-4 font-semibold text-gray-900 text-base">Receiver</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-4 text-gray-900">{row.timestamp}</td>
                    <td className="py-4 text-gray-900">{row.location}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.667 0-8 1.333-8 4v2h16v-2c0-2.667-5.333-4-8-4z" fill="#6B7280"/>
                          </svg>
                        </div>
                        <span className="text-gray-900">{row.user}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.667 0-8 1.333-8 4v2h16v-2c0-2.667-5.333-4-8-4z" fill="#6B7280"/>
                          </svg>
                        </div>
                        <span className="text-gray-900">{row.receiver}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature Section */}
          <div className="space-y-4">
            <Textarea
              className="w-full min-h-[120px] resize-none rounded-lg border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
              placeholder="Signature *"
              value={signature}
              onChange={e => setSignature(e.target.value)}
            />
            <div className="flex justify-end">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-base"
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Example usage with sample data
const SampleDriverHistoryModal = () => {
  const [isOpen, setIsOpen] = useState(true);
  
  const sampleSlipHistories = [
    {
      slipNumber: "665479",
      stage: "Bite block",
      deliveryDate: "01/07/2025 @ 4pm",
      isRush: false
    },
    {
      slipNumber: "657894", 
      stage: "Try in with teeth",
      deliveryDate: "01/13/2025 @ 4pm",
      isRush: true
    }
  ];

  const sampleTimeline = [
    {
      timestamp: "01/07/2025, 5:34 pm",
      location: "In office ready to pick up → on route to the lab",
      user: "Office Assistant",
      receiver: "Jeff"
    },
    {
      timestamp: "01/07/2025, 5:34 pm", 
      location: "On route to the lab → In lab",
      user: "Jeff",
      receiver: "Arely"
    },
    {
      timestamp: "01/07/2025, 5:34 pm",
      location: "In lab → In lab ready to pick up", 
      user: "Arely",
      receiver: "Horacio"
    },
    {
      timestamp: "01/07/2025, 5:34 pm",
      location: "In lab ready to pick up → On route to the office",
      user: "Horacio", 
      receiver: "Jeff"
    }
  ];

  return (
    <DriverHistoryModal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      office="Henderson Modern Dentistry"
      code="HMD" 
      patient="Mary Gutierrez"
      pan="----"
      caseNo="1256489"
      slipHistories={sampleSlipHistories}
      timeline={sampleTimeline}
      onSubmitSignature={(sig) => {}}
    />
  );
};

export { SampleDriverHistoryModal };