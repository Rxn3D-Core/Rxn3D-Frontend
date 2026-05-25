"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Filter, MoreHorizontal, Paperclip, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CallLogsService } from "@/services/call-logs-service";
import {
  filterFlattenedCallLogs,
  flattenCaseCallLogs,
  formatCallLogTimestamp,
  type FlattenedCallLogRow,
} from "@/lib/call-log-transformers";

const callTypeIcon = (type: string) => {
  switch (type) {
    case "Incoming":
      return <Phone className="h-4 w-4 text-green-600 rotate-90" />;
    case "Outgoing":
      return <Phone className="h-4 w-4 text-blue-600" />;
    default:
      return <Phone className="h-4 w-4 text-gray-400" />;
  }
};

function FollowUpToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Toggle Follow Up"
      className={`relative flex h-6 w-10 items-center rounded-full border transition-colors duration-200 ${
        checked ? "border-[#C40000] bg-[#C40000]" : "border-[#174A7C] bg-white"
      }`}
      onClick={onChange}
      style={{ minHeight: 24, minWidth: 40 }}
    >
      <span
        className={`absolute left-1 top-1 block h-4 w-4 rounded-full shadow transition-all duration-200 ${
          checked ? "translate-x-4 bg-white" : "translate-x-0 bg-[#174A7C]"
        }`}
      />
    </button>
  );
}

function NoteCell({ note }: { note: string }) {
  const [showFull, setShowFull] = useState(false);

  if (!note) {
    return <span className="text-xs italic text-gray-400">No note</span>;
  }

  if (note.length < 80 || showFull) {
    return <span>{note}</span>;
  }

  return (
    <span>
      {note.slice(0, 80)}...
      <button className="ml-1 text-xs text-blue-600 underline" onClick={() => setShowFull(true)}>
        Read more
      </button>
    </span>
  );
}

function toCaseId(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getNoResultsMessage({
  hasValidCaseId,
  fetchError,
  hasRows,
}: {
  hasValidCaseId: boolean;
  fetchError: string | null;
  hasRows: boolean;
}) {
  if (!hasValidCaseId) {
    return "Select or open a case with a valid caseId in the URL to view call logs.";
  }

  if (fetchError) {
    return fetchError;
  }

  if (!hasRows) {
    return "This case does not have any call logs yet.";
  }

  return "No call logs match your current filter.";
}

export default function CallLogTable() {
  const searchParams = useSearchParams();
  const caseId = useMemo(() => toCaseId(searchParams.get("caseId")), [searchParams]);

  const [selected, setSelected] = useState<number[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterCallType, setFilterCallType] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<{ start?: string; end?: string }>({});
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);
  const [filterOffice, setFilterOffice] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [actionRow, setActionRow] = useState<number | null>(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rows, setRows] = useState<FlattenedCallLogRow[]>([]);

  useEffect(() => {
    if (caseId == null) {
      setRows([]);
      setFetchError(null);
      setLoading(false);
      return;
    }

    const resolvedCaseId = caseId;
    let ignore = false;

    async function loadCallLogs() {
      setLoading(true);
      setFetchError(null);

      try {
        const response = await CallLogsService.listCaseCallLogs(resolvedCaseId);
        if (!ignore) {
          setRows(flattenCaseCallLogs(response.data));
        }
      } catch (error) {
        if (!ignore) {
          setRows([]);
          setFetchError(
            error instanceof Error
              ? error.message
              : `Unable to load call logs for case ${resolvedCaseId}.`,
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadCallLogs();

    return () => {
      ignore = true;
    };
  }, [caseId]);

  const officeOptions = useMemo(
    () => ["All", ...new Set(rows.map((row) => row.officeName).filter(Boolean))],
    [rows],
  );

  const userOptions = useMemo(
    () => ["All", ...new Set(rows.map((row) => row.loggedByName).filter(Boolean))],
    [rows],
  );

  const filteredCalls = useMemo(() => {
    const locallyFiltered = filterFlattenedCallLogs(rows, {
      searchText: filterText,
      showFollowUpOnly,
      officeName: filterOffice,
      userName: filterUser,
      dateRange: filterDate,
    });

    if (filterCallType.length === 0) {
      return locallyFiltered;
    }

    return locallyFiltered.filter((row) => filterCallType.includes(row.callType));
  }, [filterCallType, filterDate, filterOffice, filterText, filterUser, rows, showFollowUpOnly]);

  useEffect(() => {
    const validIds = new Set(filteredCalls.map((row) => row.callLogId));
    setSelected((current) => current.filter((id) => validIds.has(id)));
  }, [filteredCalls]);

  const showNoResults = !loading && filteredCalls.length === 0;
  const hasValidCaseId = caseId != null;
  const hasRows = rows.length > 0;

  const clearFilters = () => {
    setFilterText("");
    setFilterCallType([]);
    setShowFollowUpOnly(false);
    setFilterDate({});
    setFilterOffice("All");
    setFilterUser("All");
  };

  const handleSelect = (callLogId: number) => {
    setSelected((current) =>
      current.includes(callLogId)
        ? current.filter((id) => id !== callLogId)
        : [...current, callLogId],
    );
  };

  const handleSelectAll = () => {
    if (filteredCalls.length === 0) {
      setSelected([]);
      return;
    }

    setSelected(
      selected.length === filteredCalls.length
        ? []
        : filteredCalls.map((row) => row.callLogId),
    );
  };

  const toggleCallType = (callType: "Incoming" | "Outgoing") => {
    setFilterCallType((current) =>
      current.includes(callType)
        ? current.filter((item) => item !== callType)
        : [...current, callType],
    );
  };

  const RowActionMenu = ({ row }: { row: FlattenedCallLogRow }) => (
    <Popover open={actionRow === row.callLogId} onOpenChange={(open) => setActionRow(open ? row.callLogId : null)}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <button className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Edit</button>
        <button className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">View Details</button>
        <button className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
        <button className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Mark as resolved</button>
        <button className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">Mark as follow up</button>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Input
          className="w-full max-w-xl"
          placeholder="Search by slip, patient, doctor, note, caller, or user"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
        />
        <Button className="bg-blue-700 px-4 text-white" onClick={() => {}}>
          <Phone className="mr-1 h-4 w-4" /> Add Call log
        </Button>
        <Button variant="outline" className="ml-auto" disabled>
          <Filter className="mr-1 h-4 w-4" /> Advance Filter
        </Button>
        <Button variant="ghost" className="text-sm text-blue-700" onClick={clearFilters}>
          Clear all Filters
        </Button>
        <label className="ml-4 flex items-center gap-2 text-sm">
          Show Follow-up only
          <FollowUpToggle checked={showFollowUpOnly} onChange={() => setShowFollowUpOnly((value) => !value)} />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Call type</span>
          <Button
            variant={filterCallType.includes("Incoming") ? "default" : "outline"}
            size="sm"
            className={filterCallType.includes("Incoming") ? "bg-green-600 text-white hover:bg-green-700" : ""}
            onClick={() => toggleCallType("Incoming")}
          >
            Incoming
          </Button>
          <Button
            variant={filterCallType.includes("Outgoing") ? "default" : "outline"}
            size="sm"
            className={filterCallType.includes("Outgoing") ? "bg-blue-700 text-white hover:bg-blue-800" : ""}
            onClick={() => toggleCallType("Outgoing")}
          >
            Outgoing
          </Button>
        </div>

        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          Date from
          <input
            type="date"
            value={filterDate.start ?? ""}
            onChange={(event) =>
              setFilterDate((current) => ({
                ...current,
                start: event.target.value || undefined,
              }))
            }
          />
        </label>

        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          Date to
          <input
            type="date"
            value={filterDate.end ?? ""}
            onChange={(event) =>
              setFilterDate((current) => ({
                ...current,
                end: event.target.value || undefined,
              }))
            }
          />
        </label>

        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          Office
          <select value={filterOffice} onChange={(event) => setFilterOffice(event.target.value)}>
            {officeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          User
          <select value={filterUser} onChange={(event) => setFilterUser(event.target.value)}>
            {userOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {hasValidCaseId ? (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Case #{caseId}
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="mb-2 flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="mr-3 font-semibold text-blue-700">Bulk actions:</span>
          <Popover open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className="h-4 w-4" /> Actions
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
              <button className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50">Mark as follow up</button>
              <button className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50">Mark as resolved</button>
              <button className="w-full px-4 py-2 text-left text-red-600 hover:bg-blue-50">Delete</button>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-700">
              <th className="w-9 px-4 py-2">
                <Checkbox
                  checked={filteredCalls.length > 0 && selected.length === filteredCalls.length}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="px-2 py-2 text-left font-semibold">Timestamp</th>
              <th className="px-2 py-2 text-left font-semibold">Follow up</th>
              <th className="px-2 py-2 text-left font-semibold">Linked slip</th>
              <th className="px-2 py-2 text-left font-semibold">Patient / Doctor</th>
              <th className="px-2 py-2 text-left font-semibold">Office</th>
              <th className="px-2 py-2 text-left font-semibold">Call type</th>
              <th className="px-2 py-2 text-left font-semibold">User</th>
              <th className="px-2 py-2 text-left font-semibold">Caller</th>
              <th className="px-2 py-2 text-left font-semibold">Note</th>
              <th className="px-2 py-2 text-center font-semibold">Attachment</th>
              <th className="px-2 py-2 text-center font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-500">
                  Loading call logs...
                </td>
              </tr>
            ) : showNoResults ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <span>{getNoResultsMessage({ hasValidCaseId, fetchError, hasRows })}</span>
                    {(filterText || filterCallType.length > 0 || showFollowUpOnly || filterDate.start || filterDate.end || filterOffice !== "All" || filterUser !== "All") ? (
                      <Button className="bg-blue-700 text-white" onClick={clearFilters}>
                        <CheckCircle2 className="mr-2 h-5 w-5" /> Clear all filters
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCalls.map((row, index) => (
                <tr
                  key={row.callLogId}
                  className={`group border-b border-gray-100 ${
                    selected.includes(row.callLogId)
                      ? "bg-blue-50"
                      : index % 2 === 0
                        ? "bg-gray-50"
                        : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(row.callLogId)}
                      onCheckedChange={() => handleSelect(row.callLogId)}
                    />
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">{formatCallLogTimestamp(row.timestamp)}</td>
                  <td className="px-2 py-3">
                    {row.followUp ? (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        Follow up
                      </span>
                    ) : row.resolved ? (
                      <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="font-semibold text-gray-800">{row.slipNumber}</div>
                    <div className="text-xs text-gray-500">Slip #{row.slipId}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-gray-800">{row.patientName || "Unknown patient"}</div>
                    <div className="text-xs text-gray-500">{row.doctorName || "No doctor"}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="text-gray-800">{row.officeName || "No office"}</div>
                    <div className="text-xs text-gray-500">{row.locationName || "No location"}</div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      {callTypeIcon(row.callType)}
                      <span className="text-[13px]">{row.callType}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3">{row.loggedByName || "Unknown user"}</td>
                  <td className="px-2 py-3">
                    <div className="text-gray-800">{row.callerName || "Unknown caller"}</div>
                    <div className="text-xs text-gray-500">{row.callerPhone || "No phone"}</div>
                  </td>
                  <td className="px-2 py-3 text-gray-700">
                    <NoteCell note={row.note} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    {row.hasAttachments || row.attachmentsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-blue-700">
                        <Paperclip className="inline h-4 w-4" />
                        <span>{row.attachmentsCount}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <RowActionMenu row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Showing case-level call logs from the backend. Actions remain placeholder-only on this screen for now.
      </div>
    </div>
  );
}
