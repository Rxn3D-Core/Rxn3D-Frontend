import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import enTranslation from "@/public/locales/en/translation.json"
import esTranslation from "@/public/locales/es/translation.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    defaultNS: "translation",
    ns: ["translation"],
    debug: false,
    initImmediate: false,

    resources: {
      en: { translation: enTranslation },
      es: { translation: esTranslation },
    },

    interpolation: {
      escapeValue: false,
    },

    saveMissing: false,

    supportedLngs: ["en", "es"],
    nonExplicitSupportedLngs: false,

    detection: {
      order: ["localStorage", "cookie", "navigator"],
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "i18nextLng",
      lookupCookie: "i18next",
      cookieExpirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      checkWhitelist: true,
    },
  })

export default i18n
