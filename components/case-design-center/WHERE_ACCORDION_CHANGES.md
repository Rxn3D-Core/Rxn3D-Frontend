# Where the "2 types of product accordion" changes are

## What the previous session intended

- **Fixed Restoration** category → detailed accordion (implant details with CardSelectorField + CardGallery, implant inclusions, abutment, stage, shades, characterization, margins, etc. — all at once).
- **Other categories** → progressive step-by-step accordion (Grade → Stage → Teeth Shade → Gum Shade → Impression → Add-ons).

## What actually exists in the codebase today

### Implemented

| Location | What's there |
|----------|--------------|
| **MandibularPanel.tsx** | Category/subcategory in accordion header (lines 306–307, 385–392). Tooth field progress props. Single accordion body: ImplantDetailSection when retention is Implant, then progressive steps (Grade, Stage, …). **No** `if (Fixed Restoration)` branch. |
| **MaxillaryPanel.tsx** | Same: category/subcategory in header (347–348, 426–434), tooth field progress props, single accordion body (progressive + ImplantDetailSection for Implant). **No** implant detail props (right1Brand, right1Platform, activeCardType). **No** Fixed Restoration branch. |
| **CaseDesignCenter.tsx** | Passes tooth field progress to both panels. Passes **no** right1Brand, right1Platform, activeCardType, etc. to MaxillaryPanel. Uses right1Brand/right1Platform only for **CaseSummaryNotes** (lines 163–166). |
| **CaseDesignProps / types** | right1Brand, setRight1Brand, right1Platform, setRight1Platform (and right2*) come from **parent props**; useCaseDesignState spreads `...props` so `state.right1Brand` etc. exist. |
| **useImplantState.ts** | activeCardType, right1Inclusion, right1InclusionQty, right2* — **no** right1Brand/right1Platform (those are from props). |

### Not implemented (missing from the “2 accordion types” plan)

1. **Category-based branching**  
   Neither panel has:
   - `const isFixedRestoration = categoryName === "Fixed Restoration";`
   - A branch that renders the **detailed** accordion for Fixed Restoration and the **progressive** accordion for other categories.

2. **Implant props to MaxillaryPanel**  
   MaxillaryPanel does **not** receive or use:
   - right1Brand, setRight1Brand, right1Platform, setRight1Platform  
   - right1Inclusion, setRight1Inclusion, right1InclusionQty, setRight1InclusionQty  
   - activeCardType, setActiveCardType  

3. **Fixed Restoration detailed accordion block**  
   The full block from CaseDesignCenterNew (Implant Detail fieldset with CardSelectorField + CardGallery, ImplantInclusionsField, SelectField for size/abutment, stage, stump shade, cervical/incisal/body shades, characterization, margins, impression, add-ons, action buttons) is **not** rendered in CaseDesignCenter’s MaxillaryPanel or MandibularPanel. Only **CaseDesignCenterNew.tsx** (and test page) has that UI.

## Reference implementation

- **CaseDesignCenterNew.tsx** (e.g. lines 1800–1902, 1816–1873): has the Fixed Restoration–style implant detail UI (CardSelectorField, CardGallery, SelectField, ImplantInclusionsField) and the layout (tooth # left, form right).
- **ImplantDetailSection.tsx**: already refactored to use that same UI (CardSelectorField, CardGallery, SelectField, ImplantInclusionsField); used when retention is **Implant** inside the **progressive** accordion.

## Summary

The “2 types of product accordion” logic (branch on category, detailed vs progressive) was **not** fully applied in CaseDesignCenter/MaxillaryPanel/MandibularPanel. Only the progressive accordion plus ImplantDetailSection for Implant teeth exists there. To match the previous plan you need to add the category check and the Fixed Restoration detailed accordion (and pass implant props to MaxillaryPanel where that UI lives).
