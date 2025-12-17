# RXN3D Design System - Complete Specifications

## Floating Label Pattern - NEW IMPLEMENTATION

The floating label now uses the **exact pattern** from the design guidelines where the label appears **above** the input border (not inside) when the input has a value.

### Visual Behavior

```
Stage 1: Empty Input
┌─────────────────────────────────┐
│ Insert patient name             │ ← Placeholder inside
└─────────────────────────────────┘

Stage 2: On Focus
   Insert patient name              ← Label moves up (-8px)
┌─────────────────────────────────┐
│                                 │ ← Blue border
└─────────────────────────────────┘

Stage 3: With Value
   John Smith                       ← Label stays floating (green)
┌─────────────────────────────────┐
│ John Smith                      │ ← Green border + checkmark
└─────────────────────────────────┘
```

### Implementation Details

**Label Positioning:**
- Position: `absolute top: -8px left: 12px`
- Background: `white` (prevents overlap with border)
- Padding: `0 4px` (creates white strip)
- Font size: `12px`
- Animation: `200ms ease-out`
- Z-index: `10` (above border)

**Input Measurements:**
- Height: `48px` (h-12)
- Padding: `16px` (px-4) horizontal, `12px` (py-3) vertical
- Text size: `16px`
- Border: `2px solid` (border-2)
- Border radius: `8px` (rounded-lg)

---

## Color Tokens

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#1162A8` | Focus state, selected borders |
| Success Green | `#119933` | Valid/Active/Connected states |
| Warning Orange | `#FF9900` | Pending/Needs Action states |
| Error Red | `#CF0202` | Invalid/Error states |
| Neutral Gray | `#E0E0E0` | Default borders |
| Disabled Gray | `#BDBDBD` | Disabled state |
| Background | `#F9FAFB` | Page backgrounds |

---

## Animation Timings

All animations follow these exact specifications:

| Animation | Duration | Easing | Opacity |
|-----------|----------|--------|---------|
| **Hover Glow** | 150ms | ease-out | 20% |
| **Select Halo** | 250ms | ease-in-out | 15-20% |
| **Disable Fade** | 200ms | ease-in | 40% |
| **Validation** | 200ms | linear | - |
| **Label Float** | 200ms | ease-out | - |
| **Max Duration** | 300ms | - | - |

---

## Component Measurements

### Inputs
```
Height:           48px
Padding:          12px 16px (vertical horizontal)
Text size:        16px
Border:           1.5px (implemented as 2px for better visibility)
Border radius:    8px
Label size:       12px
Label position:   -8px from top
Label padding:    0 4px
```

### Buttons
```
Height (default): 40px
Height (large):   48px
Min width:        80px
Padding:          10px 16px
Icon size:        20×20
Icon gap:         8px
Border radius:    8px
```

### Pills (Status Badges)
```
Height:           32px
Padding (icon):   8px 12px
Padding (no icon):10px 16px
Icon size:        16×16
Icon gap:         6px
Font size:        14px (medium weight)
Border radius:    10px
```

### Icons
```
Active icons:     24×24
Pill icons:       16×16
Button icons:     20×20
```

---

## Interaction States

### Default State
- **Border:** 2px solid #E0E0E0 (neutral gray)
- **Background:** white
- **Text:** black
- **Effect:** None
- **Cursor:** text

### Hover State
- **Effect:** Soft glow - `box-shadow: 0 0 8px rgba(17, 98, 168, 0.2)`
- **Duration:** 150ms ease-out
- **Applies to:** Inputs, buttons, pills

### Focus/Selected State
- **Border:** 2px solid #1162A8 (primary blue)
- **Halo:** `box-shadow: 0 0 0 4px rgba(17, 98, 168, 0.15)`
- **Duration:** 250ms ease-in-out
- **Label:** Floats to -8px position, turns blue

### Valid State
- **Border:** 2px solid #119933 (success green)
- **Label:** Green color
- **Icon:** Green checkmark (right side)
- **Halo on focus:** `box-shadow: 0 0 0 4px rgba(17, 153, 51, 0.15)`

### Warning State
- **Border:** 2px solid #FF9900 (warning orange)
- **Label:** Orange color
- **Icon:** Orange warning triangle
- **Halo on focus:** `box-shadow: 0 0 0 4px rgba(255, 153, 0, 0.15)`

### Error State
- **Border:** 2px solid #CF0202 (error red)
- **Label:** Red color
- **Icon:** Red X
- **Halo on focus:** `box-shadow: 0 0 0 4px rgba(207, 2, 2, 0.15)`
- **Message:** Error text below input

### Disabled State
- **Opacity:** 40%
- **Background:** #f9fafb (gray tint)
- **Border:** 2px solid #BDBDBD
- **Cursor:** not-allowed
- **Transition:** 200ms ease-in

---

## Usage Examples

### Basic Input with Floating Label

```tsx
<Input
  label="Patient Name"
  value={patientName}
  onChange={(e) => setPatientName(e.target.value)}
  placeholder="Insert patient name"
/>
```

**Result:**
- Empty: Shows placeholder "Insert patient name"
- Typing: Label floats to top (-8px), turns blue
- Valid: Label stays floating, border turns green, checkmark appears

### Input with Validation

```tsx
<Input
  label="Email Address"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  validationState={error ? "error" : email ? "valid" : "default"}
  errorMessage={error}
  placeholder="Enter your email"
/>
```

### Input with Warning

```tsx
<Input
  label="Username"
  value={username}
  validationState="warning"
  warningMessage="This username is pending verification"
  placeholder="Enter username"
/>
```

### Disabled Input

```tsx
<Input
  label="Locked Field"
  value="Cannot edit"
  disabled
/>
```

---

## CSS Variables Reference

All design tokens are available as CSS custom properties:

```css
/* Colors */
--rxn-primary-blue: #1162A8;
--rxn-success-green: #119933;
--rxn-warning-orange: #FF9900;
--rxn-error-red: #CF0202;
--rxn-neutral-gray: #E0E0E0;
--rxn-disabled-gray: #BDBDBD;
--rxn-background: #F9FAFB;

/* Measurements */
--rxn-input-height: 48px;
--rxn-input-padding-x: 16px;
--rxn-input-padding-y: 12px;
--rxn-input-text-size: 16px;
--rxn-floating-label-size: 12px;
--rxn-label-position: -8px;
--rxn-label-padding: 4px;

/* Animation Timings */
--rxn-hover-glow-duration: 150ms;
--rxn-select-halo-duration: 250ms;
--rxn-label-float-duration: 200ms;

/* Opacity */
--rxn-hover-glow-opacity: 0.2;
--rxn-selected-halo-opacity: 0.15;
--rxn-disabled-opacity: 0.4;
```

---

## Accessibility Features

### WCAG AA Compliance
- ✅ Contrast ratio ≥4.5:1 for all text
- ✅ Color + icon pairing (never color alone)
- ✅ Focus indicators visible (blue ring)
- ✅ Keyboard navigation support
- ✅ Screen reader friendly (ARIA labels)

### Motion Sensitivity
- ✅ All animations under 300ms
- ✅ Reduced motion media query support
- ✅ Smooth, non-jarring transitions

### Label Best Practices
- ✅ White background strip prevents overlap
- ✅ Label always visible when input has value
- ✅ Clear placeholder text when empty
- ✅ Proper `htmlFor` association

---

## Migration from Old Pattern

### Old Pattern (Internal Floating)
```tsx
// Label floated INSIDE the input
<div className="relative">
  <input className="pt-5" />  // Extra top padding
  <label className="absolute left-4 top-2">Label</label>
</div>
```

### New Pattern (Above Border)
```tsx
// Label floats ABOVE the input border
<div className="relative">
  {hasValue && (
    <label className="absolute -top-2 left-3 bg-white px-1">
      Label
    </label>
  )}
  <input />
</div>
```

**Key Differences:**
1. Label appears **outside** the input border (not inside)
2. Label has white background to create gap in border
3. Label only appears when input has a value
4. No extra padding needed in input
5. Placeholder shown when empty (not label)

---

## Status Pills

Status pills follow the same color system with specific measurements:

```tsx
// Active pill with icon
<div className="h-8 px-3 py-2 rounded-[10px] border-2 border-green-400 bg-green-50">
  <Check className="w-4 h-4" />
  <span className="text-sm font-medium">Active</span>
</div>

// Disabled pill
<div className="h-8 px-4 py-2 rounded-[10px] border-2 border-gray-300 bg-gray-50 opacity-40">
  <span className="text-sm font-medium">Disabled</span>
</div>
```

**Pill Colors:**
- Success: `border-green-400 bg-green-50 text-green-700`
- Warning: `border-orange-400 bg-orange-50 text-orange-700`
- Error: `border-red-400 bg-red-50 text-red-700`
- Neutral: `border-gray-300 bg-gray-50 text-gray-700`

---

## Button Variants

Buttons follow the design system with proper measurements:

```tsx
// Default (Primary Blue)
<Button variant="default">Continue</Button>

// Success (Green)
<Button variant="success">Save</Button>

// Warning (Orange)
<Button variant="warning">Review</Button>

// Destructive (Red)
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="default">Default (40px)</Button>
<Button size="lg">Large (48px)</Button>
```

**Button Measurements:**
- Default: 40px height, 10px 16px padding
- Large: 48px height, 12px 20px padding
- Min width: 80px
- Icon size: 20×20
- Border radius: 8px

---

## Testing Checklist

### Visual Verification
- [ ] Empty input shows placeholder
- [ ] Typing causes label to float to -8px position
- [ ] Label has white background strip
- [ ] Valid state shows green border + checkmark
- [ ] Error state shows red border + X icon + message
- [ ] Hover shows 20% opacity glow
- [ ] Focus shows blue border + 15% halo
- [ ] Disabled shows 40% opacity

### Animation Verification
- [ ] Label floats in 200ms ease-out
- [ ] Hover glow appears in 150ms ease-out
- [ ] Focus halo appears in 250ms ease-in-out
- [ ] Disabled fades in 200ms ease-in
- [ ] All transitions smooth and not jarring
- [ ] Max animation duration ≤ 300ms

### Measurement Verification
- [ ] Input height is exactly 48px
- [ ] Input padding is 16px horizontal, 12px vertical
- [ ] Label font size is 12px
- [ ] Input font size is 16px
- [ ] Label positioned -8px from top
- [ ] Border is 2px thick
- [ ] Border radius is 8px

---

## Files Updated

1. **[components/ui/input.tsx](components/ui/input.tsx)**
   - Implements new floating label pattern
   - Exact measurements from spec
   - Proper animation timings

2. **[components/ui/floating-label-input.tsx](components/ui/floating-label-input.tsx)**
   - Standalone component with same pattern
   - Can be used independently

3. **[app/globals.css](app/globals.css)**
   - All CSS custom properties
   - Animation timings
   - Measurement variables
   - Utility classes

4. **[components/login-form.tsx](components/login-form.tsx)**
   - Updated to use new Input component
   - Demonstrates all states

5. **[components/add-slip-header.tsx](components/add-slip-header.tsx)**
   - Patient name input updated

6. **[components/registration/profile-form.tsx](components/registration/profile-form.tsx)**
   - All text inputs updated

---

## Resources

- **Demo:** `/design-system-demo`
- **Full Docs:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- **Migration Guide:** [DESIGN_SYSTEM_MIGRATION.md](DESIGN_SYSTEM_MIGRATION.md)
- **Main README:** [README.md](README.md#design-system)

---

**Last Updated:** 2025-01-24
**Version:** 2.0 (New Floating Label Pattern)
