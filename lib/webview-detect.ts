declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

/** Pure detection so it can be exercised without a browser. */
export function detectEmbeddedWebView(
  ua: string,
  win: Pick<Window, "ReactNativeWebView" | "Capacitor">,
): boolean {
  if (win.ReactNativeWebView) return true;
  if (win.Capacitor?.isNativePlatform?.()) return true;
  // Android WebView marks itself with "; wv)" in the UA.
  if (/;\s*wv\)/.test(ua)) return true;
  // iOS WKWebView UAs lack the trailing "Safari/xxx" token every real iOS browser has.
  // ponytail: iPads in desktop-UA mode slip through and get browser behavior, same as today
  if (/iphone|ipad|ipod/i.test(ua) && !/safari/i.test(ua)) return true;
  return false;
}

export function isEmbeddedWebView(): boolean {
  if (typeof window === "undefined") return false;
  return detectEmbeddedWebView(navigator.userAgent, window);
}
