const theme = process.env.THEME || 'modern';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    css: [ '~/src/theme/' + theme + '/assets/main.css' ],

    colorMode: {
        classSuffix: "",
        storage: "cookie",
        storageKey: "theme",
        preference: "system",
        fallback: "dark",
    }
});
