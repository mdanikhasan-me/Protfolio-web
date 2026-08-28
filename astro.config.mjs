// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import process from 'node:process';
import { URL } from 'node:url';

const captureSinkOrigin = process.env.PORTFOLIO_CAPTURE_SINK_ORIGIN;
const connectSources = ["'self'"];
if (captureSinkOrigin) {
  const captureSink = new URL(captureSinkOrigin);
  if (captureSink.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(captureSink.hostname)) {
    throw new Error('PORTFOLIO_CAPTURE_SINK_ORIGIN must be a local HTTP origin');
  }
  connectSources.push(captureSink.origin);
}

export default defineConfig({
  site: 'https://mdanikhasan.com',
  output: 'static',
  trailingSlash: 'always',
  server: {
    allowedHosts: ['conflict-reading-drainage-dictionary.trycloudflare.com'],
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const pathname = new globalThis.URL(page).pathname;
        return !['/404/', '/search/'].includes(pathname);
      },
    }),
  ],
  markdown: {
    syntaxHighlight: 'prism',
  },
  security: {
    csp: {
      algorithm: 'SHA-384',
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        `connect-src ${connectSources.join(' ')}`,
        "font-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "manifest-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "worker-src 'self'",
      ],
    },
  },
});
