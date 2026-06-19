export function openPaperSlipPrintTab(route: string): void {
  const popup = window.open(route, "_blank");
  if (!popup) return;

  function onMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== "PAPER_SLIP_PRINT_READY") return;
    window.removeEventListener("message", onMessage);

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;inset:0;z-index:99999;background:#fff;display:none;";
    container.setAttribute("data-paper-slip-print", "1");
    container.innerHTML = event.data.html as string;
    document.body.appendChild(container);

    const style = document.createElement("style");
    style.textContent = "@media print { [data-paper-slip-print] { display:block !important; } body > *:not([data-paper-slip-print]) { display:none !important; } }";
    document.head.appendChild(style);

    window.print();

    document.body.removeChild(container);
    document.head.removeChild(style);
  }

  window.addEventListener("message", onMessage);
}
