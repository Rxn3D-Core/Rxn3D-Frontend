"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

export interface TopBarSelectedLab {
  logo: string | null;
  name?: string;
}

export interface TopBarProps {
  /** Selected lab or office from the wizard (logo and name). */
  selectedLab?: TopBarSelectedLab | null;
  /** Called when the user clicks the pencil to change lab/office selection. */
  onEditClick?: () => void;
}

export function TopBar({ selectedLab, onEditClick }: TopBarProps = {}) {
  const [leftLabel, setLeftLabel] = useState("Sending To");
  const [profileLogoUrl, setProfileLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setLeftLabel(role === "lab_admin" ? "Creating For" : "Sending To");
  }, []);

  useEffect(() => {
    const fetchProfileLogo = async () => {
      try {
        const token = localStorage.getItem("token");
        const customerId = localStorage.getItem("customerId");
        if (!token || !customerId) return;

        // Check cache first
        const cached = localStorage.getItem(`customerLogo_${customerId}`) || localStorage.getItem("customerLogo");
        if (cached) setProfileLogoUrl(cached);

        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const logo = data?.logo_url || data?.data?.logo_url || null;
        if (logo) {
          setProfileLogoUrl(logo);
          localStorage.setItem(`customerLogo_${customerId}`, logo);
          localStorage.setItem("customerLogo", logo);
        }
      } catch {
        // silently fall back to cached value
      }
    };
    fetchProfileLogo();
  }, []);

  const selectedLogoUrl = selectedLab?.logo && selectedLab.logo.trim() !== "" ? selectedLab.logo : null;
  const logoAlt = selectedLab?.name ? `${selectedLab.name} logo` : "Lab or office logo";

  return (
    <div className="h-[80px] border-b border-[#d9d9d9] bg-[#fdfdfd] flex items-center px-6 flex-shrink-0">
      {/* Left: Creating For / Sending To — only shown after a lab/office is selected */}
      <div className="w-[200px] flex items-center gap-2 min-w-0">
        {selectedLab && (
          <>
            <span className="text-[14px] font-medium text-[#1d1d1b] whitespace-nowrap">
              {leftLabel}
            </span>
            {selectedLogoUrl ? (
              <img
                src={selectedLogoUrl}
                alt={logoAlt}
                className="h-[32px] max-w-[80px] object-contain"
              />
            ) : (
              <span className="text-[13px] font-semibold text-[#1d1d1b] truncate max-w-[80px]">
                {selectedLab.name}
              </span>
            )}
            <button
              type="button"
              onClick={onEditClick}
              className="p-0.5 rounded hover:bg-[#e5e7eb] transition-colors text-[#7f7f7f] hover:text-[#1d1d1b] flex-shrink-0"
              aria-label="Change lab or office"
            >
              <Pencil size={14} />
            </button>
          </>
        )}
      </div>

      {/* Center: User's profile logo from API */}
      <div className="flex-1 flex items-center justify-center">
        {profileLogoUrl && (
          <img
            src={profileLogoUrl}
            alt="Profile logo"
            className="h-[75px] object-contain"
          />
        )}
      </div>

      <div className="w-[200px]" />
    </div>
  );
}
