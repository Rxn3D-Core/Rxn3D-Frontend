"use client"

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, ChevronDown, Filter, MoreHorizontal, Paperclip, Phone, User, Flag, X, CheckCircle2 } from "lucide-react";
import { format, isAfter, isBefore, parse } from "date-fns";
import { useSlipContext, SlipProvider } from "../SlipContext";

const callTypeIcon = (type: string) => {
  switch (type) {
    case "Incoming": return <Phone className="h-4 w-4 text-green-600 rotate-90" />;
    case "Outgoing": return <Phone className="h-4 w-4 text-blue-600" />;
    case "Missed":   return <Phone className="h-4 w-4 text-red-600" />;
    default: return null;
  }
};

// 3. Follow Up Toggle
function FollowUpToggle({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <button
      type="button"
      aria-label="Toggle Follow Up"
      className={
        `w-10 h-6 rounded-full relative transition-colors duration-200 flex items-center
        ${checked ? "bg-[#C40000] border border-[#C40000]" : "bg-white border border-[#174A7C]"}`
      }
      onClick={onChange}
      style={{ minWidth: 40, minHeight: 24 }}
    >
      <span
        className={
          `block w-4 h-4 rounded-full shadow transition-all duration-200
          absolute top-1 left-1
          ${checked
            ? "bg-white translate-x-4"
            : "bg-[#174A7C] translate-x-0"
          }`
        }
        style={{
          transition: "background 0.2s, transform 0.2s",
        }}
      />
    </button>
  );
}

// 4. Note cell with "Read more"
function NoteCell({ note }: { note: string }) {
  const [showFull, setShowFull] = useState(false);
  if (!note) return <span className="italic text-gray-400 text-xs">No note</span>;
  if (note.length < 50 || showFull) return <span>{note}</span>;
  return (
    <span>
      {note.slice(0, 50)}...
      <button className="ml-1 text-blue-600 text-xs underline" onClick={() => setShowFull(true)}>Read more</button>
    </span>
  );
}

export default function CallLogTable() {
  // 5. State
  const [selected, setSelected] = useState<number[]>([]);
  const [filterText, setFilterText] = useState("");
  const [filterCallType, setFilterCallType] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<{start?: string, end?: string}>({});
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);
  const [filterOffice, setFilterOffice] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [actionRow, setActionRow] = useState<number | null>(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  const { callLogs, loading, fetchCallLogs } = useSlipContext();

  useEffect(() => {
    fetchCallLogs();
  }, []);

  // 6. Filtered + Sorted data
  const filteredCalls = useMemo(() => {
    // Ensure callLogs is always an array
    let calls = Array.isArray(callLogs) ? [...callLogs] : [];
    // Filter by follow up only
    if (showFollowUpOnly) calls = calls.filter(row => row.followUp && !row.resolved && !row.archived);
    // Text search
    if (filterText) {
      const lower = filterText.toLowerCase();
      calls = calls.filter(row =>
        row.linkedSlip?.toLowerCase().includes(lower) ||
        row.user?.toLowerCase().includes(lower) ||
        row.caller?.toLowerCase().includes(lower) ||
        row.note?.toLowerCase().includes(lower)
      );
    }
    // Call type filter
    if (filterCallType.length > 0) calls = calls.filter(row => filterCallType.includes(row.callType));
    // Date filter
    if (filterDate.start) calls = calls.filter(row => isAfter(parse(row.timestamp, "MM/dd/yy @ h:mm a", new Date()), new Date(filterDate.start!)));
    if (filterDate.end) calls = calls.filter(row => isBefore(parse(row.timestamp, "MM/dd/yy @ h:mm a", new Date()), new Date(filterDate.end!)));
    // Office filter
    if (filterOffice !== "All") calls = calls.filter(row => row.office === filterOffice);
    // User filter
    if (filterUser !== "All") calls = calls.filter(row => row.user === filterUser);
    // Sort
    calls.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return calls;
  }, [filterText, filterCallType, filterDate, showFollowUpOnly, filterOffice, filterUser, callLogs]);

  // 7. No filter results state
  const showNoResults = filteredCalls.length === 0;

  // 8. Handler for row selection
  const handleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleSelectAll = () => {
    setSelected(selected.length === filteredCalls.length ? [] : filteredCalls.map(row => row.id));
  };

  // 9. Action menu
  const RowActionMenu = ({ row }: { row: any }) => (
    <Popover open={actionRow === row.id} onOpenChange={open => setActionRow(open ? row.id : null)}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-48">
        <button className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50 text-sm">Edit</button>
        <button className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50 text-sm">View Details</button>
        <button className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 text-sm">Archive</button>
        <button className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50 text-sm">Mark as resolved</button>
        <button className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50 text-sm">Mark as follow up</button>
      </PopoverContent>
    </Popover>
  );

  // 10. Table render
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <Input className="w-96" placeholder="Search by patient, office, doctor, case..." value={filterText} onChange={e => setFilterText(e.target.value)} />
        <Button className="bg-blue-700 text-white px-4" onClick={() => {/* open call log modal */}}> <Phone className="h-4 w-4 mr-1" /> Add Call log</Button>
        <Button variant="outline" className="ml-auto"><Filter className="h-4 w-4 mr-1" /> Advance Filter</Button>
        <Button variant="ghost" className="text-sm text-blue-700">Clear all Filters</Button>
        <label className="flex items-center ml-4 gap-2 text-sm">Show Follow-up only
          <FollowUpToggle checked={showFollowUpOnly} onChange={() => setShowFollowUpOnly(v => !v)} />
        </label>
      </div>

      {/* Filters row (dropdowns, date pickers, etc) */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        {/* Date picker, call type multi-select, office, user, patient/slip search, etc */}
        {/* ...Implement as shown in your 3rd screenshot if needed */}
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 mb-2 rounded bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
          <Popover open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm"><ChevronDown className="h-4 w-4" /> Actions</Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-56">
              {/* Only enable valid actions, disable if any selected are archived/resolved */}
              <button className="w-full px-4 py-2 text-left hover:bg-blue-50 text-gray-900">Mark as follow up</button>
              <button className="w-full px-4 py-2 text-left hover:bg-blue-50 text-gray-900">Mark as resolved</button>
              <button className="w-full px-4 py-2 text-left hover:bg-blue-50 text-red-600">Archive</button>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-700">
              <th className="px-4 py-2 w-9">
                <Checkbox
                  checked={selected.length === filteredCalls.length}
                  indeterminate={selected.length > 0 && selected.length < filteredCalls.length}
                  onCheckedChange={handleSelectAll}
                  style={{ accentColor: "#1162A8", borderColor: "#1162A8" }}
                />
              </th>
              <th className="px-2 py-2 font-semibold text-left">Timestamp</th>
              <th className="px-2 py-2 font-semibold text-left">Follow up</th>
              <th className="px-2 py-2 font-semibold text-left">Linked slip</th>
              <th className="px-2 py-2 font-semibold text-left">Call type</th>
              <th className="px-2 py-2 font-semibold text-left">User</th>
              <th className="px-2 py-2 font-semibold text-left">Caller</th>
              <th className="px-2 py-2 font-semibold text-left">Note</th>
              <th className="px-2 py-2 font-semibold text-center">Attachment</th>
              <th className="px-2 py-2 font-semibold text-center"></th>
            </tr>
          </thead>
          <tbody>
            {showNoResults ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <span>No call logs match your current filter.</span>
                    <Button className="bg-blue-700 text-white" onClick={() => {
                      setFilterText("");
                      setFilterCallType([]);
                      setShowFollowUpOnly(false);
                      setFilterDate({});
                      setFilterOffice("All");
                      setFilterUser("All");
                    }}>
                      <CheckCircle2 className="mr-2 h-5 w-5" /> Clear all filters
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCalls.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 group ${selected.includes(row.id) ? "bg-blue-50" : idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() => handleSelect(row.id)}
                      style={{ accentColor: "#1162A8", borderColor: "#1162A8" }}
                    />
                  </td>
                  <td className="px-2 py-3">{row.timestamp}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center">
                      <FollowUpToggle checked={row.followUp} onChange={() => {/* logic to toggle followup */}} />

                      {row.followUp}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-800">{row.linkedSlip}</span>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <svg width="12" height="12" fill="none" viewBox="0 0 20 20" className="inline ml-1"><path d="M7.5 2.5H5A2.5 2.5 0 0 0 2.5 5v10A2.5 2.5 0 0 0 5 17.5h10a2.5 2.5 0 0 0 2.5-2.5v-2.5" stroke="#1673B1" strokeWidth={1.4} /><path d="M14.167 3.333H17.5v3.334M10 10l7.5-7.5" stroke="#1673B1" strokeWidth={1.4} strokeLinecap="round" /></svg>
                      </a>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center">
                      {row.callType === "Outgoing" ? (
                        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline mr-1">
                          <g clipPath="url(#clip0_4584_33974)">
                            <path d="M12.9531 6.60693L17.4531 2.10693" stroke="#2E86DE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17.4531 6.60693V2.10693H12.9531" stroke="#2E86DE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M11.3271 13.0329C11.482 13.1041 11.6565 13.1203 11.8219 13.079C11.9873 13.0377 12.1336 12.9413 12.2369 12.8057L12.5031 12.4569C12.6428 12.2706 12.824 12.1194 13.0323 12.0153C13.2406 11.9112 13.4703 11.8569 13.7031 11.8569H15.9531C16.3509 11.8569 16.7325 12.015 17.0138 12.2963C17.2951 12.5776 17.4531 12.9591 17.4531 13.3569V15.6069C17.4531 16.0048 17.2951 16.3863 17.0138 16.6676C16.7325 16.9489 16.3509 17.1069 15.9531 17.1069C12.3727 17.1069 8.93892 15.6846 6.40718 13.1529C3.87544 10.6211 2.45313 7.18736 2.45312 3.60693C2.45312 3.20911 2.61116 2.82758 2.89246 2.54627C3.17377 2.26497 3.5553 2.10693 3.95312 2.10693H6.20312C6.60095 2.10693 6.98248 2.26497 7.26378 2.54627C7.54509 2.82758 7.70312 3.20911 7.70312 3.60693V5.85693C7.70312 6.0898 7.64891 6.31947 7.54477 6.52775C7.44062 6.73604 7.28942 6.91721 7.10312 7.05693L6.75212 7.32018C6.61444 7.42532 6.51739 7.57487 6.47747 7.74345C6.43755 7.91202 6.45721 8.08922 6.53313 8.24493C7.55814 10.3268 9.24394 12.0105 11.3271 13.0329Z" stroke="#2E86DE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </g>
                          <defs>
                            <clipPath id="clip0_4584_33974">
                              <rect width="18" height="18" fill="white" transform="translate(0.953125 0.606934)"/>
                            </clipPath>
                          </defs>
                        </svg>
                      ) : <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g clipPath="url(#clip0_4584_33996)">
                      <path d="M12.4531 2.35107V6.85107H16.9531" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.9531 2.35107L12.4531 6.85107" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.8271 13.2771C10.982 13.3482 11.1565 13.3645 11.3219 13.3232C11.4873 13.2818 11.6336 13.1854 11.7369 13.0498L12.0031 12.7011C12.1428 12.5148 12.324 12.3636 12.5323 12.2594C12.7406 12.1553 12.9703 12.1011 13.2031 12.1011H15.4531C15.8509 12.1011 16.2325 12.2591 16.5138 12.5404C16.7951 12.8217 16.9531 13.2032 16.9531 13.6011V15.8511C16.9531 16.2489 16.7951 16.6304 16.5138 16.9117C16.2325 17.193 15.8509 17.3511 15.4531 17.3511C11.8727 17.3511 8.43892 15.9288 5.90718 13.397C3.37544 10.8653 1.95313 7.4315 1.95312 3.85107C1.95312 3.45325 2.11116 3.07172 2.39246 2.79041C2.67377 2.50911 3.0553 2.35107 3.45312 2.35107H5.70312C6.10095 2.35107 6.48248 2.50911 6.76378 2.79041C7.04509 3.07172 7.20312 3.45325 7.20312 3.85107V6.10107C7.20312 6.33394 7.14891 6.56361 7.04477 6.77189C6.94062 6.98018 6.78942 7.16135 6.60312 7.30107L6.25212 7.56432C6.11444 7.66946 6.01739 7.81901 5.97747 7.98759C5.93755 8.15616 5.95721 8.33336 6.03313 8.48907C7.05814 10.571 8.74394 12.2547 10.8271 13.2771Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <defs>
                      <clipPath id="clip0_4584_33996">
                      <rect width="18" height="18" fill="white" transform="translate(0.453125 0.851074)"/>
                      </clipPath>
                      </defs>
                      </svg>
                      }
                      <span className="text-[13px]">{row.callType}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3">{row.user}</td>
                  <td className="px-2 py-3">{row.caller}</td>
                  <td className="px-2 py-3 text-gray-700"><NoteCell note={row.note} /></td>
                  <td className="px-2 py-3 text-center">{row.attachment ? <Paperclip className="h-4 w-4 text-blue-700 inline" /> : ""}</td>
                  <td className="px-2 py-3 text-center"><RowActionMenu row={row} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
