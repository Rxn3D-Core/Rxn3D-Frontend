"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";

const DEFAULT_LOGO_PLACEHOLDER = "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/customers/logos/hmc_69736ca93cf31.jpeg";

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
  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setLeftLabel(role === "lab_admin" ? "Creating For" : "Sending To");
  }, []);

  const logoUrl = selectedLab?.logo && selectedLab.logo.trim() !== "" ? selectedLab.logo : DEFAULT_LOGO_PLACEHOLDER;
  const logoAlt = selectedLab?.name ? `${selectedLab.name} logo` : "Lab or office logo";

  return (
    <div className="h-[80px] border-b border-[#d9d9d9] bg-[#fdfdfd] flex items-center px-6 flex-shrink-0">
      {/* Left: Creating For (lab_admin) or Sending To (office_admin, etc.) */}
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-[#1d1d1b]">
          {leftLabel}
        </span>
        <img
          src={logoUrl}
          alt={logoAlt}
          className="h-[32px] object-contain"
        />
        <button
          type="button"
          onClick={onEditClick}
          className="p-0.5 rounded hover:bg-[#e5e7eb] transition-colors text-[#7f7f7f] hover:text-[#1d1d1b]"
          aria-label="Change lab or office"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Center: Henderson logo */}
      <div className="flex-1 flex items-center justify-center">
        <img
          src="https://static.wixstatic.com/media/babfaa_ac5b0cfb4cbd40c39757e53856a2e821~mv2.gif"
          alt="Henderson Modern Dentistry"
          className="h-[75px] object-contain"
        />
      </div>

      <div className="w-[120px]" />
    </div>
  );
}
