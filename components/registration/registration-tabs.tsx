"use client"

export function RegistrationTabs({
  activeTab,
  setActiveTab,
  registrationType,
}: {
  activeTab: string
  setActiveTab: (tab: string) => void
  registrationType: "Lab" | "Office"
}) {
  const profileTabName = registrationType === "Lab" ? "Lab Profile" : "Practice Profile"

  return (
    <div className="flex justify-center mb-8">
      <div
        className={`cursor-pointer px-8 py-2 text-center ${activeTab === "profile" ? "bg-[#e6f0f9] text-[#1162a8] font-medium" : ""}`}
      >
        {profileTabName}
      </div>
      <div
        className={`cursor-pointer px-8 py-2 text-center ${activeTab === "user" ? "bg-[#e6f0f9] text-[#1162a8] font-medium" : ""}`}
      >
        User Profile
      </div>
    </div>
  )
}
