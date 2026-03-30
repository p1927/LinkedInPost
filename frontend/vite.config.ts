import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages has no server fallback for client-side routes. Copying the built
 * `index.html` to `404.html` lets deep links and refreshes on `/topics`, etc. load the SPA.
 */
function spaGithubPages404(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-github-pages-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const indexHtml = path.resolve(process.cwd(), outDir, 'index.html')
      const notFoundHtml = path.resolve(process.cwd(), outDir, '404.html')
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, notFoundHtml)
      }
    },
  }
}

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
  plugins: [react(), tailwindcss(), spaGithubPages404()],
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
