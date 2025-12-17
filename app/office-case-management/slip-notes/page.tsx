"use client"

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, ChevronDown, Filter, MoreHorizontal, Paperclip, Phone, CheckCircle2 } from "lucide-react";

export const dummyCalls = [
  {
    id: 1,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    type: "Internal",
    user: "Mary Ann Sanches",
    patient: "Maria Pavlova",
    patientLink: "#",
    product: "SFN-IFD",
    deliveryDate: "01/15/2025",
    rush: true,
    note: "Aliquam dignissim ullamcorper dui. Sed gravida..",
    attachment: true,
  },
  {
    id: 2,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Internal",
    user: "Christina Aguilera",
    patient: "Maria Pavlova",
    patientLink: "#",
    product: "AOT",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Sed gravida sapien id dolor tempor finibus. Etiam fin",
    attachment: false,
  },
  {
    id: 3,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Internal",
    user: "Christina Aguilera",
    patient: "Maria Pavlova",
    patientLink: "#",
    product: "MFA-BB/MFA-BB",
    deliveryDate: "01/15/2025",
    rush: true,
    note: "Cras sed bibendum lacus",
    attachment: false,
  },
  {
    id: 4,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Stage",
    user: "Mary Ann Sanches",
    patient: "Christina Perri",
    patientLink: "#",
    product: "FD-BB",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Curabitur commodo velit a suscipit mattis. Morbi I",
    attachment: true,
  },
  {
    id: 5,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    type: "Stage",
    user: "Mary Ann Sanches",
    patient: "Matt Damon",
    patientLink: "#",
    product: "CRN-FN",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Donec sed mi a lorem interdum lacinia eu a dui.",
    attachment: false,
  },
  {
    id: 6,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Lab Connect",
    user: "Christina Aguilera",
    patient: "Angelica Panganiban",
    patientLink: "#",
    product: "FD-BB",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Curabitur eros ligula, condimentum eget dui condimentum, pharetra bibendum nibh",
    attachment: false,
  },
  {
    id: 7,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Internal",
    user: "Christina Aguilera",
    patient: "Cynthia Gutierrez",
    patientLink: "#",
    product: "CRN-FN",
    deliveryDate: "01/15/2025",
    rush: true,
    note: "Donec eu iaculis nunc. Vivamus ac porttitor lorem. Nullam eleifend, augue",
    attachment: true,
  },
  {
    id: 8,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: true,
    type: "Lab Connect",
    user: "Mary Ann Sanches",
    patient: "Greciaa Pascual",
    patientLink: "#",
    product: "FD-BB",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Praesent orci ligula, sagittis at justo ut, pretium volutpat velit.",
    attachment: true,
  },
  {
    id: 9,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Internal",
    user: "Christina Aguilera",
    patient: "Anthony Bylon",
    patientLink: "#",
    product: "AOT",
    deliveryDate: "01/15/2025",
    rush: false,
    note: "Vivamus risus neque, molestie nec pellentesque vitae",
    attachment: false,
  },
  {
    id: 10,
    timestamp: "01/23/25 @ 1:23 pm",
    followUp: false,
    type: "Internal",
    user: "Christina Aguilera",
    patient: "Mark Washington",
    patientLink: "#",
    product: "MFA-BB/MFA-BB",
    deliveryDate: "01/15/2025",
    rush: true,
    note: "Fusce interdum bibendum elit vel porta. Sed vel sodales neque.",
    attachment: false,
  },
];


// Follow Up Toggle (stateful!)
function FollowUpToggle({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <button
      type="button"
      aria-label="Toggle Follow Up"
      className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${checked ? "bg-[#FF432A]" : "bg-gray-200"}`}
      onClick={onChange}
      tabIndex={0}
    >
      <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0 left-0 transition ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

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

const RowActionMenu = ({ row }: { row: any }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
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
};

export default function SlipNoteTable() {
  // We manage all data here for simplicity
  const [calls, setCalls] = useState(dummyCalls);
  const [selected, setSelected] = useState<number[]>([]);
  const [filterText, setFilterText] = useState("");

  // Filtering (add more logic as needed)
  const filteredCalls = useMemo(() => {
    let rows = [...calls];
    if (filterText) {
      const lower = filterText.toLowerCase();
      rows = rows.filter(row =>
        row.patient.toLowerCase().includes(lower) ||
        row.user.toLowerCase().includes(lower) ||
        row.product.toLowerCase().includes(lower) ||
        row.note.toLowerCase().includes(lower)
      );
    }
    return rows;
  }, [calls, filterText]);

  const showNoResults = filteredCalls.length === 0;

  const handleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleSelectAll = () => {
    setSelected(selected.length === filteredCalls.length ? [] : filteredCalls.map(row => row.id));
  };

  // ** WORKING Follow Up toggle handler **
  const handleToggleFollowUp = (id: number) => {
    setCalls(calls =>
      calls.map(row =>
        row.id === id ? { ...row, followUp: !row.followUp } : row
      )
    );
  };

  // Bulk actions for selected rows
  const handleBulkAction = (action: "followup" | "resolved" | "archive") => {
    setCalls(calls =>
      calls.map(row =>
        selected.includes(row.id)
          ? action === "followup"
            ? { ...row, followUp: true }
            : action === "resolved"
              ? { ...row, followUp: false }
              : action === "archive"
                ? { ...row, archived: true }
                : row
          : row
      )
    );
    setSelected([]); // Optionally clear selection after
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center mb-2">
        <Input className="w-96" placeholder="Search by patient, office, doctor, case..." value={filterText} onChange={e => setFilterText(e.target.value)} />
        <Button className="bg-blue-700 text-white px-4"> <Phone className="h-4 w-4 mr-1" /> Add Call log</Button>
        <Button variant="outline" className="ml-auto"><Filter className="h-4 w-4 mr-1" /> Advance Filter</Button>
        <Button variant="ghost" className="text-sm text-blue-700" onClick={() => setFilterText("")}>Clear all Filters</Button>
        {/* Example: you can add a follow-up only filter toggle here if needed */}
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 mb-2 rounded bg-blue-50 border border-blue-200 px-4 py-2">
          <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
          <Button variant="ghost" size="sm" onClick={() => handleBulkAction("followup")}>Mark as follow up</Button>
          <Button variant="ghost" size="sm" onClick={() => handleBulkAction("resolved")}>Mark as resolved</Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleBulkAction("archive")}>Archive</Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-700">
              <th className="px-4 py-2 w-9"><Checkbox checked={selected.length === filteredCalls.length && filteredCalls.length > 0} indeterminate={selected.length > 0 && selected.length < filteredCalls.length} onCheckedChange={handleSelectAll} /></th>
              <th className="px-2 py-2 font-semibold text-left">Timestamp</th>
              <th className="px-2 py-2 font-semibold text-left">Follow up</th>
              <th className="px-2 py-2 font-semibold text-left">Type</th>
              <th className="px-2 py-2 font-semibold text-left">User</th>
              <th className="px-2 py-2 font-semibold text-left">Patient</th>
              <th className="px-2 py-2 font-semibold text-left">Product</th>
              <th className="px-2 py-2 font-semibold text-left">Delivery date</th>
              <th className="px-2 py-2 font-semibold text-left">Note</th>
              <th className="px-2 py-2 font-semibold text-center">Attachment</th>
              <th className="px-2 py-2 font-semibold text-center"></th>
            </tr>
          </thead>
          <tbody>
            {showNoResults ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <span>No call logs match your current filter.</span>
                    <Button className="bg-blue-700 text-white" onClick={() => setFilterText("")}>
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
                    <FollowUpToggle checked={row.followUp} onChange={() => handleToggleFollowUp(row.id)} />
                  </td>
                  <td className="px-2 py-3">{row.type}</td>
                  <td className="px-2 py-3">{row.user}</td>
                  <td className="px-2 py-3">
                    <a href={row.patientLink} className="text-blue-700 font-medium inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                      {row.patient}
                      <svg width="14" height="14" fill="none" viewBox="0 0 20 20"><path d="M7.5 2.5H5A2.5 2.5 0 0 0 2.5 5v10A2.5 2.5 0 0 0 5 17.5h10a2.5 2.5 0 0 0 2.5-2.5v-2.5" stroke="#1673B1" strokeWidth={1.4} /><path d="M14.167 3.333H17.5v3.334M10 10l7.5-7.5" stroke="#1673B1" strokeWidth={1.4} strokeLinecap="round" /></svg>
                    </a>
                  </td>
                  <td className="px-2 py-3">{row.product}</td>
                  <td className="px-2 py-3">
                    {row.rush ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 16 19" fill="none"><path d="M8.15625 7.91504V2.66504L2.53125 10.915H6.90625L6.90625 16.165L12.5313 7.91504L8.15625 7.91504Z" stroke="#CF0202" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {row.deliveryDate}
                      </span>
                    ) : (
                      row.deliveryDate
                    )}
                  </td>
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
