// components/CaseActionModal.tsx
// Hold / Cancel / Delete scope picker: Case | Arch (Figma)

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Info } from "lucide-react";
import clsx from "clsx";
import type { SlipActionScope, SlipArchType } from "@/lib/api/slip-case-actions";

type CaseActionType = "hold" | "resume" | "cancel" | "cancelled" | "delete" | "restore";

export type CaseActionSubmitPayload = {
  reason: string;
  scope: SlipActionScope;
  arch?: SlipArchType;
};

interface CaseActionModalProps {
  open: boolean;
  onClose: () => void;
  /** @deprecated Prefer onSubmitAction for scoped Case/Arch actions */
  onSubmit?: (reason: string) => void;
  onSubmitAction?: (payload: CaseActionSubmitPayload) => void;
  actionType: CaseActionType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  buttonText?: string;
  buttonColor?: "error" | "success" | "warning";
  reasonPlaceholder?: string;
  warning?: string;
  successMessage?: string;
  /** When true, show Case | Arch scope tabs. */
  enableScopePicker?: boolean;
  /** Available arches on the slip (Upper / Lower). */
  availableArches?: SlipArchType[];
  /** Pre-select scope (e.g. open from an arch control). */
  initialScope?: SlipActionScope;
  /** Pre-select arch. */
  initialArch?: SlipArchType;
  /**
   * When true (opened from an arch Resume/Cancel/Hold control), Case/Arch tabs
   * and the arch dropdown are locked to the pre-selected values.
   */
  lockScopeSelection?: boolean;
}

const buttonClassMap: Record<string, { bg: string, icon: string }> = {
  error: { bg: "#D32F2F", icon: "#ffffff" },
  success: { bg: "#43A047", icon: "#ffffff" },
  warning: { bg: "#FFB400", icon: "#ffffff" },
};

const SCOPE_HINTS: Record<SlipActionScope, string> = {
  case: "Entire case — all arches stop",
  arch: "Upper or Lower only — the other arch continues",
};

const CaseActionModal: React.FC<CaseActionModalProps> = ({
  open,
  onClose,
  onSubmit,
  onSubmitAction,
  actionType,
  title,
  description,
  icon,
  iconBgColor,
  iconColor,
  buttonText,
  buttonColor,
  reasonPlaceholder,
  warning,
  successMessage,
  enableScopePicker = false,
  availableArches = ["Upper", "Lower"],
  initialScope = "case",
  initialArch,
  lockScopeSelection = false,
}) => {
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<SlipActionScope>(initialScope);
  const [arch, setArch] = useState<SlipArchType>(
    initialArch ?? availableArches[0] ?? "Upper"
  );

  const scopesForAction = useMemo((): SlipActionScope[] => {
    if (actionType === "restore" || actionType === "cancelled") return ["case"];
    return ["case", "arch"];
  }, [actionType]);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setScope(initialScope);
    setArch(initialArch ?? availableArches[0] ?? "Upper");
  }, [open, initialScope, initialArch, availableArches]);

  const scopeQuestion = useMemo(() => {
    if (actionType === "hold") return "What would you like to hold?";
    if (actionType === "cancel") return "What would you like to cancel?";
    if (actionType === "delete") return "What would you like to delete?";
    if (actionType === "resume") return "What would you like to resume?";
    return null;
  }, [actionType]);

  const reasonLabel = useMemo(() => {
    if (actionType === "hold") return "Reason for hold*";
    if (actionType === "cancel") return "Reason for cancel*";
    if (actionType === "delete") return "Reason for delete*";
    if (actionType === "resume") return "Reason for resume*";
    return "Reason*";
  }, [actionType]);

  const canSubmit = useMemo(() => {
    if (actionType === "restore") return true;
    if (!reason.trim()) return false;
    if (!enableScopePicker) return true;
    if (scope === "arch") {
      return availableArches.includes(arch);
    }
    return true;
  }, [actionType, reason, enableScopePicker, scope, arch, availableArches]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload: CaseActionSubmitPayload = {
      reason: reason.trim(),
      scope: enableScopePicker ? scope : "case",
      arch: enableScopePicker && scope === "arch" ? arch : undefined,
    };
    if (onSubmitAction) {
      onSubmitAction(payload);
    } else if (onSubmit) {
      onSubmit(payload.reason);
    }
    setReason("");
  };

  // "Case Cancelled" special modal (success state)
  if (actionType === "cancelled") {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-lg p-0 overflow-visible">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-start p-8 gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 flex items-center justify-center rounded-full flex-shrink-0"
                style={{ backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : iconBgColor }}
              >
                {React.cloneElement(icon as React.ReactElement, {
                  size: 28,
                  color: buttonColor ? buttonClassMap[buttonColor].icon : iconColor,
                })}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{title}</div>
                <div className="text-sm text-gray-600">{successMessage || "You have successfully cancelled the case."}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col p-8">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : iconBgColor }}
            >
              {React.cloneElement(icon as React.ReactElement, {
                size: 28,
                color: buttonColor ? buttonClassMap[buttonColor].icon : iconColor,
              })}
            </div>
            <div>
              <div className="font-semibold text-lg text-gray-900 mb-1">{title}</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
          </div>

          {enableScopePicker && scopeQuestion && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-800 mb-3">{scopeQuestion}</p>
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                {scopesForAction.map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={
                      lockScopeSelection
                        ? "Scope is fixed because you opened this from that arch"
                        : SCOPE_HINTS[s]
                    }
                    disabled={lockScopeSelection}
                    onClick={() => {
                      if (!lockScopeSelection) setScope(s);
                    }}
                    className={clsx(
                      "flex-1 px-3 py-2.5 text-sm font-medium capitalize transition-colors",
                      scope === s
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-white text-gray-700",
                      lockScopeSelection
                        ? "cursor-not-allowed opacity-80"
                        : scope !== s && "hover:bg-gray-50"
                    )}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      {s}
                      <Info className="w-3.5 h-3.5 opacity-70" aria-hidden />
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {lockScopeSelection && scope === "arch" && arch
                  ? `${arch} only — opened from that arch`
                  : SCOPE_HINTS[scope]}
              </p>

              {scope === "arch" && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Arch
                  </label>
                  <select
                    className={clsx(
                      "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800",
                      lockScopeSelection
                        ? "cursor-not-allowed bg-gray-100 text-gray-700"
                        : "bg-white"
                    )}
                    value={arch}
                    disabled={lockScopeSelection}
                    onChange={(e) => setArch(e.target.value as SlipArchType)}
                  >
                    {availableArches.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {reasonLabel}
          </label>
          <Textarea
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="mb-6 border border-gray-300 rounded-md px-4 py-3 w-full text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />

          {warning && (
            <div className="text-xs text-gray-500 mb-6">{warning}</div>
          )}

          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="px-8 py-2.5 text-sm font-medium rounded-md text-white"
              style={{ 
                backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : '#6B7280',
                borderColor: buttonColor ? buttonClassMap[buttonColor].bg : '#6B7280'
              }}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaseActionModal;
