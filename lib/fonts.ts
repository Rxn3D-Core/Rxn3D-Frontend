import localFont from "next/font/local"

/**
 * Self-hosted fonts (latin subsets) formerly loaded via next/font/google.
 * Files live in public/fonts/ so production builds do not fetch Google Fonts.
 */

export const inter = localFont({
  src: "../public/fonts/Inter-latin.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
})

export const islandMoments = localFont({
  src: "../public/fonts/IslandMoments-Regular.woff2",
  variable: "--font-island-moments",
  display: "swap",
  weight: "400",
})

export const windSong = localFont({
  src: "../public/fonts/WindSong-Regular.woff2",
  variable: "--font-windsong",
  display: "swap",
  weight: "400",
})
