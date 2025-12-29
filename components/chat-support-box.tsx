"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { MessageCircle, X, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type Message = {
  id: number
  text: string
  sender: "user" | "support"
  quickReplyButtons?: string[]
}

// Random support responses with quick reply options
const supportResponses = [
  {
    text: "Hello! How can I help you today?",
    quickReplies: ["I need help with my account", "I have a technical issue", "I want to report a bug", "Other question"]
  },
  {
    text: "I'd be happy to assist you with that. Could you provide more details?",
    quickReplies: ["Yes, here's more info", "I'll describe it", "Let me check", "Actually, never mind"]
  },
  {
    text: "Thank you for reaching out! Our team is here to help. What specific issue are you experiencing?",
    quickReplies: ["Login problems", "Feature not working", "Billing question", "General inquiry"]
  },
  {
    text: "I understand your concern. Let me help you resolve this. Can you tell me when this issue started?",
    quickReplies: ["Just now", "Earlier today", "A few days ago", "Not sure"]
  },
  {
    text: "That's a great question! I can help you with that. Would you like step-by-step instructions?",
    quickReplies: ["Yes, please", "No, I'll try myself", "Maybe later", "Show me a guide"]
  },
  {
    text: "I see what you mean. This is a common issue and I can help you fix it right away.",
    quickReplies: ["Great, let's fix it", "What do I need to do?", "Is it complicated?", "Thanks!"]
  },
  {
    text: "No problem at all! I'm here to make sure everything works smoothly for you.",
    quickReplies: ["Perfect", "Thanks for your help", "I appreciate it", "You're awesome"]
  },
  {
    text: "I've noted your concern. Is there anything else you'd like help with today?",
    quickReplies: ["No, that's all", "Yes, one more thing", "I'll come back later", "Thanks!"]
  }
]

// Sample quick reply buttons for user messages
const userQuickReplies = [
  ["Yes", "No", "Maybe"],
  ["That works", "Let me think", "Not sure"],
  ["Got it", "Thanks", "I'll try that"],
  ["Perfect", "Okay", "Sounds good"]
]

export function ChatSupportBox() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Add welcome message when chat opens for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now(),
        text: "Hello! 👋 Welcome to RXN3D Customer Support. We're here to help you with any questions or issues you may have. How can we assist you today?",
        sender: "support" as const,
        quickReplyButtons: [
          "I need help with my account",
          "I have a technical issue",
          "I want to learn about features",
          "Other question"
        ],
      }
      // Small delay to make it feel natural
      setTimeout(() => {
        setMessages([welcomeMessage])
      }, 300)
    }
  }, [isOpen, messages.length])

  // Pages where chat support should be hidden
  const hiddenPages = [
    "/choose-doctor",
    "/choose-lab",
    "/case-design-center",
    "/lab-product-library",
    "/global-product-library",
    "/patient-input",
  ]

  // Check if current page should hide chat support
  const shouldHideChat = pathname ? hiddenPages.some((page) => pathname.startsWith(page)) : false

  // Don't render if on a hidden page (after all hooks)
  if (shouldHideChat) {
    return null
  }

  const handleToggle = () => {
    if (isOpen) {
      // Reset messages when closing the chat
      setMessages([])
      setMessage("")
    }
    setIsOpen(!isOpen)
  }

  const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * supportResponses.length)
    return supportResponses[randomIndex]
  }

  const getRandomUserQuickReplies = () => {
    const randomIndex = Math.floor(Math.random() * userQuickReplies.length)
    return userQuickReplies[randomIndex]
  }

  const handleSend = (text?: string, isQuickReply: boolean = false) => {
    const messageToSend = text || message.trim()
    if (messageToSend) {
      const newMessage: Message = {
        id: Date.now(),
        text: messageToSend,
        sender: "user" as const,
        // Add random quick replies to user messages (50% chance), but not if it's from a quick reply button
        quickReplyButtons: !isQuickReply && Math.random() > 0.5 ? getRandomUserQuickReplies() : undefined,
      }
      setMessages((prev) => [...prev, newMessage])
      setMessage("")

      // Simulate support response with random response and quick replies
      setTimeout(() => {
        const randomResponse = getRandomResponse()
        const supportResponse: Message = {
          id: Date.now() + 1,
          text: randomResponse.text,
          sender: "support" as const,
          quickReplyButtons: randomResponse.quickReplies,
        }
        setMessages((prev) => [...prev, supportResponse])
      }, 1000)
    }
  }

  const handleQuickReply = (replyText: string) => {
    handleSend(replyText, true)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Mobile positioning - account for bottom navigation (64px height)
  const buttonBottom = isMobile ? "bottom-20" : "bottom-6"
  const chatBottom = isMobile ? "bottom-20" : "bottom-6"

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed right-6 z-50",
              chatBottom,
              "bg-white rounded-lg shadow-2xl border border-[#E0E0E0] flex flex-col",
              isMobile 
                ? "w-[calc(100vw-3rem)] h-[calc(100vh-10rem)] max-w-sm" 
                : "w-96 h-[600px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E0E0E0] bg-[#1162A8] rounded-t-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-white" />
                <h3 className="text-white font-medium text-base">Customer Support</h3>
              </div>
              <button
                onClick={handleToggle}
                className="p-1.5 rounded-lg hover:bg-[#0f5497] transition-colors text-white"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm">Start a conversation with our support team</p>
                  <p className="text-xs text-gray-400 mt-1">We're here to help!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    <div
                      className={cn(
                        "flex",
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                          msg.sender === "user"
                            ? "bg-[#1162A8] text-white"
                            : "bg-white text-gray-800 border border-[#E0E0E0]"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                    {/* Quick Reply Buttons */}
                    {msg.quickReplyButtons && msg.quickReplyButtons.length > 0 && (
                      <div
                        className={cn(
                          "flex flex-wrap gap-2",
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.quickReplyButtons.map((reply, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickReply(reply)}
                            className={cn(
                              "text-xs px-3 py-1.5 h-auto",
                              msg.sender === "user"
                                ? "border-[#1162A8] text-[#1162A8] hover:bg-[#1162A8] hover:text-white"
                                : "border-[#E0E0E0] text-gray-700 hover:bg-[#dfeefb] hover:border-[#1162A8] hover:text-[#1162A8]"
                            )}
                          >
                            {reply}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#E0E0E0] bg-white rounded-b-lg">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  size="icon"
                  className="shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          onClick={handleToggle}
          className={cn(
            "fixed right-6 z-50",
            buttonBottom,
            "bg-[#1162A8] text-white rounded-full p-4 shadow-lg",
            "hover:bg-[#0f5497] hover:shadow-xl",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-[#1162A8] focus:ring-offset-2"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open chat"
          aria-expanded={false}
        >
          <MessageCircle className="h-6 w-6" />
        </motion.button>
      )}
    </>
  )
}

