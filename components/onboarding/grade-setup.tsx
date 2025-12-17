"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ChevronRight, ChevronLeft, Plus, Trash2, Edit, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Grade {
  id: string
  name: string
  description: string
  priceMultiplier: number
  isDefault: boolean
  materials: string[]
}

export function GradeSetup() {
  const [grades, setGrades] = React.useState<Grade[]>([
    {
      id: "1",
      name: "Economy",
      description: "Basic quality suitable for temporary solutions",
      priceMultiplier: 0.8,
      isDefault: false,
      materials: ["Standard Acrylic", "Basic Composite"],
    },
    {
      id: "2",
      name: "Standard",
      description: "Good quality for most applications",
      priceMultiplier: 1.0,
      isDefault: true,
      materials: ["Premium Acrylic", "Standard Porcelain", "Standard Alloy"],
    },
    {
      id: "3",
      name: "Premium",
      description: "High-quality materials and finish",
      priceMultiplier: 1.5,
      isDefault: false,
      materials: ["High-grade Porcelain", "Premium Composite", "Premium Alloy"],
    },
    {
      id: "4",
      name: "Elite",
      description: "Top-tier quality with the finest materials",
      priceMultiplier: 2.0,
      isDefault: false,
      materials: ["Zirconia", "E.max", "High Noble Alloy", "Premium Ceramic"],
    },
  ])

  const [editingGradeId, setEditingGradeId] = React.useState<string | null>(null)
  const [newMaterial, setNewMaterial] = React.useState("")
  const [editingMaterial, setEditingMaterial] = React.useState<{ gradeId: string; index: number } | null>(null)

  const handleAddGrade = () => {
    const newId = (grades.length + 1).toString()
    const newGrade: Grade = {
      id: newId,
      name: "",
      description: "",
      priceMultiplier: 1.0,
      isDefault: false,
      materials: [],
    }
    setGrades([...grades, newGrade])
    setEditingGradeId(newId)
  }

  const handleRemoveGrade = (id: string) => {
    setGrades(grades.filter((grade) => grade.id !== id))
    if (editingGradeId === id) {
      setEditingGradeId(null)
    }
  }

  const handleGradeChange = (id: string, field: keyof Grade, value: any) => {
    setGrades(
      grades.map((grade) => {
        if (grade.id === id) {
          return { ...grade, [field]: value }
        }
        return grade
      }),
    )
  }

  const handleSetDefault = (id: string) => {
    setGrades(
      grades.map((grade) => ({
        ...grade,
        isDefault: grade.id === id,
      })),
    )
  }

  const handleAddMaterial = (gradeId: string) => {
    if (!newMaterial.trim()) return

    setGrades(
      grades.map((grade) => {
        if (grade.id === gradeId) {
          return {
            ...grade,
            materials: [...grade.materials, newMaterial.trim()],
          }
        }
        return grade
      }),
    )

    setNewMaterial("")
  }

  const handleRemoveMaterial = (gradeId: string, index: number) => {
    setGrades(
      grades.map((grade) => {
        if (grade.id === gradeId) {
          const newMaterials = [...grade.materials]
          newMaterials.splice(index, 1)
          return {
            ...grade,
            materials: newMaterials,
          }
        }
        return grade
      }),
    )
  }

  const handleEditMaterial = (gradeId: string, index: number, newValue: string) => {
    setGrades(
      grades.map((grade) => {
        if (grade.id === gradeId) {
          const newMaterials = [...grade.materials]
          newMaterials[index] = newValue
          return {
            ...grade,
            materials: newMaterials,
          }
        }
        return grade
      }),
    )
    setEditingMaterial(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Grades</h2>
        <p className="text-gray-600 mb-8">Define the quality grades that you offer for your products</p>

        <div className="space-y-6 mb-8">
          {grades.map((grade) => (
            <div
              key={grade.id}
              className={cn(
                "rounded-lg border transition-all",
                editingGradeId === grade.id
                  ? "border-blue-300 bg-blue-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              {editingGradeId === grade.id ? (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${grade.id}`} className="text-sm font-medium">
                        Grade Name
                      </Label>
                      <Input
                        id={`name-${grade.id}`}
                        value={grade.name}
                        onChange={(e) => handleGradeChange(grade.id, "name", e.target.value)}
                        className="w-full"
                        placeholder="e.g. Standard, Premium, Elite"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`multiplier-${grade.id}`} className="text-sm font-medium">
                        Price Multiplier
                      </Label>
                      <div className="flex items-center">
                        <Input
                          id={`multiplier-${grade.id}`}
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={grade.priceMultiplier}
                          onChange={(e) =>
                            handleGradeChange(grade.id, "priceMultiplier", Number.parseFloat(e.target.value) || 1.0)
                          }
                          className="w-24"
                        />
                        <span className="ml-2 text-sm text-gray-500">× base price</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${grade.id}`} className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id={`description-${grade.id}`}
                      value={grade.description}
                      onChange={(e) => handleGradeChange(grade.id, "description", e.target.value)}
                      className="w-full"
                      placeholder="Describe this grade's quality and use cases"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Materials</Label>
                      <div className="flex items-center">
                        <Input
                          value={newMaterial}
                          onChange={(e) => setNewMaterial(e.target.value)}
                          className="w-48 h-8 mr-2"
                          placeholder="Add material"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddMaterial(grade.id)
                            }
                          }}
                        />
                        <Button size="sm" variant="outline" onClick={() => handleAddMaterial(grade.id)} className="h-8">
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {grade.materials.map((material, index) => (
                        <div
                          key={index}
                          className="flex items-center bg-white border border-gray-200 rounded-full pl-3 pr-1 py-1"
                        >
                          {editingMaterial &&
                          editingMaterial.gradeId === grade.id &&
                          editingMaterial.index === index ? (
                            <div className="flex items-center">
                              <Input
                                value={material}
                                onChange={(e) => handleEditMaterial(grade.id, index, e.target.value)}
                                className="w-32 h-6 mr-1 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    setEditingMaterial(null)
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setEditingMaterial(null)}
                              >
                                <Check size={14} />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm">{material}</span>
                              <div className="flex ml-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                  onClick={() => setEditingMaterial({ gradeId: grade.id, index })}
                                >
                                  <Edit size={12} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                  onClick={() => handleRemoveMaterial(grade.id, index)}
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <div className="flex items-center">
                      <Switch
                        id={`default-${grade.id}`}
                        checked={grade.isDefault}
                        onCheckedChange={() => handleSetDefault(grade.id)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor={`default-${grade.id}`} className="ml-2 text-sm">
                        Set as default grade
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingGradeId(null)}>
                        Done
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleRemoveGrade(grade.id)}
                      >
                        <Trash2 size={14} className="mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-semibold text-lg">{grade.name}</h3>
                        {grade.isDefault && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{grade.description}</p>
                    </div>
                    <div className="flex items-start">
                      <span className="text-lg font-medium text-gray-900">{grade.priceMultiplier}×</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-4 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => setEditingGradeId(grade.id)}
                      >
                        <Edit size={16} className="mr-1" /> Edit
                      </Button>
                    </div>
                  </div>

                  {grade.materials.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-medium text-gray-500">Materials:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {grade.materials.map((material, index) => (
                          <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {material}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={handleAddGrade}
          className="mb-8 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Plus size={16} className="mr-2" /> Add Grade
        </Button>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <div className="space-x-3">
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Continue Later
            </Button>
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50" asChild>
              <Link href="/onboarding/case-pan">
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Link>
            </Button>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
            Complete Setup <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
