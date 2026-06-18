import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a subpath on the combined "AEP Games" Static Web App.
// `base` makes Vite emit /cap-table/-prefixed asset URLs; import.meta.env.BASE_URL
// reflects it for public assets, the router basename, and the QR play URL.
export default defineConfig({
  base: '/cap-table/',
  plugins: [react()],
})
