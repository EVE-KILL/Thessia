export default defineAppConfig({
  ui: {
    // Strategy options: 'prefix' | 'prefix-except-default' | 'composition' | 'no-prefix'
    strategy: "prefix-except-default",

    // Default locale for UI components
    defaultLocale: "en",

    notifications: {
      // Default notification position
      position: "top-right",
    },
  },
});
