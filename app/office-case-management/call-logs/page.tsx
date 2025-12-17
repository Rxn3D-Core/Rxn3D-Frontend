"use client"

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, ChevronDown, Filter, MoreHorizontal, Paperclip, Phone, User, Flag, X, CheckCircle2 } from "lucide-react";
import { format, isAfter, isBefore, parse } from "date-fns";

// 1. Dummy Data Example (you can load this from an API, or context/provider)
export const dummyCalls = [
  {
    id: 1,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    linkedSlip: "Maria Pavlova",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Arian",
    note: "Aliquam dignissim ullamcorper dui. Sed gravida..",
    attachment: true,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 2,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Maria Pavlova",
    callType: "Outgoing",
    user: "Christina Aguilera",
    caller: "Kian",
    note: "Sed gravida sapien id dolor tempor finibus. Etiam fin",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 3,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Maria Pavlova",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Nannie",
    note: "Cras sed bibendum lacus",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 4,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Christina Perri",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Naima",
    note: "Curabitur commodo velit a suscipit mattis. Morbi I",
    attachment: true,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 5,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    linkedSlip: "Matt Damon",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Dr Hernandez",
    note: "Donec sed mi a lorem interdum lacinia eu a dui.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 6,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Angelica Panganiban",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Sadie",
    note: "Curabitur eros ligula, condimentum eget dui condimentum, pharetra bibendum nibh",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 7,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Cynthia Gutierrez",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Lawson",
    note: "Donec eu iaculis nunc. Vivamus ac porttitor lorem. Nullam eleifend, augue",
    attachment: true,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 8,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    linkedSlip: "Greciaa Pascual",
    callType: "Missed",
    user: "Mary Ann Sanches",
    caller: "Dr. Lee",
    note: "Praesent orci ligula, sagittis at justo ut, pretium volutpat velit.",
    attachment: true,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 9,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Anthony Bylon",
    callType: "Outgoing",
    user: "Christina Aguilera",
    caller: "Nina",
    note: "Vivamus risus neque, molestie nec pellentesque vitae",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  {
    id: 10,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    linkedSlip: "Mark Washington",
    callType: "Missed",
    user: "Christina Aguilera",
    caller: "Ethel",
    note: "Fusce interdum bibendum elit vel porta. Sed vel sodales neque.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "SRD"
  },
  // New/varied cases for demo
  {
    id: 11,
    timestamp: "01/24/25 @ 10:13 am",
    followUp: true,
    linkedSlip: "Anna Kendrick",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Rick",
    note: "Client confirmed pick up. Awaiting courier.",
    attachment: true,
    archived: false,
    resolved: false,
    office: "RDS"
  },
  {
    id: 12,
    timestamp: "01/25/25 @ 9:18 am",
    followUp: false,
    linkedSlip: "Samuel Cruz",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Janice",
    note: "Requested update on prosthesis, ETA next week.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "RDS"
  },
  {
    id: 13,
    timestamp: "01/25/25 @ 2:43 pm",
    followUp: false,
    linkedSlip: "Jose Lopez",
    callType: "Missed",
    user: "Mary Ann Sanches",
    caller: "Erik",
    note: "",
    attachment: true, // Only attachment, no note
    archived: false,
    resolved: false,
    office: "RDS"
  },
  {
    id: 14,
    timestamp: "01/26/25 @ 3:55 pm",
    followUp: true,
    linkedSlip: "Jenna Ortega",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Amanda",
    note: "Case urgently needs review. High priority.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "CRD"
  },
  {
    id: 15,
    timestamp: "01/26/25 @ 4:20 pm",
    followUp: false,
    linkedSlip: "Tom Hiddleston",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Joy",
    note: "Client left message regarding billing concern.",
    attachment: false,
    archived: true, // Test archived edge case
    resolved: false,
    office: "CRD"
  },
  {
    id: 16,
    timestamp: "01/26/25 @ 5:30 pm",
    followUp: false,
    linkedSlip: "Clark Kent",
    callType: "Missed",
    user: "Mary Ann Sanches",
    caller: "Bruce",
    note: "Missed call, will return tomorrow.",
    attachment: false,
    archived: false,
    resolved: true, // Test resolved edge case
    office: "CRD"
  },
  {
    id: 17,
    timestamp: "01/27/25 @ 11:11 am",
    followUp: false,
    linkedSlip: "Diana Prince",
    callType: "Incoming",
    user: "Christina Aguilera",
    caller: "Lois",
    note: "Sent updated lab results via email.",
    attachment: true,
    archived: false,
    resolved: false,
    office: "CRD"
  },
  {
    id: 18,
    timestamp: "01/27/25 @ 2:45 pm",
    followUp: true,
    linkedSlip: "Bruce Wayne",
    callType: "Outgoing",
    user: "Mary Ann Sanches",
    caller: "Selina",
    note: "Will follow up regarding next appointment.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "CRD"
  },
  {
    id: 19,
    timestamp: "01/28/25 @ 9:07 am",
    followUp: false,
    linkedSlip: "",
    callType: "Missed",
    user: "Christina Aguilera",
    caller: "Barry",
    note: "",
    attachment: false,
    archived: false,
    resolved: false,
    office: "None" // missing linked slip edge case
  },
  {
    id: 20,
    timestamp: "01/28/25 @ 10:32 am",
    followUp: false,
    linkedSlip: "General Inquiry",
    callType: "Incoming",
    user: "Mary Ann Sanches",
    caller: "Hal",
    note: "General question about insurance.",
    attachment: false,
    archived: false,
    resolved: false,
    office: "General"
  }
]


// 2. Utilities
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
      className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${checked ? "bg-[#FF432A]" : "bg-gray-200"}`}
      onClick={onChange}
    >
      <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0 left-0 transition ${checked ? "translate-x-4" : ""}`} />
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

  // 6. Filtered + Sorted data
  const filteredCalls = useMemo(() => {
    let calls = [...dummyCalls];
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
  }, [filterText, filterCallType, filterDate, showFollowUpOnly, filterOffice, filterUser]);

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
              <th className="px-4 py-2 w-9"><Checkbox checked={selected.length === filteredCalls.length} indeterminate={selected.length > 0 && selected.length < filteredCalls.length} onCheckedChange={handleSelectAll} /></th>
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
                  <td className="px-4 py-3"><Checkbox checked={selected.includes(row.id)} onCheckedChange={() => handleSelect(row.id)} /></td>
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
                  <td className="px-2 py-3"><div className="flex items-center gap-1">{callTypeIcon(row.callType)}<span className="text-[13px]">{row.callType}</span></div></td>
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
