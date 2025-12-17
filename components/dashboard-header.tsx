"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BellIcon, MenuIcon, SearchIcon, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"

export function DashboardHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout } = useAuth()

  // Get current date
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  const formattedDate = today.toLocaleDateString("en-US", options)

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 md:px-6 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="hidden md:block">
            <Image
              src="/placeholder.svg?height=40&width=40"
              alt="Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
          </div>
        </div>

        <div className="hidden md:flex relative max-w-xs">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hidden md:flex items-center" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan Driver Slip
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <BellIcon className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                5
              </Badge>
              <span className="sr-only">Notifications</span>
            </Button>
          </div>

          <div className="flex items-center border-l pl-4 ml-2">
            <div className="text-right mr-3">
              <div className="text-blue-600 font-semibold">Hi {user?.name || "User"}</div>
              <div className="text-xs text-gray-500">Today is {formattedDate}</div>
            </div>
            <Avatar className="h-9 w-9 border border-gray-200">
              <AvatarImage src={user?.avatar || "/placeholder.svg?height=36&width=36"} alt="User" />
              <AvatarFallback>
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.removeItem("library_token");
              localStorage.removeItem("labAdminHistory");
              logout();
            }}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
