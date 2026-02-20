"use client";

import { useState, useEffect } from "react";
import NewCaseWizard, { type WizardLabShape, type WizardDoctorShape } from "@/components/new-case-wizard";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import type { AddedProduct } from "./types";
import { TopBar } from "./components/TopBar";
import { PatientHeader } from "./components/PatientHeader";
import { CaseDesignCenter } from "./components/CaseDesignCenter";
import { CaseSummaryNotes } from "./components/CaseSummaryNotes";
import { FloatingActions } from "./components/FloatingActions";

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function Page() {
  const [wizardComplete, setWizardComplete] = useState(false);
  const [completedDoctor, setCompletedDoctor] = useState<WizardDoctorShape | null>(null);
  const [completedLab, setCompletedLab] = useState<WizardLabShape | null>(null);
  const [completedPatientName, setCompletedPatientName] = useState<string>("");
  const [completedGender, setCompletedGender] = useState<string>("");
  const [labEditMode, setLabEditMode] = useState(false);
  const [doctorEditMode, setDoctorEditMode] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const r = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setRole(r);
  }, []);
  const [right1Brand, setRight1Brand] = useState("Truabutment");
  const [right1Platform, setRight1Platform] = useState("Truscan");
  const [right2Brand, setRight2Brand] = useState("Nobel Biocare");
  const [right2Platform, setRight2Platform] = useState("Active");
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(false);
  const [caseSubmitted, setCaseSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ---- Add Product via wizard redirect ----
  const [wizardMode, setWizardMode] = useState<"initial" | "addProduct">("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  // Load cached added products
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("cdc_added_products");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const persistProducts = (products: AddedProduct[]) => {
    setAddedProducts(products);
    try {
      localStorage.setItem("cdc_added_products", JSON.stringify(products));
    } catch (e) {
      console.error("Failed to cache products:", e);
    }
  };

  const handleWizardComplete = (result: any) => {
    if (wizardMode === "addProduct") {
      const newProduct: AddedProduct = {
        id: Date.now(),
        product: {
          name: result.material || result.product || "Untitled Product",
          category_name: result.category || "",
          subcategory_name: result.product || "",
          code: "",
          image_url: "",
        },
        arch: pendingProductArch,
        expanded: true,
      };
      persistProducts([...addedProducts, newProduct]);
      setWizardMode("initial");
      setWizardComplete(true);
    } else {
      const productId = Number(result.material);
      if (productId) setSelectedProductId(productId);
      setCompletedDoctor(result?.doctor ?? null);
      setCompletedLab(result?.lab ?? null);
      setCompletedPatientName(result?.patientName ?? "");
      setCompletedGender(result?.gender ?? "");
      setLabEditMode(false);
      setDoctorEditMode(false);
      setWizardComplete(true);
    }
  };

  const handleAddProduct = (arch: "maxillary" | "mandibular") => {
    setPendingProductArch(arch);
    setWizardMode("addProduct");
    setWizardComplete(false);
  };

  const handleBackToProducts = () => {
    setWizardMode("addProduct");
    setWizardComplete(false);
  };

  const handleTopBarEditLab = () => {
    setLabEditMode(true);
    setDoctorEditMode(false);
    setWizardComplete(false);
  };

  const handleEditDoctor = () => {
    setDoctorEditMode(true);
    setLabEditMode(false);
    setWizardComplete(false);
  };

  const wizardStartStep = wizardMode === "addProduct"
    ? 4
    : labEditMode
    ? (role === "office_admin" ? 2 : 1)
    : doctorEditMode
    ? (role === "office_admin" ? 1 : 2)
    : 1;

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        <TopBar
          selectedLab={completedLab ? { logo: completedLab.logo, name: completedLab.name } : null}
          onEditClick={wizardComplete ? handleTopBarEditLab : undefined}
          caseSubmitted={caseSubmitted}
        />
        {wizardComplete ? (
          <>
            <PatientHeader
              doctorImageUrl={completedDoctor?.img}
              doctorName={completedDoctor?.name}
              patientName={completedPatientName}
              gender={completedGender}
              caseSubmitted={caseSubmitted}
              onEditDoctorClick={handleEditDoctor}
            />
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
              onBackToProducts={handleBackToProducts}
              selectedProductId={selectedProductId}
              caseSubmitted={caseSubmitted}
            />
            {showDetails && (
              <CaseSummaryNotes
                right1Brand={right1Brand}
                right1Platform={right1Platform}
                right2Brand={right2Brand}
                right2Platform={right2Platform}
              />
            )}
            {/* Spacer for fixed footer */}
            <div style={{ height: "80px" }} />
          </>
        ) : (
          <NewCaseWizard
            onComplete={handleWizardComplete}
            onLabSelect={(lab) => setCompletedLab(lab)}
            startStep={wizardStartStep}
            mode={wizardMode}
            initialLabId={doctorEditMode && completedLab ? completedLab.id : null}
          />
        )}
      </main>

      {/* Footer - outside main to avoid overflow clipping */}
      {wizardComplete && !caseSubmitted && (
        <SlipCreationStepFooter
          mode="submit"
          confirmDetailsChecked={confirmDetailsChecked}
          isAccordionComplete={() => true}
          onConfirmDetailsChange={setConfirmDetailsChecked}
          onSubmit={() => {
            console.log("Submit case")
            setCaseSubmitted(true)
          }}
        />
      )}
      {caseSubmitted && <FloatingActions />}
    </div>
  );
}
