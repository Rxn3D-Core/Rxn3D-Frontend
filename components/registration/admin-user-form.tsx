"use client"

import { UserForm } from "./user-form"

type AdminUserFormProps = {
  adminUser: any;
  userValidationErrors: any;
  handleAdminFormChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateUser: () => void;
  registrationType: string;
};

export function AdminUserForm({
  adminUser,
  userValidationErrors,
  handleAdminFormChange,
  updateUser,
  registrationType,
}: AdminUserFormProps) {
  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Admin User Profile</h2>
      <UserForm
        user={adminUser}
        userValidationErrors={userValidationErrors}
        handleUserFormChange={handleAdminFormChange}
        updateUser={updateUser}
        index={0}
        registrationType={registrationType}
        isDoctor={adminUser?.role === "doctor" || adminUser?.role === "doctor_admin"}
        isAdminForm={true} adminUser={undefined}      />
    </div>
  )
}
