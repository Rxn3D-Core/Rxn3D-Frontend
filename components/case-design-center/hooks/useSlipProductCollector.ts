import { useCallback, useEffect } from "react";
import type React from "react";
import {
  hasRetentionOptions,
  parseStageFieldValue,
  parseStageDisplayName,
  resolveStageIdFromSelection,
} from "../utils/categoryHelpers";
import { resolveEnrichedProductForSubmit } from "../utils/gradeHelpers";
import {
  resolveAddedCardProductData,
  resolveCardFieldValue,
} from "../utils/resolveAddedCardProduct";
import { getRushFromStore } from "../utils/rushModalContext";
import {
  buildExtractionScopeTeeth,
  resolveProductTeethForSlipSubmit,
} from "../utils/removableToothDisplay";
import { splintKeyForProductCard, deriveWingTeeth } from "../utils/splintHelpers";
import { useCaseDesignState } from "./useCaseDesignState";
import type { CaseDesignProps, SlipProductSnapshot } from "../types";

type CaseDesignState = ReturnType<typeof useCaseDesignState>;

interface UseSlipProductCollectorParams {
  state: CaseDesignState;
  props: CaseDesignProps;
  maxillaryImplantDetail: Record<number, import("../components/ImplantDetailSection").ImplantDetailData>;
  mandibularImplantDetail: Record<number, import("../components/ImplantDetailSection").ImplantDetailData>;
  maxillarySplintLinksRef: React.MutableRefObject<Record<string, number[]>>;
  mandibularSplintLinksRef: React.MutableRefObject<Record<string, number[]>>;
}

export function useSlipProductCollector({
  state,
  props,
  maxillaryImplantDetail,
  mandibularImplantDetail,
  maxillarySplintLinksRef,
  mandibularSplintLinksRef,
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

      const extractionMap = arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap;
      const noActiveBoxTeeth =
        arch === "maxillary"
          ? state.maxillaryNoActiveBoxTeeth
          : state.mandibularNoActiveBoxTeeth ?? [];
      const archClaspTeeth =
        arch === "maxillary" ? state.maxillaryClaspTeeth : state.mandibularClaspTeeth ?? [];

      cardGroups.forEach((teethNums, cardId) => {
        const sortedTeeth = [...teethNums].sort((a, b) => a - b);
        const repTooth = sortedTeeth.find((tn) => !!state.getToothProduct(arch, tn)) ?? sortedTeeth[0];
        const stubProduct =
          props.addedProducts?.find((ap) => ap.id === cardId)?.product ?? null;
        const productApiData = resolveAddedCardProductData(
          arch,
          cardId,
          sortedTeeth,
          state.getToothProduct,
          stubProduct
        );
        const allCardTeethOnArch = allTeeth.filter(
          (tn) => state.getToothProductCard(arch, tn) === cardId
        );
        const fieldScanTeeth = [
          ...new Set([...sortedTeeth, ...allCardTeethOnArch]),
        ].sort((a, b) => a - b);
        const productForSubmit =
          resolveEnrichedProductForSubmit(
            productApiData,
            arch,
            state.getToothProduct,
            stubProduct
          ) ?? productApiData;
        const productId = productApiData?.id
          ?? (props.addedProducts?.find((ap) => ap.id === cardId)?.productId)
          ?? props.selectedProductId
          ?? 0;
        const isRemovable = !hasRetentionOptions(productApiData);
        const archSelectedTeeth =
          arch === "maxillary" ? state.maxillaryTeeth : state.mandibularTeeth ?? [];
        const cardScopedSelected = archSelectedTeeth.filter(
          (tn) => state.getToothProductCard(arch, tn) === cardId
        );
        const productTeeth = resolveProductTeethForSlipSubmit({
          isRemovable,
          cardTeeth:
            isRemovable && cardScopedSelected.length > 0
              ? cardScopedSelected
              : sortedTeeth,
          toothExtractionMap: extractionMap ?? {},
          claspTeeth: archClaspTeeth,
          noActiveBoxTeeth,
          extractions: productApiData?.extractions,
        });
        const extractionScopeTeeth = buildExtractionScopeTeeth(
          sortedTeeth,
          extractionMap ?? {},
          archClaspTeeth,
          allTeeth
        );

        const fieldValues: Record<string, string> = {};
        const allSteps = [
          "grade", "stage", "teeth_shade", "gum_shade", "impression", "addons",
          "material", "retention", "retention_option",
          "fixed_stage", "fixed_stump_shade", "fixed_shade_trio", "fixed_characterization",
          "fixed_contact_icons", "fixed_margin", "fixed_metal", "fixed_proximal_contact",
          "fixed_impression", "fixed_addons", "fixed_notes", "fixed_retention_type",
        ] as const;
        for (const step of allSteps) {
          const val = resolveCardFieldValue(
            arch,
            cardId,
            fieldScanTeeth,
            repTooth,
            step as any,
            state.getFieldValue
          );
          if (val) fieldValues[step] = val;
        }

        const isFixed = hasRetentionOptions(productApiData);
        const stageKey = isFixed ? `${arch}_fixed_${repTooth}` : `${arch}_prep_${repTooth}`;
        const stageRaw = fieldValues["stage"] ?? fieldValues["fixed_stage"] ?? null;
        const parsedStage = parseStageFieldValue(stageRaw);
        const stageKeyCandidates = new Set<string>([
          stageKey,
          `${arch}_prep_${repTooth}`,
          `${arch}_fixed_${repTooth}`,
          ...fieldScanTeeth.map((tn) => `${arch}_prep_${tn}`),
          ...fieldScanTeeth.map((tn) => `${arch}_fixed_${tn}`),
        ]);
        let stageName: string | null = null;
        for (const key of stageKeyCandidates) {
          const fromStore = state.selectedStages?.[key];
          if (fromStore?.trim()) {
            stageName = fromStore;
            break;
          }
        }
        if (!stageName) {
          stageName =
            parsedStage?.name ??
            (stageRaw && !stageRaw.trim().startsWith("{")
              ? parseStageDisplayName(stageRaw)
              : null);
        }
        const stageId = resolveStageIdFromSelection(
          productForSubmit,
          stageRaw,
          stageName
        );

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

        const isFixedProduct = hasRetentionOptions(productApiData);
        const rush =
          getRushFromStore(
            state.rushedProducts,
            arch,
            cardId,
            repTooth,
            isFixedProduct
          ) ?? null;

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
        for (const tn of productTeeth) {
          const detail = implantDetailMap[tn];
          if (detail && (detail.brand || detail.platform || detail.size)) {
            relevantImplantDetail[tn] = detail;
          }
        }
        const hasImplantDetail = Object.keys(relevantImplantDetail).length > 0;

        const splintLinksByKey =
          arch === "maxillary"
            ? maxillarySplintLinksRef.current
            : mandibularSplintLinksRef.current;
        const splintKey = splintKeyForProductCard(cardId, productId);
        // Effective splint links (auto-derived + manual overlay) come from the panel.
        const splintLinks = splintLinksByKey[splintKey] ?? [];

        // Wing retainers (Maryland / cantilever): derived from this product's pontics
        // whose arch neighbor is empty. Uses the arch-wide retention map so a neighbor
        // owned by another product is not mistaken for an empty (wing) position.
        const archRetentionTypes =
          arch === "maxillary"
            ? state.maxillaryRetentionTypes
            : state.mandibularRetentionTypes ?? {};
        const productPonticTeeth = productTeeth.filter(
          (tn) => (archRetentionTypes?.[tn] ?? [])[0] === "Pontic"
        );
        // Wing teeth = the empty abutment neighbors only (not the pontic), as a string.
        const wingTeeth =
          productPonticTeeth.length > 0
            ? deriveWingTeeth(archRetentionTypes ?? {}, allTeeth, productPonticTeeth).join(",")
            : "";

        snapshots.push({
          type,
          productId,
          productApiData: productForSubmit ?? productApiData ?? null,
          cardFieldTeeth: fieldScanTeeth,
          teethNumbers: productTeeth,
          allCardTeeth: extractionScopeTeeth,
          repToothNumber: repTooth,
          fieldValues,
          stageName,
          ...(stageId && stageId > 0 ? { stageId } : {}),
          impressions,
          ...(Object.keys(oppositeImpressions).length > 0 ? { oppositeImpressions } : {}),
          rush,
          cardId,
          toothExtractionMap: { ...(extractionMap ?? {}) },
          claspTeeth: archClaspTeeth.filter((tn) => extractionScopeTeeth.includes(tn)),
          retentionTypesByTooth,
          selectedShades: { ...(state.selectedShades ?? {}) },
          shadeGuide: state.selectedShadeGuide ?? "Vita Classical",
          ...(oppositeExtractions ? { oppositeExtractions } : {}),
          ...(hasImplantDetail ? { implantDetailByTooth: relevantImplantDetail } : {}),
          selectedAddonsByTooth: { ...(state.selectedAddonsByTooth ?? {}) },
          ...(splintLinks.length > 0 ? { splintLinks } : {}),
          ...(wingTeeth ? { wingTeeth } : {}),
        });
      });
    };

    processArch("maxillary", "Upper", MAXILLARY_ALL);
    processArch("mandibular", "Lower", MANDIBULAR_ALL);

    return snapshots;
  }, [
    mandibularImplantDetail,
    mandibularSplintLinksRef,
    maxillaryImplantDetail,
    maxillarySplintLinksRef,
    props.addedProducts,
    props.selectedProductId,
    state.getFieldValue,
    state.getToothProduct,
    state.getToothProductCard,
    state.mandibularClaspTeeth,
    state.mandibularNoActiveBoxTeeth,
    state.mandibularRetentionTypes,
    state.mandibularTeeth,
    state.mandibularToothExtractionMap,
    state.maxillaryClaspTeeth,
    state.maxillaryNoActiveBoxTeeth,
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
