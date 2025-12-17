"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks"
import { setActiveTab, selectTooth, applyStatusToSelected, clearAllSelections } from "@/lib/redux/features/stageSlice"
import type { ToothStatus } from "@/types/stage"

export function ElegantStageManager() {
  const dispatch = useAppDispatch()
  const { activeTab, upperTeeth, lowerTeeth, selectedStatus } = useAppSelector((state) => state.stage)

  const handleToothClick = (isUpper: boolean, id: number) => {
    dispatch(selectTooth({ isUpper, id }))
  }

  const handleApplyStatus = (status: ToothStatus) => {
    dispatch(applyStatusToSelected(status))
  }

  const getStatusColor = (status: ToothStatus) => {
    switch (status) {
      case "inMouth":
        return "bg-amber-100 border-amber-300"
      case "toReplace":
        return "bg-amber-500 border-amber-600 text-white"
      case "missing":
        return "bg-gray-100 border-gray-300"
      case "willExtract":
        return "bg-red-500 border-red-600 text-white"
      case "hasBeenExtracted":
        return "bg-gray-400 border-gray-500 text-white"
      case "fixOrAdd":
        return "bg-green-500 border-green-600 text-white"
      case "clasps":
        return "bg-pink-400 border-pink-500 text-white"
      default:
        return "bg-gray-200 border-gray-300"
    }
  }

  const getSelectedTeeth = (isUpper: boolean) => {
    const teeth = isUpper ? upperTeeth : lowerTeeth
    return teeth
      .filter((t) => t.selected)
      .map((t) => t.id)
      .join(", ")
  }

  const getTeethByStatus = (isUpper: boolean, status: ToothStatus) => {
    const teeth = isUpper ? upperTeeth : lowerTeeth
    return teeth
      .filter((t) => t.status === status)
      .map((t) => t.id)
      .join(", ")
  }

  const handleClearAllSelections = () => {
    dispatch(clearAllSelections())
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Stage Management</CardTitle>
            <CardDescription>Configure extractions, impressions, shades, and other stage details</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => dispatch(setActiveTab(value))} className="w-full">
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="extractions">Extractions</TabsTrigger>
            <TabsTrigger value="impressions">Impressions</TabsTrigger>
            <TabsTrigger value="toothShades">Tooth Shades</TabsTrigger>
            <TabsTrigger value="gumShades">Gum Shades</TabsTrigger>
            <TabsTrigger value="stageNotes">Stage Notes</TabsTrigger>
            <TabsTrigger value="rushDates">Rush Dates</TabsTrigger>
          </TabsList>

          <TabsContent value="extractions" className="space-y-6">
            <div className="flex gap-2 mb-6">
              <Button variant="outline" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Manage Default Extractions</span>
              </Button>
              <Button className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Add New extraction</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upper Teeth Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-center">Upper</h3>
                <div className="relative flex justify-center">
                  <div className="relative w-[400px] h-[200px]">
                    {/* Arch shape for upper teeth */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 400 200" className="w-full h-full">
                        <path
                          d="M 50,180 Q 200,20 350,180"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="120"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Upper teeth */}
                    {upperTeeth.map((tooth) => {
                      // Calculate position along the arch
                      const index = tooth.id - 1
                      const angle = (index / 15) * Math.PI
                      const x = 200 - 150 * Math.cos(angle)
                      const y = 180 - 150 * Math.sin(angle)

                      return (
                        <TooltipProvider key={tooth.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "absolute w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                  getStatusColor(tooth.status),
                                  tooth.selected && "ring-2 ring-blue-500 ring-offset-2",
                                )}
                                style={{
                                  left: `${x - 20}px`,
                                  top: `${y - 20}px`,
                                }}
                                onClick={() => handleToothClick(true, tooth.id)}
                              >
                                {tooth.id}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tooth {tooth.id}</p>
                              <p>Status: {tooth.status !== "none" ? tooth.status : "Not set"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm">
                    Missing all teeth
                  </Button>
                </div>

                {/* Status buttons for upper */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleApplyStatus("toReplace")}
                  >
                    Teeth To Replace
                  </Button>

                  <div className="w-full bg-amber-100 border border-amber-300 rounded-md p-2 text-sm">
                    <div className="font-medium">Teeth In Mouth</div>
                    <div>{getTeethByStatus(true, "inMouth") || "None"}</div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => handleApplyStatus("missing")}>
                    Missing Teeth
                  </Button>

                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => handleApplyStatus("willExtract")}
                  >
                    Will Extract On Delivery
                  </Button>

                  <Button
                    className="w-full bg-gray-400 hover:bg-gray-500 text-white"
                    onClick={() => handleApplyStatus("hasBeenExtracted")}
                  >
                    Has Been Extracted
                  </Button>

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleApplyStatus("fixOrAdd")}
                  >
                    Fix Or Add
                  </Button>

                  <Button
                    className="w-full bg-pink-400 hover:bg-pink-500 text-white"
                    onClick={() => handleApplyStatus("clasps")}
                  >
                    Clasps
                  </Button>
                </div>
              </div>

              {/* Lower Teeth Chart */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-center">Lower</h3>
                <div className="relative flex justify-center">
                  <div className="relative w-[400px] h-[200px]">
                    {/* Arch shape for lower teeth */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 400 200" className="w-full h-full">
                        <path
                          d="M 50,20 Q 200,180 350,20"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="120"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Lower teeth */}
                    {lowerTeeth.map((tooth) => {
                      // Calculate position along the arch
                      const index = tooth.id - 17
                      const angle = (index / 15) * Math.PI
                      const x = 200 - 150 * Math.cos(angle)
                      const y = 20 + 150 * Math.sin(angle)

                      return (
                        <TooltipProvider key={tooth.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "absolute w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                                  getStatusColor(tooth.status),
                                  tooth.selected && "ring-2 ring-blue-500 ring-offset-2",
                                )}
                                style={{
                                  left: `${x - 20}px`,
                                  top: `${y - 20}px`,
                                }}
                                onClick={() => handleToothClick(false, tooth.id)}
                              >
                                {tooth.id}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tooth {tooth.id}</p>
                              <p>Status: {tooth.status !== "none" ? tooth.status : "Not set"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm">
                    Missing all teeth
                  </Button>
                </div>

                {/* Status buttons for lower */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleApplyStatus("toReplace")}
                  >
                    Teeth To Replace
                  </Button>

                  <div className="w-full bg-amber-100 border border-amber-300 rounded-md p-2 text-sm">
                    <div className="font-medium">Teeth In Mouth</div>
                    <div>{getTeethByStatus(false, "inMouth") || "None"}</div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => handleApplyStatus("missing")}>
                    Missing Teeth
                  </Button>

                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => handleApplyStatus("willExtract")}
                  >
                    Will Extract On Delivery
                  </Button>

                  <Button
                    className="w-full bg-gray-400 hover:bg-gray-500 text-white"
                    onClick={() => handleApplyStatus("hasBeenExtracted")}
                  >
                    Has Been Extracted
                  </Button>

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleApplyStatus("fixOrAdd")}
                  >
                    Fix Or Add
                  </Button>

                  <Button
                    className="w-full bg-pink-400 hover:bg-pink-500 text-white"
                    onClick={() => handleApplyStatus("clasps")}
                  >
                    Clasps
                  </Button>
                </div>
              </div>
            </div>

            {/* Selection info */}
            {(getSelectedTeeth(true) || getSelectedTeeth(false)) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Selected teeth:</p>
                    <p>Upper: {getSelectedTeeth(true) || "None"}</p>
                    <p>Lower: {getSelectedTeeth(false) || "None"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearAllSelections}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="impressions">
            <div className="flex items-center justify-center h-40 border rounded-md">
              <p className="text-muted-foreground">Impressions content will be displayed here</p>
            </div>
          </TabsContent>

          <TabsContent value="toothShades">
            <div className="flex items-center justify-center h-40 border rounded-md">
              <p className="text-muted-foreground">Tooth Shades content will be displayed here</p>
            </div>
          </TabsContent>

          <TabsContent value="gumShades">
            <div className="flex items-center justify-center h-40 border rounded-md">
              <p className="text-muted-foreground">Gum Shades content will be displayed here</p>
            </div>
          </TabsContent>

          <TabsContent value="stageNotes">
            <div className="flex items-center justify-center h-40 border rounded-md">
              <p className="text-muted-foreground">Stage Notes content will be displayed here</p>
            </div>
          </TabsContent>

          <TabsContent value="rushDates">
            <div className="flex items-center justify-center h-40 border rounded-md">
              <p className="text-muted-foreground">Rush Dates content will be displayed here</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
