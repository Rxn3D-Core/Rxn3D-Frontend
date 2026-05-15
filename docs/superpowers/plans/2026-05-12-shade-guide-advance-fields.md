# Shade Guide Advance Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support product `advance_fields` with `field_type === "shade_guide"` as named shade selections in the shade picker and fixed-restoration accordion.

**Architecture:** Extend the existing shade-selection state so one product can track multiple named shade-guide fields, while keeping backward compatibility for the current `tooth_shade` and `stump_shade` callers. Reuse that shared state in `ShadeSelectionGuide`, fixed-restoration rendering, and case-submission payload building so the same selected shade value drives UI, progress, and submit data.

**Tech Stack:** Next.js, React, TypeScript

---

### Task 1: Add reusable shade-guide advance-field helpers

**Files:**
- Create: `components/case-design-center/utils/shadeGuideAdvanceFields.ts`
- Modify: `components/case-design-center/types.ts`

- [ ] Define filtered/sorted helpers for `shade_guide` advance fields only.
- [ ] Add state typing needed to carry an optional active advance-field id/name.

### Task 2: Extend shared shade-selection state

**Files:**
- Modify: `components/case-design-center/hooks/useShadeSelection.ts`
- Modify: `components/case-design-center/hooks/useCaseDesignState.ts`

- [ ] Add a per-field shade key format that still supports current stump/tooth calls.
- [ ] Allow shade field clicks to open the guide for a specific advance field.
- [ ] Ensure fixed-restoration completion still advances after the correct field is selected.

### Task 3: Render named shade-guide fields in the selector and accordion

**Files:**
- Modify: `components/case-design-center/components/ShadeSelectionGuide.tsx`
- Modify: `components/case-design-center/components/FixedRestorationFields.tsx`
- Modify: `components/case-design-center/components/MaxillaryPanel.tsx`
- Modify: `components/case-design-center/components/MandibularPanel.tsx`
- Modify: `components/case-design-center/components/CaseDesignCenter.tsx`

- [ ] Show only `shade_guide` advance fields in the shade guide summary.
- [ ] Use the active field label in the picker prompt.
- [ ] Render the same named fields as regular accordion fields that reopen the picker on click.
- [ ] Update incomplete-gating logic to require the relevant named shade-guide fields.

### Task 4: Submit named shade-guide selections

**Files:**
- Modify: `components/case-design-center/utils/caseSubmissionPayload.ts`

- [ ] Map each `shade_guide` advance field to its selected shade value on submit.
- [ ] Keep existing implant and non-shade fixed-field payload behavior intact.

### Task 5: Verify

**Files:**
- Modify: none

- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run lint` if the repo’s current lint baseline allows it.
