import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: 'MD Anik Hasan — Website and Software Developer',
      short_name: 'MD Anik Hasan',
      description:
        'Portfolio, services, project case studies, and writing from MD Anik Hasan in Bangladesh.',
      start_url: '/',
      scope: '/',
      display: 'browser',
      background_color: '#eee7d5',
      theme_color: '#eee7d5',
      lang: 'en',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }),
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
      },
    },
  );
