import de from "./locales/de.json";
// Import all locales
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

export default defineI18nConfig(() => ({
    runtimeOnly: true,
    compositionOnly: true,
    fullInstall: false,
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
