import { useState, useRef, useCallback } from 'react'

interface UseSpotlightReturn {
  isSpotlightActive: boolean
  targetElement: HTMLElement | null
  activateSpotlight: (element: HTMLElement) => void
  deactivateSpotlight: () => void
  nextField: () => void
  previousField: () => void
}

export function useSpotlight(): UseSpotlightReturn {
  const [isSpotlightActive, setIsSpotlightActive] = useState(false)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const currentFieldIndex = useRef(0)
  const formFields = useRef<HTMLElement[]>([])

  const activateSpotlight = useCallback((element: HTMLElement) => {
    setTargetElement(element)
    setIsSpotlightActive(true)
    
    // Focus the element
    element.focus()
    
    // Scroll element into view if needed
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'center'
    })
  }, [])

  const deactivateSpotlight = useCallback(() => {
    setIsSpotlightActive(false)
    setTargetElement(null)
    currentFieldIndex.current = 0
  }, [])

  const getFormFields = useCallback(() => {
    // Get all input fields, select elements, and textareas that are not disabled
    const fields = Array.from(document.querySelectorAll(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )) as HTMLElement[]
    
    // Filter out hidden fields and only include visible ones
    return fields.filter(field => {
      const rect = field.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && 
             window.getComputedStyle(field).display !== 'none' &&
             window.getComputedStyle(field).visibility !== 'hidden'
    })
  }, [])

  const nextField = useCallback(() => {
    const fields = getFormFields()
    if (fields.length === 0) return

    currentFieldIndex.current = (currentFieldIndex.current + 1) % fields.length
    const nextField = fields[currentFieldIndex.current]
    activateSpotlight(nextField)
  }, [getFormFields, activateSpotlight])

  const previousField = useCallback(() => {
    const fields = getFormFields()
    if (fields.length === 0) return

    currentFieldIndex.current = currentFieldIndex.current === 0 
      ? fields.length - 1 
      : currentFieldIndex.current - 1
    const prevField = fields[currentFieldIndex.current]
    activateSpotlight(prevField)
  }, [getFormFields, activateSpotlight])

  return {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight,
    nextField,
    previousField
  }
}

