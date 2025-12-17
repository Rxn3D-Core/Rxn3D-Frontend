# RXN3D Design System - Floating Labels & Components

This document describes the global design system implementation for consistent UI components across the RXN3D platform.

## Overview

The design system provides standardized input fields with floating labels, buttons, and interactive elements that follow a consistent color scheme and interaction pattern.

## Color Tokens

All components use the following global color system:

| Color | Hex Code | Usage | Token |
|-------|----------|-------|-------|
| **Primary Blue** | `#1162A8` | Focus & selection border | `--rxn-primary-blue` |
| **Success Green** | `#119933` | Valid / Active / Connected | `--rxn-success-green` |
| **Warning Orange** | `#FF9900` | Needs Action / Pending | `--rxn-warning-orange` |
| **Error Red** | `#CF0202` | Invalid / Disconnected | `--rxn-error-red` |
| **Neutral Gray** | `#E0E0E0` | Default borders | `--rxn-neutral-gray` |
| **Disabled Gray** | `#BDBDBD` | 40% opacity layer | `--rxn-disabled-gray` |

## Design Specifications

### Global Settings

- **Border Thickness:** 1.5px consistently applied
- **Input Radius:** 8px for inputs/buttons
- **Pill Radius:** 10px for pills
- **Transition Duration:** 200ms ease-out
- **Hover Glow Opacity:** 20%
- **Selected Halo Opacity:** 15%
- **Disabled Opacity:** 40%

## Components

### Input with Floating Label

The `Input` component from `@/components/ui/input` now supports floating labels and validation states.

#### Basic Usage

```tsx
import { Input } from "@/components/ui/input"

// Simple input without floating label
<Input type="text" placeholder="Enter text" />

// Input with floating label
<Input
  label="Patient Name"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

#### Validation States

```tsx
// Default state
<Input label="Patient Name" value={value} onChange={handleChange} />

// Valid state (green border, checkmark icon)
<Input
  label="Email Address"
  value={value}
  validationState="valid"
  onChange={handleChange}
/>

// Warning state (orange border, warning icon)
<Input
  label="Username"
  value={value}
  validationState="warning"
  warningMessage="This username is pending verification"
  onChange={handleChange}
/>

// Error state (red border, X icon)
<Input
  label="Email"
  value={value}
  validationState="error"
  errorMessage="Please enter a valid email"
  onChange={handleChange}
/>

// Disabled state
<Input label="Locked Field" value={value} disabled />
```

#### Props

```typescript
interface InputProps {
  label?: string                           // Floating label text
  validationState?: "default" | "valid" | "warning" | "error" | "disabled"
  errorMessage?: string                    // Error message (shown when validationState="error")
  warningMessage?: string                  // Warning message (shown when validationState="warning")
  showValidIcon?: boolean                  // Show validation icon (default: true)
  // ...all standard HTML input props
}
```

### Buttons

The `Button` component follows the design system specifications with proper hover, focus, and disabled states.

#### Basic Usage

```tsx
import { Button } from "@/components/ui/button"

// Primary button (blue)
<Button variant="default">Continue</Button>

// Success button (green)
<Button variant="success">Save</Button>

// Warning button (orange)
<Button variant="warning">Review</Button>

// Destructive button (red)
<Button variant="destructive">Delete</Button>

// Outline button
<Button variant="outline">Cancel</Button>

// Disabled button
<Button variant="default" disabled>Can't Click</Button>
```

#### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Icon />
</Button>
```

#### Variants

- `default` - Primary blue button
- `success` - Green button
- `warning` - Orange button
- `destructive` - Red button
- `outline` - Outlined button with hover effects
- `secondary` - Gray button
- `ghost` - Transparent button with hover
- `link` - Link-styled button

## Interaction States

### Default State
- Gray outline (`#E0E0E0`)
- No special effects
- Neutral appearance

### Hover State
- Soft glow with 20% opacity
- 150ms ease-out transition
- Brightness filter for buttons

### Selected/Focus State
- Blue border (`#1162A8`)
- Outer glow with 15-20% opacity
- 250ms ease-in-out transition
- Box shadow: `0 0 0 4px rgba(17,98,168,0.15)`

### Disabled State
- 40% opacity
- Gray tint (`#BDBDBD`)
- Cursor: not-allowed
- 200ms ease-in transition

## CSS Utility Classes

The design system provides utility classes in `globals.css`:

### Input Classes
- `.rxn-input-default` - Default input styling
- `.rxn-input-valid` - Valid state styling
- `.rxn-input-warning` - Warning state styling
- `.rxn-input-error` - Error state styling
- `.rxn-input-disabled` - Disabled state styling

### Button Classes
- `.rxn-button` - Base button styling
- `.rxn-button-primary` - Primary blue button
- `.rxn-button-success` - Success green button
- `.rxn-button-warning` - Warning orange button
- `.rxn-button-error` - Error red button

### Pill Classes
- `.rxn-pill` - Base pill styling
- `.rxn-pill-primary` - Primary blue pill
- `.rxn-pill-success` - Success green pill
- `.rxn-pill-warning` - Warning orange pill
- `.rxn-pill-error` - Error red pill
- `.rxn-pill-neutral` - Neutral gray pill
- `.rxn-pill-disabled` - Disabled gray pill

### Floating Label Classes
- `.floating-label` - Base floating label
- `.floating-label.floated` - Floated state (small, positioned top)
- `.floating-label.static` - Static state (normal size, centered)

## Demo Component

To see all states and components in action, use the demo component:

```tsx
import { FloatingLabelDemo } from "@/components/floating-label-demo"

<FloatingLabelDemo />
```

This component showcases:
- All input validation states
- All button variants
- Color token reference
- Interaction state examples
- Usage guidelines

## Migration Guide

### Updating Existing Inputs

**Before:**
```tsx
<input
  type="text"
  name="name"
  value={value}
  placeholder="Patient Name*"
  className="w-full px-4 py-2 border rounded"
/>
```

**After:**
```tsx
<Input
  type="text"
  name="name"
  label="Patient Name"
  value={value}
  onChange={handleChange}
/>
```

### Adding Validation

**Before:**
```tsx
<input
  className={`border ${error ? "border-red-500" : "border-gray-300"}`}
/>
{error && <p className="text-red-500">{error}</p>}
```

**After:**
```tsx
<Input
  label="Email"
  value={value}
  validationState={error ? "error" : "default"}
  errorMessage={error}
  onChange={handleChange}
/>
```

## Best Practices

1. **Always use labels** - Provide clear, descriptive labels for accessibility
2. **Show validation state** - Use appropriate validation states to guide users
3. **Provide error messages** - Always include helpful error messages when validation fails
4. **Be consistent** - Use the same validation patterns across the application
5. **Test interactions** - Verify hover, focus, and disabled states work correctly
6. **Use semantic colors** - Stick to the color tokens for their intended purposes

## Browser Support

The design system uses modern CSS features and is tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

All components follow WCAG 2.1 AA standards:
- Proper focus indicators
- Keyboard navigation support
- ARIA labels for icons
- Sufficient color contrast
- Screen reader friendly

## Files Modified

- `/components/ui/input.tsx` - Enhanced Input component with floating labels
- `/components/ui/button.tsx` - Updated Button component with design system
- `/app/globals.css` - Added design system CSS variables and utility classes
- `/components/floating-label-demo.tsx` - Demo component showing all states
- `/components/ui/floating-label-input.tsx` - Standalone floating label component

## CSS Variables Reference

```css
/* Color Tokens */
--rxn-primary-blue: #1162A8;
--rxn-success-green: #119933;
--rxn-warning-orange: #FF9900;
--rxn-error-red: #CF0202;
--rxn-neutral-gray: #E0E0E0;
--rxn-disabled-gray: #BDBDBD;

/* Design Settings */
--rxn-border-thickness: 1.5px;
--rxn-input-radius: 8px;
--rxn-pill-radius: 10px;
--rxn-transition-duration: 200ms;
--rxn-hover-glow-opacity: 0.2;
--rxn-selected-halo-opacity: 0.15;
--rxn-disabled-opacity: 0.4;
```

## Support

For questions or issues with the design system, please contact the development team or file an issue in the project repository.
