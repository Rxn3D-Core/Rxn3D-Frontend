export const isOpenRegistrationEnabled =
  process.env.NEXT_PUBLIC_OPEN_REGISTRATION_ENABLED === "true"

/** When false, Turnstile widget is hidden and OTP send skips captcha (must match backend TURNSTILE_ENABLED). */
export const isTurnstileEnabled =
  process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === "true"

export const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"

export type RegistrationPurpose = "lab" | "office" | "personal"
