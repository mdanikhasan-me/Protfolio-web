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
      background_color: '#f0eadb',
      theme_color: '#f0eadb',
      lang: 'en',
    }),
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
      },
    },
  );
