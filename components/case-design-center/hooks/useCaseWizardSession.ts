import { useEffect, useMemo, useRef, useState } from "react";
import type { WizardDoctorShape, WizardLabShape } from "@/components/new-case-wizard";
import type { AddedProduct } from "../types";
import type { CaseDesignProductDetails } from "../utils/caseDesignProductDetails";
import { hasPendingDemographics } from "@/lib/product-demographics";
import { isArchAtProductLimit } from "../utils/archProductLimits";
import { nextAddedProductCardId } from "../utils/nextAddedProductCardId";
import { useOfficeDoctors } from "@/hooks/use-slip-data";
import { mapOfficeDoctorsToWizardShape } from "../components/DoctorEditModal";

type WizardMode = "initial" | "addProduct" | "backToProducts";

export type CaseDesignBootstrap = {
  doctor: WizardDoctorShape | null;
  lab: WizardLabShape | null;
  /** Office customer id for `/slip/office/{id}/doctors` (required when lab_admin preloads from a slip). */
  officeId?: number | null;
  patientName: string;
  gender: string;
  age: string;
  addedProducts: AddedProduct[];
  initialArch?: "maxillary" | "mandibular" | "both";
};

interface UseCaseWizardSessionParams {
  fetchProductDetails: (
    productId: number,
    selectedLabId?: number | null
  ) => Promise<CaseDesignProductDetails | null>;
  /** Open CDC immediately with seeded header/products (add-new-stage). */
  bootstrap?: CaseDesignBootstrap | null;
}

function buildAddedProductStub(
  details: CaseDesignProductDetails | null,
  fallback: {
    name: string;
    categoryName: string;
    subcategoryName?: string;
    subcategoryId?: number;
    imageUrl?: string;
  }
): AddedProduct["product"] {
  const categoryName = details?.category_name || fallback.categoryName;
  const subcategoryName = details?.subcategory_name || fallback.subcategoryName || "";
  return {
    id: details?.id,
    name: details?.name || fallback.name,
    category_name: categoryName,
    subcategory_name: subcategoryName,
    subcategory: {
      id: details?.subcategory_id ?? fallback.subcategoryId,
      name: subcategoryName,
      category: { name: categoryName },
    },
    code: "",
    image_url: details?.image_url || fallback.imageUrl || "",
    retention_options: details?.retention_options,
    extractions: details?.extractions,
    has_retention: details?.has_retention,
    has_variation: details?.has_variation,
    variations: details?.variations,
  };
}

export function useCaseWizardSession({
  fetchProductDetails,
  bootstrap,
}: UseCaseWizardSessionParams) {
  const [wizardComplete, setWizardComplete] = useState(false);
  const [completedDoctor, setCompletedDoctor] = useState<WizardDoctorShape | null>(null);
  const [completedLab, setCompletedLab] = useState<WizardLabShape | null>(null);
  const [completedPatientName, setCompletedPatientName] = useState("");
  const [completedGender, setCompletedGender] = useState("");
  const [completedAge, setCompletedAge] = useState("");
  const [labEditMode, setLabEditMode] = useState(false);
  const [doctorEditModalOpen, setDoctorEditModalOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [wizardMode, setWizardMode] = useState<WizardMode>("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [inlineAddProductArch, setInlineAddProductArch] = useState<
    "maxillary" | "mandibular" | null
  >(null);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);
  const [selectedProductCategoryName, setSelectedProductCategoryName] = useState<string | undefined>(undefined);
  const [initialArch, setInitialArch] = useState<"maxillary" | "mandibular" | "both" | undefined>(undefined);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<number | null>(null);
  const [lastSelectedSubProduct, setLastSelectedSubProduct] = useState<number | null>(null);
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);
  const [caseDesignMounted, setCaseDesignMounted] = useState(false);
  const wizardCompletingRef = useRef(false);
  const [demographicModalOpen, setDemographicModalOpen] = useState(false);
  const [pendingDemographicDetails, setPendingDemographicDetails] = useState<CaseDesignProductDetails | null>(null);
  const [pendingInlineAdd, setPendingInlineAdd] = useState<{
    category?: string;
    categoryName?: string;
    product?: string;
    material: string;
    materialName?: string;
    arch: "maxillary" | "mandibular";
  } | null>(null);
  const [pendingWizardResult, setPendingWizardResult] = useState<any | null>(null);

  useEffect(() => {
    const currentRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setRole(currentRole);
    localStorage.removeItem("cdc_added_products");
  }, []);

  useEffect(() => {
    if (!bootstrap) return;
    setCompletedDoctor(bootstrap.doctor);
    setCompletedLab(bootstrap.lab);
    setCompletedPatientName(bootstrap.patientName);
    setCompletedGender(bootstrap.gender);
    setCompletedAge(bootstrap.age);
    setAddedProducts(bootstrap.addedProducts);
    if (bootstrap.initialArch) setInitialArch(bootstrap.initialArch);
    setLabEditMode(false);
    setDoctorEditModalOpen(false);
    setWizardComplete(true);
    setCaseDesignMounted(true);
  }, [bootstrap]);

  const customerId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("customerId");
    return stored ? Number(stored) : null;
  }, []);

  const officeIdForDoctors = useMemo(() => {
    const bootstrapOfficeId = bootstrap?.officeId;
    if (typeof bootstrapOfficeId === "number" && bootstrapOfficeId > 0) {
      return bootstrapOfficeId;
    }
    if (role === "office_admin" && customerId != null) return customerId;
    if (role === "lab_admin" && completedLab?.id != null) return completedLab.id;
    return undefined;
  }, [bootstrap?.officeId, role, customerId, completedLab?.id]);

  const { data: officeDoctorsRaw = [], isSuccess: doctorsLoaded, isLoading: doctorsLoading, error: doctorsError } = useOfficeDoctors(officeIdForDoctors);
  const canEditDoctor = doctorsLoaded && officeDoctorsRaw.length > 1;
  const doctorsForPicker = useMemo(
    () => mapOfficeDoctorsToWizardShape(officeDoctorsRaw as { id: number; first_name?: string; last_name?: string; image?: string; profile_image?: string }[]),
    [officeDoctorsRaw]
  );

  const applyWizardComplete = async (result: any) => {
    if (result.category) setLastSelectedCategory(Number(result.category) || null);
    if (result.product) setLastSelectedSubProduct(Number(result.product) || null);

    if (wizardMode === "addProduct") {
      const addedProductId = Number(result.material) || undefined;
      const details = addedProductId
        ? await fetchProductDetails(addedProductId, completedLab?.id)
        : null;
      const categoryName = details?.category_name || result.categoryName || "";
      setAddedProducts((prev) => {
        const newProduct: AddedProduct = {
          id: nextAddedProductCardId(prev),
          productId: addedProductId,
          product: buildAddedProductStub(details, {
            name: result.product || "Untitled Product",
            categoryName,
            subcategoryName: details?.subcategory_name,
            subcategoryId: Number(result.product) || undefined,
            imageUrl: details?.image_url ?? undefined,
          }),
          arch: pendingProductArch,
          expanded: true,
        };
        return [newProduct, ...prev.map((product) => ({ ...product, expanded: false }))];
      });
      setWizardMode("initial");
      setWizardComplete(true);
      return;
    }

    const productId = Number(result.material);
    if (productId) {
      setSelectedProductId(productId);
      if (result.categoryName) setSelectedProductCategoryName(result.categoryName);
      if (result.materialName) setSelectedProductName(result.materialName);
    } else {
      setSelectedProductCategoryName(undefined);
    }
    if (wizardMode !== "backToProducts") {
      setCompletedDoctor(result?.doctor ?? null);
      setCompletedLab(result?.lab ?? null);
      setCompletedPatientName(result?.patientName ?? "");
      setCompletedGender(result?.gender ?? "");
      setCompletedAge(result?.age ?? "");
    }
    if (result?.arch) setInitialArch(result.arch);
    setLabEditMode(false);
    setDoctorEditModalOpen(false);
    setWizardComplete(true);
    setCaseDesignMounted(true);
  };

  const handleWizardComplete = async (result: any) => {
    if (wizardCompletingRef.current) return;
    wizardCompletingRef.current = true;
    try {
      const productId = Number(result.material);
      const labId = result.lab?.id ?? completedLab?.id;
      if (productId) {
        const details = await fetchProductDetails(productId, labId);
        const resultGender = result.gender ?? completedGender;
        const resultAge = result.age ?? completedAge;
        if (hasPendingDemographics(details, resultGender, resultAge)) {
          setPendingDemographicDetails(details);
          setPendingWizardResult(result);
          setPendingInlineAdd(null);
          setDemographicModalOpen(true);
          return;
        }
      }
      await applyWizardComplete(result);
    } finally {
      wizardCompletingRef.current = false;
    }
  };

  const handleAddProduct = (arch: "maxillary" | "mandibular") => {
    if (
      isArchAtProductLimit(arch, {
        initialArch,
        selectedProductId,
        addedProducts,
      })
    ) {
      return;
    }
    setInlineAddProductArch(arch);
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

  const completeInlineAddProduct = async (result: {
    category?: string;
    categoryName?: string;
    product?: string;
    material: string;
    materialName?: string;
    arch: "maxillary" | "mandibular";
  }) => {
    if (wizardCompletingRef.current) return;
    wizardCompletingRef.current = true;
    try {
      const addedProductId = Number(result.material) || undefined;
      const details = addedProductId
        ? await fetchProductDetails(addedProductId, completedLab?.id)
        : null;

      if (hasPendingDemographics(details, completedGender, completedAge)) {
        setPendingDemographicDetails(details);
        setPendingInlineAdd(result);
        setDemographicModalOpen(true);
        return;
      }

      if (result.category) setLastSelectedCategory(Number(result.category) || null);
      if (result.product) setLastSelectedSubProduct(Number(result.product) || null);

      const categoryName = details?.category_name || result.categoryName || "";
      const arch = result.arch;
      setAddedProducts((prev) => {
        const newProduct: AddedProduct = {
          id: nextAddedProductCardId(prev),
          productId: addedProductId,
          product: buildAddedProductStub(details, {
            name: result.materialName || "Untitled Product",
            categoryName,
            subcategoryName: details?.subcategory_name,
            subcategoryId: Number(result.product) || undefined,
            imageUrl: details?.image_url ?? undefined,
          }),
          arch,
          expanded: true,
        };
        return [
          newProduct,
          ...prev.map((product) => ({ ...product, expanded: false })),
        ];
      });
      setInlineAddProductArch(null);
    } finally {
      wizardCompletingRef.current = false;
    }
  };

  const commitPendingInlineAdd = async (
    result: NonNullable<typeof pendingInlineAdd>,
    demographics: { gender: string; age: string },
  ) => {
    setCompletedGender(demographics.gender);
    setCompletedAge(demographics.age);
    const addedProductId = Number(result.material) || undefined;
    const details = addedProductId
      ? await fetchProductDetails(addedProductId, completedLab?.id)
      : null;
    if (result.category) setLastSelectedCategory(Number(result.category) || null);
    if (result.product) setLastSelectedSubProduct(Number(result.product) || null);
    const categoryName = details?.category_name || result.categoryName || "";
    setAddedProducts((prev) => {
      const newProduct: AddedProduct = {
        id: nextAddedProductCardId(prev),
        productId: addedProductId,
        product: buildAddedProductStub(details, {
          name: result.materialName || "Untitled Product",
          categoryName,
          subcategoryName: details?.subcategory_name,
          subcategoryId: Number(result.product) || undefined,
          imageUrl: details?.image_url ?? undefined,
        }),
        arch: result.arch,
        expanded: true,
      };
      return [newProduct, ...prev.map((product) => ({ ...product, expanded: false }))];
    });
    setInlineAddProductArch(null);
  };

  const handleDemographicConfirm = async (values: { gender: string; age: string }) => {
    setDemographicModalOpen(false);
    setCompletedGender(values.gender);
    setCompletedAge(values.age);

    const inline = pendingInlineAdd;
    const wizardResult = pendingWizardResult;
    setPendingInlineAdd(null);
    setPendingWizardResult(null);
    setPendingDemographicDetails(null);

    if (inline) {
      await commitPendingInlineAdd(inline, values);
      return;
    }

    if (wizardResult) {
      wizardCompletingRef.current = true;
      try {
        await applyWizardComplete({ ...wizardResult, gender: values.gender, age: values.age });
      } finally {
        wizardCompletingRef.current = false;
      }
    }
  };

  const handleDemographicCancel = () => {
    setDemographicModalOpen(false);
    setPendingInlineAdd(null);
    setPendingWizardResult(null);
    setPendingDemographicDetails(null);
  };

  const cancelInlineAddProduct = () => {
    setInlineAddProductArch(null);
  };

  const handleTopBarEditLab = () => {
    setWizardMode("initial");
    setLabEditMode(true);
    setDoctorEditModalOpen(false);
    setWizardComplete(false);
    setWizardKey((key) => key + 1);
  };

  const handleEditDoctor = () => {
    if (!canEditDoctor) return;
    setDoctorEditModalOpen(true);
  };

  const handleDoctorEditClose = () => {
    setDoctorEditModalOpen(false);
  };

  const handleDoctorEditSelect = (doctor: WizardDoctorShape) => {
    setCompletedDoctor(doctor);
    setDoctorEditModalOpen(false);
  };

  const handleEditDone = () => {
    setLabEditMode(false);
    setWizardComplete(true);
  };

  const wizardStartStep = wizardMode === "backToProducts"
    ? 6
    : wizardMode === "addProduct"
      ? 4
      : labEditMode
        ? (role === "office_admin" ? 2 : 1)
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
    inlineAddProductArch,
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
    demographicModalOpen,
    pendingDemographicDetails,
    handleDemographicConfirm,
    handleDemographicCancel,
  };
}
