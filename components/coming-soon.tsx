"use client"

import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

interface ComingSoonProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function ComingSoon({ 
  title, 
  description,
  icon 
}: ComingSoonProps) {
  const { t } = useTranslation()

  const defaultTitle = title || t("comingSoon.title", "Coming Soon")
  const defaultDescription = description || t("comingSoon.description", "This feature is currently under development and will be available soon.")

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-lg border shadow-sm p-8 sm:p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 sm:w-48 sm:h-48 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 sm:w-40 sm:h-40 bg-purple-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 sm:w-28 sm:h-28 bg-cyan-100 rounded-full opacity-20 blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#1162a8] to-blue-600 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center">
                  {icon || <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-[#1162a8]" />}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#1162a8] to-blue-600 bg-clip-text text-transparent">
                  {defaultTitle}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
                  {defaultDescription}
                </p>
              </div>

              {/* Animated dots */}
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#1162a8] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

