import { ChevronsLeft, ChevronsRight } from "lucide-react";

export function CenterNavigation({
  showMaxillary,
  setShowMaxillary,
  showMandibular,
  setShowMandibular,
}: {
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center pt-6 flex-shrink-0 w-16 order-2 lg:order-none gap-1">
      <button
        onClick={() => setShowMaxillary(!showMaxillary)}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
      >
        <ChevronsLeft size={22} className={showMaxillary ? "text-[#7f7f7f]" : "text-[#d9d9d9]"} />
      </button>
      <button
        onClick={() => setShowMandibular(!showMandibular)}
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
        title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
      >
        <ChevronsRight size={22} className={showMandibular ? "text-[#7f7f7f]" : "text-[#d9d9d9]"} />
      </button>
    </div>
  );
}
