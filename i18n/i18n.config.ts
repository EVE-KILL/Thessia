import de from "~/i18n/locales/de.json";
// Import all locales
import en from "~/i18n/locales/en.json";
import es from "~/i18n/locales/es.json";
import fr from "~/i18n/locales/fr.json";
import ja from "~/i18n/locales/ja.json";
import ko from "~/i18n/locales/ko.json";
import ru from "~/i18n/locales/ru.json";
import zh from "~/i18n/locales/zh.json";

export default defineI18nConfig(() => ({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  // Include all locale messages
  messages: {
    en,
    de,
    es,
    fr,
    ja,
    ko,
    ru,
    zh,
  },
  // Add this to ensure cookie detection works correctly
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: "i18n_locale",
    redirectOn: "root",
    cookieCrossOrigin: false,
    alwaysRedirect: false,
  },
}));
