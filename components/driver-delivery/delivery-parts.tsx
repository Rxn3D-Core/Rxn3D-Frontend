"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSlipDriverHistory,
  normalizeSlipDriverHistoryPayload,
} from "@/lib/api/slip-driver-history";
import {
  filesToUploadedImages,
  type UploadedImage,
} from "@/lib/image-to-base64";

const ISLAND_MOMENTS_FONT =
  'var(--font-island-moments), "Segoe Script", "Brush Script MT", cursive';

export type DeliveryTimelineRow = {
  timestamp: string;
  location: string;
  user: string;
  receiver: string;
  /** Pickup/drop photo URL for this entry, if any. */
  imageUrl?: string | null;
};

/* ----------------------------- Icons ----------------------------- */

/** Delivery truck icon; colour drives pick up (green) vs drop off (red). */
export function DeliveryTruckIcon({
  color = "#34C759",
  size = 30,
}: {
  color?: string;
  size?: number;
}) {
  const w = (size * 23) / 33;
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 24 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M8.95658 6.95117H2.75481C1.69774 6.95117 0.84082 7.80677 0.84082 8.8622V16.2821C0.84082 17.3376 1.69774 18.1932 2.75481 18.1932H8.95658C10.0136 18.1932 10.8706 17.3376 10.8706 16.2821V8.8622C10.8706 7.80677 10.0136 6.95117 8.95658 6.95117Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M5.85561 18.7695L1.87793 23.4564H9.84399L5.85561 18.7695Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M5.85547 23.457V32.9161" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M19.0824 6.51344C20.6651 6.51344 21.9481 5.23243 21.9481 3.65223C21.9481 2.07202 20.6651 0.791016 19.0824 0.791016C17.4998 0.791016 16.2168 2.07202 16.2168 3.65223C16.2168 5.23243 17.4998 6.51344 19.0824 6.51344Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M12.9661 15.1931L18.4729 8.83008H20.0554C20.4724 8.83008 20.8573 9.03293 21.1353 9.38524L21.8838 10.3461C22.1725 10.7198 22.3329 11.1788 22.3329 11.6486V19.5916L16.4947 26.0934V30.0863C16.4947 30.9084 16.2702 31.7304 15.789 32.3603C15.7034 32.4671 15.6286 32.5525 15.5644 32.5952C15.265 32.7874 14.5059 32.7447 14.1851 32.5952C14.1209 32.5632 14.0354 32.4991 14.0354 32.4991C13.4045 31.9013 13.1265 31.1326 13.1265 30.3425V26.3283L18.3125 19.8265L18.1093 14.5525L14.9122 18.3639H5.85547" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M22.7717 22.0039V29.7014C22.7717 30.5235 22.5899 31.3455 22.2049 31.9754C22.1408 32.0822 22.0766 32.1676 22.0232 32.2103C21.7879 32.4025 21.1678 32.3598 20.9111 32.2103C20.8577 32.1783 20.7935 32.1142 20.7187 32.0288C20.291 31.5164 20.0664 30.7477 20.0664 29.9576V25.9434" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
    </svg>
  );
}

/* --------------------------- Modal shell --------------------------- */

export function DeliveryModalHeader({
  icon,
  title,
  onClose,
}: {
  icon: ReactNode;
  title: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          {icon}
        </span>
        <h2 className="text-lg font-bold tracking-[-0.01em] text-[#1F2937] sm:text-xl">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-gray-100 hover:text-[#4B5563]"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ---------------------------- Info bar ---------------------------- */

export type DeliveryInfoField = { label: string; value: ReactNode };

export function DeliveryInfoBar({ fields }: { fields: DeliveryInfoField[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-b border-[#E5E7EB] pb-4">
      {fields.map((f) => (
        <div key={f.label} className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-[#6B7280]">
            {f.label}
          </span>
          <span className="text-[13px] text-[#111827]">{f.value || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Pills ------------------------------ */

export function DeliveryPills({ items }: { items: ReactNode[] }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-3">
      {visible.map((item, i) => (
        <span
          key={i}
          className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5 text-[13px] font-medium text-[#374151]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* --------------------------- Timeline ----------------------------- */

export function DeliveryTimeline({
  rows,
  loading,
  error,
  emptyLabel = "No driver history recorded for this slip yet.",
}: {
  rows: DeliveryTimelineRow[];
  loading?: boolean;
  error?: string | null;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[#6B7280]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="my-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#6B7280]">{emptyLabel}</p>
    );
  }
  return (
    <div className="py-1">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(140px,1fr)_minmax(150px,1.4fr)_minmax(80px,0.8fr)_minmax(100px,0.9fr)_44px] items-center gap-3 border-b border-dashed border-[#E5E7EB] py-3 text-[13px] last:border-b-0"
        >
          <span className="text-[#374151]">{row.timestamp}</span>
          <span className="text-[#374151]">{row.location}</span>
          <span className="text-[#374151]">{row.user}</span>
          <span
            className="justify-self-end text-right text-[22px] leading-none text-[#111827]"
            style={{ fontFamily: ISLAND_MOMENTS_FONT }}
          >
            {row.receiver && row.receiver !== "—" ? row.receiver : ""}
          </span>
          <span className="justify-self-end">
            {row.imageUrl ? (
              <a
                href={row.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-9 w-9 overflow-hidden rounded-md border border-[#E5E7EB] transition-opacity hover:opacity-80"
                title="View photo"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.imageUrl} alt="Delivery photo" className="h-full w-full object-cover" />
              </a>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Fetch + normalize a single slip's driver history when `open`. */
export function useSlipDriverTimeline(slipId: number | null, open: boolean) {
  const [rows, setRows] = useState<DeliveryTimelineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!slipId || Number.isNaN(slipId)) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getSlipDriverHistory(slipId);
      if (!res.success) {
        setError(res.message || "Failed to load driver history");
        setRows([]);
        return;
      }
      const normalized = normalizeSlipDriverHistoryPayload(res.data, slipId);
      setRows(normalized?.timeline ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load driver history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [slipId]);

  useEffect(() => {
    if (open) void reload();
    else {
      setRows([]);
      setError(null);
    }
  }, [open, reload]);

  return { rows, loading, error, reload };
}

/* -------------------------- Signature pad -------------------------- */

export function SignaturePad({
  value,
  onChange,
  onSubmit,
  placeholder = "Signature",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user presses Enter inside the signature box. */
  onSubmit?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="rounded-lg border border-[#D9D9D9] bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[96px] w-full rounded-lg border-0 bg-transparent px-4 text-center text-[40px] leading-none text-[#1F2937] outline-none placeholder:text-[#C4C4C4] focus-visible:ring-0"
        style={{ fontFamily: ISLAND_MOMENTS_FONT }}
      />
    </div>
  );
}

/* -------------------------- Image dropzone ------------------------- */

/** Single image per slip (backend stores one image per slip per action). */
export function ImageDropzone({
  image,
  onChange,
  onRejected,
}: {
  image: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
  onRejected?: (names: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setBusy(true);
      try {
        const { images: added, rejected } = await filesToUploadedImages(files);
        if (rejected.length && onRejected) onRejected(rejected);
        // One image per slip — keep the first valid file, replacing any existing.
        if (added.length) onChange(added[0]);
      } finally {
        setBusy(false);
      }
    },
    [onChange, onRejected]
  );

  if (image) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#111827]">{image.name}</p>
          <p className="text-xs text-[#6B7280]">{(image.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-[#D1D5DB] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-gray-100"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-gray-200 hover:text-[#4B5563]"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
        dragOver
          ? "border-[#0E66B2] bg-blue-50"
          : "border-[#CBD5E1] bg-[#F9FAFB] hover:border-[#0E66B2]"
      )}
    >
      {busy ? (
        <Loader2 className="h-6 w-6 animate-spin text-[#0E66B2]" />
      ) : (
        <Upload className="h-6 w-6 text-[#9CA3AF]" aria-hidden />
      )}
      <p className="text-sm text-[#6B7280]">Drag &amp; drop a photo here or click to browse</p>
      <p className="text-xs text-[#9CA3AF]">Image only (JPG, PNG, GIF, WEBP) · max 10MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ----------------------------- Footer ----------------------------- */

export function DeliveryModalFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  submitting,
  extra,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  submitting?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 border-t border-[#F3F4F6] px-6 py-5 sm:px-8">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="h-10 rounded-lg border border-[#D1D5DB] px-6 text-sm font-medium text-[#374151] transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled || submitting}
        className="h-10 rounded-lg bg-[#0E66B2] px-8 text-sm font-medium text-white transition-colors hover:bg-[#0c5a9f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : confirmLabel}
      </button>
      {extra}
    </div>
  );
}
