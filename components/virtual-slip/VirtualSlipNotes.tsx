"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes";
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
import { formatCaseSummaryNotesForDisplay } from "@/lib/format-case-summary-notes";

interface VirtualSlipNotesProps {
  caseId?: number | null;
  slipId?: number | null;
  /** Stage labels from the current virtual slip (ensures tabs + default selection). */
  stageSeeds?: CaseNoteStageSeed[];
  /** Bump to refetch case notes after create/edit in the notes modal. */
  notesRefreshKey?: number;
  /** Opens the slip notes modal (same as sticky-note FAB). */
  onOpenNotesModal?: () => void;
}

function NoteEntry({ note }: { note: SlipNoteDetail }) {
  const timestamp = formatSlipNoteTimestamp(note.created_at);
  const status = slipNoteStatusLabel(note);
  const statusColor = slipNoteStatusColor(status);
  const author = slipNoteAuthorName(note);
  const body = note.note?.trim() ?? "";
  const displayBody = body ? formatCaseSummaryNotesForDisplay(body) : "";

  return (
    <div className="border-b border-[#D1D5DB] last:border-b-0">
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
      {displayBody ? (
        <div className="mt-1 space-y-2 font-sans text-[16px] leading-[22px] text-[#374151]">
          {displayBody.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Case summary notes display + stage tabs. */
export function VirtualSlipNotes({
  caseId = null,
  slipId = null,
  stageSeeds = [],
  notesRefreshKey = 0,
  onOpenNotesModal,
}: VirtualSlipNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTabKey, setSelectedTabKey] = useState<string | null>(null);

  const { data, notes, isLoading, error } = useCaseSlipNotes(caseId, {
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

  const hasMultipleStageTabs = stageTabs.length > 1;

  return (
      <div className="px-6 pb-2">
        {hasMultipleStageTabs ? (
          <div className="mt-4 flex flex-wrap justify-center gap-[8px]">
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

        <div
          className={`relative mt-4 rounded-[7.7px] border-[0.74px] border-[#4C4D55] px-[15px] pb-[12px] pt-[12px] transition-[min-height] duration-200 ${
            expanded ? "min-h-[320px]" : "min-h-[20px]"
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
                className={cn("h-[18px] w-[18px]", expanded && "scale-[-1]")}
              />
            </button>
          </div>

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
      </div>
  );
}
