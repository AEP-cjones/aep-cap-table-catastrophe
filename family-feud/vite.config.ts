import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Served from a subpath on the combined "AEP Games" Static Web App.
// `base` makes Vite emit /family-feud/-prefixed asset URLs; import.meta.env.BASE_URL
// reflects it for public assets, the router basename, and the QR play URL.
export default defineConfig({
  base: '/family-feud/',
  plugins: [react(), tailwindcss()],
  // This app is nested inside the Cap Table repo, which has its own root
  // postcss.config.js (Tailwind v3). PostCSS resolves config by walking UP the
  // tree, so without this it would apply Cap Table's v3 config to Feud's v4 CSS
  // and fail. Feud's Tailwind v4 runs via the @tailwindcss/vite plugin (above),
  // not PostCSS, so pinning an empty inline PostCSS config fully isolates it.
  css: { postcss: {} },
})
