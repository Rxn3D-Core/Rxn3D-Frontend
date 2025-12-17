"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { getAuthToken, getTokenExpiresAt } from "@/lib/auth-storage"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ClientLayoutProps {
  children: React.ReactNode
  customRedirectMessage?: string
  animationDuration?: number
}

export function ClientLayout({
  children,
  customRedirectMessage = "Session expired. Redirecting to login...",
  animationDuration = 800,
}: ClientLayoutProps) {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const [progress, setProgress] = useState(0)

  // Add this useEffect to check token presence/expiry on mount
  useEffect(() => {
    const token = getAuthToken()
    const expiresAt = getTokenExpiresAt()
    const now = Date.now()
    if (!token || (expiresAt && now > expiresAt)) {
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      router.replace("/login")
    }
  }, [router])

  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        // Start the smooth transition
        setIsRedirecting(true)
        setShowContent(false)

        // Animate progress bar
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval)
              return 100
            }
            return prev + 2
          })
        }, animationDuration / 50)

        // Wait for animation to complete before clearing data and redirecting
        setTimeout(() => {
          // Clear auth data
          localStorage.removeItem("user")
          localStorage.removeItem("token")
          // Redirect to login
          router.push("/login")
        }, animationDuration)

        throw new Error("Unauthorized")
      }

      return response
    }
  }, [animationDuration, router])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      filter: "blur(8px)",
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0, opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="visible"
            exit="exit"
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced redirect overlay */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center z-50"
          >
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="text-center max-w-md mx-auto p-8"
            >
              {/* Animated logo/icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                />
              </motion.div>

              {/* Message */}
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-semibold text-gray-800 mb-2"
              >
                Redirecting...
              </motion.h3>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 mb-6"
              >
                {customRedirectMessage}
              </motion.p>

              {/* Progress bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-1 bg-gray-200 rounded-full overflow-hidden"
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
