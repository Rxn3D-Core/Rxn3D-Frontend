"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { ChatSupportBox } from "@/components/chat-support-box"
import { useAuth } from "@/contexts/auth-context"
import { useDashboardSettings } from "@/hooks/use-dashboard-settings"
import { WIDGET_IDS, getCustomerId } from "@/lib/dashboard-widgets"
import { useDashboardSettingsStore } from "@/stores/dashboard-settings-store"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const { user } = useAuth()
  const userRole = user?.roles?.[0] || ""
  const userId = user?.id
  const customerId = getCustomerId(user)
  const { isEnabled, isLoading } = useDashboardSettings(userRole, userId, customerId)
  const { chatSupportEnabled, initializeFromSettings } = useDashboardSettingsStore()
  
  // Initialize Zustand store from settings when they load
  useEffect(() => {
    if (!isLoading && userRole) {
      const enabled = isEnabled(WIDGET_IDS.CHAT_SUPPORT)
      initializeFromSettings(enabled)
    }
  }, [isLoading, userRole, isEnabled, initializeFromSettings])
  
  // Use Zustand store for real-time updates, fallback to hook if store not initialized
  const shouldShowChat = user && (isLoading || !userRole ? true : chatSupportEnabled)

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ImpersonationBanner />
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            key="content"
            initial={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              filter: "blur(4px)",
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redirect overlay with smooth animation */}
      <AnimatePresence>
        {isRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.2,
                duration: 0.4,
                ease: "easeOut",
              }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
              />
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-700 font-medium"
              >
                Session expired. Redirecting to login...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Support Box - Available on all authenticated pages (if enabled in dashboard settings) */}
      {shouldShowChat && <ChatSupportBox />}
    </div>
  )
}
