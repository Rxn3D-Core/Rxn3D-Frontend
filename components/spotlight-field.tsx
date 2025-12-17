"use client"

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'

interface SpotlightFieldProps {
  children: React.ReactElement
  onFocus?: (element: HTMLElement) => void
  onBlur?: () => void
  className?: string
}

export interface SpotlightFieldRef {
  focus: () => void
  blur: () => void
}

const SpotlightField = forwardRef<SpotlightFieldRef, SpotlightFieldProps>(
  ({ children, onFocus, onBlur, className = '' }, ref) => {
    const fieldRef = useRef<HTMLElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => {
        fieldRef.current?.focus()
      },
      blur: () => {
        fieldRef.current?.blur()
      }
    }))

    useEffect(() => {
      const element = fieldRef.current
      if (!element) return

      const handleFocus = () => {
        onFocus?.(element)
      }

      const handleBlur = () => {
        onBlur?.()
      }

      element.addEventListener('focus', handleFocus)
      element.addEventListener('blur', handleBlur)

      return () => {
        element.removeEventListener('focus', handleFocus)
        element.removeEventListener('blur', handleBlur)
      }
    }, [onFocus, onBlur])

    // Clone the child element and add our ref
    const enhancedChild = React.cloneElement(children, {
      ref: (node: HTMLElement) => {
        // Handle both function refs and object refs
        if (typeof children.ref === 'function') {
          children.ref(node)
        } else if (children.ref) {
          ;(children.ref as React.MutableRefObject<HTMLElement | null>).current = node
        }
        fieldRef.current = node
      },
      className: `${children.props.className || ''} ${className}`.trim()
    })

    return enhancedChild
  }
)

SpotlightField.displayName = 'SpotlightField'

export default SpotlightField

