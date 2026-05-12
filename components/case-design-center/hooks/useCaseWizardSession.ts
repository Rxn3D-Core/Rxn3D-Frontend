import { useEffect, useRef, useState } from "react";
import type { WizardDoctorShape, WizardLabShape } from "@/components/new-case-wizard";
import type { AddedProduct } from "../types";
import type { CaseDesignProductDetails } from "../utils/caseDesignProductDetails";

type WizardMode = "initial" | "addProduct" | "backToProducts";

interface UseCaseWizardSessionParams {
  fetchProductDetails: (productId: number) => Promise<CaseDesignProductDetails | null>;
}

export function useCaseWizardSession({ fetchProductDetails }: UseCaseWizardSessionParams) {
  const [wizardComplete, setWizardComplete] = useState(false);
  const [completedDoctor, setCompletedDoctor] = useState<WizardDoctorShape | null>(null);
  const [completedLab, setCompletedLab] = useState<WizardLabShape | null>(null);
  const [completedPatientName, setCompletedPatientName] = useState("");
  const [completedGender, setCompletedGender] = useState("");
  const [completedAge, setCompletedAge] = useState("");
  const [labEditMode, setLabEditMode] = useState(false);
  const [doctorEditMode, setDoctorEditMode] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [wizardMode, setWizardMode] = useState<WizardMode>("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);
  const [selectedProductCategoryName, setSelectedProductCategoryName] = useState<string | undefined>(undefined);
  const [initialArch, setInitialArch] = useState<"maxillary" | "mandibular" | "both" | undefined>(undefined);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<number | null>(null);
  const [lastSelectedSubProduct, setLastSelectedSubProduct] = useState<number | null>(null);
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);
  const [caseDesignMounted, setCaseDesignMounted] = useState(false);
  const wizardCompletingRef = useRef(false);

  useEffect(() => {
    const currentRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setRole(currentRole);
    localStorage.removeItem("cdc_added_products");
  }, []);

  const handleWizardComplete = async (result: any) => {
    if (wizardCompletingRef.current) return;
    wizardCompletingRef.current = true;
    try {
      if (result.category) setLastSelectedCategory(Number(result.category) || null);
      if (result.product) setLastSelectedSubProduct(Number(result.product) || null);

      if (wizardMode === "addProduct") {
        const addedProductId = Number(result.material) || undefined;
        const details = addedProductId ? await fetchProductDetails(addedProductId) : null;
        const categoryName = details?.category_name || result.categoryName || "";
        const newProduct: AddedProduct = {
          id: Date.now(),
          productId: addedProductId,
          product: {
            name: details?.name || result.product || "Untitled Product",
            category_name: categoryName,
            subcategory_name: details?.subcategory_name || "",
            subcategory: {
              name: details?.subcategory_name || "",
              category: { name: categoryName },
            },
            code: "",
            image_url: details?.image_url || "",
          },
          arch: pendingProductArch,
          expanded: true,
        };
        setAddedProducts((prev) => [newProduct, ...prev.map((product) => ({ ...product, expanded: false }))]);
        setWizardMode("initial");
        setWizardComplete(true);
      } else {
        const productId = Number(result.material);
        if (productId) {
          setSelectedProductId(productId);
          if (result.categoryName) setSelectedProductCategoryName(result.categoryName);
          if (result.materialName) setSelectedProductName(result.materialName);
        } else {
          setSelectedProductCategoryName(undefined);
        }
        setCompletedDoctor(result?.doctor ?? null);
        setCompletedLab(result?.lab ?? null);
        setCompletedPatientName(result?.patientName ?? "");
        setCompletedGender(result?.gender ?? "");
        setCompletedAge(result?.age ?? "");
        if (result?.arch) setInitialArch(result.arch);
        setLabEditMode(false);
        setDoctorEditMode(false);
        setWizardComplete(true);
        setCaseDesignMounted(true);
      }
    } finally {
      wizardCompletingRef.current = false;
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

  const handleBackToCategories = (arch?: "maxillary" | "mandibular") => {
    if (arch) setPendingProductArch(arch);
    setLastSelectedCategory(null);
    setLastSelectedSubProduct(null);
    setWizardMode("addProduct");
    setWizardComplete(false);
  };

  const handleTopBarEditLab = () => {
    setWizardMode("initial");
    setLabEditMode(true);
    setDoctorEditMode(false);
    setWizardComplete(false);
    setWizardKey((key) => key + 1);
  };

  const handleEditDoctor = () => {
    setWizardMode("initial");
    setDoctorEditMode(true);
    setLabEditMode(false);
    setWizardComplete(false);
    setWizardKey((key) => key + 1);
  };

  const handleEditDone = () => {
    setLabEditMode(false);
    setDoctorEditMode(false);
    setWizardComplete(true);
  };

  const wizardStartStep = wizardMode === "backToProducts"
    ? 6
    : wizardMode === "addProduct"
      ? 4
      : labEditMode
        ? (role === "office_admin" ? 2 : 1)
        : doctorEditMode
          ? (role === "office_admin" ? 1 : 2)
          : 1;

  return {
    wizardComplete,
    completedDoctor,
    completedLab,
    completedPatientName,
    completedGender,
    completedAge,
    role,
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
    doctorEditMode,
    wizardStartStep,
    setCompletedLab,
    setCompletedPatientName,
    setCompletedGender,
    setCompletedAge,
    setAddedProducts,
    handleWizardComplete,
    handleAddProduct,
    handleBackToProducts,
    handleBackToCategories,
    handleTopBarEditLab,
    handleEditDoctor,
    handleEditDone,
  };
}
