import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    host: true,
    allowedHosts: ['irritate-awhile-catnap.ngrok-free.dev'],
    watch: {
      // Ignore transient atomic-save temp files created by other tools, which
      // otherwise trigger EBUSY errors in Vite's file watcher on Windows.
      ignored: ['**/*.tmp', '**/*.tmpdir/**', '**/.*.tmpdir/**']
    }
  }
})
