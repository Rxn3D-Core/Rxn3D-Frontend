import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-http-backend"

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)

  .init({
    fallbackLng: "en",
    defaultNS: "translation",
    ns: ["translation"],
    debug: false,

    // Preload only the default language to reduce initial requests
    preload: ["en"],

    // Load resources on demand for better performance
    load: 'languageOnly',
    
    // Prevent reloading resources that are already loaded
    partialBundledLanguages: true,
    
    // Cache loaded resources to prevent multiple requests
    initImmediate: false,

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      // Prevent 404 errors by handling missing files gracefully
      allowMultiLoading: false,
      crossDomain: false,
      // Add request options to handle errors and caching
      requestOptions: {
        cache: "default", // Use browser cache to prevent multiple requests
      },
    },

    // Handle missing translations gracefully
    saveMissing: false,
    missingKeyHandler: false,

    // Only load languages that exist
    supportedLngs: ["en", "es"],
    nonExplicitSupportedLngs: false,

    detection: {
      order: ["localStorage", "cookie", "navigator"],
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "i18nextLng",
      lookupCookie: "i18next",
      cookieExpirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      // Only detect supported languages
      checkWhitelist: true,
    },
  })

// Handle backend loading errors gracefully
i18n.on("failedLoading", (lng, ns, msg) => {
  console.warn(`i18n: Failed to load ${lng}/${ns}:`, msg)
  // Don't throw errors, just log warnings
})

export default i18n
