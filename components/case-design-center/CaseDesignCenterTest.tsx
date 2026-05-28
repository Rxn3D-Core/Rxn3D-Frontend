"use client";

import { useEffect, useRef, useState } from "react";
import NewCaseWizard from "@/components/new-case-wizard";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import type { SlipProductSnapshot } from "./types";
import { TopBar } from "./components/TopBar";
import { AddProductFocusOverlay } from "./components/AddProductFocusOverlay";
import { PatientHeader } from "./components/PatientHeader";
import { CaseDesignCenter } from "./components/CaseDesignCenter";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getBusinessSettings } from "@/lib/api-business-settings";
import { fetchCaseDesignProductDetails } from "./utils/caseDesignProductDetails";
import { useCaseWizardSession } from "./hooks/useCaseWizardSession";
import { resolveLibraryCustomerId } from "./utils/libraryCustomerId";
import { useCaseSubmissionFlow } from "./hooks/useCaseSubmissionFlow";
import { CaseSubmissionOverlays } from "./components/CaseSubmissionOverlays";
import { DoctorEditModal } from "./components/DoctorEditModal";
import { caseDesignInter } from "./case-design-inter-font";

export default function Page() {
  const { createSlip } = useSlipCreation();
  const { toast } = useToast();
  const router = useRouter();
  const slipCollectorRef = useRef<(() => SlipProductSnapshot[]) | null>(null);

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
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(false);
  const [caseReady, setCaseReady] = useState(false);
  const [incompleteFieldLabel, setIncompleteFieldLabel] = useState<string | null>(null);
  const [hasToothStatusValidation, setHasToothStatusValidation] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [rushCasesEnabled, setRushCasesEnabled] = useState(true);

  const {
    submissionState,
    caseSubmitted,
    slipHeaderLoading,
    slipResponseData,
    submit,
  } = useCaseSubmissionFlow({
    createSlip,
    router,
    toast,
    slipCollectorRef,
    completedLab,
    completedDoctor,
    completedPatientName,
    completedGender,
    completedAge,
    labCustomerId:
      typeof window !== "undefined" && localStorage.getItem("role") === "lab_admin"
        ? Number(localStorage.getItem("customerId")) || null
        : completedLab?.id ?? null,
  });

  useEffect(() => {
    const userRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const labCustomerId = userRole === "lab_admin"
      ? Number(localStorage.getItem("customerId")) || null
      : completedLab?.id ?? null;

    if (!labCustomerId) return;

    getBusinessSettings(labCustomerId)
      .then((settings) => {
        setRushCasesEnabled(settings?.case_schedule?.enable_rush_cases ?? true);
      })
      .catch(() => {
        setRushCasesEnabled(true);
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
            <AddProductFocusOverlay active={!caseSubmitted && inlineAddProductArch != null}>
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
            </AddProductFocusOverlay>
            <CaseDesignCenter
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
              confirmDetailsChecked={confirmDetailsChecked}
              onAnyModalOpenChange={setIsAnyModalOpen}
              rushCasesEnabled={rushCasesEnabled}
            />
            <div style={{ height: "80px" }} />
          </div>
        )}
      </main>

      {wizardComplete && !caseSubmitted && !isAnyModalOpen && !doctorEditModalOpen && (
        <AddProductFocusOverlay active={inlineAddProductArch != null}>
          <SlipCreationStepFooter
            mode="submit"
            confirmDetailsChecked={confirmDetailsChecked}
            isAccordionComplete={() => caseReady}
            incompleteFieldLabel={incompleteFieldLabel}
            hasToothStatusValidation={hasToothStatusValidation}
            onConfirmDetailsChange={setConfirmDetailsChecked}
            onSubmit={submit}
          />
        </AddProductFocusOverlay>
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
