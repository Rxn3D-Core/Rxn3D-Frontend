import type Echo from "laravel-echo"

let echoInstance: Echo | null = null

export async function initializeEcho(authToken: string): Promise<Echo> {
  if (echoInstance) return echoInstance

  if (typeof window === "undefined") throw new Error("Echo must be initialized on the client")

  // Dynamically import to avoid SSR issues
  const [{ default: EchoClass }, { default: Pusher }] = await Promise.all([
    import("laravel-echo"),
    import("pusher-js"),
  ])

  ;(window as any).Pusher = Pusher

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
  // Broadcasting auth lives at /broadcasting/auth (no /v1 prefix)
  const authEndpoint = apiBaseUrl.replace(/\/v1\/?$/, "") + "/broadcasting/auth"

  echoInstance = new EchoClass({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? "6001"),
    wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? "6001"),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint,
    auth: {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    },
  })

  return echoInstance
}

export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

export function getEcho(): Echo | null {
  return echoInstance
}
