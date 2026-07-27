import { SITE } from '../config/site';

export type SchemaNode = Record<string, unknown>;

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, SITE.origin).href } : {}),
    })),
  };
}

export function websiteSchema(): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.origin,
    description: SITE.description,
    inLanguage: 'en',
  };
}

export function profilePageSchema(): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `About ${SITE.name}`,
    url: `${SITE.origin}/about/`,
    mainEntity: {
      '@type': 'Person',
      name: SITE.name,
      url: SITE.origin,
    },
  };
}

export function serviceSchema(title: string, description: string, route: string): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    description,
    url: new URL(route, SITE.origin).href,
    areaServed: [
      {
        '@type': 'Country',
        name: 'Bangladesh',
      },
      {
        '@type': 'Place',
        name: 'Remote',
      },
    ],
    provider: {
      '@type': 'Person',
      name: SITE.name,
      url: SITE.origin,
    },
  };
}

export function articleSchema(input: {
  title: string;
  description: string;
  route: string;
  publishedAt: Date;
  updatedAt?: Date;
}): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: new URL(input.route, SITE.origin).href,
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      name: SITE.name,
      url: SITE.origin,
    },
  };
}

export function softwareApplicationSchema(input: {
  name: string;
  description: string;
  route: string;
  operatingSystem?: string;
}): SchemaNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: new URL(input.route, SITE.origin).href,
    applicationCategory: 'DeveloperApplication',
    ...(input.operatingSystem ? { operatingSystem: input.operatingSystem } : {}),
    author: {
      '@type': 'Person',
      name: SITE.name,
      url: SITE.origin,
    },
  };
}
