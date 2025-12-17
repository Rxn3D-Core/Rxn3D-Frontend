"use client"

import { useState } from "react"

export function useFormValidation(registrationType: "Lab" | "Office" = "Lab") {
  const [validationErrors, setValidationErrors] = useState({})
  const [userValidationErrors, setUserValidationErrors] = useState({})
  const [userFormValidationErrors, setUserFormValidationErrors] = useState({})

  const fieldErrorMessages = {
    name: "Name is required",
    address: "Address is required",
    city: "City is required",
    state_id: "State is required",
    country_id: "Country is required",
    postal_code: "Postal code is required",
    website: "Please enter a valid website URL",
    first_name: "First name is required",
    last_name: "Last name is required",
    email: "Email is required",
    phone: "Phone number is required",
    work_number: "Work number is required",
    role: "Position is required",
    license_number: "License number is required",
    signature: "Signature is required",
  }

  const validateWebsiteUrl = (url: string) => {
    if (!url) return true // Empty is valid (not required)
    return /\.[a-zA-Z]{2,}$/.test(url)
  }

  const validateEmail = (email: string) => {
    if (!email) return false // Empty is not valid for email

    // Email validation regex
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailPattern.test(email)
  }

  const validateProfileForm = (registrationData, setValidationErrors) => {
    const requiredFields = ["name", "address", "city", "state_id", "country_id", "postal_code"]
    const missingFields = requiredFields.filter((field) => !registrationData[field])

    if (registrationData.website && !validateWebsiteUrl(registrationData.website)) {
      setValidationErrors((prev) => ({
        ...prev,
        website: fieldErrorMessages.website,
      }))
      return false
    }

    if (missingFields.length > 0) {
      setValidationErrors(
        missingFields.reduce(
          (acc, field) => ({
            ...acc,
            [field]: fieldErrorMessages[field] || `${field} is required`,
          }),
          {},
        ),
      )
      return false
    }

    setValidationErrors({})
    return true
  }

  const validateUserForm = (user, setUserValidationErrors, isDoctor = false) => {
    const requiredUserFields = ["first_name", "last_name", "email", "phone", "work_number", "role"]

    // Add license_number as required for doctors
    if (isDoctor || user.role === "doctor" || user.role === "doctor_admin") {
      requiredUserFields.push("license_number")
    }

    // Add signature as required for office registration
    if (isDoctor || user.role === "doctor" || user.role === "doctor_admin") {
      requiredUserFields.push("signature")
    }

    const missingUserFields = requiredUserFields.filter((field) => !user[field])

    if (user.email && !validateEmail(user.email)) {
      setUserValidationErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }))
      return false
    }

    if (missingUserFields.length > 0) {
      setUserValidationErrors(
        missingUserFields.reduce(
          (acc, field) => ({
            ...acc,
            [field]: fieldErrorMessages[field] || `${field} is required`,
          }),
          {},
        ),
      )
      return false
    }

    setUserValidationErrors({})
    return true
  }

  const validateAdminUserForm = (adminUser, setUserValidationErrors) => {
    return validateUserForm(
      adminUser,
      setUserValidationErrors,
      adminUser.role === "doctor" || adminUser.role === "doctor_admin",
    )
  }

  const validateNewUserForm = (userForm, setUserFormValidationErrors) => {
    return validateUserForm(
      userForm,
      setUserFormValidationErrors,
      userForm.role === "doctor" || userForm.role === "doctor_admin",
    )
  }

  const clearAllValidationErrors = () => {
    setValidationErrors({})
    setUserValidationErrors({})
    setUserFormValidationErrors({})
  }

  return {
    validationErrors,
    userValidationErrors,
    userFormValidationErrors,
    validateWebsiteUrl,
    validateEmail,
    validateProfileForm,
    validateAdminUserForm,
    validateNewUserForm,
    setValidationErrors,
    setUserValidationErrors,
    setUserFormValidationErrors,
    clearAllValidationErrors,
  }
}
