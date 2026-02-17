"use client";

import { useState } from "react";
import NewCaseWizard from "@/components/new-case-wizard";
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
      setWizardComplete(true);
    }
  };

  const handleAddProduct = (arch: "maxillary" | "mandibular") => {
    setPendingProductArch(arch);
    setWizardMode("addProduct");
    setWizardComplete(false);
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        <TopBar />
        {wizardComplete ? (
          <>
            <PatientHeader caseSubmitted={caseSubmitted} />
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
            startStep={wizardMode === "addProduct" ? 4 : 1}
            mode={wizardMode}
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
