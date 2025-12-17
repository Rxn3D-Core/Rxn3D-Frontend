"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useWindowSize } from 'react-use'
import { useInvitation } from "@/contexts/invitation-context"
const ReactConfetti = dynamic(() => import("react-confetti"), {
  ssr: false,
})


type User = {
  id: string
  email: string
  email_verification_token: string
}

interface SuccessStepProps {
  users: User[]
  isSubmitting: boolean
  handleOnboarding: () => void
}

export function SuccessStep({ users, isSubmitting, handleOnboarding }: SuccessStepProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [showConfetti, setShowConfetti] = useState(true)
  const { resendInvitation } = useInvitation()
  useEffect(() => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    })

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)

    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 8000)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timer)
    }
  }, [])

  const handleResendClick = async () => {
    if (users && users.length > 0) {
      await resendInvitation(Number(users[0]?.id), users[0].email, users[0].email_verification_token)
    }
  }
  

  return (
    <div className="py-12 text-center relative">
      {showConfetti && (
      <div
        style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: dimensions.width,
        height: dimensions.height,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        }}
      >
        <ReactConfetti
        width={dimensions.width}
        height={dimensions.height}
        recycle={false}
        gravity={0.1}
        colors={["#1162a8", "#0d4d8a", "#4a90e2", "#63b3ed", "#90cdf4"]}
        numberOfPieces={400}
        />
      </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Ready to start?</h1>

      <div className="mb-6">
      <p className="mb-2">We've sent a confirmation email to the following address:</p>
      <ul className="text-center list-disc inline-block text-left">
        {users.map((user, index) => (
        <li key={index}>{user.email}</li>
        ))}
      </ul>
      </div>

      <p className="mb-8">
      We're thrilled to have you on board! We're here to simplify your practice
      <br />
      management and help your team deliver smiles effortlessly!
      </p>

      <div className="flex justify-center mb-12">
      <Link
        href={{
          pathname: "/login",
        }}
        passHref
      >
        <button
          className={`bg-[#1162a8] text-white px-6 py-3 rounded flex items-center justify-center min-w-[180px] ${
        isSubmitting ? "opacity-90" : "hover:bg-[#0d4d8a]"
          } transition-all duration-300 transform hover:scale-105`}
          onClick={handleOnboarding}
          disabled={isSubmitting}
        >
          <span>Start Onboarding</span>
        </button>
      </Link>
      </div>

      <p className="text-sm text-[#a19d9d]">
      If you didn't receive the email, check your spam folder or{" "}
      <button
        type="button"
        className="text-[#1162a8] underline hover:text-[#0d4d8a] focus:outline-none"
        onClick={handleResendClick}
        disabled={isSubmitting}
      >
        resend verification
      </button>
      .
      </p>
    </div>
  )
}
