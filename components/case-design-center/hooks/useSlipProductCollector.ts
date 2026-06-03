import { useCallback, useEffect } from "react";
import { hasRetentionOptions } from "../utils/categoryHelpers";
import { useCaseDesignState } from "./useCaseDesignState";
import type { CaseDesignProps, SlipProductSnapshot } from "../types";

type CaseDesignState = ReturnType<typeof useCaseDesignState>;

interface UseSlipProductCollectorParams {
  state: CaseDesignState;
  props: CaseDesignProps;
  maxillaryImplantDetail: Record<number, import("../components/ImplantDetailSection").ImplantDetailData>;
  mandibularImplantDetail: Record<number, import("../components/ImplantDetailSection").ImplantDetailData>;
}

export function useSlipProductCollector({
  state,
  props,
  maxillaryImplantDetail,
  mandibularImplantDetail,
}: UseSlipProductCollectorParams) {
  const collectSlipProducts = useCallback((): SlipProductSnapshot[] => {
    const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
    const snapshots: SlipProductSnapshot[] = [];
    const getOpposingArch = (arch: "maxillary" | "mandibular") =>
      arch === "maxillary" ? "mandibular" : "maxillary";
    const getOpposingArchTeeth = (arch: "maxillary" | "mandibular") =>
      arch === "maxillary" ? MANDIBULAR_ALL : MAXILLARY_ALL;

    const processArch = (arch: "maxillary" | "mandibular", type: "Upper" | "Lower", allTeeth: number[]) => {
      const cardGroups = new Map<number, number[]>();
      for (const tn of allTeeth) {
        if (!state.getToothProduct(arch, tn) && !state.maxillaryTeeth.includes(tn) && !state.mandibularTeeth?.includes(tn)) {
          const hasRetention = arch === "maxillary"
            ? Object.prototype.hasOwnProperty.call(state.maxillaryRetentionTypes, tn)
            : Object.prototype.hasOwnProperty.call(state.mandibularRetentionTypes || {}, tn);
          if (!hasRetention) continue;
        }

        const cardId = state.getToothProductCard(arch, tn);
        const toothProduct = state.getToothProduct(arch, tn);
        const isInRetentionTypes = arch === "maxillary"
          ? Object.prototype.hasOwnProperty.call(state.maxillaryRetentionTypes, tn)
          : Object.prototype.hasOwnProperty.call(state.mandibularRetentionTypes || {}, tn);
        const isInRemovables = arch === "maxillary"
          ? state.maxillaryTeeth.includes(tn)
          : (state.mandibularTeeth ?? []).includes(tn);
        if (!toothProduct && !isInRetentionTypes && !isInRemovables) continue;
        if (toothProduct && !isInRetentionTypes && !isInRemovables) continue;
        const existing = cardGroups.get(cardId);
        if (existing) existing.push(tn);
        else cardGroups.set(cardId, [tn]);
      }

      const HEADER_EXTRACTION_CODES = new Set(["MT", "WED", "WEOD", "FR", "CTS"]);
      const extractionMap = arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap;

      cardGroups.forEach((teethNums, cardId) => {
        const sortedTeeth = [...teethNums].sort((a, b) => a - b);
        const repTooth = sortedTeeth.find((tn) => !!state.getToothProduct(arch, tn)) ?? sortedTeeth[0];
        const productApiData = state.getToothProduct(arch, repTooth);
        const productId = productApiData?.id
          ?? (props.addedProducts?.find((ap) => ap.id === cardId)?.productId)
          ?? props.selectedProductId
          ?? 0;

        const fieldValues: Record<string, string> = {};
        const allSteps = [
          "grade", "stage", "teeth_shade", "gum_shade", "impression", "addons",
          "material", "retention", "retention_option",
          "fixed_stage", "fixed_stump_shade", "fixed_shade_trio", "fixed_characterization",
          "fixed_contact_icons", "fixed_margin", "fixed_metal", "fixed_proximal_contact",
          "fixed_impression", "fixed_addons", "fixed_notes", "fixed_retention_type",
        ] as const;
        for (const step of allSteps) {
          const val = state.getFieldValue(arch, repTooth, step as any);
          if (val) fieldValues[step] = val;
        }

        const isFixed = hasRetentionOptions(productApiData);
        const stageKey = isFixed ? `${arch}_fixed_${repTooth}` : `${arch}_prep_${repTooth}`;
        const stageName = state.selectedStages?.[stageKey] ?? fieldValues["stage"] ?? fieldValues["fixed_stage"] ?? null;

        const filteredByExtraction = sortedTeeth.filter((tn) => {
          const code = extractionMap?.[tn];
          return code && HEADER_EXTRACTION_CODES.has(code);
        });
        const teethSelection = filteredByExtraction.length > 0 ? filteredByExtraction : sortedTeeth;

        const catalog = productApiData?.impressions ?? [];
        const resolveImpressionCode = (entryCode: string) => {
          const match = catalog.find((i) => i.code === entryCode);
          return match?.code ?? entryCode;
        };

        const impressions: Record<string, number> = {};
        if (productApiData?.has_impression === "Yes") {
          const archEntries = state.selectedImpressions?.[arch] ?? [];
          for (const entry of archEntries) {
            if (entry.qty <= 0) continue;
            impressions[resolveImpressionCode(entry.code)] = entry.qty;
          }
        }

        const oppositeImpressions: Record<string, number> = {};
        if (productApiData?.opposite_impression === "Yes") {
          const opposingArch = getOpposingArch(arch);
          const opposingEntries = state.selectedImpressions?.[opposingArch] ?? [];
          for (const entry of opposingEntries) {
            if (entry.qty <= 0) continue;
            const code = resolveImpressionCode(entry.code);
            oppositeImpressions[code] = entry.qty;
          }
        }

        const rushKey = `${arch}_${cardId}`;
        const rush = state.rushedProducts?.[rushKey] ?? null;

        const retentionTypesByTooth =
          arch === "maxillary"
            ? Object.fromEntries(
                sortedTeeth
                  .filter((tn) => state.maxillaryRetentionTypes[tn]?.length)
                  .map((tn) => [tn, [...(state.maxillaryRetentionTypes[tn] ?? [])]])
              )
            : Object.fromEntries(
                sortedTeeth
                  .filter((tn) => (state.mandibularRetentionTypes?.[tn] ?? []).length)
                  .map((tn) => [tn, [...(state.mandibularRetentionTypes?.[tn] ?? [])]])
              );

        const claspTeeth =
          arch === "maxillary" ? state.maxillaryClaspTeeth : state.mandibularClaspTeeth ?? [];

        let oppositeExtractions: Array<{ extraction_id: number; teeth_numbers: number[] }> | undefined;
        if (
          Object.keys(state.opposingToothExtractionMap).length > 0 &&
          productApiData?.opposite_extractions?.length
        ) {
          const grouped = new Map<string, number[]>();
          Object.entries(state.opposingToothExtractionMap).forEach(([tn, code]) => {
            const existing = grouped.get(code);
            if (existing) existing.push(Number(tn));
            else grouped.set(code, [Number(tn)]);
          });
          oppositeExtractions = Array.from(grouped.entries()).map(([code, toothNums]) => {
            const opExt = productApiData.opposite_extractions!.find((e: any) => e.code === code);
            const extraction_id =
              (opExt as { extraction_id?: number })?.extraction_id ?? opExt?.id ?? 0;
            return { extraction_id, teeth_numbers: toothNums.sort((a, b) => a - b) };
          }).filter((entry) => entry.extraction_id !== 0);
        } else if (productApiData?.opposite_extractions?.length) {
          const defaultOpposingExtraction = productApiData.opposite_extractions.find(
            (ext) => String((ext as { is_default?: string })?.is_default ?? "").trim().toLowerCase() === "yes"
          );
          const defaultExtractionId = Number(
            (defaultOpposingExtraction as { extraction_id?: number })?.extraction_id ??
              defaultOpposingExtraction?.id ??
              0
          );
          if (defaultExtractionId > 0) {
            const opposingArch = getOpposingArch(arch);
            const defaultTeeth =
              state.opposingSelectedTeeth.length > 0
                ? state.opposingSelectedTeeth
                : getOpposingArchTeeth(opposingArch);
            oppositeExtractions = [
              {
                extraction_id: defaultExtractionId,
                teeth_numbers: [...defaultTeeth].sort((a, b) => a - b),
              },
            ];
          }
        }

        const implantDetailMap = arch === "maxillary" ? maxillaryImplantDetail : mandibularImplantDetail;
        const relevantImplantDetail: Record<number, import("../components/ImplantDetailSection").ImplantDetailData> = {};
        for (const tn of teethSelection) {
          const detail = implantDetailMap[tn];
          if (detail && (detail.brand || detail.platform || detail.size)) {
            relevantImplantDetail[tn] = detail;
          }
        }
        const hasImplantDetail = Object.keys(relevantImplantDetail).length > 0;

        snapshots.push({
          type,
          productId,
          productApiData: productApiData ?? null,
          teethNumbers: teethSelection,
          allCardTeeth: sortedTeeth,
          repToothNumber: repTooth,
          fieldValues,
          stageName,
          impressions,
          ...(Object.keys(oppositeImpressions).length > 0 ? { oppositeImpressions } : {}),
          rush,
          cardId,
          toothExtractionMap: { ...(extractionMap ?? {}) },
          claspTeeth: claspTeeth.filter((tn) => sortedTeeth.includes(tn)),
          retentionTypesByTooth,
          selectedShades: { ...(state.selectedShades ?? {}) },
          shadeGuide: state.selectedShadeGuide ?? "Vita Classical",
          ...(oppositeExtractions ? { oppositeExtractions } : {}),
          ...(hasImplantDetail ? { implantDetailByTooth: relevantImplantDetail } : {}),
          selectedAddonsByTooth: { ...(state.selectedAddonsByTooth ?? {}) },
        });
      });
    };

    processArch("maxillary", "Upper", MAXILLARY_ALL);
    processArch("mandibular", "Lower", MANDIBULAR_ALL);

    return snapshots;
  }, [
    mandibularImplantDetail,
    maxillaryImplantDetail,
    props.addedProducts,
    props.selectedProductId,
    state.getFieldValue,
    state.getToothProduct,
    state.getToothProductCard,
    state.mandibularClaspTeeth,
    state.mandibularRetentionTypes,
    state.mandibularTeeth,
    state.mandibularToothExtractionMap,
    state.maxillaryClaspTeeth,
    state.maxillaryRetentionTypes,
    state.maxillaryTeeth,
    state.maxillaryToothExtractionMap,
    state.opposingToothExtractionMap,
    state.rushedProducts,
    state.selectedAddonsByTooth,
    state.selectedImpressions,
    state.selectedShadeGuide,
    state.selectedShades,
    state.selectedStages,
  ]);

  useEffect(() => {
    if (props.slipCollectorRef) {
      props.slipCollectorRef.current = collectSlipProducts;
    }
  });

  return { collectSlipProducts };
}
