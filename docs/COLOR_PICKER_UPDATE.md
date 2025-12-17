# Color Picker Update

## Overview
Updated the color picker component to provide a better user experience with a two-stage selection process: preset colors and custom color picker.

## Changes Made

### 1. Updated Color Picker Component
**File**: [components/ui/color-picker.tsx](../components/ui/color-picker.tsx)

#### Features:
- **Two-Stage UI**:
  1. **Preset Colors View**: Shows preset color swatches in a grid layout
  2. **Custom Color Picker View**: Opens when clicking the custom color input

#### Preset Colors View:
- Grid of 12 preset colors (6 columns)
- Click any color to select it instantly
- Shows current custom color with hex value input
- Clicking the hex input opens the custom color picker

#### Custom Color Picker View:
- **Canvas gradient**: Click anywhere to select a color
- **Hue slider**: Adjusts the color hue (0-360°)
- **RGB inputs**: Direct R, G, B value inputs (0-255)
- **Hex input**: Shows and accepts hex color codes
- **Color preview**: Real-time preview of selected color
- **Checkmark button**: Returns to preset colors view

### 2. Updated Modal Implementation
**File**: [components/case-tracking/add-case-pan-tracking-modal.tsx](../components/case-tracking/add-case-pan-tracking-modal.tsx)

#### Changes:
- Simplified color section
- Removed redundant preset color display (now in popover)
- Removed custom color input section (now in popover)
- Shows only the color picker button and hex value display

### 3. Component Architecture

```tsx
<ColorPicker
  value="#00ACC1"
  onChange={(color) => handleColorChange(color)}
  predefinedColors={PRESET_COLORS}
/>
```

## User Flow

1. **Click color button** → Opens popover with preset colors
2. **Select preset color** → Color applied, popover closes
3. **Click hex input** → Opens custom color picker view
4. **Pick custom color**:
   - Click on gradient canvas
   - Adjust hue slider
   - Enter RGB values
   - Enter hex code
5. **Click checkmark** → Returns to preset view with new color

## Technical Details

### Color Conversions
- **Hex to RGB**: For displaying RGB values
- **RGB to Hex**: For updating color from RGB inputs
- **RGB to HSL**: For hue slider functionality

### Canvas Gradient
- Horizontal gradient: White → Pure Hue Color
- Vertical gradient: Transparent → Black
- Dynamically redraws when hue changes

### State Management
```tsx
const [isOpen, setIsOpen] = useState(false)           // Popover open/close
const [showCustomPicker, setShowCustomPicker] = useState(false) // View toggle
const [customColor, setCustomColor] = useState(value) // Selected color
const [rgb, setRgb] = useState({ r: 0, g: 172, b: 193 }) // RGB values
const [hue, setHue] = useState(185)                   // Hue slider position
```

## Preset Colors

Default preset colors (used if not provided):
```javascript
const defaultPredefinedColors = [
  "#D32F2F", // Red
  "#1976D2", // Blue
  "#388E3C", // Green
  "#F57C00", // Orange
  "#7B1FA2", // Purple
  "#0097A7", // Cyan
  "#C2185B", // Pink
  "#5D4037", // Brown
  "#689F38", // Lime Green
  "#E64A19", // Deep Orange
  "#512DA8", // Deep Purple
  "#00796B", // Teal
]
```

## Styling

### Preset Colors View
- Popover width: 520px
- Grid: 6 columns with gap-3
- Color swatches: 48px × 48px rounded squares
- Hover: Border changes to primary blue

### Custom Color Picker View
- Canvas: 400px × 200px
- Hue slider: Full width × 24px height
- RGB inputs: 3 columns with centered text
- Checkmark button: Absolute positioned top-right, cyan background

## Dependencies

- `@/components/ui/popover` - Radix UI Popover
- `@/components/ui/input` - Form input component
- `@/components/ui/button` - Button component

## Browser Compatibility

- Canvas API: All modern browsers
- Color gradients: All modern browsers
- Popover: All modern browsers (with Radix UI polyfill)

## Future Enhancements

Potential improvements:
1. Add opacity/alpha channel support
2. Add recent colors history
3. Add color name labels
4. Add keyboard navigation
5. Add color harmony suggestions
6. Add eyedropper tool for screen color picking
