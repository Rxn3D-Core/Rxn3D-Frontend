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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function fetchProductDetails(productId: number): Promise<{ name: string; image_url: string | null; category_name: string; subcategory_name: string } | null> {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const role = localStorage.getItem("role");
    const customerId = Number(
      role === "office_admin" || role === "doctor"
        ? localStorage.getItem("selectedLabId")
        : localStorage.getItem("customerId")
    ) || 1;
    const url = new URL(`/v1/library/products/${productId}`, API_BASE_URL);
    url.searchParams.set("lang", "en");
    url.searchParams.set("customer_id", String(customerId));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data) return null;
    return {
      name: data.name || "",
      image_url: data.image_url || null,
      category_name: data.subcategory?.category?.name || "",
      subcategory_name: data.subcategory?.name || "",
    };
  } catch {
    return null;
  }
}

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
    // Clear any stale added-products cache so each new case session starts fresh
    localStorage.removeItem("cdc_added_products");
  }, []);
  const [right1Brand, setRight1Brand] = useState("Truabutment");
  const [right1Platform, setRight1Platform] = useState("Truscan");
  const [right2Brand, setRight2Brand] = useState("Nobel Biocare");
  const [right2Platform, setRight2Platform] = useState("Active");
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(false);
  const [caseSubmitted, setCaseSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [caseReady, setCaseReady] = useState(false);
  const [incompleteFieldLabel, setIncompleteFieldLabel] = useState<string | null>(null);
  // Once true, CaseDesignCenter stays mounted (hidden via CSS) so hook state survives Add Product wizard
  const [caseDesignMounted, setCaseDesignMounted] = useState(false);

  // ---- Add Product via wizard redirect ----
  const [wizardMode, setWizardMode] = useState<"initial" | "addProduct">("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);

  const handleWizardComplete = async (result: any) => {
    if (wizardMode === "addProduct") {
      const addedProductId = Number(result.material) || undefined;
      // Fetch real product details so the accordion shows the correct name/image
      const details = addedProductId ? await fetchProductDetails(addedProductId) : null;
      const newProduct: AddedProduct = {
        id: Date.now(),
        productId: addedProductId,
        product: {
          name: details?.name || result.product || "Untitled Product",
          category_name: details?.category_name || "",
          subcategory_name: details?.subcategory_name || "",
          code: "",
          image_url: details?.image_url || "",
        },
        arch: pendingProductArch,
        expanded: true,
      };
      setAddedProducts((prev) => [...prev, newProduct]);
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
      setCaseDesignMounted(true); // Keep CaseDesignCenter mounted from here on
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
        {/* Wizard — shown when wizardComplete is false */}
        {!wizardComplete && (
          <NewCaseWizard
            onComplete={handleWizardComplete}
            onLabSelect={(lab) => setCompletedLab(lab)}
            startStep={wizardStartStep}
            mode={wizardMode}
            initialLabId={doctorEditMode && completedLab ? completedLab.id : null}
            initialPatientName={wizardMode === "addProduct" ? completedPatientName : ""}
            initialGender={wizardMode === "addProduct" ? completedGender : ""}
            initialDoctor={wizardMode === "addProduct" && completedDoctor ? completedDoctor : undefined}
          />
        )}

        {/* Case Design Center — kept mounted once initial wizard completes so hook state survives "Add Product" wizard navigation */}
        {caseDesignMounted && (
          <div style={{ display: wizardComplete ? undefined : "none" }}>
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
              onReadinessChange={setCaseReady}
              onIncompleteFieldChange={setIncompleteFieldLabel}
              addedProducts={addedProducts}
              onProductsChange={setAddedProducts}
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
          </div>
        )}
      </main>

      {/* Footer - outside main to avoid overflow clipping */}
      {wizardComplete && !caseSubmitted && (
        <SlipCreationStepFooter
          mode="submit"
          confirmDetailsChecked={confirmDetailsChecked}
          isAccordionComplete={() => caseReady}
          incompleteFieldLabel={incompleteFieldLabel}
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
