import { useState, useEffect } from 'react'
import { ConversionModalState, ConversionMatch } from '../types'

export const useConversionModal = (initialState: ConversionModalState) => {
  const [tempSelectedMatch, setTempSelectedMatch] = useState<ConversionMatch | null>(null)
  const [tempSelectedSystem, setTempSelectedSystem] = useState<string>('')
  const [tempSelectedShade, setTempSelectedShade] = useState<string>('')
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Handle full screen mode changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement
      setIsFullScreen(!!isCurrentlyFullScreen)
    }
    
    // Check initial state
    handleFullScreenChange()
    
    document.addEventListener('fullscreenchange', handleFullScreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange)
    document.addEventListener('mozfullscreenchange', handleFullScreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange)
    }
  }, [])

  const selectMatch = (match: ConversionMatch) => {
    setTempSelectedMatch(match)
    setTempSelectedSystem(match.brand.name)
    setTempSelectedShade(match.name)
  }

  const clearTempSelection = () => {
    setTempSelectedMatch(null)
    setTempSelectedSystem('')
    setTempSelectedShade('')
  }

  return {
    tempSelectedMatch,
    tempSelectedSystem,
    tempSelectedShade,
    isFullScreen,
    selectMatch,
    clearTempSelection
  }
}

