"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { useToast } from "@/hooks/use-toast";
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage";
import { putEditSlip } from "@/lib/api/slip-edit";
import { extractVirtualSlipProducts } from "@/lib/virtual-slip-products";
import {
  buildAddedProducts,
  buildWizardSeedFromSlipDetails,
  resolveLabIdFromSlipDetails,
} from "@/lib/add-stage/preload-state";
import {
  SLIP_EDIT_REQUIRES_IN_LAB_MESSAGE,
  slipIsInLab,
  type SlipLocationRef,
} from "@/lib/slip-location";
import { resolveCreatedByFromVirtualSlip } from "@/lib/slip-header-response-data";
import {
  buildVirtualSlipInitialState,
  determineInitialArch,
} from "@/lib/virtual-slip-transformer";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import { CaseSubmissionOverlays } from "@/components/case-design-center/components/CaseSubmissionOverlays";
import { CaseDesignCenter } from "@/components/case-design-center/components/CaseDesignCenter";
import { DoctorEditModal } from "@/components/case-design-center/components/DoctorEditModal";
import { PatientHeader } from "@/components/case-design-center/components/PatientHeader";
import type { SlipProductSnapshot, VirtualSlipInitialState } from "@/components/case-design-center/types";
import { buildEditSlipSubmissionPayloadAsync } from "@/components/case-design-center/utils/editSlipSubmissionPayload";
import { resolveLibraryCustomerId } from "@/components/case-design-center/utils/libraryCustomerId";
import { fetchCaseDesignProductDetails } from "@/components/case-design-center/utils/caseDesignProductDetails";
import {
  useCaseWizardSession,
  type CaseDesignBootstrap,
} from "@/components/case-design-center/hooks/useCaseWizardSession";
import {
  getBusinessSettings,
  type BusinessHour,
  type CaseSchedule,
} from "@/lib/api-business-settings";
import { caseDesignInter } from "@/components/case-design-center/case-design-inter-font";
import { Button } from "@/components/ui/button";
import NewCaseWizard from "@/components/new-case-wizard";

type FlowStep = "loading" | "ineligible" | "design";

type Props = {
  slipId: number;
};

function isSlipEditBlocked(details: unknown): { blocked: boolean; reason?: string } {
  const status = String((details as { status?: string } | null)?.status ?? "").toLowerCase();
  if (status === "finished") {
    return { blocked: true, reason: "Finished slips cannot be edited." };
  }
  if (status === "cancelled" || status === "canceled") {
    return { blocked: true, reason: "Cancelled slips cannot be edited." };
  }

  const d = details as {
    location?: { id?: number; name?: string; current?: { id?: number; name?: string } };
    location_id?: number;
  } | null;
  const locationRef: SlipLocationRef = {
    locationId: d?.location?.current?.id ?? d?.location?.id ?? d?.location_id,
    location: d?.location?.current?.name ?? d?.location?.name ?? "",
  };
  if (!slipIsInLab(locationRef)) {
    return { blocked: true, reason: SLIP_EDIT_REQUIRES_IN_LAB_MESSAGE };
  }

  return { blocked: false };
}

export function EditSlipFlow({ slipId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { fetchVirtualSlipDetails, virtualSlipDetails } = useSlipCreation();

  const [step, setStep] = useState<FlowStep>("loading");
  const [ineligibleMessage, setIneligibleMessage] = useState<string | null>(null);
  const [detailsReady, setDetailsReady] = useState(false);
  const initRanRef = useRef(false);
  const [bootstrap, setBootstrap] = useState<CaseDesignBootstrap | null>(null);
  const [initialSlipState, setInitialSlipState] = useState<VirtualSlipInitialState | null>(
    null
  );

  const slipCollectorRef = useRef<(() => SlipProductSnapshot[]) | null>(null);
  const caseSummaryNotesRef = useRef("");
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(true);
  const [caseReady, setCaseReady] = useState(false);
  const [incompleteFieldLabel, setIncompleteFieldLabel] = useState<string | null>(null);
  const [hasToothStatusValidation, setHasToothStatusValidation] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [rushCasesEnabled, setRushCasesEnabled] = useState(true);
  const [rushCaseSchedule, setRushCaseSchedule] = useState<CaseSchedule | null>(null);
  const [labBusinessHours, setLabBusinessHours] = useState<BusinessHour[] | null>(null);
  const [right1Brand, setRight1Brand] = useState("Truabutment");
  const [right1Platform, setRight1Platform] = useState("Truscan");
  const [right2Brand, setRight2Brand] = useState("Nobel Biocare");
  const [right2Platform, setRight2Platform] = useState("Active");

  const [submissionState, setSubmissionState] = useState<
    "idle" | "submitting" | "success-transition"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const apiProducts = useMemo(
    () => extractVirtualSlipProducts(virtualSlipDetails),
    [virtualSlipDetails]
  );

  const locationId = useMemo(() => {
    const d = virtualSlipDetails as { location?: { id?: number }; location_id?: number } | null;
    return d?.location?.id ?? d?.location_id ?? null;
  }, [virtualSlipDetails]);

  const slipStatus = useMemo(() => {
    const d = virtualSlipDetails as { status?: string } | null;
    return d?.status ?? "In Progress";
  }, [virtualSlipDetails]);

  const casepanMeta = useMemo(() => {
    const d = virtualSlipDetails as {
      casepan?: { id?: number; number?: string };
      casepan_id?: number;
      casepan_number?: string;
    } | null;
    return {
      id: d?.casepan?.id ?? d?.casepan_id ?? null,
      number: d?.casepan?.number ?? d?.casepan_number ?? null,
    };
  }, [virtualSlipDetails]);

  const createdByMeta = useMemo(
    () => resolveCreatedByFromVirtualSlip(virtualSlipDetails),
    [virtualSlipDetails]
  );

  const labCustomerId = useMemo(
    () => resolveLibraryCustomerId(resolveLabIdFromSlipDetails(virtualSlipDetails)),
    [virtualSlipDetails]
  );

  const wizard = useCaseWizardSession({
    fetchProductDetails: fetchCaseDesignProductDetails,
    bootstrap,
  });

  const goBackToVirtualSlip = useCallback(() => {
    router.push(`/virtual-slip-v2/${slipId}`);
  }, [router, slipId]);

  useEffect(() => {
    setStep("loading");
    setDetailsReady(false);
    setBootstrap(null);
    setInitialSlipState(null);
    initRanRef.current = false;
    clearSlipCreationStorage();
    void fetchVirtualSlipDetails(slipId).then(() => setDetailsReady(true));
  }, [slipId, fetchVirtualSlipDetails]);

  useEffect(() => {
    if (!detailsReady || !virtualSlipDetails || initRanRef.current) return;
    initRanRef.current = true;

    const blocked = isSlipEditBlocked(virtualSlipDetails);
    if (blocked.blocked) {
      setIneligibleMessage(blocked.reason ?? "This slip cannot be edited.");
      setStep("ineligible");
      return;
    }

    if (apiProducts.length === 0) {
      setIneligibleMessage("This slip has no products to edit.");
      setStep("ineligible");
      return;
    }

    const seed = buildWizardSeedFromSlipDetails(virtualSlipDetails);
    setInitialSlipState(buildVirtualSlipInitialState(apiProducts));
    setBootstrap({
      patientName: seed.patientName,
      gender: seed.gender,
      age: seed.age,
      doctor: seed.doctor
        ? { id: seed.doctor.id, name: seed.doctor.name, img: seed.doctor.img }
        : null,
      lab: seed.lab ? { id: seed.lab.id, name: seed.lab.name, logo: seed.lab.logo } : null,
      addedProducts: buildAddedProducts(apiProducts),
      initialArch: determineInitialArch(apiProducts),
    });
    setStep("design");
  }, [apiProducts, detailsReady, virtualSlipDetails]);

  useEffect(() => {
    if (step !== "design" || !labCustomerId) return;
    getBusinessSettings(labCustomerId)
      .then((settings) => {
        setRushCaseSchedule(settings?.case_schedule ?? null);
        setLabBusinessHours(settings?.business_hours ?? null);
        setRushCasesEnabled(settings?.case_schedule?.enable_rush_cases ?? true);
      })
      .catch(() => {
        setRushCasesEnabled(true);
        setRushCaseSchedule(null);
        setLabBusinessHours(null);
      });
  }, [step, labCustomerId]);

  const submitEditSlip = async () => {
    if (submissionState === "submitting") return;
    const snapshots = slipCollectorRef.current?.() ?? [];
    setSubmitError(null);
    setSubmissionState("submitting");

    try {
      const { payload, multipartFiles } = await buildEditSlipSubmissionPayloadAsync({
        snapshots,
        apiProducts,
        locationId,
        status: slipStatus,
        casepanId: casepanMeta.id,
        casepanNumber: casepanMeta.number ?? undefined,
        labCustomerId: labCustomerId ?? undefined,
        caseSummaryNotes: caseSummaryNotesRef.current,
        patientName: wizard.completedPatientName,
        gender: wizard.completedGender,
        age: wizard.completedAge,
      });

      const res = await putEditSlip(slipId, payload, multipartFiles);
      if (!res.success) {
        throw new Error(res.message || "Could not update slip.");
      }

      setSubmissionState("success-transition");
      toast({
        title: "Slip updated",
        description: res.message || "The slip was updated successfully.",
      });
      setTimeout(() => router.push(`/virtual-slip-v2/${slipId}`), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update slip.";
      setSubmitError(message);
      setSubmissionState("idle");
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-[#64748B]">Loading slip for edit…</p>
      </div>
    );
  }

  if (step === "ineligible") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-12">
        <h1 className="text-xl font-bold text-[#4C4D55]">Cannot edit slip</h1>
        <p className="text-sm text-[#64748B]">{ineligibleMessage}</p>
        <Button type="button" onClick={goBackToVirtualSlip}>
          Back to virtual slip
        </Button>
      </div>
    );
  }

  return (
    <div className={`${caseDesignInter.className} flex h-screen bg-white overflow-hidden`}>
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        {!wizard.wizardComplete && (
          <NewCaseWizard
            key={wizard.wizardKey}
            onComplete={wizard.handleWizardComplete}
            onLabSelect={(lab) => wizard.setCompletedLab(lab)}
            startStep={wizard.wizardStartStep}
            mode={
              wizard.wizardMode === "backToProducts" || wizard.wizardMode === "addProduct"
                ? "addProduct"
                : wizard.wizardMode
            }
            initialLabId={
              (wizard.wizardMode === "backToProducts" ||
                wizard.wizardMode === "addProduct") &&
              wizard.completedLab
                ? wizard.completedLab.id
                : null
            }
            initialPatientName={
              wizard.wizardMode === "backToProducts" || wizard.wizardMode === "addProduct"
                ? wizard.completedPatientName
                : ""
            }
            initialGender={
              wizard.wizardMode === "backToProducts" || wizard.wizardMode === "addProduct"
                ? wizard.completedGender
                : ""
            }
            initialAge={
              wizard.wizardMode === "backToProducts" || wizard.wizardMode === "addProduct"
                ? wizard.completedAge
                : ""
            }
            initialDoctor={
              (wizard.wizardMode === "backToProducts" ||
                wizard.wizardMode === "addProduct") &&
              wizard.completedDoctor
                ? wizard.completedDoctor
                : undefined
            }
            initialCategory={
              wizard.wizardMode === "backToProducts" ? wizard.lastSelectedCategory : null
            }
            initialSubProduct={
              wizard.wizardMode === "backToProducts" ? wizard.lastSelectedSubProduct : null
            }
            forceArch={wizard.wizardMode === "addProduct" ? wizard.pendingProductArch : undefined}
            editTarget={wizard.labEditMode ? "lab" : undefined}
            onEditDone={wizard.handleEditDone}
          />
        )}

        {wizard.caseDesignMounted && (
          <div style={{ display: wizard.wizardComplete ? undefined : "none" }}>
            <PatientHeader
              doctorImageUrl={wizard.completedDoctor?.img}
              doctorName={wizard.completedDoctor?.name}
              patientName={wizard.completedPatientName}
              gender={wizard.completedGender}
              age={wizard.completedAge}
              caseSubmitted={false}
              onEditDoctorClick={wizard.handleEditDoctor}
              canEditDoctor={wizard.canEditDoctor}
              onPatientNameChange={wizard.setCompletedPatientName}
              onGenderChange={wizard.setCompletedGender}
              onAgeChange={wizard.setCompletedAge}
              createdByName={createdByMeta.name}
              createdByImageUrl={createdByMeta.imageUrl}
              labLogoUrl={wizard.completedLab?.logo}
              labName={wizard.completedLab?.name}
              onEditLab={wizard.handleTopBarEditLab}
            />

            {initialSlipState && (
              <CaseDesignCenter
                right1Brand={right1Brand}
                setRight1Brand={setRight1Brand}
                right1Platform={right1Platform}
                setRight1Platform={setRight1Platform}
                right2Brand={right2Brand}
                setRight2Brand={setRight2Brand}
                right2Platform={right2Platform}
                setRight2Platform={setRight2Platform}
                onAddProduct={wizard.handleAddProduct}
                inlineAddProductArch={wizard.inlineAddProductArch}
                onInlineAddProductComplete={wizard.completeInlineAddProduct}
                onInlineAddProductCancel={wizard.cancelInlineAddProduct}
                labCustomerId={labCustomerId}
                onBackToProducts={wizard.handleBackToProducts}
                onBackToCategories={wizard.handleBackToCategories}
                selectedProductId={wizard.selectedProductId}
                selectedProductName={wizard.selectedProductName}
                selectedProductCategoryName={wizard.selectedProductCategoryName}
                caseSubmitted={false}
                onReadinessChange={setCaseReady}
                onIncompleteFieldChange={setIncompleteFieldLabel}
                onToothStatusValidationChange={setHasToothStatusValidation}
                addedProducts={wizard.addedProducts}
                onProductsChange={wizard.setAddedProducts}
                initialArch={wizard.initialArch}
                initialSlipState={initialSlipState}
                preloadInitialSlipState
                suppressFieldAutoOpen
                slipCollectorRef={slipCollectorRef}
                caseSummaryNotesRef={caseSummaryNotesRef}
                confirmDetailsChecked={confirmDetailsChecked}
                onAnyModalOpenChange={setIsAnyModalOpen}
                rushCasesEnabled={rushCasesEnabled}
                rushCaseSchedule={rushCaseSchedule}
                labBusinessHours={labBusinessHours}
              />
            )}
            <div style={{ height: "80px" }} />
          </div>
        )}
      </main>

      {wizard.wizardComplete && !isAnyModalOpen && !wizard.doctorEditModalOpen && (
        <SlipCreationStepFooter
          mode="submit"
          isSubmitting={submissionState === "submitting"}
          confirmDetailsChecked={confirmDetailsChecked}
          isAccordionComplete={() => caseReady}
          incompleteFieldLabel={incompleteFieldLabel}
          hasToothStatusValidation={hasToothStatusValidation}
          onConfirmDetailsChange={setConfirmDetailsChecked}
          onSubmit={() => void submitEditSlip()}
          onCancelSlip={goBackToVirtualSlip}
        />
      )}

      {submitError ? (
        <p className="fixed bottom-24 left-6 z-50 max-w-md text-sm text-red-600">
          {submitError}
        </p>
      ) : null}

      <CaseSubmissionOverlays submissionState={submissionState} />

      <DoctorEditModal
        open={wizard.doctorEditModalOpen}
        onClose={wizard.handleDoctorEditClose}
        doctors={wizard.doctorsForPicker}
        selectedDoctorId={wizard.completedDoctor?.id ?? null}
        isLoading={wizard.doctorsLoading}
        error={wizard.doctorsError}
        onSelect={wizard.handleDoctorEditSelect}
      />
    </div>
  );
}
