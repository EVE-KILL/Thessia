/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
    "./node_modules/@nuxt/ui/dist/**/*.{js,vue,mjs,ts}"
  ],
  theme: {
    extend: {
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      opacity: {
        '85': '0.85',
      },
    },
  },
  plugins: [],
  // Ensure core plugins are explicitly enabled
  corePlugins: {
    opacity: true,
    backgroundColor: true,
    backgroundOpacity: true,
    textOpacity: true,
    borderOpacity: true,
  },
  // Use a more specific safelist format
  safelist: [
    {
      pattern: /bg-(white|black|gray|opacity)-(10|20|30|40|50|60|70|80|85|90)/,
    },
    {
      pattern: /hover:bg-(white|black|gray|opacity)-(10|20|30|40|50|60|70|80|85|90)/,
    }
  ],
}
