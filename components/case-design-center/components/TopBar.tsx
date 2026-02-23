"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

/**
 * Recommended logo dimensions for TopBar (2x resolution for sharp display).
 * Use these when letting users upload the center (profile) or left (lab) logo.
 */
export const TOP_BAR_RECOMMENDED_LOGO_SIZES = {
  /** Center (profile) logo — main branding in the middle of the bar */
  center: {
    mobile: { width: 160, height: 80 },   // < 640px, display ~40px tall
    sm: { width: 224, height: 112 },     // 640px+, display ~56px tall
    md: { width: 300, height: 150 },     // 768px+, display 75px tall
  },
  /** Left (lab/office) logo — next to "Creating For" / "Sending To" */
  left: {
    mobile: { width: 128, height: 64 },   // < 640px, display 32×64px
    sm: { width: 192, height: 96 },        // 640px+, display 40×96px
    md: { width: 360, height: 112 },       // 768px+, display 56×180px
  },
} as const;

export interface TopBarSelectedLab {
  logo: string | null;
  name?: string;
}

export interface TopBarProps {
  /** Selected lab or office from the wizard (logo and name). */
  selectedLab?: TopBarSelectedLab | null;
  /** Called when the user clicks the pencil to change lab/office selection. */
  onEditClick?: () => void;
  /** When true, hides the pencil edit icon (case has been submitted). */
  caseSubmitted?: boolean;
}

export function TopBar({ selectedLab, onEditClick, caseSubmitted = false }: TopBarProps = {}) {
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
    <div className="h-14 sm:h-16 md:h-[80px] border-b border-[#d9d9d9] bg-[#fdfdfd] flex items-center px-3 sm:px-4 md:px-6 flex-shrink-0">
      {/* Left: Creating For / Sending To — only shown after a lab/office is selected */}
      <div className="w-36 sm:w-44 md:w-[360px] flex items-center gap-3 sm:gap-4 min-w-0 flex-shrink-0">
        {selectedLab && (
          <>
            <span className="text-[14px] sm:text-[15px] md:text-base font-medium text-[#1d1d1b] whitespace-nowrap">
              {leftLabel}
            </span>
            {selectedLogoUrl ? (
              <img
                src={selectedLogoUrl}
                alt={logoAlt}
                className="h-8 w-16 sm:h-10 sm:max-w-24 md:h-[56px] md:max-w-[180px] object-contain flex-shrink-0"
              />
            ) : (
              <span className="text-[13px] sm:text-[14px] md:text-[15px] font-semibold text-[#1d1d1b] truncate max-w-24 sm:max-w-32 md:max-w-[220px]">
                {selectedLab.name}
              </span>
            )}
            {!caseSubmitted && (
              <button
                type="button"
                onClick={onEditClick}
                className="p-1 rounded hover:bg-[#e5e7eb] transition-colors text-[#7f7f7f] hover:text-[#1d1d1b] flex-shrink-0"
                aria-label="Change lab or office"
              >
                <Pencil size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Center: User's profile logo from API */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
        {profileLogoUrl && (
          <img
            src={profileLogoUrl}
            alt="Profile logo"
            className="h-10 sm:h-14 md:h-[75px] max-w-full object-contain"
          />
        )}
      </div>

      <div className="w-36 sm:w-44 md:w-[360px] flex-shrink-0" />
    </div>
  );
}
