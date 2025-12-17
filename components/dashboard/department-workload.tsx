"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export function DepartmentWorkload() {
  const [isVisible, setIsVisible] = useState(false)
  const [animatedPercentages, setAnimatedPercentages] = useState({})
  const containerRef = useRef(null)

  const departments = [
    { name: "Driver", active: 15, total: 225, percentage: 7 },
    { name: "Receiving", active: 15, total: 225, percentage: 7 },
    { name: "Study", active: 20, total: 225, percentage: 67 },
    { name: "Scanning", active: 5, total: 225, percentage: 10 },
    { name: "Design & Print", active: 30, total: 225, percentage: 10 },
    { name: "Supply", active: 2, total: 225, percentage: 10 },
    { name: "Modeling", active: 50, total: 225, percentage: 75 },
  ]

  // Initialize animated percentages to 0
  useEffect(() => {
    const initialPercentages = {}
    departments.forEach((dept, index) => {
      initialPercentages[index] = 0
    })
    setAnimatedPercentages(initialPercentages)
  }, [])

  // Check if component is visible in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.disconnect()
      }
    }
  }, [])

  // Animate percentages when component becomes visible
  useEffect(() => {
    if (!isVisible) return

    // Stagger the animations for each department
    departments.forEach((dept, index) => {
      const delay = 300 + index * 150 // Staggered delay
      setTimeout(() => {
        animatePercentage(index, dept.percentage)
      }, delay)
    })
  }, [isVisible])

  // Animate from 0 to target percentage
  const animatePercentage = (index, targetPercentage) => {
    let startPercentage = 0
    const duration = 1500 // Animation duration in ms
    const framesPerSecond = 60
    const totalFrames = (duration / 1000) * framesPerSecond
    const incrementPerFrame = targetPercentage / totalFrames

    const animate = () => {
      if (startPercentage < targetPercentage) {
        startPercentage += incrementPerFrame
        if (startPercentage > targetPercentage) {
          startPercentage = targetPercentage
        }

        setAnimatedPercentages((prev) => ({
          ...prev,
          [index]: Math.round(startPercentage),
        }))

        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {departments.map((dept, index) => (
        <div
          key={index}
          className={`flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 transition-opacity duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <div>
            <div className="font-medium text-base">{dept.name}</div>
            <div className="text-sm text-[#a19d9d]">
              {dept.active} out of {dept.total} active cases
            </div>
          </div>
          <CircularProgress
            percentage={dept.percentage}
            animatedPercentage={animatedPercentages[index] || 0}
            isVisible={isVisible}
          />
        </div>
      ))}

      <div className="flex justify-center mt-6">
        <div className="flex items-center space-x-1">
          <PaginationButton icon={<ChevronsLeft className="h-3 w-3" />} />
          <PaginationButton icon={<ChevronLeft className="h-3 w-3" />} />
          <PaginationButton number={1} active />
          <PaginationButton number={2} />
          <PaginationButton icon={<ChevronRight className="h-3 w-3" />} />
          <PaginationButton icon={<ChevronsRight className="h-3 w-3" />} />
        </div>
      </div>
    </div>
  )
}

interface CircularProgressProps {
  percentage: number
  animatedPercentage: number
  isVisible: boolean
}

function CircularProgress({ percentage, animatedPercentage, isVisible }: CircularProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [highlight, setHighlight] = useState(false)

  // Determine if this is a high percentage that should be highlighted
  useEffect(() => {
    if (percentage >= 70 && isVisible) {
      // Add a pulse effect for high percentages
      const timer = setTimeout(() => {
        setHighlight(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [percentage, isVisible])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions with higher resolution for retina displays
    const size = 60
    const lineWidth = 4
    canvas.width = size * 2
    canvas.height = size * 2
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(2, 2)

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw background circle
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, (size - lineWidth) / 2, 0, 2 * Math.PI)
    ctx.strokeStyle = "#f0f0f0"
    ctx.lineWidth = lineWidth
    ctx.stroke()

    // Determine color based on percentage
    let color = "#34c759" // Green for low percentage
    if (percentage >= 70) {
      color = "#eb0303" // Red for high percentage
    } else if (percentage >= 50) {
      color = "#ff9500" // Orange for medium percentage
    }

    // Draw progress arc
    const startAngle = -0.5 * Math.PI // Start at top
    const endAngle = startAngle + (2 * Math.PI * animatedPercentage) / 100

    ctx.beginPath()
    ctx.arc(size / 2, size / 2, (size - lineWidth) / 2, startAngle, endAngle)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.stroke()

    // Draw percentage text
    ctx.font = "bold 14px Arial"
    ctx.fillStyle = "#000000"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${animatedPercentage}%`, size / 2, size / 2)
  }, [animatedPercentage, percentage])

  return (
    <div className={`relative ${isVisible ? "animate-fadeIn" : "opacity-0"}`}>
      <canvas ref={canvasRef} className={`w-[60px] h-[60px] ${highlight ? "animate-pulse" : ""}`} />
      {percentage >= 70 && highlight && (
        <div
          className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-full animate-ping"
          style={{ animationDuration: "3s" }}
        ></div>
      )}
    </div>
  )
}

interface PaginationButtonProps {
  number?: number
  icon?: React.ReactNode
  active?: boolean
}

function PaginationButton({ number, icon, active = false }: PaginationButtonProps) {
  return (
    <button
      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
        active ? "bg-[#1162a8] text-white" : "bg-[#f0f0f0] text-[#a19d9d]"
      }`}
    >
      {number !== undefined ? number : icon}
    </button>
  )
}
