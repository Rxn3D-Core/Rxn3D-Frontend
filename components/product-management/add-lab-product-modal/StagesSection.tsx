import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Info, Plus, Trash2, AlertCircle, GripVertical } from "lucide-react"
import { ValidationError } from "@/components/ui/validation-error"
import { useState, useCallback } from "react"

interface Stage {
    stage_id: string | number;
    sequence: number;
    economy_price: string;
    standard_price: string;
    days: string;
    status: string;
    grade_prices?: { [grade_id: string]: string };
    is_default?: "Yes" | "No";
}

interface StagesSectionProps {
    control: any;
    watch: (field: string) => Stage[];
    setValue: (field: string, value: any, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void;
    sections: { stages: boolean };
    toggleSection: (section: string) => void;
    getValidationError: (field: string) => string | undefined;
    stages: { data?: { data: any[], grades?: any[] }, grades?: any[] } | any[];
    grades?: any[];
    sectionHasErrors: (fields: string[]) => boolean;
    expandedSections: { stages: boolean };
    toggleExpanded: (section: string) => void;
    releasingStageIds?: (string | number)[];
    setReleasingStageIds?: (ids: (string | number)[]) => void;
    draggedStageId: string | number | null;
    setDraggedStageId: (id: string | number | null) => void;
    userRole: string;
    customGradeNames?: Record<number, string>; // Map of custom grade IDs (negative) to their names
}

export function StagesSection({
    control,
    watch,
    setValue,
    sections,
    toggleSection,
    getValidationError,
    stages,
    grades,
    sectionHasErrors,
    expandedSections,
    toggleExpanded,
    releasingStageIds,
    setReleasingStageIds,
    draggedStageId,
    setDraggedStageId,
    userRole = "",
    customGradeNames = {}, // Default to empty object
}: StagesSectionProps) {
    // Fallback state for releasing stages if not provided as props
    const [localReleasingStageIds, setLocalReleasingStageIds] = useState<(string | number)[]>([])

    // Always use fallback if either prop is missing
    const useFallback = !releasingStageIds || !setReleasingStageIds
    const safeReleasingStageIds = useFallback ? localReleasingStageIds : releasingStageIds
    const safeSetReleasingStageIds = useFallback ? setLocalReleasingStageIds : setReleasingStageIds

    const allStages = (Array.isArray(stages) ? stages : (stages as any)?.data?.data || (stages as any)?.data || stages || []) as any[]
    const watchedStages = watch("stages") || []

    // Add watchedGrades for grade-based pricing check
    const watchedGrades = watch("grades") || []
    const hasSelectedGrades = watchedGrades.length > 0
    const hasGradeBasedPricing = String(watch("has_grade_based_pricing") || "") === "Yes"
    const basePrice = watch("base_price") || ""

    // Use grades prop if available, otherwise fallback to stages.grades or stages.data.grades
    const stagesObj = Array.isArray(stages) ? {} : (stages as any)
    const masterGrades =
        (grades && Array.isArray(grades) ? grades :
        stagesObj?.grades && Array.isArray(stagesObj.grades) ? stagesObj.grades :
        stagesObj?.data?.grades && Array.isArray(stagesObj.data.grades) ? stagesObj.data.grades :
        []) as any[]

    // Merge watchedGrades with master grades to get name, including custom grades
    const selectedGradesWithNames = watchedGrades
        .map((g: any) => {
            const gradeId = g.grade_id || g.id
            
            // Check if it's a custom grade (negative ID) and has a name in customGradeNames
            if (typeof gradeId === "number" && gradeId < 0 && customGradeNames[gradeId]) {
                return {
                    ...g,
                    name: customGradeNames[gradeId],
                    grade_id: gradeId,
                    id: gradeId,
                }
            }
            
            // Otherwise, try to find in master grades
            const found = masterGrades.find((mg: any) =>
                mg.id === gradeId || mg.grade_id === gradeId || mg.id === g.id
            )
            
            return {
                ...g,
                name: found?.name || g.name || g.label || g.grade_name || (typeof gradeId === "number" && gradeId < 0 ? customGradeNames[gradeId] : undefined) || gradeId || g.id,
                grade_id: gradeId,
                id: gradeId,
            }
        })
        .filter((grade: any) => {
            // Filter out grades with "Extract Blank" or "Blank" in the name
            const gradeName = grade.name?.toLowerCase() || ""
            return !gradeName.includes("extract blank") && !gradeName.includes("blank")
        })

    // State to control price suggestion banner visibility
    const [showPriceSuggestion, setShowPriceSuggestion] = useState(true)

    // Helper: check if a stage is selected
    const isStageSelected = (stageId: string | number) =>
        watchedStages.some((s) => s.stage_id === stageId)

    // Helper to get grade price for a stage, fallback to GradesSection price if not set
    const getGradePrice = (stage: any, gradeId: string | number) => {
        // Normalize gradeId for comparison (handle both string and number)
        const normalizedGradeId = typeof gradeId === "string" ? gradeId : gradeId.toString()
        
        // 1. Try stage.grade_prices (check both string and number keys)
        // Check if the key exists first (even if value is empty string, it means user set it)
        if (stage.grade_prices) {
            // Check with original gradeId (could be string or number)
            if (gradeId in stage.grade_prices) {
                return stage.grade_prices[gradeId] ?? ""
            }
            // Also check with normalized string key
            if (normalizedGradeId in stage.grade_prices) {
                return stage.grade_prices[normalizedGradeId] ?? ""
            }
            // Also check with number key if gradeId is string
            if (typeof gradeId === "string" && !isNaN(Number(gradeId))) {
                const numKey = Number(gradeId)
                if (numKey in stage.grade_prices) {
                    return stage.grade_prices[numKey] ?? ""
                }
            }
        }
        
        // 2. Fallback to GradesSection price (handle both string and number comparisons)
        const watchedGrade = watchedGrades.find((g: any) => {
            const gId = g.grade_id || g.id
            return gId === gradeId || 
                   gId?.toString() === normalizedGradeId || 
                   g.grade_id?.toString() === normalizedGradeId ||
                   g.id?.toString() === normalizedGradeId
        })
        return (watchedGrade as any)?.price ?? ""
    }

    // Helper to update grade price for a stage
    const setGradePrice = (stageId: string | number, gradeId: string | number, value: string) => {
        const updated = watchedStages.map(s => {
            if (s.stage_id?.toString() !== stageId.toString()) return s
            
            // Use the gradeId as-is for the key, but also ensure we update all possible key formats
            // to avoid lookup issues
            const gradeKey = gradeId
            const normalizedKey = typeof gradeId === "string" ? gradeId : gradeId.toString()
            const numKey = typeof gradeId === "string" && !isNaN(Number(gradeId)) ? Number(gradeId) : null
            
            // Start with existing grade_prices
            const existingPrices = { ...(s.grade_prices || {}) }
            
            // Remove all possible key formats to avoid duplicates
            delete existingPrices[gradeKey]
            delete existingPrices[normalizedKey]
            if (numKey !== null) {
                delete existingPrices[numKey]
            }
            
            // Set the new value using the original gradeId format
            existingPrices[gradeKey] = value
            
            return {
                ...s,
                grade_prices: existingPrices
            }
        })
        setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
    }

    // Handle setting default stage (only one can be default)
    const handleSetDefaultStage = (stageId: string | number) => {
        const updated = watchedStages.map(s => ({
            ...s,
            is_default: s.stage_id === stageId ? "Yes" : "No"
        }))
        setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
    }

    // Handle toggling releasing stage status
    const handleToggleReleasingStage = (stageId: string | number, checked: boolean) => {
        if (checked) {
            // Add to releasing stages if not already present
            if (!safeReleasingStageIds.some(id => id.toString() === stageId.toString())) {
                safeSetReleasingStageIds([...safeReleasingStageIds, stageId])
            }
        } else {
            // Remove from releasing stages
            safeSetReleasingStageIds(safeReleasingStageIds.filter(id => id.toString() !== stageId.toString()))
        }
    }

    // Handle adding/removing stages
    const handleToggleStage = (stage: any) => {
        if (isStageSelected(stage.id)) {
            // Remove stage
            const updated = watchedStages.filter((s) => s.stage_id !== stage.id)
            // Sort by sequence first, then reassign sequences after removal to ensure continuous order
            const reordered = updated
                .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                .map((s, index) => ({
                    ...s,
                    sequence: index + 1
                }))
            setValue(
                "stages",
                reordered,
                { shouldDirty: true, shouldValidate: true }
            )
        } else {
            // Add stage - assign sequence as next available (max + 1)
            const maxSequence = watchedStages.length > 0 
                ? Math.max(...watchedStages.map((s) => s.sequence || 0))
                : 0
            // If this is the first stage, set it as default
            const isFirstStage = watchedStages.length === 0
            const newStage = {
                stage_id: stage.id,
                sequence: maxSequence + 1,
                economy_price: "",
                standard_price: "",
                days: "",
                status: "Active",
                grade_prices: {},
                is_default: isFirstStage ? "Yes" : "No",
            }
            // Add the new stage and ensure sequences are properly ordered
            const updated = [...watchedStages, newStage]
                .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                .map((s, index) => ({
                    ...s,
                    sequence: index + 1 // Reassign sequences to ensure continuous order
                }))
            setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
        }
    }

    // Handle pricing suggestions
    const handleUseStagePricing = () => {
        // Logic for "Use stage pricing" - populate with default stage prices from stage data
        const updated = watchedStages.map(stage => {
            // Find stage info - match by id (convert to string for comparison to handle both number and string IDs)
            const stageInfo = allStages.find((s: any) => {
                const sId = s.id?.toString()
                const stageId = stage.stage_id?.toString()
                return sId === stageId
            })
            
            // Get default price from stage (lab_stage.price or stage.price)
            // Handle both string and number types, convert to string
            // Also check for empty strings and "0" values
            let defaultPrice: string = ""
            if (stageInfo) {
                // Check lab_stage.price first (lab-specific pricing)
                // Handle both string and number types
                const labPrice = stageInfo.lab_stage?.price
                if (labPrice !== undefined && labPrice !== null && labPrice !== "" && labPrice !== "0" && labPrice !== 0) {
                    defaultPrice = String(labPrice)
                } 
                // Fallback to stage.price (master stage pricing)
                else {
                    const stagePrice = stageInfo.price
                    if (stagePrice !== undefined && stagePrice !== null && stagePrice !== "" && stagePrice !== "0" && stagePrice !== 0) {
                        defaultPrice = String(stagePrice)
                    }
                }
            }
            
            // If no default price found, set to "0" or empty string to ensure all stages are updated
            // This ensures the UI updates even if the stage doesn't have a default price
            if (!defaultPrice) {
                defaultPrice = "0"
            }
            
            if (hasGradeBasedPricing && hasSelectedGrades) {
                // For grade-based pricing, set price for each grade using the stage's default price
                const gradePrices: { [key: string]: string } = {}
                watchedGrades.forEach((grade: any) => {
                    const gradeId = grade.grade_id || grade.id
                    // Use stage's default price for all grades (even if 0)
                    gradePrices[gradeId] = defaultPrice
                })
                
                return {
                    ...stage,
                    grade_prices: gradePrices
                }
            } else {
                // For non-grade-based pricing, use economy_price and standard_price
                // Always set the price (even if 0) to ensure UI updates
                return {
                    ...stage,
                    economy_price: defaultPrice,
                    standard_price: defaultPrice
                }
            }
        })
        setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
    }

    const handleDividePriceEqually = () => {
        // Logic for "Divide price equally" - distribute total price equally among stages
        const stageCount = watchedStages.length
        
        if (stageCount === 0) return
        
        if (hasGradeBasedPricing && hasSelectedGrades) {
            // For grade-based pricing: divide each grade's price equally among stages
            const updated = watchedStages.map(stage => {
                const gradePrices: { [key: string]: string } = {}
                
                watchedGrades.forEach((grade: any) => {
                    const gradeId = grade.grade_id || grade.id
                    const gradePrice = parseFloat(grade.price || "0")
                    
                    if (gradePrice > 0) {
                        const pricePerStage = Math.round((gradePrice / stageCount) * 100) / 100 // Round to 2 decimals
                        gradePrices[gradeId] = pricePerStage.toString()
                    } else {
                        gradePrices[gradeId] = ""
                    }
                })
                
                return {
                    ...stage,
                    grade_prices: gradePrices
                }
            })
            setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
        } else {
            // For non-grade-based pricing: divide base_price equally among stages
            const basePriceStr = String(basePrice || "")
            const totalPrice = parseFloat(basePriceStr || "0")
            
            if (totalPrice > 0 && stageCount > 0) {
                const pricePerStage = Math.round((totalPrice / stageCount) * 100) / 100 // Round to 2 decimals
                const priceStr = pricePerStage.toString()
                
                const updated = watchedStages.map(stage => ({
                    ...stage,
                    economy_price: priceStr,
                    standard_price: priceStr
                }))
                setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
            }
        }
    }

    // Handle drag start
    const handleDragStart = (e: React.DragEvent, stageId: string | number) => {
        setDraggedStageId(stageId)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("stage-id", stageId.toString())
        e.dataTransfer.setData("text/plain", stageId.toString())
        
        // Add visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5"
        }
    }

    // Handle drag end
    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedStageId(null)
        
        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1"
        }
    }

    // Handle drop for reordering stages
    const handleDrop = (e: React.DragEvent, targetStageId: string | number) => {
        e.preventDefault()
        e.stopPropagation()
        
        const draggedId = e.dataTransfer.getData("stage-id") || e.dataTransfer.getData("text/plain")
        if (!draggedId || draggedId === targetStageId.toString()) {
            setDraggedStageId(null)
            return
        }

        const draggedStageId = draggedId
        const draggedIndex = watchedStages.findIndex(s => s.stage_id.toString() === draggedStageId)
        const targetIndex = watchedStages.findIndex(s => s.stage_id === targetStageId)

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedStageId(null)
            return
        }

        // Reorder the stages
        const newStages = [...watchedStages]
        const draggedStage = newStages[draggedIndex]
        newStages.splice(draggedIndex, 1)
        newStages.splice(targetIndex, 0, draggedStage)

        // Update sequences based on new order (this ensures sequence matches UI order)
        const updatedStages = newStages.map((stage, index) => ({
            ...stage,
            sequence: index + 1
        }))

        setValue("stages", updatedStages, { shouldDirty: true, shouldValidate: true })
        setDraggedStageId(null)
    }

    // Handle drag over for reordering
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = "move"
    }


    // Show all selected stages in the editable table
    // Always sort by sequence to ensure UI order matches slip creation order
    const selectedStages = watchedStages
        .sort((a, b) => {
            // Sort by sequence, ensuring proper numeric comparison
            const seqA = a.sequence ?? 0
            const seqB = b.sequence ?? 0
            return seqA - seqB
        })
        .map((stageData) => {
            const stageInfo = allStages.find((stage: { id: string | number }) => stage.id === stageData.stage_id)
            return { ...stageData, stageInfo }
        })
        .filter(item => item.stageInfo)

    return (
        <div className="border-t">
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium">Stages</span>
                    {sectionHasErrors(["stages"]) ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                        <Info className="h-4 w-4 text-gray-400" />
                    )}
                    <span
                        className={`text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-[#1162a8] ${selectedStages.length === 0 ? "opacity-80" : ""}`}
                        style={{ marginRight: "1rem" }}
                    >
                        <strong>{selectedStages.length} selected</strong>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Switch
                        checked={sections.stages}
                        onCheckedChange={() => toggleSection("stages")}
                        className="data-[state=checked]:bg-[#1162a8]"
                    />
                    <ChevronDown
                        className={`h-5 w-5 transition-transform duration-200 cursor-pointer ${expandedSections.stages ? "rotate-180" : ""}`}
                        onClick={() => toggleExpanded("stages")}
                    />
                </div>
            </div>
            {expandedSections.stages && sections.stages && (
                <div className="px-6 pb-6">
                    {/* Pricing suggestion banner */}
                    {showPriceSuggestion && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-lightbulb text-yellow-600"></i>
                                    <span className="text-sm text-gray-700">
                                        <strong>Not sure how to price this? We've got you.</strong>
                                    </span>
                                </div>
                                <button
                                    className="text-xs text-yellow-600 underline hover:text-yellow-700 transition-colors"
                                    onClick={() => setShowPriceSuggestion(false)}
                                >
                                    Hide price suggestion
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 text-center">
                                Select one of the options below to auto-fill pricing based on your setup preferences:
                            </p>
                            <div className="flex justify-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                    onClick={handleUseStagePricing}
                                >
                                    Use stage pricing
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                    onClick={handleDividePriceEqually}
                                >
                                    Divide price equally
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Stages table */}
                    <div className="space-y-2 mb-4 overflow-x-auto">
                        {selectedStages.length > 0 ? (
                            <div
                                className="min-w-full"
                                style={{
                                    overflowX: "auto"
                                }}
                            >
                                {/* Header row */}
                                <div
                                    className={`grid gap-2 font-medium text-sm text-gray-700 border-b pb-2 bg-white sticky top-0 z-10`}
                                    style={{
                                        gridTemplateColumns: userRole === "superadmin"
                                            ? "minmax(120px,1fr) minmax(80px,1fr) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px"
                                            : hasSelectedGrades
                                                ? `minmax(120px,1fr) minmax(80px,1fr) repeat(${selectedGradesWithNames.length}, minmax(120px,1fr)) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px`
                                                : "minmax(120px,1fr) minmax(80px,1fr) minmax(100px,1fr) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px"
                                    }}
                                >
                                    <div className="px-1">Case Stage</div>
                                    <div className="px-1">Code</div>
                                    {/* Hide price columns for superadmin */}
                                    {userRole !== "superadmin" && (
                                      hasSelectedGrades
                                        ? selectedGradesWithNames.map((grade: any, idx: number) => {
                                            const hasManyGrades = selectedGradesWithNames.length > 4
                                            return (
                                                <div
                                                    key={grade.grade_id || grade.id || idx}
                                                    className={`font-semibold text-gray-700 px-1 ${
                                                        hasManyGrades 
                                                            ? "text-xs break-words" 
                                                            : "text-sm"
                                                    }`}
                                                    title={grade.name}
                                                    style={{
                                                        minWidth: hasManyGrades ? "100px" : "120px",
                                                        wordBreak: "break-word",
                                                        lineHeight: hasManyGrades ? "1.3" : "1.5",
                                                        overflowWrap: "break-word"
                                                    }}
                                                >
                                                    {grade.name}
                                                </div>
                                            )
                                        })
                                        : <div className="px-1">Price</div>
                                    )}
                                    <div className="px-1">Days</div>
                                    <div className="text-center px-1">
                                        <span className="whitespace-nowrap text-xs">Use as Default</span>
                                    </div>
                                    <div className="text-center px-1">
                                        <span className="whitespace-nowrap text-xs">Releasing Stage</span>
                                    </div>
                                    <div></div>
                                </div>
                                {selectedStages.map((item) => {
                                    const { stageInfo, ...stageData } = item
                                    const isDragging = draggedStageId === stageData.stage_id

                                    return (
                                        <div
                                            key={stageData.stage_id}
                                            className={`grid items-center gap-2 py-2 px-2 rounded transition-all duration-200 cursor-grab active:cursor-grabbing border-2 border-transparent ${
                                                isDragging ? 'opacity-50 border-blue-300' : 'hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                            style={{
                                                gridTemplateColumns: userRole === "superadmin"
                                                    ? "minmax(120px,1fr) minmax(80px,1fr) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px"
                                                    : hasSelectedGrades
                                                        ? `minmax(120px,1fr) minmax(80px,1fr) repeat(${selectedGradesWithNames.length}, minmax(120px,1fr)) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px`
                                                        : "minmax(120px,1fr) minmax(80px,1fr) minmax(100px,1fr) minmax(100px,1fr) minmax(120px,1fr) minmax(100px,1fr) 40px"
                                            }}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, stageData.stage_id)}
                                            onDragEnd={handleDragEnd}
                                            onDrop={(e) => handleDrop(e, stageData.stage_id)}
                                            onDragOver={handleDragOver}
                                        >
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="h-4 w-4 text-gray-400" />
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                                                    #{stageData.sequence}
                                                </span>
                                                <span>{stageInfo.name}</span>
                                            </div>
                                            <span className="text-sm text-gray-600">{stageInfo.code}</span>
                                            {/* Hide price inputs for superadmin */}
                                            {userRole !== "superadmin" && (
                                              hasSelectedGrades
                                                ? selectedGradesWithNames.map((grade: any) => (
                                                    <div className="relative" key={grade.grade_id || grade.id}>
                                                        <Input
                                                            type="number"
                                                            className="pl-7 h-8 w-full"
                                                            value={getGradePrice(stageData, grade.grade_id || grade.id)}
                                                            placeholder="0"
                                                            onChange={e =>
                                                                setGradePrice(stageData.stage_id, grade.grade_id || grade.id, e.target.value)
                                                            }
                                                        />
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                    </div>
                                                ))
                                                : (
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="pl-7 h-8 w-full"
                                                            value={stageData.economy_price || ""}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                                const updated = watchedStages.map(s =>
                                                                    s.stage_id === stageData.stage_id 
                                                                        ? { ...s, economy_price: e.target.value, standard_price: e.target.value } 
                                                                        : s
                                                                )
                                                                setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
                                                            }}
                                                        />
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                    </div>
                                                )
                                            )}
                                            <Input
                                                type="number"
                                                className="h-8 w-24 text-center"
                                                value={stageData.days !== undefined && stageData.days !== null ? stageData.days : (stageInfo.days_to_process || "")}
                                                placeholder="0"
                                                onChange={(e) => {
                                                    const updated = watchedStages.map(s =>
                                                        s.stage_id === stageData.stage_id 
                                                            ? { ...s, days: e.target.value } 
                                                            : s
                                                    )
                                                    setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
                                                }}
                                            />
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={stageData.is_default === "Yes"}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            handleSetDefaultStage(stageData.stage_id)
                                                        } else {
                                                            // If unchecking, set to "No" but don't set another as default
                                                            const updated = watchedStages.map(s =>
                                                                s.stage_id === stageData.stage_id 
                                                                    ? { ...s, is_default: "No" } 
                                                                    : s
                                                            )
                                                            setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
                                                        }
                                                    }}
                                                    aria-label={`Set ${stageInfo.name} as default stage`}
                                                />
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={safeReleasingStageIds.some(id => id.toString() === stageData.stage_id.toString())}
                                                    onCheckedChange={(checked) => {
                                                        handleToggleReleasingStage(stageData.stage_id, checked === true)
                                                    }}
                                                    aria-label={`Mark ${stageInfo.name} as releasing stage`}
                                                />
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 flex items-center justify-center text-red-600 hover:text-red-700 visible"
                                                    onClick={() => {
                                                        const updated = watchedStages
                                                            .filter(s => s.stage_id !== stageData.stage_id)
                                                            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                                            .map((s, index) => ({
                                                                ...s,
                                                                sequence: index + 1
                                                            }))
                                                        setValue("stages", updated, { shouldDirty: true, shouldValidate: true })
                                                        // Remove from releasing stages if it was marked as releasing
                                                        if (safeReleasingStageIds.some(id => id.toString() === stageData.stage_id.toString())) {
                                                            safeSetReleasingStageIds(safeReleasingStageIds.filter(id => id.toString() !== stageData.stage_id.toString()))
                                                        }
                                                    }}
                                                    aria-label="Delete stage"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500">
                                No stages selected. Add stages from the available stages below.
                            </div>
                        )}
                    </div>

                    {/* Add stage selector */}
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-3 mt-2">
                        <div className="text-sm text-gray-600 mb-2">Available stages to add:</div>
                        <div className="flex flex-wrap gap-2">
                            {allStages
                                .filter((stage: { id: string | number }) => !isStageSelected(stage.id))
                                .map((stage: any) => (
                                    <Button
                                        key={stage.id}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={`text-xs ${
                                            isStageSelected(stage.id) 
                                                ? "bg-blue-50 border-blue-300 text-blue-700" 
                                                : ""
                                        }`}
                                        onClick={() => handleToggleStage(stage)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {stage.name}
                                        {isStageSelected(stage.id) && (
                                            <span className="ml-1 text-xs">✓</span>
                                        )}
                                    </Button>
                                ))
                            }
                        </div>
                    </div>

                    <ValidationError message={getValidationError("stages")} />
                </div>
            )}
        </div>
    )
}
