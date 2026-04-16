const fs = require('fs');
const path = require('path');

const {
  SITE_URL,
  SITE_NAME,
  META_TITLE,
  META_DESCRIPTION,
  OG_IMAGE,
  OG_IMAGE_ALT,
  GOOGLE_VERIFICATION,
  EMAIL,
  PERSON_SCHEMA_FULL,
  PERSON_SCHEMA_PROFILE,
  WEBSITE_SCHEMA,
  WEBSITE_SCHEMA_STUB,
} = require('./site');

const ROBOTS_DEFAULT = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const ROOT_DIR = path.join(__dirname, '..', '..');

function latestIsoDateForPaths(paths) {
  const timestamps = [];

  function collect(targetPath) {
    const fullPath = path.join(ROOT_DIR, targetPath);
    if (!fs.existsSync(fullPath)) return;

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(fullPath)) {
        collect(path.join(targetPath, entry));
      }
      return;
    }

    timestamps.push(stats.mtime);
  }

  for (const targetPath of paths) {
    collect(targetPath);
  }

  if (!timestamps.length) return new Date().toISOString();
  return new Date(Math.max(...timestamps.map(value => value.getTime()))).toISOString();
}

const PAGE_MODIFIED = {
  home: latestIsoDateForPaths([
    'src/pages/index.html',
    'src/content/pages/homepage.yml',
    'src/content/settings/general.yml',
    'src/content/settings/seo.yml',
  ]),
  about: latestIsoDateForPaths([
    'src/pages/about.html',
    'src/content/pages/about.yml',
    'src/content/settings/general.yml',
    'src/content/settings/seo.yml',
  ]),
  blog: latestIsoDateForPaths([
    'src/pages/blog.html',
    'src/content/posts',
  ]),
  contact: latestIsoDateForPaths([
    'src/pages/contact.html',
    'src/content/pages/contact.yml',
    'src/content/settings/contact.yml',
    'src/content/settings/social.yml',
  ]),
  projects: latestIsoDateForPaths([
    'src/pages/projects.html',
    'src/content/projects',
  ]),
  sitemap: latestIsoDateForPaths([
    'src/pages/sitemap.html',
    'src/content/posts',
    'src/content/projects',
    'scripts/build-site.js',
  ]),
};

module.exports = {
  home: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/`,
    ogType: 'website',
    ogDescription: META_DESCRIPTION,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: GOOGLE_VERIFICATION,
    preloadHomeBackground: true,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA,
        PERSON_SCHEMA_FULL,
        {
          '@type': 'WebPage',
          '@id': `${SITE_URL}/#webpage`,
          name: SITE_NAME,
          url: `${SITE_URL}/`,
          inLanguage: 'en-BD',
          description: META_DESCRIPTION,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: { '@id': `${SITE_URL}/#person` },
          mainEntity: { '@id': `${SITE_URL}/#person` },
          dateModified: PAGE_MODIFIED.home,
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: OG_IMAGE,
          },
        },
      ],
    },
  },

  about: {
    title: `Who Is ${SITE_NAME}? Game Developer from Bangladesh`,
    description: `Learn who ${SITE_NAME} is, how the interest in games began, and what this Bangladesh based game developer is building next.`,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/about/`,
    ogType: 'profile',
    ogDescription: `Learn who ${SITE_NAME} is, how the interest in games began, and what this Bangladesh based game developer is building next.`,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    extraHead: `  <meta property="profile:first_name" content="Anik">\n  <meta property="profile:last_name" content="Hasan">`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA_STUB,
        PERSON_SCHEMA_PROFILE,
        {
          '@type': ['AboutPage', 'ProfilePage'],
          '@id': `${SITE_URL}/about/#webpage`,
          name: `About ${SITE_NAME}`,
          url: `${SITE_URL}/about/`,
          inLanguage: 'en-BD',
          description: `Learn who ${SITE_NAME} is, how the interest in games began, and what this Bangladesh based game developer is building next.`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          mainEntity: { '@id': `${SITE_URL}/#person` },
          dateModified: PAGE_MODIFIED.about,
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/about/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home',  item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about/` },
          ],
        },
      ],
    },
  },

  blog: {
    title: `${SITE_NAME} Blog and Dev Logs`,
    description: `Programming notes, game development dev logs, and technical writeups by ${SITE_NAME} from Bangladesh.`,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/blog/`,
    ogType: 'website',
    ogDescription: `Programming notes, game development dev logs, and technical writeups by ${SITE_NAME} from Bangladesh.`,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    extraHead: `  <link rel="alternate" type="application/feed+json" title="${SITE_NAME} Blog JSON Feed" href="/blog/feed.json">`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA_STUB,
        PERSON_SCHEMA_FULL,
        {
          '@type': 'Blog',
          '@id': `${SITE_URL}/blog/#webpage`,
          name: `${SITE_NAME} Blog and Dev Logs`,
          url: `${SITE_URL}/blog/`,
          inLanguage: 'en-BD',
          description: `Programming notes, game development dev logs, and technical writeups by ${SITE_NAME} from Bangladesh.`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          author: { '@id': `${SITE_URL}/#person` },
          dateModified: PAGE_MODIFIED.blog,
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/blog/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
          ],
        },
      ],
    },
  },

  contact: {
    title: `Contact ${SITE_NAME}`,
    description: `Contact ${SITE_NAME} in Bangladesh for portfolio inquiries, collaboration, or project discussions.`,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/contact/`,
    ogType: 'website',
    ogDescription: `Reach out to ${SITE_NAME} in Bangladesh for portfolio inquiries, collaboration, or project discussions.`,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA_STUB,
        PERSON_SCHEMA_FULL,
        {
          '@type': 'ContactPage',
          '@id': `${SITE_URL}/contact/#webpage`,
          name: `Contact ${SITE_NAME}`,
          url: `${SITE_URL}/contact/`,
          inLanguage: 'en-BD',
          description: `Reach out to ${SITE_NAME} in Bangladesh for portfolio inquiries, collaboration, or project discussions.`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: { '@id': `${SITE_URL}/#person` },
          mainEntity: { '@id': `${SITE_URL}/#contact-point` },
          dateModified: PAGE_MODIFIED.contact,
        },
        {
          '@type': 'ContactPoint',
          '@id': `${SITE_URL}/#contact-point`,
          email: EMAIL,
          contactType: 'portfolio inquiries',
          availableLanguage: 'English',
          url: `${SITE_URL}/contact/`,
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/contact/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home',    item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact/` },
          ],
        },
      ],
    },
  },

  projects: {
    title: `${SITE_NAME} Projects and Case Studies`,
    description: `Game development, programming, and web projects by ${SITE_NAME} with source code, build notes, and live demos when available.`,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/projects/`,
    ogType: 'website',
    ogDescription: `Game development, programming, and web projects by ${SITE_NAME} with source code, build notes, and live demos when available.`,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA_STUB,
        PERSON_SCHEMA_FULL,
        {
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/projects/#webpage`,
          name: `${SITE_NAME} Projects and Case Studies`,
          url: `${SITE_URL}/projects/`,
          inLanguage: 'en-BD',
          description: `Game development, programming, and web projects by ${SITE_NAME} with source code, build notes, and live demos when available.`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: { '@id': `${SITE_URL}/#person` },
          dateModified: PAGE_MODIFIED.projects,
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/projects/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home',     item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Projects', item: `${SITE_URL}/projects/` },
          ],
        },
      ],
    },
  },

  sitemap: {
    title: `HTML Sitemap for ${SITE_NAME}`,
    description: `Browse the main pages, blog posts, and projects for ${SITE_NAME} in one crawlable place.`,
    robots: ROBOTS_DEFAULT,
    canonical: `${SITE_URL}/sitemap/`,
    ogType: 'website',
    ogDescription: `Browse the main pages, blog posts, and projects for ${SITE_NAME} in one crawlable place.`,
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        WEBSITE_SCHEMA_STUB,
        PERSON_SCHEMA_FULL,
        {
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/sitemap/#webpage`,
          name: `HTML Sitemap for ${SITE_NAME}`,
          url: `${SITE_URL}/sitemap/`,
          inLanguage: 'en-BD',
          description: `Browse the main pages, blog posts, and projects for ${SITE_NAME} in one crawlable place.`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: { '@id': `${SITE_URL}/#person` },
          dateModified: PAGE_MODIFIED.sitemap,
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/sitemap/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'HTML Sitemap', item: `${SITE_URL}/sitemap/` },
          ],
        },
      ],
    },
  },

  notFound: {
    title: `Page Not Found for ${SITE_NAME}`,
    description: `The page you are looking for is not available. Head back to the homepage of ${SITE_NAME}.`,
    robots: 'noindex,follow',
    canonical: `${SITE_URL}/404.html`,
    ogType: 'website',
    ogDescription: 'The page you are looking for is not available.',
    ogImage: OG_IMAGE,
    ogImageAlt: OG_IMAGE_ALT,
    googleVerification: null,
    preloadHomeBackground: false,
    jsonLd: null,
  },
};
