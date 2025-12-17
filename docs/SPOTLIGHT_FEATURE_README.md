# Form Field Spotlight Feature

## Overview

The Form Field Spotlight feature provides a focused, distraction-free experience when filling out forms. When activated, it creates a spotlight effect that blurs everything except the currently focused input field, making it easier to concentrate on one field at a time.

## Features

- **Spotlight Effect**: Blurs the entire form except the focused field
- **Keyboard Navigation**: Use Tab/Shift+Tab to navigate between fields
- **Visual Focus**: Clear visual indication of which field is active
- **Smooth Transitions**: Animated spotlight positioning and transitions
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Full keyboard navigation support

## Components

### 1. SpotlightOverlay (`components/spotlight-overlay.tsx`)
The main overlay component that creates the blur effect and spotlight circle.

**Props:**
- `isActive`: Boolean to control visibility
- `targetElement`: The DOM element to spotlight
- `onClose`: Callback when overlay is clicked
- `children`: Optional content to display in the overlay

### 2. SpotlightField (`components/spotlight-field.tsx`)
A wrapper component that adds spotlight functionality to any form field.

**Props:**
- `onFocus`: Callback when field gains focus
- `onBlur`: Callback when field loses focus
- `className`: Additional CSS classes
- `children`: The form field to wrap

### 3. useSpotlight Hook (`hooks/use-spotlight.ts`)
Custom hook that manages spotlight state and navigation.

**Returns:**
- `isSpotlightActive`: Boolean indicating if spotlight is active
- `targetElement`: Currently targeted DOM element
- `activateSpotlight`: Function to activate spotlight on an element
- `deactivateSpotlight`: Function to deactivate spotlight
- `nextField`: Function to move to next field
- `previousField`: Function to move to previous field

## Usage

### Basic Implementation

```tsx
import SpotlightOverlay from "@/components/spotlight-overlay"
import SpotlightField from "@/components/spotlight-field"
import { useSpotlight } from "@/hooks/use-spotlight"

function MyForm() {
  const [showSpotlight, setShowSpotlight] = useState(false)
  const {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight,
    nextField,
    previousField
  } = useSpotlight()

  return (
    <div>
      <Button onClick={() => setShowSpotlight(!showSpotlight)}>
        {showSpotlight ? "Hide Spotlight" : "Show Spotlight"}
      </Button>

      <SpotlightField
        onFocus={showSpotlight ? activateSpotlight : undefined}
        onBlur={showSpotlight ? deactivateSpotlight : undefined}
      >
        <Input placeholder="Enter your name" />
      </SpotlightField>

      <SpotlightOverlay
        isActive={isSpotlightActive && showSpotlight}
        targetElement={targetElement}
        onClose={deactivateSpotlight}
      />
    </div>
  )
}
```

### Keyboard Navigation

The spotlight feature includes built-in keyboard navigation:

- **Tab**: Move to next field
- **Shift + Tab**: Move to previous field
- **Escape**: Exit spotlight mode

```tsx
useEffect(() => {
  if (!showSpotlight) return

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        previousField()
      } else {
        nextField()
      }
    } else if (e.key === 'Escape') {
      deactivateSpotlight()
      setShowSpotlight(false)
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [showSpotlight, nextField, previousField, deactivateSpotlight])
```

## Integration with Existing Forms

The spotlight feature has been integrated into the `AddSlipHeader` component. To use it:

1. Click the "Show Spotlight" button in the header
2. Click on any form field to activate the spotlight
3. Use Tab/Shift+Tab to navigate between fields
4. Press Escape to exit spotlight mode

## Demo

Visit `/spotlight-demo` to see a complete example of the spotlight feature in action.

## Styling

The spotlight effect uses Tailwind CSS classes and can be customized:

- **Overlay**: `bg-black/60 backdrop-blur-sm`
- **Spotlight Circle**: `bg-white shadow-2xl rounded-lg`
- **Transitions**: `transition-all duration-300 ease-in-out`

## Browser Support

- Modern browsers with CSS backdrop-filter support
- Fallback blur effect for older browsers
- Full keyboard navigation support

## Accessibility

- Full keyboard navigation
- Screen reader compatible
- High contrast spotlight effect
- Focus management
- Escape key to exit

## Performance

- Efficient DOM queries for form fields
- Debounced scroll and resize handlers
- Cleanup of event listeners
- Minimal re-renders

## Troubleshooting

### Spotlight not appearing
- Ensure `showSpotlight` is true
- Check that `targetElement` is not null
- Verify the field is visible and not disabled

### Navigation not working
- Ensure keyboard event listeners are properly set up
- Check that form fields are not disabled
- Verify the `useSpotlight` hook is properly initialized

### Performance issues
- Limit the number of form fields
- Consider using virtual scrolling for large forms
- Ensure proper cleanup of event listeners

