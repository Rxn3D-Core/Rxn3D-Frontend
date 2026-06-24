export function openPaperSlipPrintTab(route: string): void {
  const popup = window.open(route, "_blank");
  if (!popup) {
    // popup blocked — fall back to direct navigation
    window.location.href = route;
    return;
  }

  function onMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== "PAPER_SLIP_PRINT_READY") return;
    window.removeEventListener("message", onMessage);

    // ponytail: iframe isolates HTML from React DOM; contentWindow.print() prints only iframe, no main-page head mutation needed
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:none;z-index:99999;visibility:hidden;";
    document.body.appendChild(iframe);

    const styleLinks = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']"))
      .map((l) => `<link rel="stylesheet" href="${l.href}">`)
      .join("");
    const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
      .map((s) => `<style>${s.textContent}</style>`)
      .join("");

    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><style>body{margin:0}</style>${styleLinks}${inlineStyles}</head><body>${event.data.html as string}</body></html>`);
    iframeDoc.close();

    iframe.onload = () => {
      iframe.style.visibility = "visible";
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 0);
    };
  }

  window.addEventListener("message", onMessage);
}
