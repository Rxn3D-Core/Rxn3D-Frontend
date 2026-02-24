"use client";

const GUM_SHADES = [
  { name: "G-Light", color: "#F4BDBD" },
  { name: "G-Dark", color: "#D99191" },
  { name: "G-Intense", color: "#E58D8D" },
  { name: "G-Red", color: "#E67373" },
  { name: "G-Violet", color: "#C58484" },
  { name: "G-Mask", color: "#EAC1A1" },
  { name: "G-Orange", color: "#FFAD66" },
  { name: "G-Brown", color: "#D5A880" },
  { name: "G-Mauve", color: "#8A484B" },
] as const;

interface GumShadePickerProps {
  selected?: string | null;
  onSelect: (shadeName: string) => void;
}

export function GumShadePicker({ selected, onSelect }: GumShadePickerProps) {
  return (
    <div className="flex flex-row items-center p-3.5 bg-white shadow-[1px_1px_4px_rgba(0,0,0,0.25)] rounded-[5px] self-stretch">
      {GUM_SHADES.map((shade) => {
        const isSelected = selected === shade.name;
        return (
          <button
            key={shade.name}
            type="button"
            onClick={() => onSelect(shade.name)}
            className="flex flex-col items-center justify-center p-[7px] gap-[7px]"
          >
            <div className="relative w-[63px] h-[63px] flex-shrink-0">
              <div
                className={`absolute inset-0 rounded-full border ${
                  isSelected ? "border-[#1162A8] border-[2px]" : "border-[#D9D9D9] border-[1.4px]"
                }`}
              />
              <div
                className="absolute rounded-full"
                style={{
                  backgroundColor: shade.color,
                  top: "4.92px",
                  left: "4.92px",
                  width: "53.72px",
                  height: "53.72px",
                }}
              />
            </div>
            <span
              className="text-[11px] text-center text-black tracking-[-0.02em] leading-[15px]"
              style={{ fontFamily: "Verdana, sans-serif" }}
            >
              {shade.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
