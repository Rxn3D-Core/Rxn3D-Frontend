"use client"

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar, ChevronDown, Filter, MoreHorizontal, Paperclip, Phone, CheckCircle2 } from "lucide-react";
import { useSlipContext, SlipProvider } from "../SlipContext";


// Follow Up Toggle (stateful!)
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
      tabIndex={0}
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
  const { slipNotes, loading, fetchSlipNotes } = useSlipContext();
  const [selected, setSelected] = useState<number[]>([]);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    fetchSlipNotes();
  }, []);

  // Filtering (add more logic as needed)
  const filteredCalls = useMemo(() => {
    // Ensure slipNotes is always an array
    let rows = Array.isArray(slipNotes) ? [...slipNotes] : [];
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
  }, [slipNotes, filterText]);

  const showNoResults = filteredCalls.length === 0;

  const handleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleSelectAll = () => {
    setSelected(selected.length === filteredCalls.length ? [] : filteredCalls.map(row => row.id));
  };

  // ** WORKING Follow Up toggle handler **
  // Remove setCalls, since you are using context (slipNotes)
  // You may want to update followUp via context or API instead.
  // For now, just show a warning if you try to use setCalls.
  const handleToggleFollowUp = (id: number) => {
    // TODO: Implement follow up toggle via context or API
    // Example: updateSlipNote(id, { followUp: !currentFollowUp })
    // For now, do nothing or show a warning
    console.warn("handleToggleFollowUp not implemented: should update context or backend");
  };

  // Bulk actions for selected rows
  const handleBulkAction = (action: "followup" | "resolved" | "archive") => {
    // TODO: Implement bulk actions via context or API
    // For now, do nothing or show a warning
    console.warn("handleBulkAction not implemented: should update context or backend");
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
              <th className="px-4 py-2 w-9">
                <Checkbox
                  checked={selected.length === filteredCalls.length && filteredCalls.length > 0}
                  indeterminate={selected.length > 0 && selected.length < filteredCalls.length}
                  onCheckedChange={handleSelectAll}
                  style={{ accentColor: "#1162A8", borderColor: "#1162A8" }}
                />
              </th>
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
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() => handleSelect(row.id)}
                      style={{ accentColor: "#1162A8", borderColor: "#1162A8" }}
                    />
                  </td>
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
