import { execSync } from 'node:child_process'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/** Shown in the workspace sidebar; set from CI (GitHub Actions) or local git. */
function appBuildLabel(): string {
  const rawSha = (process.env.VITE_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '').trim()
  const sha = rawSha ? rawSha.slice(0, 7) : gitShortSha()
  const run = (process.env.VITE_CI_RUN_NUMBER || process.env.GITHUB_RUN_NUMBER || '').trim()
  const parts: string[] = []
  if (sha) parts.push(sha)
  if (run) parts.push(`#${run}`)
  return parts.join(' · ') || 'local'
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_LABEL__: JSON.stringify(appBuildLabel()),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    /** Fail fast so the URL always matches Google Cloud “Authorized JavaScript origins” (e.g. http://localhost:5174). */
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: process.env.VITE_BASE_PATH || '/',
})
