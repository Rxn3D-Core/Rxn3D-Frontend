import { slipService, type QRScanResponse, type QRScanResponseData } from "@/services/slip";
import { filterValidQrScanSlips } from "@/lib/slip-location";

/** Persisted across in-app scans and native-camera deep links. */
export const DRIVER_QR_SESSION_STORAGE_KEY = "qr_scan_session_key";
/** In-memory batch for Add Slip across modal ↔ scanner (same tab). */
export const DRIVER_QR_BATCH_STORAGE_KEY = "qr_scan_batch_data";
/** Dispatched to open the header scanner from other pages (e.g. native-camera landing). */
export const DRIVER_QR_SCANNER_OPEN_EVENT = "rxn3d:open-driver-qr-scanner";

export type ParsedDriverQr = {
  case_id: number;
  slip_ids: number[];
  rawText: string;
};

export type DriverScanMergeResult = {
  ok: boolean;
  message: string;
  response: QRScanResponse | null;
  sessionKey: string | null;
  validSlips: QRScanResponseData[];
  /** Backend reported the case is already in the active driver session. */
  alreadyInSession?: boolean;
};

/** Trim and decode URI-encoded QR payloads (common from camera apps). */
export function normalizeQrScanText(text: string): string {
  const trimmed = text.trim();
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Parse any supported Rxn3D slip QR format into case + slip ids. */
export function parseDriverQrText(text: string): ParsedDriverQr | null {
  const normalized = normalizeQrScanText(text);
  const parsed = slipService.parseQRCode(normalized);
  if (!parsed?.case_id) return null;
  return { ...parsed, rawText: normalized };
}

export function isRxn3dDriverQrText(text: string): boolean {
  return parseDriverQrText(text) !== null;
}

export function mergeDriverScanSlips(
  prev: QRScanResponseData[],
  incoming: QRScanResponseData[]
): QRScanResponseData[] {
  const prevValid = filterValidQrScanSlips(prev);
  const seen = new Set(prevValid.map((d) => d.slip_id));
  return [
    ...prevValid,
    ...filterValidQrScanSlips(incoming).filter((d) => !seen.has(d.slip_id)),
  ];
}

export function buildMergedScanResponse(
  res: QRScanResponse,
  mergedSlips: QRScanResponseData[]
): QRScanResponse {
  return {
    ...res,
    data: mergedSlips,
    scanned_cases_count: mergedSlips.length,
  };
}

/** Remove attempted slip ids from an in-memory batch after a failed scan. */
export function removeSlipIdsFromBatch(
  prev: QRScanResponseData[],
  slipIds: number[]
): QRScanResponseData[] {
  const failed = new Set(slipIds);
  return filterValidQrScanSlips(prev.filter((d) => !failed.has(d.slip_id)));
}

/**
 * Normalize a scan-qr API response into merge / error state for the driver UI.
 * Callers update session storage when `sessionKey` is returned on success.
 */
export function processDriverScanApiResult(
  res: QRScanResponse | null,
  prevData: QRScanResponseData[],
  attemptedSlipIds: number[]
): DriverScanMergeResult {
  if (!res) {
    return {
      ok: false,
      message: "Failed to scan QR code. Please check your connection and try again.",
      response: null,
      sessionKey: null,
      validSlips: [],
    };
  }

  const message = res.message || "";
  const alreadyInSession =
    !res.success && /already been scanned/i.test(message);

  if (alreadyInSession) {
    const existing = filterValidQrScanSlips(prevData);
    return {
      ok: existing.length > 0,
      message: message || "This case is already in your pickup list.",
      response: existing.length > 0 ? buildMergedScanResponse(res, existing) : null,
      sessionKey: res.session_key || loadDriverSessionKey(),
      validSlips: [],
      alreadyInSession: true,
    };
  }

  if (!res.success) {
    return {
      ok: false,
      message:
        message ||
        (Array.isArray((res as { errors?: string[] }).errors)
          ? (res as { errors?: string[] }).errors!.join(" ")
          : "Failed to process QR code."),
      response: null,
      sessionKey: null,
      validSlips: [],
    };
  }

  const validSlips = filterValidQrScanSlips(Array.isArray(res.data) ? res.data : []);
  if (validSlips.length === 0) {
    const cleaned = removeSlipIdsFromBatch(prevData, attemptedSlipIds);
    return {
      ok: false,
      message:
        message ||
        "Invalid slip locations for pickup or drop-off. Only slips ready for pick up or drop off can be scanned.",
      response: cleaned.length > 0 ? buildMergedScanResponse(res, cleaned) : null,
      sessionKey: res.session_key || null,
      validSlips: [],
    };
  }

  const merged = mergeDriverScanSlips(prevData, validSlips);
  return {
    ok: true,
    message,
    response: buildMergedScanResponse(res, merged),
    sessionKey: res.session_key || null,
    validSlips,
  };
}

export function loadDriverSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DRIVER_QR_SESSION_STORAGE_KEY);
}

export function saveDriverSessionKey(key: string | null): void {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(DRIVER_QR_SESSION_STORAGE_KEY, key);
  else localStorage.removeItem(DRIVER_QR_SESSION_STORAGE_KEY);
}

export function persistDriverScanBatch(response: QRScanResponse | null): void {
  if (typeof window === "undefined") return;
  if (!response?.data?.length) {
    sessionStorage.removeItem(DRIVER_QR_BATCH_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(DRIVER_QR_BATCH_STORAGE_KEY, JSON.stringify(response));
}

export function loadDriverScanBatch(): QRScanResponse | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRIVER_QR_BATCH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QRScanResponse;
    return parsed?.data?.length ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDriverScanBatch(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRIVER_QR_BATCH_STORAGE_KEY);
}

/** iOS Safari and iPadOS need simpler camera constraints. */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function driverQrCameraConstraints(): MediaStreamConstraints {
  // Prefer environment camera when available; keep constraints soft so desktop webcams work.
  return {
    video: {
      facingMode: { ideal: "environment" },
    },
    audio: false,
  };
}

export function driverQrCameraFallbackConstraints(): MediaStreamConstraints {
  return { video: true, audio: false };
}

function prepareVideoElementForCamera(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("autoplay", "true");
}

function videoHasUsableFrame(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ||
    (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
  );
}

/**
 * Soft-wait for camera preview. Never hard-fails if the MediaStream is live —
 * some browsers delay frames while overlays cover the <video>.
 */
export async function waitForVideoPlayback(
  video: HTMLVideoElement,
  timeoutMs = 2_500
): Promise<void> {
  prepareVideoElementForCamera(video);

  const tryPlay = async (): Promise<void> => {
    try {
      await video.play();
    } catch {
      // Ignore — muted autoplay / later decode loop will retry.
    }
  };

  await tryPlay();
  if (videoHasUsableFrame(video)) return;

  await new Promise<void>((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      video.removeEventListener("loadedmetadata", onProgress);
      video.removeEventListener("loadeddata", onProgress);
      video.removeEventListener("canplay", onProgress);
      video.removeEventListener("playing", onProgress);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onProgress = () => {
      void tryPlay().then(() => {
        if (videoHasUsableFrame(video) || (!video.paused && video.videoWidth > 0)) {
          finish();
        }
      });
    };

    const timeoutId = window.setTimeout(() => {
      void tryPlay().finally(() => finish());
    }, timeoutMs);

    const pollId = window.setInterval(onProgress, 150);

    video.addEventListener("loadedmetadata", onProgress);
    video.addEventListener("loadeddata", onProgress);
    video.addEventListener("canplay", onProgress);
    video.addEventListener("playing", onProgress);
    onProgress();
  });
}
