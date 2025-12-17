import { useState, useCallback } from 'react'

export function useFocusedSpotlight() {
  const [isSpotlightActive, setIsSpotlightActive] = useState(false)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

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
  }, [])

  return {
    isSpotlightActive,
    targetElement,
    activateSpotlight,
    deactivateSpotlight
  }
}

