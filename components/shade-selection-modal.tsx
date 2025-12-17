"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { X, Maximize2, Minimize2, Shuffle, MousePointer2, ScrollText, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

// ----- Types -----
type Mode = "pick" | "scroll" | "convert"
type TabType = "shade" | "color-picker"

interface ShadeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSystem?: string
  selectedShade?: string
  onShadeSelect: (shade: string, system: string) => void
  onSetAsDefault?: (system: string, shade: string) => void
}

interface ShadeOption {
  id: string
  name: string
  color: string
  group: "OM" | "A" | "B" | "C" | "D"
  position: number
}

// ----- Data -----
const shadeSystemOptions = [
  { value: "vita-classical", label: "VITA Classical" },
  { value: "vita-3d-master", label: "VITA 3D-Master" },
  { value: "vita-toothguide-3d-master", label: "VITA Toothguide 3D-Master" },
  { value: "chromascop", label: "ChromaScop®" },
  { value: "ivoclar-chromascop", label: "Ivoclar ChromaScop" },
]

// VITA Classical (grouped like the rack in the mock)
const vitaClassicalShades: ShadeOption[] = [
  { id: "OM1", name: "OM1", color: "#F5F0E8", group: "OM", position: 1 },
  { id: "OM2", name: "OM2", color: "#F2EDE5", group: "OM", position: 2 },
  { id: "OM3", name: "OM3", color: "#EFEBE2", group: "OM", position: 3 },
  { id: "A1", name: "A1", color: "#F5F0E8", group: "A", position: 4 },
  { id: "A2", name: "A2", color: "#F2EDE5", group: "A", position: 5 },
  { id: "A3", name: "A3", color: "#EFEBE2", group: "A", position: 6 },
  { id: "A3.5", name: "A3.5", color: "#EDE9E0", group: "A", position: 7 },
  { id: "A4", name: "A4", color: "#EBE7DE", group: "A", position: 8 },
  { id: "B1", name: "B1", color: "#F3F0E9", group: "B", position: 9 },
  { id: "B2", name: "B2", color: "#F0EDE6", group: "B", position: 10 },
  { id: "B3", name: "B3", color: "#EDEBE4", group: "B", position: 11 },
  { id: "B4", name: "B4", color: "#EAE8E1", group: "B", position: 12 },
  { id: "C1", name: "C1", color: "#F4F1EA", group: "C", position: 13 },
  { id: "C2", name: "C2", color: "#F1EEE7", group: "C", position: 14 },
  { id: "C3", name: "C3", color: "#EEECE5", group: "C", position: 15 },
  { id: "C4", name: "C4", color: "#EBEAE3", group: "C", position: 16 },
  { id: "D2", name: "D2", color: "#F0EEE7", group: "D", position: 17 },
  { id: "D3", name: "D3", color: "#EDECE5", group: "D", position: 18 },
  { id: "D4", name: "D4", color: "#EAEAE3", group: "D", position: 19 },
]

// quick sample conversion map (extend as needed)
const conversions: Record<
  string,
  { system: string; value: string }[]
> = {
  A4: [
    { system: "Vita 3D-Master", value: "2M2" },
    { system: "Chromascop", value: "210" },
    { system: "Dentsply", value: "B35" },
  ],
  A2: [
    { system: "Vita 3D-Master", value: "2M1" },
    { system: "Chromascop", value: "140" },
  ],
}

// ----- Component -----
export function ShadeSelectionModal({
  isOpen,
  onClose,
  selectedSystem = "vita-classical",
  selectedShade,
  onShadeSelect,
  onSetAsDefault,
}: ShadeSelectionModalProps) {
  const [activeTab, setActiveTab] = useState<"teeth" | "gum">("teeth")
  const [activeModalTab, setActiveModalTab] = useState<TabType>("shade")
  const [mode, setMode] = useState<Mode>("pick")
  const [currentSystem, setCurrentSystem] = useState(selectedSystem)
  const [currentShade, setCurrentShade] = useState<string | undefined>(selectedShade)
  const [isMaximized, setIsMaximized] = useState(false)
  const [showDefaultGuideModal, setShowDefaultGuideModal] = useState(false)
  const [sliderValue, setSliderValue] = useState([0])
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setCurrentSystem(selectedSystem)
      setCurrentShade(selectedShade)
    }
  }, [isOpen, selectedSystem, selectedShade])

  const currentShades = useMemo(() => {
    switch (currentSystem) {
      case "vita-classical":
      default:
        return vitaClassicalShades
    }
  }, [currentSystem])

  const groups = useMemo(() => {
    const g: Record<ShadeOption["group"], ShadeOption[]> = { OM: [], A: [], B: [], C: [], D: [] }
    currentShades.forEach(s => g[s.group].push(s))
    ;(["OM", "A", "B", "C", "D"] as const).forEach(k => g[k].sort((a,b)=>a.position-b.position))
    return g
  }, [currentShades])

  const selectedShadeInfo = currentShades.find(s => s.id === currentShade)

  const handleSystemChange = (value: string) => {
    setCurrentSystem(value)
    setCurrentShade(undefined)
  }

  const handleResumeCase = () => {
    if (currentShade) onShadeSelect(currentShade, currentSystem)
    onClose()
  }

  const handleSetAsDefault = () => {
    if (currentShade) onSetAsDefault?.(currentSystem, currentShade)
    setShowDefaultGuideModal(true)
  }

  const handleReset = () => {
    setCurrentShade("A1")
    setCurrentSystem("vita-classical")
    setSliderValue([0])
    setActiveModalTab("shade")
  }

  const getShadeFromSlider = (value: number): string => {
    const shades = vitaClassicalShades
    const index = Math.floor((value / 100) * (shades.length - 1))
    return shades[index]?.id || shades[0]?.id || "A1"
  }

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
    const newShade = getShadeFromSlider(value[0])
    setCurrentShade(newShade)
  }

  // Update slider position when shade changes from external source
  useEffect(() => {
    if (currentShade) {
      const shadeIndex = vitaClassicalShades.findIndex(shade => shade.id === currentShade)
      if (shadeIndex !== -1) {
        const newSliderValue = Math.round((shadeIndex / (vitaClassicalShades.length - 1)) * 100)
        setSliderValue([newSliderValue])
      }
    }
  }, [currentShade])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={cn(
            "p-0 gap-0 bg-white rounded-md overflow-hidden",
            isMaximized ? "max-w-[96vw] max-h-[96vh]" : "max-w-6xl max-h-[85vh]"
          )}
        >
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded">
                {/* small white tool glyph */}
               <svg width="43" height="42" viewBox="0 0 43 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.875" y="0.231445" width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                <g clipPath="url(#clip0_690_5726)">
                <path d="M20.7383 19.3438L22.9883 21.5938" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.3646 27.5938C17.8838 27.5938 18.3913 27.4398 18.823 27.1514C19.2547 26.8629 19.5911 26.453 19.7898 25.9733C19.9885 25.4936 20.0405 24.9658 19.9392 24.4566C19.8379 23.9474 19.5879 23.4797 19.2208 23.1126C18.8537 22.7455 18.3859 22.4955 17.8767 22.3942C17.3675 22.2929 16.8397 22.3449 16.3601 22.5436C15.8804 22.7422 15.4705 23.0787 15.182 23.5104C14.8936 23.9421 14.7396 24.4496 14.7396 24.9688C14.7398 25.4679 14.5499 25.9485 14.2086 26.3128C14.1035 26.4176 14.0318 26.5514 14.0028 26.6971C13.9737 26.8427 13.9886 26.9937 14.0454 27.1309C14.1023 27.2682 14.1987 27.3854 14.3222 27.4678C14.4458 27.5502 14.5911 27.594 14.7396 27.5938H17.3646Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.9663 24.6168L28.5231 16.0616C28.8217 15.763 28.9894 15.358 28.9894 14.9358C28.9894 14.5136 28.8217 14.1086 28.5231 13.8101C28.2245 13.5115 27.8196 13.3438 27.3973 13.3438C26.9751 13.3437 26.5702 13.5115 26.2716 13.8101L17.7148 22.3668" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                <clipPath id="clip0_690_5726">
                <rect width="18" height="18" fill="white" transform="translate(12.4883 11.8438)"/>
                </clipPath>
                </defs>
                </svg>


              </div>
              <DialogTitle className="text-lg font-semibold">Shade selection</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsMaximized(v => !v)} className="h-8 w-8">
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Tabs (Teeth / Gum) */}
          <div className="flex border-b">
            {[
              { key: "teeth", label: "Teeth Shade" },
              { key: "gum", label: "Gum Shade" },
            ].map(t => (
              <Button
                key={t.key}
                variant={activeTab === (t.key as any) ? "default" : "ghost"}
                className={cn(
                  "rounded-none border-b-2 border-transparent",
                  activeTab === (t.key as any) && "border-blue-600 bg-blue-600 text-white"
                )}
                onClick={() => setActiveTab(t.key as any)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto">
            {activeTab === "teeth" ? (
              <div className="space-y-6">
                {/* Shade/Color Picker Tabs */}
                <div className="flex border-b">
                  <button 
                    className={cn(
                      "flex-1 px-6 py-3 text-sm font-medium transition-colors",
                      activeModalTab === "shade" 
                        ? "bg-blue-600 text-white" 
                        : "bg-white text-gray-700 border-r"
                    )}
                    onClick={() => setActiveModalTab("shade")}
                  >
                    Shade
                  </button>
                  <button 
                    className={cn(
                      "flex-1 px-6 py-3 text-sm font-medium transition-colors",
                      activeModalTab === "color-picker" 
                        ? "bg-blue-600 text-white" 
                        : "bg-white text-gray-700"
                    )}
                    onClick={() => setActiveModalTab("color-picker")}
                  >
                    Color Picker
                  </button>
                </div>

                {activeModalTab === "shade" ? (
                  <>
                    {/* Mode segmented control: Pick / Scroll / Convert */}
                    <div className="flex items-center justify-center">
                      <div className="inline-flex rounded-full border bg-muted p-1">
                        <Button
                          type="button"
                          variant={mode === "pick" ? "default" : "ghost"}
                          className={cn("rounded-full px-4", mode === "pick" && "bg-white text-primary shadow")}
                          onClick={() => setMode("pick")}
                        >
                          <MousePointer2 className="mr-2 h-4 w-4" /> Pick
                        </Button>
                        <Button
                          type="button"
                          variant={mode === "scroll" ? "default" : "ghost"}
                          className={cn("rounded-full px-4", mode === "scroll" && "bg-white text-primary shadow")}
                          onClick={() => setMode("scroll")}
                        >
                          <ScrollText className="mr-2 h-4 w-4" /> Scroll
                        </Button>
                        <Button
                          type="button"
                          variant={mode === "convert" ? "default" : "ghost"}
                          className={cn("rounded-full px-4", mode === "convert" && "bg-white text-primary shadow")}
                          onClick={() => setMode("convert")}
                        >
                          <Shuffle className="mr-2 h-4 w-4" /> Convert
                        </Button>
                      </div>
                    </div>

                {/* System selector (top of rack) */}
                <div className="flex items-center justify-center gap-6">
                  <div className="text-sm font-medium">Shade System</div>
                  <Select value={currentSystem} onValueChange={handleSystemChange}>
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Select shade system" />
                    </SelectTrigger>
                    <SelectContent>
                      {shadeSystemOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected card + conversion (matches the floating card in Figma) */}
                {currentShade && (
                  <div className="flex justify-center">
                    <Card className="w-full max-w-2xl">
                      <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-12 rounded border-2 border-gray-400 shadow"
                            style={{ backgroundColor: selectedShadeInfo?.color }}
                            aria-label={`sample ${selectedShadeInfo?.name}`}
                          />
                          <div>
                            <div className="text-sm text-muted-foreground">Selected:</div>
                            <div className="font-semibold">{selectedShadeInfo?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              VITA Classical Shade system
                            </div>
                          </div>
                        </div>

                        <div className="md:ml-auto w-full md:w-auto">
                          <div className="text-sm font-medium mb-1">System Conversion:</div>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {(conversions[currentShade] ?? []).map((c, i) => (
                              <li key={i}>
                                {c.system}: {c.value}
                              </li>
                            ))}
                            {!(conversions[currentShade] ?? []).length && (
                              <li>No mapped conversions yet.</li>
                            )}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Rack */}
                <div className="mx-auto max-w-[1040px]">
                  <div className="text-center mb-3 text-muted-foreground">
                    {currentSystem === "vita-classical" ? "Select your teeth shade" : "Shade Selection"}
                  </div>

                  {/* Board */}
                  <div className="bg-[#E9EAEC] rounded-xl p-5 shadow-inner">
                    <div className="flex gap-6 items-end justify-center mb-4">
                      {/* OM block (left) */}
                      <div className="flex gap-4 pr-6 border-r">
                        {groups.OM.map(shade => (
                          <ShadePaddle
                            key={shade.id}
                            shade={shade}
                            selected={currentShade === shade.id}
                            onSelect={() => setCurrentShade(shade.id)}
                          />
                        ))}
                      </div>

                      {/* A-D continuous rack */}
                      <div className="flex gap-5 flex-wrap justify-center">
                        {(["A", "B", "C", "D"] as const).map(groupKey => (
                          <div key={groupKey} className="flex gap-4 items-end">
                            {groups[groupKey].map(shade => (
                              <ShadePaddle
                                key={shade.id}
                                shade={shade}
                                selected={currentShade === shade.id}
                                onSelect={() => setCurrentShade(shade.id)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Divider bar and logo line like the mock */}
                    <div className="mt-2">
                      <div className="h-1 bg-gray-400/70 rounded w-full mb-4" />
                      <div className="text-center text-3xl font-light text-gray-600 italic">
                        VITA <span className="font-normal not-italic">classical</span>
                      </div>
                    </div>
                  </div>
                </div>
                  </>
                ) : (
                  /* Color Picker Tab Content */
                  <div className="space-y-6">
                    {/* Selected Shade Display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-gray-900" aria-label={`Selected shade: ${currentShade}`}>
                          {currentShade || "A1"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleReset}
                          className="h-8 w-8 rounded-full hover:bg-gray-100"
                          aria-label="Reset shade selection"
                        >
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    </div>

                    {/* System Information */}
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-gray-900">
                        {shadeSystemOptions.find(s => s.value === currentSystem)?.label || "VITA Classical"}
                      </p>
                      <p className="text-sm text-gray-500">Selected System</p>
                    </div>

                    {/* Gradient Slider */}
                    <div className="space-y-3">
                      <Label htmlFor="shade-slider" className="text-sm font-medium text-gray-700 sr-only">
                        Shade intensity slider
                      </Label>
                      <div className="relative" ref={sliderRef}>
                        <Slider
                          id="shade-slider"
                          value={sliderValue}
                          onValueChange={handleSliderChange}
                          max={100}
                          step={1}
                          className="w-full"
                          aria-label="Shade intensity"
                        />
                        <div className="h-8 bg-gradient-to-r from-white via-yellow-100 to-yellow-300 rounded-lg absolute inset-0 pointer-events-none" />
                      </div>
                      
                      {/* Slider Labels */}
                      <div className="flex justify-between text-xs text-gray-600">
                        {["Bleach", "Light", "Medium", "Dark", "Darkest"].map((label) => (
                          <span key={label} className="text-center">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>



                    {/* Back to Guide Button */}
                    <div className="flex justify-center pt-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setActiveModalTab("shade")} 
                        className="text-blue-600"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Back to Guide
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                Gum shade selection interface will appear here (palette & presets).
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-between">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <div className="flex gap-2">
              {currentShade && (
                <Button variant="outline" onClick={handleSetAsDefault}>
                  Set as Default
                </Button>
              )}
              <Button onClick={handleResumeCase} disabled={!currentShade} className="bg-blue-600 text-white">
                Resume Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* “Set as default” confirmation */}
      <Dialog open={showDefaultGuideModal} onOpenChange={setShowDefaultGuideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Default Shade Guide</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              You selected <strong>{selectedShadeInfo?.name}</strong>. Make this your office’s default
              <strong> tooth</strong> shade guide?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDefaultGuideModal(false)}>Cancel</Button>
              <Button onClick={() => setShowDefaultGuideModal(false)} className="bg-blue-600 text-white">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ----- Subcomponents -----
function ShadePaddle({
  shade,
  selected,
  onSelect,
}: {
  shade: ShadeOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-center focus:outline-none",
        selected && "scale-105"
      )}
      aria-pressed={selected}
      aria-label={`Select shade ${shade.name}`}
    >
      <div
        className={cn(
          "w-9 h-16 rounded-t border transition-all",
          selected ? "border-[3px] border-gray-900 shadow-lg" : "border-gray-400 group-hover:border-gray-600"
        )}
        style={{ backgroundColor: shade.color }}
      />
      <div className="w-9 h-7 bg-gray-500 rounded-b border border-gray-400 grid place-items-center">
        <span className="text-[11px] text-white font-medium">{shade.id}</span>
      </div>
    </button>
  )
}
