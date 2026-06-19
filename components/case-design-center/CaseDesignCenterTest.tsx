"use client";

import { useEffect, useRef, useState } from "react";
import NewCaseWizard from "@/components/new-case-wizard";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import type { SlipProductSnapshot } from "./types";
import { TopBar } from "./components/TopBar";
import { PatientHeader } from "./components/PatientHeader";
import { CaseDesignCenter } from "./components/CaseDesignCenter";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  getBusinessSettings,
  type BusinessHour,
  type CaseSchedule,
} from "@/lib/api-business-settings";
import { fetchCaseDesignProductDetails } from "./utils/caseDesignProductDetails";
import { useCaseWizardSession } from "./hooks/useCaseWizardSession";
import { resolveLibraryCustomerId } from "./utils/libraryCustomerId";
import { useCaseSubmissionFlow } from "./hooks/useCaseSubmissionFlow";
import { CaseSubmissionOverlays } from "./components/CaseSubmissionOverlays";
import { DoctorEditModal } from "./components/DoctorEditModal";
import { caseDesignInter } from "./case-design-inter-font";

export default function Page() {
  const { createSlip, uploadSlipAttachment } = useSlipCreation();
  const { toast } = useToast();
  const router = useRouter();
  const slipCollectorRef = useRef<(() => SlipProductSnapshot[]) | null>(null);
  const caseSummaryNotesRef = useRef("");

  const {
    wizardComplete,
    completedDoctor,
    completedLab,
    completedPatientName,
    completedGender,
    completedAge,
    wizardKey,
    wizardMode,
    pendingProductArch,
    selectedProductId,
    selectedProductName,
    selectedProductCategoryName,
    initialArch,
    lastSelectedCategory,
    lastSelectedSubProduct,
    addedProducts,
    caseDesignMounted,
    labEditMode,
    doctorEditModalOpen,
    doctorsForPicker,
    doctorsLoading,
    doctorsError,
    wizardStartStep,
    setCompletedLab,
    setCompletedPatientName,
    setCompletedGender,
    setCompletedAge,
    setAddedProducts,
    handleWizardComplete,
    handleAddProduct,
    inlineAddProductArch,
    completeInlineAddProduct,
    cancelInlineAddProduct,
    handleBackToProducts,
    handleBackToCategories,
    handleTopBarEditLab,
    handleEditDoctor,
    handleDoctorEditClose,
    handleDoctorEditSelect,
    handleEditDone,
    canEditDoctor,
  } = useCaseWizardSession({
    fetchProductDetails: fetchCaseDesignProductDetails,
  });

  const [right1Brand, setRight1Brand] = useState("Truabutment");
  const [right1Platform, setRight1Platform] = useState("Truscan");
  const [right2Brand, setRight2Brand] = useState("Nobel Biocare");
  const [right2Platform, setRight2Platform] = useState("Active");
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(true);
  const [caseReady, setCaseReady] = useState(false);
  const [incompleteFieldLabel, setIncompleteFieldLabel] = useState<string | null>(null);
  const [hasToothStatusValidation, setHasToothStatusValidation] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [rushCasesEnabled, setRushCasesEnabled] = useState(true);
  const [rushCaseSchedule, setRushCaseSchedule] = useState<CaseSchedule | null>(null);
  const [labBusinessHours, setLabBusinessHours] = useState<BusinessHour[] | null>(null);

  const {
    submissionState,
    caseSubmitted,
    slipHeaderLoading,
    slipResponseData,
    submit,
  } = useCaseSubmissionFlow({
    createSlip,
    uploadSlipAttachment,
    router,
    toast,
    slipCollectorRef,
    caseSummaryNotesRef,
    completedLab,
    completedDoctor,
    completedPatientName,
    completedGender,
    completedAge,
    labCustomerId: resolveLibraryCustomerId(completedLab?.id) ?? null,
  });

  useEffect(() => {
    const labCustomerId = resolveLibraryCustomerId(completedLab?.id);
    if (!labCustomerId) return;

    getBusinessSettings(labCustomerId)
      .then((settings) => {
        const schedule = settings?.case_schedule ?? null;
        setRushCaseSchedule(schedule);
        setLabBusinessHours(settings?.business_hours ?? null);
        setRushCasesEnabled(schedule?.enable_rush_cases ?? true);
      })
      .catch(() => {
        setRushCasesEnabled(true);
        setRushCaseSchedule(null);
        setLabBusinessHours(null);
      });
  }, [completedLab?.id]);

  return (
    <div className={`${caseDesignInter.className} flex h-screen bg-white overflow-hidden`}>
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        <TopBar
          selectedLab={completedLab ? { logo: completedLab.logo, name: completedLab.name } : null}
          onEditClick={handleTopBarEditLab}
          caseSubmitted={caseSubmitted}
        />

        {!wizardComplete && (
          <NewCaseWizard
            key={wizardKey}
            onComplete={handleWizardComplete}
            onLabSelect={(lab) => setCompletedLab(lab)}
            startStep={wizardStartStep}
            mode={wizardMode === "backToProducts" || wizardMode === "addProduct" ? "addProduct" : wizardMode}
            initialLabId={(labEditMode || wizardMode === "backToProducts" || wizardMode === "addProduct") && completedLab ? completedLab.id : null}
            initialPatientName={(labEditMode || wizardMode === "backToProducts" || wizardMode === "addProduct") ? completedPatientName : ""}
            initialGender={(labEditMode || wizardMode === "backToProducts" || wizardMode === "addProduct") ? completedGender : ""}
            initialAge={(labEditMode || wizardMode === "backToProducts" || wizardMode === "addProduct") ? completedAge : ""}
            initialDoctor={(labEditMode || wizardMode === "backToProducts" || wizardMode === "addProduct") && completedDoctor ? completedDoctor : undefined}
            initialCategory={wizardMode === "backToProducts" ? lastSelectedCategory : null}
            initialSubProduct={wizardMode === "backToProducts" ? lastSelectedSubProduct : null}
            forceArch={wizardMode === "addProduct" ? pendingProductArch : undefined}
            editTarget={labEditMode ? "lab" : undefined}
            onEditDone={handleEditDone}
          />
        )}

        {caseDesignMounted && (
          <div style={{ display: wizardComplete ? undefined : "none" }}>
            <PatientHeader
              doctorImageUrl={completedDoctor?.img}
              doctorName={completedDoctor?.name}
              patientName={completedPatientName}
              gender={completedGender}
              age={completedAge}
              caseSubmitted={caseSubmitted}
              slipHeaderLoading={slipHeaderLoading}
              slipResponseData={slipResponseData}
              onEditDoctorClick={handleEditDoctor}
              canEditDoctor={canEditDoctor}
              onPatientNameChange={setCompletedPatientName}
              onGenderChange={setCompletedGender}
              onAgeChange={setCompletedAge}
              compactLayout={wizardComplete && !caseSubmitted}
            />
            <CaseDesignCenter
              // Remount with fresh product configuration when the user goes back and
              // picks a *different* product. selectedProductId only changes on a real
              // product change (re-picking the same product is a no-op), so the config
              // is preserved when the product is unchanged. Patient/doctor/lab and
              // addedProducts live at the page level and survive the remount.
              key={`cdc-${selectedProductId ?? "none"}`}
              right1Brand={right1Brand}
              setRight1Brand={setRight1Brand}
              right1Platform={right1Platform}
              setRight1Platform={setRight1Platform}
              right2Brand={right2Brand}
              setRight2Brand={setRight2Brand}
              right2Platform={right2Platform}
              setRight2Platform={setRight2Platform}
              onAddProduct={handleAddProduct}
              inlineAddProductArch={inlineAddProductArch}
              onInlineAddProductComplete={completeInlineAddProduct}
              onInlineAddProductCancel={cancelInlineAddProduct}
              labCustomerId={resolveLibraryCustomerId(completedLab?.id) ?? null}
              onBackToProducts={handleBackToProducts}
              onBackToCategories={handleBackToCategories}
              selectedProductId={selectedProductId}
              selectedProductName={selectedProductName}
              selectedProductCategoryName={selectedProductCategoryName}
              caseSubmitted={caseSubmitted}
              onReadinessChange={setCaseReady}
              onIncompleteFieldChange={setIncompleteFieldLabel}
              onToothStatusValidationChange={setHasToothStatusValidation}
              addedProducts={addedProducts}
              onProductsChange={setAddedProducts}
              initialArch={initialArch}
              slipCollectorRef={slipCollectorRef}
              caseSummaryNotesRef={caseSummaryNotesRef}
              confirmDetailsChecked={confirmDetailsChecked}
              onAnyModalOpenChange={setIsAnyModalOpen}
              rushCasesEnabled={rushCasesEnabled}
              rushCaseSchedule={rushCaseSchedule}
              labBusinessHours={labBusinessHours}
            />
            <div style={{ height: "80px" }} />
          </div>
        )}
      </main>

      {wizardComplete && !caseSubmitted && !isAnyModalOpen && !doctorEditModalOpen && (
        <SlipCreationStepFooter
          mode="submit"
          confirmDetailsChecked={confirmDetailsChecked}
          isAccordionComplete={() => caseReady}
          incompleteFieldLabel={incompleteFieldLabel}
          hasToothStatusValidation={hasToothStatusValidation}
          onConfirmDetailsChange={setConfirmDetailsChecked}
          onSubmit={submit}
        />
      )}

      <CaseSubmissionOverlays submissionState={submissionState} />

      <DoctorEditModal
        open={doctorEditModalOpen}
        onClose={handleDoctorEditClose}
        doctors={doctorsForPicker}
        selectedDoctorId={completedDoctor?.id ?? null}
        isLoading={doctorsLoading}
        error={doctorsError}
        onSelect={handleDoctorEditSelect}
      />
    </div>
  );
}
