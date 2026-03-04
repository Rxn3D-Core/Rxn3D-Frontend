"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import NewCaseWizard, { type WizardLabShape, type WizardDoctorShape } from "@/components/new-case-wizard";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import type { AddedProduct, SlipProductSnapshot } from "./types";
import { TopBar } from "./components/TopBar";
import { PatientHeader } from "./components/PatientHeader";
import { CaseDesignCenter } from "./components/CaseDesignCenter";
import { CaseSummaryNotes } from "./components/CaseSummaryNotes";
import { FloatingActions } from "./components/FloatingActions";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import type { SlipCreationProduct } from "@/contexts/slip-creation-context";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

/** Fetch basic product info for the accordion (name/image/category). */
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build the case summary note string for a product snapshot (mirrors CaseSummaryNotes logic). */
function buildProductNote(
  snap: SlipProductSnapshot,
  product: Record<string, any> | null,
  stageName: string | null
): string {
  const productName = product?.name || "";
  const teethStr = snap.teethNumbers.length
    ? snap.teethNumbers.slice().sort((a, b) => a - b).join(", ")
    : "";

  const gradeRaw = snap.fieldValues["grade"] ?? "";
  let gradeName = gradeRaw;
  try { const p = JSON.parse(gradeRaw); gradeName = p.name ?? gradeRaw; } catch {}

  const teethShadeRaw = snap.fieldValues["teeth_shade"] ?? "";
  let teethShade = teethShadeRaw;
  try { const p = JSON.parse(teethShadeRaw); teethShade = p.name ?? teethShadeRaw; } catch {}
  const gumShadeRaw = snap.fieldValues["gum_shade"] ?? "";
  let gumShadeName = gumShadeRaw;
  try { const p = JSON.parse(gumShadeRaw); gumShadeName = p.name ?? gumShadeRaw; } catch {}

  const fixedNotes = snap.fieldValues["fixed_notes"] ?? "";

  let note = productName
    ? `Please fabricate a${gradeName ? ` ${gradeName}` : ""} ${productName} for teeth #${teethStr}${stageName ? `, in the ${stageName} stage` : ""}.`
    : "";

  if (teethShade || gumShadeName) {
    note += ` Use${teethShade ? ` ${teethShade} denture teeth` : ""}${gumShadeName ? ` with ${gumShadeName} gingiva` : ""}.`;
  }
  if (fixedNotes) note += ` Notes: ${fixedNotes}.`;

  return note || undefined as any;
}

/** Parse display name from a JSON shade value or return raw string */
function parseShadeDisplayName(raw: string): string {
  try { return JSON.parse(raw).name ?? raw; } catch { return raw; }
}

/**
 * Convert a SlipProductSnapshot into a SlipCreationProduct.
 * Only passes fields relevant to the product category.
 */
function snapshotToProduct(snap: SlipProductSnapshot): SlipCreationProduct {
  const product = snap.productApiData;
  const isFixed = product?.subcategory?.category?.name === "Fixed Restoration";

  // --- Stage --- plain name; resolve stage_id from product.stages
  const stageName = snap.stageName ?? snap.fieldValues["stage"] ?? snap.fieldValues["fixed_stage"] ?? null;
  const stageObj = product?.stages?.find((s) => s.name === stageName);
  const stage_id = stageObj?.stage_id ?? 0;

  // --- Impressions ---
  const impressions = Object.entries(snap.impressions)
    .filter(([, qty]) => qty > 0)
    .map(([code, qty]) => {
      const imp = product?.impressions?.find((i) => i.code === code);
      return { impression_id: imp?.impression_id ?? imp?.id ?? 0, quantity: qty };
    })
    .filter((i) => i.impression_id > 0);

  // --- Fixed Restoration: advance_fields only, no grade/shade/gum IDs ---
  if (isFixed) {
    const advance_fields: Array<{ teeth_number: number | null; advance_field_id: number; advance_field_value: string }> = [];
    const advanceFieldKeys: Array<[string, (n: string) => boolean, boolean]> = [
      // [fieldKey, nameMatcher, isShadeJson]
      ["fixed_stump_shade", (n) => n.includes("stump") && n.includes("shade"), true],
      ["fixed_shade_trio", (n) => (n.includes("crown") || n.includes("tooth") || n.includes("incisal") || n.includes("cervical") || n.includes("body")) && n.includes("shade"), true],
      ["fixed_characterization", (n) => n.includes("characterization"), false],
      ["fixed_contact_icons", (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure"), false],
      ["fixed_margin", (n) => n.includes("margin"), false],
      ["fixed_metal", (n) => n.includes("metal"), false],
      ["fixed_proximal_contact", (n) => n.includes("proximal") && n.includes("contact"), false],
      ["fixed_notes", (n) => n.includes("note") || n.includes("additional"), false],
    ];
    for (const [key, matcher, isShadeJson] of advanceFieldKeys) {
      const raw = snap.fieldValues[key];
      if (!raw) continue;
      const advField = product?.advance_fields?.find((af) => matcher((af.name ?? "").toLowerCase()));
      if (!advField) continue;
      // For shade fields stored as JSON, extract the display name as the value
      const value = isShadeJson ? parseShadeDisplayName(raw) : raw;
      advance_fields.push({ teeth_number: null, advance_field_id: advField.id, advance_field_value: value });
    }

    return {
      type: snap.type,
      category_id: product?.subcategory?.category_id ?? 0,
      product_id: snap.productId,
      subcategory_id: product?.subcategory?.id ?? 0,
      stage_id,
      teeth_selection: snap.teethNumbers.join(","),
      status: "In Progress",
      notes: buildProductNote(snap, product, stageName),
      ...(impressions.length > 0 ? { impressions } : {}),
      ...(advance_fields.length > 0 ? { advance_fields } : {}),
      ...(snap.rush?.is_rush
        ? { rush: { is_rush: true, requested_rush_date: snap.rush.requested_rush_date ?? "" } }
        : {}),
    } as SlipCreationProduct;
  }

  // --- Removables / other products ---

  // Grade — stored as JSON: { grade_id, name }
  const gradeRaw = snap.fieldValues["grade"] ?? "";
  let grade_id = 0;
  if (gradeRaw) {
    try { grade_id = JSON.parse(gradeRaw).grade_id ?? 0; }
    catch { grade_id = product?.grades?.find((g) => g.name === gradeRaw)?.grade_id ?? 0; }
  }

  // Teeth shade — stored as JSON: { teeth_shade_id, brand_id, name }
  const teethShadeRaw = snap.fieldValues["teeth_shade"] ?? "";
  let teeth_shade_id = 0;
  let teeth_shade_brand_id = 0;
  if (teethShadeRaw) {
    try {
      const parsed = JSON.parse(teethShadeRaw);
      teeth_shade_id = parsed.teeth_shade_id ?? 0;
      teeth_shade_brand_id = parsed.brand_id ?? 0;
    } catch {}
  }

  // Gum shade — stored as JSON: { gum_shade_id, brand_id, name }
  const gumShadeStr = snap.fieldValues["gum_shade"] ?? "";
  let gum_shade_id = 0;
  let gum_shade_brand_id = 0;
  if (gumShadeStr) {
    try {
      const parsed = JSON.parse(gumShadeStr);
      gum_shade_id = parsed.gum_shade_id ?? 0;
      gum_shade_brand_id = parsed.brand_id ?? 0;
    } catch {
      const matchedGumShade = product?.gum_shades?.find((s) => s.name === gumShadeStr);
      if (matchedGumShade) {
        gum_shade_id = matchedGumShade.gum_shade_id ?? matchedGumShade.id;
        gum_shade_brand_id = matchedGumShade.brand?.id ?? 0;
      }
    }
  }

  return {
    type: snap.type,
    category_id: product?.subcategory?.category_id ?? 0,
    product_id: snap.productId,
    subcategory_id: product?.subcategory?.id ?? 0,
    stage_id,
    ...(grade_id ? { grade_id } : {}),
    teeth_selection: snap.teethNumbers.join(","),
    ...(teeth_shade_id ? { teeth_shade_id, teeth_shade_brand_id } : {}),
    ...(gum_shade_id ? { gum_shade_id, gum_shade_brand_id } : {}),
    status: "In Progress",
    notes: buildProductNote(snap, product, stageName),
    ...(impressions.length > 0 ? { impressions } : {}),
    ...(snap.rush?.is_rush
      ? { rush: { is_rush: true, requested_rush_date: snap.rush.requested_rush_date ?? "" } }
      : {}),
  } as SlipCreationProduct;
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function Page() {
  const { createSlip } = useSlipCreation();
  const { toast } = useToast();
  const slipCollectorRef = useRef<(() => SlipProductSnapshot[]) | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  const [slipHeaderLoading, setSlipHeaderLoading] = useState(false);
  const [slipResponseData, setSlipResponseData] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [caseReady, setCaseReady] = useState(false);
  const [incompleteFieldLabel, setIncompleteFieldLabel] = useState<string | null>(null);
  const [hasToothStatusValidation, setHasToothStatusValidation] = useState(false);
  // Once true, CaseDesignCenter stays mounted (hidden via CSS) so hook state survives Add Product wizard
  const [caseDesignMounted, setCaseDesignMounted] = useState(false);

  // ---- Add Product via wizard redirect ----
  const [wizardMode, setWizardMode] = useState<"initial" | "addProduct" | "backToProducts">("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  /** Category name of the selected (initial) product — e.g. "Removable restoration". Used to hide retention popover for Removables. */
  const [selectedProductCategoryName, setSelectedProductCategoryName] = useState<string | undefined>(undefined);
  /** Arch selection from Removable Restoration product dropdown — controls which panels are initially shown */
  const [initialArch, setInitialArch] = useState<"maxillary" | "mandibular" | "both" | undefined>(undefined);
  /** Track the last selected category & subcategory so "Back to Products" returns to product selection (step 6) instead of category (step 4) */
  const [lastSelectedCategory, setLastSelectedCategory] = useState<number | null>(null);
  const [lastSelectedSubProduct, setLastSelectedSubProduct] = useState<number | null>(null);

  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);

  const handleWizardComplete = async (result: any) => {
    // Always track the last selected category & subcategory so "Back to Products" can return to step 6
    if (result.category) setLastSelectedCategory(Number(result.category) || null);
    if (result.product) setLastSelectedSubProduct(Number(result.product) || null);

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
      if (productId) {
        setSelectedProductId(productId);
        // Set category name immediately from wizard result so removables detection
        // works on the very first tooth click (no need to wait for async fetch)
        if (result.categoryName) {
          setSelectedProductCategoryName(result.categoryName);
        } else {
          fetchProductDetails(productId).then((details) => {
            if (details?.category_name) setSelectedProductCategoryName(details.category_name);
          });
        }
      } else {
        setSelectedProductCategoryName(undefined);
      }
      setCompletedDoctor(result?.doctor ?? null);
      setCompletedLab(result?.lab ?? null);
      setCompletedPatientName(result?.patientName ?? "");
      setCompletedGender(result?.gender ?? "");
      if (result?.arch) setInitialArch(result.arch);
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
    setWizardMode("backToProducts");
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

  const handleSubmit = useCallback(async () => {
    const snapshots = slipCollectorRef.current?.() ?? [];

    // Resolve lab_id and office_id based on role
    // - lab_admin: completedLab.id is the office id; lab_id comes from customerId
    // - office_admin/doctor: completedLab.id is the lab id; office_id comes from customerId
    const userRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const customerId = Number(typeof window !== "undefined" ? localStorage.getItem("customerId") : 0) || 0;
    let labId: number;
    let officeId: number;
    if (userRole === "lab_admin") {
      labId = customerId;
      officeId = completedLab?.id ?? 0;
    } else {
      labId = completedLab?.id ?? 0;
      officeId = customerId;
    }
    const doctorId = completedDoctor?.id ?? 0;

    const filteredSnapshots = snapshots.filter((s) => s.teethNumbers.length > 0 || s.productId > 0);

    const products: SlipCreationProduct[] = filteredSnapshots.map((s) =>
      snapshotToProduct(s)
    );

    const payload = {
      case: {
        lab_id: labId,
        office_id: officeId,
        doctor: doctorId,
        patient_name: completedPatientName,
        gender: completedGender,
        case_status: "In Progress",
      },
      slips: [
        {
          status: "In Progress",
          products,
          notes: products
            .map((p) => p.notes)
            .filter((n): n is string => !!n)
            .map((n) => ({ note: n })),
        },
      ],
    };

    console.log("[SlipCreate] payload:", JSON.stringify(payload, null, 2));

    setSubmitting(true);
    setSlipHeaderLoading(true);
    try {
      const responseData = await createSlip(payload);
      setSlipResponseData(responseData ?? null);
      setSlipHeaderLoading(false);
      setCaseSubmitted(true);
      toast({ title: "Case submitted", description: "Slip created successfully." });
    } catch (err: any) {
      setSlipHeaderLoading(false);
      toast({ title: "Submit failed", description: err?.message ?? "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [completedLab, completedDoctor, completedPatientName, completedGender, createSlip, toast]);

  const wizardStartStep = wizardMode === "backToProducts"
    ? 6
    : wizardMode === "addProduct"
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
            mode={wizardMode === "backToProducts" ? "addProduct" : wizardMode}
            initialLabId={doctorEditMode && completedLab ? completedLab.id : null}
            initialPatientName={wizardMode === "addProduct" || wizardMode === "backToProducts" ? completedPatientName : ""}
            initialGender={wizardMode === "addProduct" || wizardMode === "backToProducts" ? completedGender : ""}
            initialDoctor={((wizardMode === "addProduct" || wizardMode === "backToProducts") && completedDoctor) ? completedDoctor : undefined}
            initialCategory={wizardMode === "backToProducts" ? lastSelectedCategory : null}
            initialSubProduct={wizardMode === "backToProducts" ? lastSelectedSubProduct : null}
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
              slipHeaderLoading={slipHeaderLoading}
              slipResponseData={slipResponseData}
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
              selectedProductCategoryName={selectedProductCategoryName}
              caseSubmitted={caseSubmitted}
              onReadinessChange={setCaseReady}
              onIncompleteFieldChange={setIncompleteFieldLabel}
              onToothStatusValidationChange={setHasToothStatusValidation}
              addedProducts={addedProducts}
              onProductsChange={setAddedProducts}
              initialArch={initialArch}
              slipCollectorRef={slipCollectorRef}
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
          hasToothStatusValidation={hasToothStatusValidation}
          onConfirmDetailsChange={setConfirmDetailsChecked}
          onSubmit={handleSubmit}
        />
      )}
      {caseSubmitted && <FloatingActions />}
    </div>
  );
}
