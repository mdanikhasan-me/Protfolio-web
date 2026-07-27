import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const GET: APIRoute = async (context) => {
  const articles = (await getCollection('articles', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

  return rss({
    title: `${SITE.name} — field notes`,
    description:
      'First-hand notes about websites, custom software, practical automation, native Windows work, Boilabin, and learning language models from scratch.',
    site: context.site ?? SITE.origin,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishedAt,
      link: `/writing/${article.id}/`,
      categories: article.data.topics,
    })),
    customData: '<language>en</language>',
  });
};
