export const V2_STATUS_TABS = [
  { label: "In Progress", value: "In Progress", icon: "progress" },
  { label: "On Hold", value: "On hold", icon: "hold" },
  { label: "Cancelled", value: "cancelled", icon: "cancelled" },
  { label: "Done", value: "Finished", icon: "done" },
];

export function countVisibleV2Columns(columns) {
  const groupedPatientSlip = columns.patient || columns.slipNumber;
  const groupedPanProduct = columns.pan || columns.product;
  const standaloneColumns = [
    columns.office,
    columns.status,
    columns.location,
    columns.due,
    columns.actions,
    columns.timestamp,
    columns.attachment,
    columns.viewSlip,
  ];

  return (
    1 +
    Number(groupedPatientSlip) +
    Number(groupedPanProduct) +
    standaloneColumns.filter(Boolean).length
  );
}

export function getV2PaginationPages(currentPage, totalPages) {
  const windowSize = Math.min(5, totalPages);
  const lastStartPage = Math.max(1, totalPages - windowSize + 1);
  const startPage = Math.min(Math.max(1, currentPage - 2), lastStartPage);

  return Array.from({ length: windowSize }, (_, index) => startPage + index);
}

export function v2RowActionStripClass() {
  return "pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";
}
