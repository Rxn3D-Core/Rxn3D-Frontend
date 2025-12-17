"use client"
import { X, UserPlus, Loader2, Mail } from "lucide-react"
import { UserForm } from "./user-form"

interface User {
  first_name?: string;
  last_name?: string;
  role?: string;
  [key: string]: any;
}

interface AdditionalUserFormProps {
  userForm: User;
  users: User[];
  userFormValidationErrors: Record<string, string>;
  handleUserFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleRemoveUser: (index: number) => void;
  handleAddUser: () => void;
  showAnimation: boolean;
  setUserForm: React.Dispatch<React.SetStateAction<User>>;
  registrationType: string;
}

export function AdditionalUserForm({
  userForm,
  users,
  userFormValidationErrors,
  handleUserFormChange,
  handleRemoveUser,
  handleAddUser,
  showAnimation,
  setUserForm,
  registrationType,
}: AdditionalUserFormProps) {
  const isDoctor = userForm?.role === "doctor" || userForm?.role === "doctor_admin"
  const adminUser = users?.[0] || null

  const getUserTypeLabel = (user: User) => {
    const roleMap: Record<string, string> = {
      lab_admin: "Admin",
      lab_user: "User",
      office_admin: "Admin",
      doctor: "Doctor",
      office_user: "User",
    }
    return roleMap[user?.role ?? ""] || user?.role?.replace("_", " ") || ""
  }

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">User Profile</h2>

        <UserForm
          user={userForm}
          userValidationErrors={userFormValidationErrors}
          handleUserFormChange={(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => handleUserFormChange(e)}
          updateUser={(_: any, data: User) => setUserForm((prev: User) => ({ ...prev, ...data }))}
          index={-1}
          registrationType={registrationType}
          isDoctor={isDoctor}
          adminUser={adminUser}
          isAdminForm={false}
        />

        {/* Added Users */}
      <div className="mt-6 flex flex-wrap gap-2">
        {users?.map((user, index) => (
          <div key={index} className="flex items-center bg-white border border-[#d9d9d9] rounded px-3 py-1">
            <span className="text-sm">
              {user?.first_name} {user?.last_name} - {getUserTypeLabel(user)}
            </span>
            {index > 0 && ( // Only show remove button for non-admin users
              <button onClick={() => handleRemoveUser(index)} className="ml-2">
                <X className="h-4 w-4 text-[#a19d9d] hover:text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite Animation */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
            <div className="mb-4 text-[#1162a8]">
              <Mail className="h-12 w-12 animate-bounce" />
            </div>
            <p className="text-lg font-medium mb-2">Adding User...</p>
            <p className="text-sm text-[#a19d9d]">Please wait while we add the user.</p>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-8 clear-right">
        <button
          className={`px-4 py-2 rounded flex items-center transition-colors
            ${
              showAnimation || users?.length >= 4
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-[#1162a8] text-white hover:bg-[#0e518e]"
            }
          `}
          onClick={handleAddUser}
          disabled={showAnimation || users?.length >= 4}
        >
          {showAnimation ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Add User
        </button>
      </div>
    </div>
  )
}
