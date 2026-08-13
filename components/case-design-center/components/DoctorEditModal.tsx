"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WizardDoctorShape } from "@/components/new-case-wizard";
import { resolveDoctorImageUrl, getInitials, formatDoctorDisplayName, type DoctorImageSource } from "@/utils/avatar-utils";

export function mapOfficeDoctorsToWizardShape(
  raw: (DoctorImageSource & { id: number; first_name?: string; last_name?: string })[]
): WizardDoctorShape[] {
  return raw.map((d) => ({
    id: d.id,
    name: formatDoctorDisplayName(d.first_name, d.last_name),
    // Empty string when no photo — UI shows initials (never a placeholder image)
    img: resolveDoctorImageUrl(d) || "",
  }));
}

export function DoctorEditModal({
  open,
  onClose,
  doctors,
  selectedDoctorId,
  isLoading,
  error,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  doctors: WizardDoctorShape[];
  selectedDoctorId?: number | null;
  isLoading?: boolean;
  error?: Error | null;
  onSelect: (doctor: WizardDoctorShape) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-[720px] w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#d9d9d9]">
          <DialogTitle className="text-base font-bold text-[#1d1d1b] text-center">
            Change doctor
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[min(70vh,520px)] overflow-y-auto">
          {error ? (
            <p className="text-sm text-center text-[#7f7f7f] py-8">
              Unable to load doctors. Please try again.
            </p>
          ) : isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-[100px] h-[100px] rounded-full" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[#9ba5b7] text-right mb-3">
                {doctors.length} {doctors.length === 1 ? "doctor" : "doctors"} found
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onSelect(doc)}
                      className="group flex flex-col items-center gap-2 p-1 w-full max-w-[140px]"
                    >
                      <div
                        className={cn(
                          "relative flex items-center justify-center w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-[#eef1f4] border-[3px] transition-colors",
                          isSelected ? "border-[#1162A8]" : "border-[#d9d9d9] group-hover:border-[#1162A8]"
                        )}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-[#1162a8]">
                          {getInitials(doc.name) || "?"}
                        </span>
                        {doc.img && (
                          <img
                            src={doc.img}
                            alt={doc.name}
                            className="relative w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.remove();
                            }}
                          />
                        )}
                      </div>
                      <span className="text-[13px] font-bold text-[#1d1d1b] text-center leading-tight">
                        {doc.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
