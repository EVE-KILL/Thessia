/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/theme/modern/components/**/*.{js,vue,ts}",
    "./src/theme/modern/layouts/**/*.vue",
    "./src/theme/modern/pages/**/*.vue",
    "./src/theme/core/plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
    "./node_modules/@nuxt/ui/dist/**/*.{js,vue,mjs,ts}",
  ],
  theme: {
    extend: {
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      opacity: {
        85: "0.85",
      },
    },
  },
  plugins: [],
  // Ensure core plugins are enabled
  corePlugins: {
    opacity: true,
    backgroundColor: true,
    backgroundOpacity: true,
    textOpacity: true,
    borderOpacity: true,
  },
  // More specific safelist patterns
  safelist: [
    // Background opacity classes
    {
      pattern: /bg-(white|black|gray)-(10|20|30|40|50|60|70|80|90)/,
      variants: ["hover"],
    },
    // Custom opacity utility classes
    "custom-bg-white-60",
    "custom-bg-black-40",
    "custom-bg-white-85",
    "custom-bg-black-85",
    // Backdrop classes
    "backdrop-blur-custom",
    "backdrop-blur-sm",
  ],
};
