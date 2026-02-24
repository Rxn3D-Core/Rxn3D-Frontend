"use client";

import { useState } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import type { NotesProps } from "../types";

export function CaseSummaryNotes({ right1Brand, right1Platform, right2Brand, right2Platform }: NotesProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "maxillary" | "mandibular">("mandibular");
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const defaultMaxillary = `Fabricate full contour zirconia crowns for #4–5 in the finish stage, using tooth shade Vita 3D Master A2 and stump shade A2. Retention: screw-retained. Design specifications: Modified ridge pontic, Type II embrasures, POS pontic design, open proximal contact, standard occlusal contact. Impression: STL file. Add-ons selected`;

  const defaultMandibular = `Fabricate a full contour zirconia crown for #19 in the finish stage, using tooth shade Vita 3D Master A2 and stump shade A2. Retention: screw-retained implant. Implant: ${right1Brand || "TruAbutment"}, ${right1Platform || "Truscan platform"}, 4.5 mm, with tissue model; using a custom abutment provided by the office. Design specifications: Modified ridge pontic, Type II embrasures, POS pontic design, open proximal contact, standard occlusal contact. Impression: STL file. Add-ons selected.`;

  const [noteText, setNoteText] = useState(
    `Maxillary: ${defaultMaxillary}\n\nMANDIBULAR: ${defaultMandibular}`
  );

  const getDisplayValue = () => {
    if (activeTab === "summary") return noteText;
    if (activeTab === "maxillary") {
      const match = noteText.match(/Maxillary:\s*([\s\S]*?)(?=\n\nMANDIBULAR:|$)/i);
      return match ? `Maxillary: ${match[1].trim()}` : noteText;
    }
    const match = noteText.match(/MANDIBULAR:\s*([\s\S]*?)$/i);
    return match ? `MANDIBULAR: ${match[1].trim()}` : noteText;
  };

  const handleChange = (newValue: string) => {
    if (activeTab === "summary") {
      setNoteText(newValue);
    } else if (activeTab === "maxillary") {
      const mandMatch = noteText.match(/(\n\nMANDIBULAR:[\s\S]*$)/i);
      setNoteText(newValue + (mandMatch ? mandMatch[1] : ""));
    } else {
      const maxMatch = noteText.match(/^([\s\S]*?\n\n)(?=MANDIBULAR:)/i);
      setNoteText((maxMatch ? maxMatch[1] : "") + newValue);
    }
  };

  const tabs = [
    { key: "summary" as const, icon: ClipboardList, title: "Stage Notes" },
    { key: "maxillary" as const, icon: ClipboardCheck, title: "Maxillary Notes" },
    { key: "mandibular" as const, icon: CheckCircle2, title: "Lab Connect Notes" },
  ];

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-start">
        {/* Left side icon buttons */}
        {!collapsed && (
          <div className="flex flex-col flex-shrink-0">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isFirst = idx === 0;
              const isLast = idx === tabs.length - 1;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-[37px] h-[53px] flex items-center justify-center border border-[#7f7f7f] -my-[1px] transition-colors ${
                    isFirst ? "rounded-tl-[11px]" : ""
                  } ${isLast ? "rounded-bl-[11px]" : ""} ${
                    isActive
                      ? "bg-[#1162a8] border-[#1162a8]"
                      : "bg-white hover:bg-[#f0f0f0]"
                  }`}
                  title={tab.title}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-[#7f7f7f]"} />
                </button>
              );
            })}
          </div>
        )}

        {/* Right side - textarea as fieldset */}
        <fieldset
          className={`flex-1 relative border border-[#7f7f7f] bg-white transition-all ${
            collapsed
              ? "rounded-[8px] h-[40px]"
              : expanded
                ? "rounded-r-[8px] h-[300px]"
                : "rounded-r-[8px] h-[158px]"
          }`}
        >
          <legend className="ml-2 px-1 text-[14px] text-[#7f7f7f] font-normal tracking-[0.05em]">
            Case summary notes
          </legend>

          {collapsed ? (
            <div className="flex items-center justify-between px-[15px] h-[20px]">
              <span className="text-[14px] text-[#7f7f7f] truncate flex-1">
                {getDisplayValue().slice(0, 80)}...
              </span>
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-2">
                <button onClick={() => setCollapsed(false)} title="Expand">
                  <ChevronDown size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => { setCollapsed(false); setExpanded(true); }} title="Full view">
                  <Maximize2 size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start px-[15px] pb-[5px] h-[calc(100%-14px)]">
              <textarea
                value={getDisplayValue()}
                onChange={(e) => handleChange(e.target.value)}
                className="flex-1 h-full text-[18px] leading-[22px] text-black font-normal resize-none outline-none bg-transparent"
              />
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-2 pt-1">
                <button onClick={() => { setCollapsed(true); setExpanded(false); }} title="Collapse">
                  <ChevronUp size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => setExpanded(!expanded)} title={expanded ? "Default size" : "Expand"}>
                  <Maximize2 size={14} className={`hover:text-[#7f7f7f] transition-colors ${expanded ? "text-[#1162a8]" : "text-[#b4b0b0]"}`} />
                </button>
              </div>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}
