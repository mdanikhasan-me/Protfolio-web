const fs = require('fs');
const path = require('path');

const SETTINGS_DIR = path.join(__dirname, '..', 'content', 'settings');

const DEFAULT_SITE_URL = 'https://mdanikhasan.com';
const DEFAULT_SITE_NAME = 'Md Yani Hassan';
const DEFAULT_SITE_DESCRIPTION = 'Personal portfolio, projects, and blog of Md Yani Hassan, a game developer from Bangladesh focused on Unreal Engine, programming, and practical web builds.';
const DEFAULT_META_TITLE = 'Md Yani Hassan, Game Developer Portfolio in Bangladesh';
const DEFAULT_META_DESCRIPTION = 'Md Yani Hassan is a game developer from Bangladesh and a Computer Science and Engineering student sharing portfolio projects, dev logs, and practical web builds.';
const DEFAULT_OG_IMAGE = '/assets/og/preview.png';
const DEFAULT_LOGO = '/assets/icons/icon-192.png';
const DEFAULT_THEME_COLOR = '#07100d';
const DEFAULT_GOOGLE_VERIFICATION = 'RifOZcU90W5gHKCjrueCg9PtBGAjq9LEXamyo_TaoBE';
const DEFAULT_EMAIL = 'anikhasan2@icloud.com';
const DEFAULT_RESPONSE_TIME = 'I usually respond within 24 to 48 hours.';
const DEFAULT_TWITTER_HANDLE = '@mdanikhasan_dev';

const SOCIAL_DEFAULTS = {
  github: 'https://github.com/mdanikhasan-dev',
  linkedin: 'https://www.linkedin.com/in/mdanikhasan-dev/',
  facebook: 'https://www.facebook.com/mdanikhasan.dev',
  x: 'https://x.com/mdanikhasan_dev',
  discord: 'https://discord.com/users/751170057664462938',
  instagram: '',
  youtube: 'https://www.youtube.com/@mdanikhasan_dev',
};

function stripQuotes(value) {
  let out = String(value || '').trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1);
  }
  return out;
}

function readSimpleYaml(filename) {
  const file = path.join(SETTINGS_DIR, filename);
  if (!fs.existsSync(file)) return {};

  const out = {};
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = stripQuotes(line.slice(idx + 1));
    out[key] = value;
  }

  return out;
}

function pickFirst() {
  for (const value of arguments) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeSiteUrl(value) {
  return pickFirst(value, DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function toAbsoluteSiteUrl(value, siteUrl) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${siteUrl}${raw}`;
  return `${siteUrl}/${raw.replace(/^\.?\//, '')}`;
}

function deriveTwitterHandle(url, fallback) {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)x\.com$/i.test(parsed.hostname) && !/(^|\.)twitter\.com$/i.test(parsed.hostname)) {
      return fallback;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    const handle = segments[0];
    if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      return fallback;
    }

    return `@${handle}`;
  } catch (error) {
    return fallback;
  }
}

function buildCountrySchema(value) {
  const name = String(value || '').trim();
  if (!name) return null;
  return {
    '@type': 'Country',
    name,
  };
}

const general = readSimpleYaml('general.yml');
const seo = readSimpleYaml('seo.yml');
const social = readSimpleYaml('social.yml');
const contact = readSimpleYaml('contact.yml');

const SITE_URL = normalizeSiteUrl(general.site_url);
const SITE_NAME = pickFirst(general.site_title, DEFAULT_SITE_NAME);
const AUTHOR_URL = `${SITE_URL}/about/`;
const SITE_DESCRIPTION = pickFirst(general.site_description, DEFAULT_SITE_DESCRIPTION);
const META_TITLE = pickFirst(seo.meta_title, `${SITE_NAME}, Game Developer Portfolio in Bangladesh`, DEFAULT_META_TITLE);
const META_DESCRIPTION = pickFirst(seo.meta_description, `${SITE_NAME} is a game developer from Bangladesh sharing portfolio projects, dev logs, and practical web builds.`, DEFAULT_META_DESCRIPTION, SITE_DESCRIPTION);

const configuredLogo = String(general.logo || '').trim();
const LOGO_IMAGE = toAbsoluteSiteUrl(pickFirst(configuredLogo, DEFAULT_LOGO), SITE_URL);
const OG_IMAGE = toAbsoluteSiteUrl(pickFirst(seo.og_image, DEFAULT_OG_IMAGE), SITE_URL);
const OG_IMAGE_ALT = `Portfolio preview of ${SITE_NAME}`;
const TWITTER_HANDLE = deriveTwitterHandle(pickFirst(social.x, SOCIAL_DEFAULTS.x), DEFAULT_TWITTER_HANDLE);
const THEME_COLOR = DEFAULT_THEME_COLOR;
const GOOGLE_VERIFICATION = DEFAULT_GOOGLE_VERIFICATION;
const EMAIL = pickFirst(contact.email, DEFAULT_EMAIL);
const RESPONSE_TIME = pickFirst(contact.response_time, DEFAULT_RESPONSE_TIME);
const LOCATION = pickFirst(contact.location, '');
const COUNTRY_SCHEMA = buildCountrySchema(pickFirst(LOCATION, 'Bangladesh'));

const SOCIAL_LINKS = {
  github: pickFirst(social.github, SOCIAL_DEFAULTS.github),
  linkedin: pickFirst(social.linkedin, SOCIAL_DEFAULTS.linkedin),
  facebook: pickFirst(social.facebook, SOCIAL_DEFAULTS.facebook),
  instagram: pickFirst(social.instagram, SOCIAL_DEFAULTS.instagram),
  youtube: pickFirst(social.youtube, SOCIAL_DEFAULTS.youtube),
  x: pickFirst(social.x, SOCIAL_DEFAULTS.x),
  discord: pickFirst(social.discord, SOCIAL_DEFAULTS.discord),
};

const PERSON_SCHEMA_FULL = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  mainEntityOfPage: AUTHOR_URL,
  image: configuredLogo
    ? {
        '@type': 'ImageObject',
        url: LOGO_IMAGE,
      }
    : {
        '@type': 'ImageObject',
        url: OG_IMAGE,
        width: 1200,
        height: 630,
      },
  jobTitle: 'Game Developer and CSE Student',
  description: `${SITE_NAME} is a game developer from Bangladesh and a Computer Science and Engineering student at United International University focused on Unreal Engine, programming fundamentals, and practical web builds.`,
  email: EMAIL,
  ...(COUNTRY_SCHEMA ? { homeLocation: buildCountrySchema(COUNTRY_SCHEMA.name), nationality: buildCountrySchema(COUNTRY_SCHEMA.name) } : {}),
  affiliation: {
    '@type': 'CollegeOrUniversity',
    name: 'United International University',
    alternateName: 'UIU',
  },
  knowsAbout: [
    'Game Development',
    'Unreal Engine',
    'C++',
    'JavaScript',
    'Python',
    'Web Development',
    'Three.js',
    'Blender',
    'Aseprite',
    'Pixel Art',
    'Computer Science',
  ],
  sameAs: Object.values(SOCIAL_LINKS).filter(Boolean),
};

const PERSON_SCHEMA_STUB = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: SITE_NAME,
  url: AUTHOR_URL,
};

const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'en-US',
  description: SITE_DESCRIPTION,
  logo: LOGO_IMAGE,
  image: OG_IMAGE,
  about: {
    '@id': `${SITE_URL}/#person`,
  },
  creator: {
    '@id': `${SITE_URL}/#person`,
  },
  publisher: {
    '@id': `${SITE_URL}/#person`,
  },
};

const WEBSITE_SCHEMA_STUB = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'en-US',
};

module.exports = {
  SITE_URL,
  SITE_NAME,
  AUTHOR_URL,
  SITE_DESCRIPTION,
  META_TITLE,
  META_DESCRIPTION,
  OG_IMAGE,
  OG_IMAGE_ALT,
  LOGO_IMAGE,
  TWITTER_HANDLE,
  THEME_COLOR,
  GOOGLE_VERIFICATION,
  EMAIL,
  RESPONSE_TIME,
  LOCATION,
  SOCIAL_DEFAULTS,
  SOCIAL_LINKS,
  PERSON_SCHEMA_FULL,
  PERSON_SCHEMA_STUB,
  WEBSITE_SCHEMA,
  WEBSITE_SCHEMA_STUB,
};
