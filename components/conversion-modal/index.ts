// Main exports for the refactored ConversionModal
export { ConversionModalRefactored } from './ConversionModalRefactored'
export { useConversionModal } from './hooks/useConversionModal'

// Component exports
export { ShadeMatchingTab } from './components/ShadeMatchingTab'
export { ColorPickerTab } from './components/ColorPickerTab'
export { ConversionResults } from './components/ConversionResults'
export { ModalFooter } from './components/ModalFooter'

// Type exports
export type {
  ConversionModalProps,
  ConversionModalState,
  ConversionModalActions,
  ConversionModalData,
  ShadeSystem,
  Shade,
  ConversionMatch,
  GumShade
} from './types'

