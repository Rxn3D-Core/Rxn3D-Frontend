"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import { useToast } from "@/hooks/use-toast";
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage";
import { fetchNewStageEligibility } from "@/lib/api/slip-new-stage-eligibility";
import { postAddStageToSlip } from "@/lib/api/slip-add-stage";
import { extractVirtualSlipProducts } from "@/lib/virtual-slip-products";
import {
  buildAddStagePreload,
  buildAddedProducts,
  buildWizardSeedFromSlipDetails,
  resolveLabIdFromSlipDetails,
} from "@/lib/add-stage/preload-state";
import { buildAddStageInitFromProductApi } from "@/lib/add-stage/build-stage-selections";
import {
  clearAddStageSession,
  readAddStageSession,
  saveAddStageSession,
  type AddStageDesignContext,
} from "@/lib/add-stage/session";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import { CaseSubmissionOverlays } from "@/components/case-design-center/components/CaseSubmissionOverlays";
import { CaseDesignCenter } from "@/components/case-design-center/components/CaseDesignCenter";
import { TopBar } from "@/components/case-design-center/components/TopBar";
import { PatientHeader } from "@/components/case-design-center/components/PatientHeader";
import { DoctorEditModal } from "@/components/case-design-center/components/DoctorEditModal";
import type { SlipProductSnapshot, VirtualSlipInitialState } from "@/components/case-design-center/types";
import { buildAddStageSubmissionPayloadAsync } from "@/components/case-design-center/utils/addStageSubmissionPayload";
import { resolveVirtualSlipPath } from "@/components/case-design-center/utils/caseCompletionDestination";
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
  sourceSlipId: number;
};

export function AddNewStageFlow({ sourceSlipId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { fetchVirtualSlipDetails, virtualSlipDetails, fetchProductDetails } =
    useSlipCreation();

  const [step, setStep] = useState<FlowStep>("loading");
  const [ineligibleMessage, setIneligibleMessage] = useState<string | null>(null);
  const [detailsReady, setDetailsReady] = useState(false);
  const initRanRef = useRef(false);
  const [bootstrap, setBootstrap] = useState<CaseDesignBootstrap | null>(null);
  const [initialSlipState, setInitialSlipState] = useState<VirtualSlipInitialState | null>(
    null
  );
  const [addStageContext, setAddStageContext] = useState<AddStageDesignContext | null>(
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

  const labCustomerId = useMemo(
    () => resolveLibraryCustomerId(resolveLabIdFromSlipDetails(virtualSlipDetails)),
    [virtualSlipDetails]
  );

  const wizard = useCaseWizardSession({
    fetchProductDetails: fetchCaseDesignProductDetails,
    bootstrap,
  });

  const goBackToVirtualSlip = useCallback(() => {
    clearAddStageSession();
    router.push(`/virtual-slip-v2/${sourceSlipId}`);
  }, [router, sourceSlipId]);

  const labIdForProductFetch = useMemo(
    () => resolveLabIdFromSlipDetails(virtualSlipDetails),
    [virtualSlipDetails]
  );

  useEffect(() => {
    setStep("loading");
    setDetailsReady(false);
    setBootstrap(null);
    setInitialSlipState(null);
    setAddStageContext(null);
    initRanRef.current = false;
    clearSlipCreationStorage();
    void fetchVirtualSlipDetails(sourceSlipId).then(() => setDetailsReady(true));
  }, [sourceSlipId, fetchVirtualSlipDetails]);

  useEffect(() => {
    if (!detailsReady || !virtualSlipDetails || initRanRef.current) return;
    initRanRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const eligibilityRes = await fetchNewStageEligibility(sourceSlipId);
        if (cancelled) return;
        const data = eligibilityRes.data;
        if (!data?.eligible) {
          const msg =
            data?.reasons?.join(" ") ||
            data?.message ||
            eligibilityRes.message ||
            "A new stage cannot be added for this slip.";
          setIneligibleMessage(msg);
          setStep("ineligible");
          return;
        }

        const eligibleLines = (data.products ?? []).filter((p) => p.eligible);
        if (eligibleLines.length === 0) {
          setIneligibleMessage(
            data.message || "No product lines are eligible for a new stage."
          );
          setStep("ineligible");
          return;
        }

        const init = await buildAddStageInitFromProductApi({
          eligibleProducts: eligibleLines,
          apiProducts,
          fetchProductDetails,
          labId: labIdForProductFetch,
        });
        if (cancelled) return;
        if (init.matchedCount === 0) {
          setIneligibleMessage(
            apiProducts.length === 0
              ? "Slip product details did not load. Go back and try again."
              : "Could not match eligible products to this slip or load product details. Check that slip details and eligibility use the same product lines."
          );
          setStep("ineligible");
          return;
        }

        const session = readAddStageSession();
        const selections =
          session.sourceSlipId === sourceSlipId &&
          session.selections &&
          (session.selections.maxillary || session.selections.mandibular)
            ? session.selections
            : init.selections;

        const historyByArch = init.historyByArch;
        saveAddStageSession(sourceSlipId, selections, historyByArch);

        const preload = buildAddStagePreload(apiProducts, selections);
        const seed = buildWizardSeedFromSlipDetails(virtualSlipDetails);

        setInitialSlipState(preload.initialSlipState);
        setAddStageContext({
          historyByArch,
          promptStagesOnLoad: true,
        });
        setBootstrap({
          patientName: seed.patientName,
          gender: seed.gender,
          age: seed.age,
          doctor: seed.doctor
            ? { id: seed.doctor.id, name: seed.doctor.name, img: seed.doctor.img }
            : null,
          lab: seed.lab
            ? { id: seed.lab.id, name: seed.lab.name, logo: seed.lab.logo }
            : null,
          addedProducts: buildAddedProducts(apiProducts),
          initialArch: preload.initialArch,
        });
        setStep("design");
      } catch (err) {
        if (!cancelled) {
          setIneligibleMessage(
            err instanceof Error ? err.message : "Could not check new stage eligibility."
          );
          setStep("ineligible");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    apiProducts,
    detailsReady,
    fetchProductDetails,
    labIdForProductFetch,
    sourceSlipId,
    virtualSlipDetails,
  ]);

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

  const submitAddStage = async () => {
    if (submissionState === "submitting") return;
    const snapshots = slipCollectorRef.current?.() ?? [];
    setSubmitError(null);
    setSubmissionState("submitting");

    try {
      const payload = await buildAddStageSubmissionPayloadAsync({
        snapshots,
        sourceSlipLocationId: locationId,
        labCustomerId: labCustomerId ?? undefined,
        caseSummaryNotes: caseSummaryNotesRef.current,
      });
      const res = await postAddStageToSlip(sourceSlipId, payload);
      if (!res.success) {
        throw new Error(res.message || "Could not create new stage slip.");
      }

      const newSlipId =
        (res.data as { id?: number })?.id ??
        (res.data as { slip_id?: number })?.slip_id;
      const redirectPath =
        typeof newSlipId === "number" && newSlipId > 0
          ? `/virtual-slip-v2/${newSlipId}`
          : resolveVirtualSlipPath({
              kind: "single-slip",
              slipId: sourceSlipId,
              caseNumber: "",
            });

      clearAddStageSession();
      setSubmissionState("success-transition");
      toast({
        title: "New stage created",
        description: res.message || "The new stage slip was created successfully.",
      });
      setTimeout(() => router.push(redirectPath), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create new stage slip.";
      setSubmitError(message);
      setSubmissionState("idle");
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-[#64748B]">Loading add stage…</p>
      </div>
    );
  }

  if (step === "ineligible") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-12">
        <h1 className="text-xl font-bold text-[#4C4D55]">Cannot add stage</h1>
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
        <TopBar
          selectedLab={
            wizard.completedLab
              ? { logo: wizard.completedLab.logo, name: wizard.completedLab.name }
              : null
          }
          onEditClick={wizard.handleTopBarEditLab}
          caseSubmitted={false}
        />

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
              (wizard.labEditMode ||
                wizard.wizardMode === "backToProducts" ||
                wizard.wizardMode === "addProduct") &&
              wizard.completedLab
                ? wizard.completedLab.id
                : null
            }
            initialPatientName={
              wizard.labEditMode ||
              wizard.wizardMode === "backToProducts" ||
              wizard.wizardMode === "addProduct"
                ? wizard.completedPatientName
                : ""
            }
            initialGender={
              wizard.labEditMode ||
              wizard.wizardMode === "backToProducts" ||
              wizard.wizardMode === "addProduct"
                ? wizard.completedGender
                : ""
            }
            initialAge={
              wizard.labEditMode ||
              wizard.wizardMode === "backToProducts" ||
              wizard.wizardMode === "addProduct"
                ? wizard.completedAge
                : ""
            }
            initialDoctor={
              (wizard.labEditMode ||
                wizard.wizardMode === "backToProducts" ||
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
              compactLayout
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
                addStageContext={addStageContext ?? undefined}
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

      {wizard.wizardComplete &&
        !isAnyModalOpen &&
        !wizard.doctorEditModalOpen && (
          <SlipCreationStepFooter
            mode="submit"
            isSubmitting={submissionState === "submitting"}
            confirmDetailsChecked={confirmDetailsChecked}
            isAccordionComplete={() => caseReady}
            incompleteFieldLabel={incompleteFieldLabel}
            hasToothStatusValidation={hasToothStatusValidation}
            onConfirmDetailsChange={setConfirmDetailsChecked}
            onSubmit={() => void submitAddStage()}
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
