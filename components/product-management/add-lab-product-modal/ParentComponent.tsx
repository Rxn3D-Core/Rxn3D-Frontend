import { useForm } from "react-hook-form"
import { ProductDetailsSection } from "./ProductDetailsSection"
import { GradesSection } from "./GradesSection"

export function ParentComponent({
  sections,
  toggleSection,
  getValidationError,
  currentParentDropdownCategories,
  grades,
  sectionHasErrors,
  expandedSections,
  toggleExpanded,
  handleToggleSelection,
  handleGradeDefaultChange,
}) {
  const { control, register, watch, setValue } = useForm({
    // ...form config...
  })

  return (
    <>
      <ProductDetailsSection
        control={control}
        register={register}
        sections={sections}
        toggleSection={toggleSection}
        getValidationError={getValidationError}
        currentParentDropdownCategories={currentParentDropdownCategories}
      />

      <GradesSection
        control={control}
        watch={watch} // <-- pass watch here
        setValue={setValue}
        sections={sections}
        toggleSection={toggleSection}
        getValidationError={getValidationError}
        grades={grades}
        sectionHasErrors={sectionHasErrors}
        expandedSections={expandedSections}
        toggleExpanded={toggleExpanded}
        handleGradeDefaultChange={handleGradeDefaultChange}
      />
    </>
  )
}