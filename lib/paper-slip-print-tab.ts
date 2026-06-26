// ponytail: width ≤1024 covers phones + tablets; avoids UA sniffing
function isMobileOrTablet(): boolean {
  return window.innerWidth <= 1024 ||
    /android|ipad|iphone|ipod|mobile/i.test(navigator.userAgent);
}

export function openPaperSlipPrintTab(route: string): void {
  // On mobile/tablet popups are always blocked and postMessage flow won't work.
  // Open in a new tab so the user can return via browser back button.
  if (isMobileOrTablet()) {
    window.open(route, "_blank");
    return;
  }

  const popup = window.open(route, "_blank");
  if (!popup) {
    // popup blocked on desktop — fall back to same-tab navigation
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
