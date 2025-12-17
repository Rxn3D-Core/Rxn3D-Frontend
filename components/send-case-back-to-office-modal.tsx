"use client"

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface SendCaseBackToOfficeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export default function SendCaseBackToOfficeModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: SendCaseBackToOfficeModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason("");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Send case back to office
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning message with icon */}
          <div className="flex items-start gap-3 mb-6">
            <div className="flex-shrink-0">
              <div className="w-15 h-12 rounded-full flex items-center justify-center">
              <svg width="66" height="57" viewBox="0 0 66 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_4490_93582)">
                <path d="M61.8946 56.3514H3.70941C1.07284 56.3514 -0.562176 53.4743 0.78278 51.2009L29.8757 2.02256C31.194 -0.205436 34.4107 -0.205436 35.7283 2.02256L64.8212 51.2015C66.1662 53.475 64.5319 56.3521 61.8946 56.3521V56.3514Z" fill="#EDBA29"/>
                <path d="M30.76 39.6384L29.3371 18.4373C29.2084 16.5182 30.656 14.8577 32.5704 14.7287C34.4848 14.5997 36.1412 16.0509 36.2699 17.9701C36.2799 18.1211 36.2786 18.2903 36.2699 18.438L34.8469 39.639C34.6015 42.1805 31.0021 42.1745 30.76 39.639V39.6384Z" fill="black"/>
                <path d="M32.8031 50.1885C34.3689 50.1885 35.6383 48.916 35.6383 47.3462C35.6383 45.7765 34.3689 44.5039 32.8031 44.5039C31.2372 44.5039 29.9678 45.7765 29.9678 47.3462C29.9678 48.916 31.2372 50.1885 32.8031 50.1885Z" fill="black"/>
                </g>
                <defs>
                <clipPath id="clip0_4490_93582">
                <rect width="65" height="56" fill="white" transform="translate(0.302734 0.351562)"/>
                </clipPath>
                </defs>
                </svg>

              </div>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              You are sending this case back to office. All fees will be waived.
            </p>
          </div>

          {/* Textarea */}
          <div className="mb-6">
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-sm"
              placeholder="Please provide a reason for putting case on hold."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}