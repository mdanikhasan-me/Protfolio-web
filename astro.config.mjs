// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mdanikhasan.com',
  output: 'static',
  trailingSlash: 'always',
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
        "connect-src 'self'",
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
