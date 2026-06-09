"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SlipPickupDropoffAction } from "@/lib/slip-location";
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes";
import { lookupSlipIdByNumber } from "@/lib/api/slip-lookup";
import {
  buildCaseNoteStageTabs,
  filterCaseNotesForTab,
  formatSlipNoteTimestamp,
  resolveDefaultCaseNoteStageTabKey,
  slipNoteAuthorName,
  slipNoteStatusColor,
  slipNoteStatusLabel,
  type CaseNoteStageSeed,
  type SlipNoteDetail,
} from "@/lib/api/slip-notes";

interface VirtualSlipNotesProps {
  caseId?: number | null;
  slipId?: number | null;
  /** Stage labels from the current virtual slip (ensures tabs + default selection). */
  stageSeeds?: CaseNoteStageSeed[];
  /** Bump to refetch case notes after create/edit in the notes modal. */
  notesRefreshKey?: number;
  relatedSlips?: string[];
  slipNumber?: string;
  /** Pick up or drop off icon in footer (right) when slip location allows. */
  pickupDropoffAction?: SlipPickupDropoffAction | null;
  pickupDropoffLabel?: string;
  onPickupDropoff?: () => void;
  /** Ready to send icon in footer when slip is in lab. */
  showReadyToSend?: boolean;
  onReadyToSend?: () => void;
  /** Add stage icon in footer when slip is in office and eligible. */
  showAddStage?: boolean;
  onAddStage?: () => void;
  /** Opens the slip notes modal (same as sticky-note FAB). */
  onOpenNotesModal?: () => void;
  /** When the case is blocked (on hold / cancelled) the footer action icon is disabled + greyscaled. */
  disableFooterAction?: boolean;
}

const FOOTER_ACTION_ICON_CLASS = "h-[72px] w-[72px] max-w-none object-contain";

/** Allow alphanumeric slip numbers (e.g. C00001-S01); reject case numbers / stray punctuation. */
function sanitizeSlipNumberInput(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "");
}

function FooterActionIcon({
  src,
  label,
  onClick,
  disabled = false,
}: {
  src: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cn(
        "shrink-0 transition-opacity",
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:opacity-90"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph */}
      <img
        src={src}
        alt=""
        width={72}
        height={72}
        className={cn(
          FOOTER_ACTION_ICON_CLASS,
          disabled && "opacity-50 grayscale"
        )}
        aria-hidden
      />
    </button>
  );

  // No tooltip when disabled (case on hold) — keep the icon inert.
  if (disabled) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NoteEntry({ note }: { note: SlipNoteDetail }) {
  const timestamp = formatSlipNoteTimestamp(note.created_at);
  const status = slipNoteStatusLabel(note);
  const statusColor = slipNoteStatusColor(status);
  const author = slipNoteAuthorName(note);
  const body = note.note?.trim() ?? "";

  return (
    <div className="border-b border-[#D1D5DB] py-[10px] last:border-b-0">
      <p className="flex flex-wrap items-baseline gap-x-3 font-sans text-[16px] leading-[22px] text-[#4C4D55]">
        <span className="italic text-[#9CA3AF]">{timestamp}</span>
        {status ? (
          <span
            className="font-bold uppercase"
            style={{ color: statusColor }}
          >
            {status}
          </span>
        ) : null}
        <span className="font-bold text-[#111827]">{author}</span>
        {note.has_attachments ? (
          <Paperclip
            className="inline h-[14px] w-[14px] align-text-bottom text-[#6B7280]"
            aria-label="Has attachments"
          />
        ) : null}
      </p>
      {body ? (
        <p className="mt-1 font-sans text-[16px] leading-[22px] text-[#374151]">{body}</p>
      ) : null}
    </div>
  );
}

/** Case summary notes display + jump-to-slip + related slip chips + pickup (footer). */
export function VirtualSlipNotes({
  caseId = null,
  slipId = null,
  stageSeeds = [],
  notesRefreshKey = 0,
  relatedSlips = [],
  pickupDropoffAction = null,
  pickupDropoffLabel = "Pick up",
  onPickupDropoff,
  showReadyToSend = false,
  onReadyToSend,
  showAddStage = false,
  onAddStage,
  onOpenNotesModal,
  disableFooterAction = false,
}: VirtualSlipNotesProps) {
  const showFooterAddStage = showAddStage && Boolean(onAddStage);
  const showFooterReadyToSend =
    !showFooterAddStage && showReadyToSend && Boolean(onReadyToSend);
  const showFooterDriverIcon =
    !showFooterAddStage &&
    !showFooterReadyToSend &&
    (pickupDropoffAction === "pickup" || pickupDropoffAction === "dropoff") &&
    Boolean(onPickupDropoff);
  const footerDriverIconSrc =
    pickupDropoffAction === "dropoff"
      ? "/icons/virtual-slip-center/drop-off.svg"
      : "/icons/virtual-slip-center/pick-up.svg";

  const stickyFooterAction =
    showFooterAddStage && onAddStage
      ? {
          src: "/icons/virtual-slip-center/add-stage.svg",
          label: "Add stage",
          onClick: onAddStage,
        }
      : showFooterReadyToSend && onReadyToSend
        ? {
            src: "/icons/virtual-slip-center/ready-to-send.svg",
            label: "Ready to send",
            onClick: onReadyToSend,
          }
        : showFooterDriverIcon && onPickupDropoff
          ? {
              src: footerDriverIconSrc,
              label: pickupDropoffLabel,
              onClick: onPickupDropoff,
            }
          : null;
  const router = useRouter();
  const [jumpSlip, setJumpSlip] = useState("");
  const [jumpSlipError, setJumpSlipError] = useState<string | null>(null);
  const [jumpSlipLoading, setJumpSlipLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedTabKey, setSelectedTabKey] = useState<string | null>(null);

  const { data, notes, slips, isLoading, error } = useCaseSlipNotes(caseId, {
    refreshKey: notesRefreshKey,
  });

  const stageTabs = useMemo(
    () => buildCaseNoteStageTabs(data, { seeds: stageSeeds, currentSlipId: slipId }),
    [data, stageSeeds, slipId]
  );

  const defaultTabKey = useMemo(
    () => resolveDefaultCaseNoteStageTabKey(stageTabs, slipId ?? null, stageSeeds),
    [stageTabs, slipId, stageSeeds]
  );

  useEffect(() => {
    if (stageTabs.length === 0) {
      setSelectedTabKey(null);
      return;
    }
    setSelectedTabKey((prev) =>
      prev && stageTabs.some((tab) => tab.key === prev) ? prev : defaultTabKey
    );
  }, [stageTabs, defaultTabKey]);

  const activeTab =
    stageTabs.find((tab) => tab.key === selectedTabKey) ?? null;
  const isDefaultTab = selectedTabKey != null && selectedTabKey === defaultTabKey;

  const visibleNotes = useMemo(
    () =>
      filterCaseNotesForTab(notes, activeTab, {
        currentSlipId: slipId,
        isDefaultTab,
      }),
    [notes, activeTab, slipId, isDefaultTab]
  );

  const findSlipIdLocally = useCallback(
    (normalized: string): number | null => {
      const match = slips.find(
        (s) => s.slip_number?.trim().toLowerCase() === normalized
      );
      return match?.id ?? null;
    },
    [slips]
  );

  const slipTags = useMemo(() => {
    if (relatedSlips.length > 0) return relatedSlips;
    return slips
      .map((s) => s.slip_number?.trim())
      .filter((n): n is string => Boolean(n));
  }, [relatedSlips, slips]);

  const navigateToSlip = useCallback(
    async (target: string) => {
      const trimmed = sanitizeSlipNumberInput(target.trim());
      if (!trimmed || jumpSlipLoading) return;

      const normalized = trimmed.toLowerCase();
      setJumpSlipLoading(true);
      setJumpSlipError(null);

      try {
        let resolvedId = findSlipIdLocally(normalized);
        if (!resolvedId) {
          resolvedId = await lookupSlipIdByNumber(trimmed);
        }

        if (!resolvedId) {
          setJumpSlipError("Slip not found");
          return;
        }

        router.push(`/virtual-slip-v2/${resolvedId}`);
      } catch {
        setJumpSlipError("Unable to find slip");
      } finally {
        setJumpSlipLoading(false);
      }
    },
    [router, findSlipIdLocally, jumpSlipLoading]
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="px-6 pb-8">
        <div
          className={`relative mt-4 rounded-[7.7px] border-[0.74px] border-[#4C4D55] px-[15px] pb-[12px] pt-[22px] transition-[min-height] duration-200 ${
            expanded ? "min-h-[320px]" : "min-h-[140px]"
          }`}
        >
          <span className="absolute -top-[12px] left-1/2 -translate-x-1/2 bg-white px-[10px] font-sans text-[20px] leading-none text-[#4C4D55]">
            Case summary notes
          </span>

          <div className="absolute right-[10px] top-[8px] z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenNotesModal?.()}
              disabled={!onOpenNotesModal}
              className="rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4C4D55] disabled:cursor-default disabled:opacity-50"
              aria-label="Open slip notes"
            >
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded p-1 text-[#B4B0B0] hover:bg-[#F3F4F6] hover:text-[#4C4D55]"
              aria-label={expanded ? "Collapse notes" : "Expand notes"}
            >
              <img
                src="/icons/virtual-slip-center/stage-notes-expand.svg"
                alt=""
                aria-hidden
                className={cn(
                  "h-[18px] w-[18px]",
                  expanded && "scale-[-1]"
                )}
              />
            </button>
          </div>

          {stageTabs.length > 0 ? (
            <div className="my-3 flex flex-wrap justify-center gap-[8px]">
              {stageTabs.map((tab) => {
                const isActive = tab.key === selectedTabKey;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTabKey(tab.key)}
                    className={cn(
                      "rounded-full border px-[10px] py-[2px] font-sans text-[13px] transition-colors",
                      isActive
                        ? "border-[#4C4D55] bg-white font-medium text-[#111827]"
                        : "border-[#D1D5DB] bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#4C4D55]"
                    )}
                    aria-pressed={isActive}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={expanded ? "" : "max-h-[160px] overflow-y-auto"}>
            {!caseId ? (
              <p className="py-6 text-center font-sans text-[15px] italic text-[#9CA3AF]">
                Case notes unavailable
              </p>
            ) : isLoading ? (
              <p className="py-6 text-center font-sans text-[15px] text-[#9CA3AF]">
                Loading notes…
              </p>
            ) : error ? (
              <p className="py-6 text-center font-sans text-[15px] text-[#CF0202]">
                {error}
              </p>
            ) : notes.length === 0 ? (
              <p className="py-6 text-center font-sans text-[15px] italic text-[#9CA3AF]">
                No stage notes yet
              </p>
            ) : visibleNotes.length === 0 ? (
              <p className="py-6 text-center font-sans text-[15px] italic text-[#9CA3AF]">
                No notes for this stage
              </p>
            ) : (
              visibleNotes.map((entry) => (
                <NoteEntry key={entry.id} note={entry} />
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-[15px]">
          <div className="flex shrink-0 flex-col gap-1">
            <label className="sr-only" htmlFor="jump-to-slip-input">
              Jump to slip
            </label>
            <input
              id="jump-to-slip-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={jumpSlip}
              onChange={(e) => {
                setJumpSlip(sanitizeSlipNumberInput(e.target.value));
                if (jumpSlipError) setJumpSlipError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void navigateToSlip(jumpSlip);
              }}
              disabled={jumpSlipLoading}
              placeholder="Jump to slip"
              aria-invalid={jumpSlipError ? true : undefined}
              aria-describedby={jumpSlipError ? "jump-to-slip-error" : undefined}
              className="w-[130px] rounded-[10px] border-[0.5px] border-[#4C4D55] bg-white px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-60"
            />
            {jumpSlipError ? (
              <p
                id="jump-to-slip-error"
                className="max-w-[130px] font-sans text-[12px] leading-tight text-[#CF0202]"
              >
                {jumpSlipError}
              </p>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[10px]">
            <span className="shrink-0 font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55]">
              Related slip:
            </span>
            {slipTags.length > 0 ? (
              slipTags.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void navigateToSlip(s)}
                  className="rounded-[10px] border border-[#E5E7EB] bg-white px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
                >
                  {s}
                </button>
              ))
            ) : (
              <span className="font-sans text-[15px] italic text-[#9CA3AF]">None</span>
            )}
          </div>

        </div>
      </div>

      {stickyFooterAction ? (
        <div className="fixed bottom-6 right-6 z-50">
          <FooterActionIcon
            src={stickyFooterAction.src}
            label={stickyFooterAction.label}
            onClick={stickyFooterAction.onClick}
            disabled={disableFooterAction}
          />
        </div>
      ) : null}
    </TooltipProvider>
  );
}
