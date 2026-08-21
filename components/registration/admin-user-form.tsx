"use client"

import { UserForm } from "./user-form"

type AdminUserFormProps = {
  adminUser: any;
  userValidationErrors: any;
  handleAdminFormChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateUser: () => void;
  registrationType: string;
  dense?: boolean;
  allowAdminEmailEdit?: boolean;
};

export function AdminUserForm({
  adminUser,
  userValidationErrors,
  handleAdminFormChange,
  updateUser,
  registrationType,
  dense = false,
  allowAdminEmailEdit = false,
}: AdminUserFormProps) {
  return (
    <div>
      {!dense ? <h2 className="mb-4 text-lg font-medium">Admin User Profile</h2> : null}
      <UserForm
        user={adminUser}
        userValidationErrors={userValidationErrors}
        handleUserFormChange={handleAdminFormChange}
        updateUser={updateUser}
        index={0}
        registrationType={registrationType}
        isDoctor={adminUser?.role === "doctor" || adminUser?.role === "doctor_admin" || adminUser?.is_doctor}
        isAdminForm={true}
        allowAdminEmailEdit={allowAdminEmailEdit}
        dense={dense}
      />
    </div>
  )
}
