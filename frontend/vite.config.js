import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite Configuration
 * Configures the build pipeline, development server, and React Fast Refresh plugin
 * for the NutriMunch frontend single-page application.
 */
export default defineConfig({
  plugins: [react()],
})
