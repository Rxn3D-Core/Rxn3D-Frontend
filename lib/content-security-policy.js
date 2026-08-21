/** Cloudflare Turnstile widget (registration OTP captcha). */
export const CSP_TURNSTILE_SCRIPT = "https://challenges.cloudflare.com"
export const CSP_CLOUDFLARE_INSIGHTS = "https://static.cloudflareinsights.com"

export const CSP_SCRIPT_SRC = `'self' 'unsafe-eval' 'unsafe-inline' blob: ${CSP_CLOUDFLARE_INSIGHTS} ${CSP_TURNSTILE_SCRIPT}`

export const CSP_CONNECT_SRC_EXTRA = `${CSP_TURNSTILE_SCRIPT}`

export const CSP_FRAME_SRC = `'self' blob: ${CSP_TURNSTILE_SCRIPT}`
