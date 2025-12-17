"use client"

import React from "react"

interface LoadingDotsProps {
  className?: string
  size?: "sm" | "md" | "lg"
  color?: string
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  className = "",
  size = "md",
  color = "rgb(17, 98, 168)", // #1162a8
}) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  }

  const dotSize = sizeClasses[size]

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex space-x-2">
        <div
          className={`${dotSize} rounded-full animate-bounce [animation-delay:-0.3s]`}
          style={{ backgroundColor: color }}
        ></div>
        <div
          className={`${dotSize} rounded-full animate-bounce [animation-delay:-0.15s]`}
          style={{ backgroundColor: color }}
        ></div>
        <div
          className={`${dotSize} rounded-full animate-bounce`}
          style={{ backgroundColor: color }}
        ></div>
      </div>
    </div>
  )
}

export default LoadingDots















