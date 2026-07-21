import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: "/",
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            ui: ["radix-ui", "lucide-react", "class-variance-authority", "tailwind-merge"],
            data: ["axios", "@tanstack/react-query", "zustand", "zod", "jwt-decode"],
          },
        },
      },
    },
    server: {
      proxy: {
        // Forward /api to Django when VITE_API_URL is unset in local development.
        "/api": {
          target: env.VITE_API_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  }
})
