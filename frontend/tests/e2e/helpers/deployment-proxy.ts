/**
 * Thin reverse proxy for GitHub Pages deployment testing.
 *
 * Maps http://localhost:PROXY_PORT/* → https://p1927.github.io/LinkedInPost/*
 *
 * This allows Playwright to set baseURL = 'http://localhost:PROXY_PORT' and
 * navigate with absolute paths like '/topics/new', which then transparently
 * proxy to the correct GitHub Pages sub-path deployment URL.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

export const PROXY_PORT = 9876;
const TARGET_ORIGIN = 'https://p1927.github.io';
const TARGET_BASE = '/LinkedInPost';

export function startDeploymentProxy(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const targetPath = TARGET_BASE + (req.url || '/');
    const targetUrl = new URL(targetPath, TARGET_ORIGIN);

    const options: https.RequestOptions = {
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.hostname,
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      // Rewrite Location headers so redirects stay on the proxy
      const headers = { ...proxyRes.headers };
      if (headers.location) {
        try {
          const loc = new URL(headers.location, TARGET_ORIGIN);
          if (loc.hostname === targetUrl.hostname && loc.pathname.startsWith(TARGET_BASE)) {
            headers.location = loc.pathname.slice(TARGET_BASE.length) + loc.search + loc.hash;
          }
        } catch {
          // non-URL location — leave as-is
        }
      }
      res.writeHead(proxyRes.statusCode ?? 200, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });

    req.pipe(proxyReq, { end: true });
  });

  return new Promise((resolve, reject) => {
    server.listen(PROXY_PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}
