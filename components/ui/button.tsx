"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus:shadow-[0_0_0_4px_rgba(17,98,168,0.15)] disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "bg-[#1162A8] text-white border-none hover:brightness-110 hover:shadow-[0_0_8px_rgba(0,0,0,0.15)]",
        success: "bg-[#119933] text-white border-none hover:brightness-110 hover:shadow-[0_0_8px_rgba(0,0,0,0.15)]",
        warning: "bg-[#FF9900] text-white border-none hover:brightness-110 hover:shadow-[0_0_8px_rgba(0,0,0,0.15)]",
        destructive: "bg-[#CF0202] text-white border-none hover:brightness-110 hover:shadow-[0_0_8px_rgba(0,0,0,0.15)]",
        outline: "border-[1.5px] border-[#E0E0E0] bg-white hover:bg-[#dfeefb] hover:text-[#1162A8] hover:border-[#1162A8]",
        secondary: "bg-gray-100 text-gray-900 hover:bg-[#dfeefb] hover:text-[#1162A8]",
        ghost: "bg-transparent hover:bg-[#dfeefb] hover:text-[#1162A8]",
        link: "text-[#1162A8] underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
