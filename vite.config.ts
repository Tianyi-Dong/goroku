import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  // Note: the OPFS SAHPool VFS does not require SharedArrayBuffer, so the
  // COOP/COEP cross-origin-isolation headers are intentionally not set here
  // (they can interfere with cross-origin fetches such as the LLM API).
})
