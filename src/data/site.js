const SITE_URL = 'https://mdanikhasan.com';
const SITE_NAME = 'MD Anik Hasan';
const SITE_DESCRIPTION = 'Personal portfolio and blog of MD Anik Hasan, a CSE student at UIU focused on game development, web work, and open source growth.';
const OG_IMAGE = `${SITE_URL}/assets/og/preview.png`;
const OG_IMAGE_ALT = 'MD Anik Hasan portfolio preview';
const TWITTER_HANDLE = '@mdanikhasan_dev';
const THEME_COLOR = '#07100d';
const GOOGLE_VERIFICATION = 'RifOZcU90W5gHKCjrueCg9PtBGAjq9LEXamyo_TaoBE';
const EMAIL = 'anikhasan2@icloud.com';

const SOCIAL_DEFAULTS = {
  github: 'https://github.com/mdanikhasan-dev',
  linkedin: 'https://www.linkedin.com/in/mdanikhasan-dev/',
  facebook: 'https://www.facebook.com/mdanikhasan.dev',
  x: 'https://x.com/mdanikhasan_dev',
  discord: 'https://discord.com/users/751170057664462938',
  instagram: '',
  youtube: 'https://www.youtube.com/@mdanikhasan_dev',
};

const PERSON_SCHEMA_FULL = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  image: {
    '@type': 'ImageObject',
    url: OG_IMAGE,
    width: 1200,
    height: 630,
  },
  jobTitle: 'CSE Student & Aspiring Game Developer',
  description: 'MD Anik Hasan is a Computer Science and Engineering student at United International University (UIU) with interests in game development, Unreal Engine world building, pixel art, and programming fundamentals.',
  email: EMAIL,
  alumniOf: {
    '@type': 'EducationalOrganization',
    name: 'United International University',
    alternateName: 'UIU',
  },
  knowsAbout: [
    'Computer Science',
    'Game Development',
    'Unreal Engine',
    'Pixel Art',
    'C++',
    'JavaScript',
    'Python',
    'Three.js',
    'Blender',
  ],
  sameAs: [
    SOCIAL_DEFAULTS.github,
    SOCIAL_DEFAULTS.x,
    SOCIAL_DEFAULTS.linkedin,
    SOCIAL_DEFAULTS.facebook,
  ],
};

const PERSON_SCHEMA_STUB = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

const WEBSITE_SCHEMA = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'en-US',
  description: SITE_DESCRIPTION,
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
  SITE_DESCRIPTION,
  OG_IMAGE,
  OG_IMAGE_ALT,
  TWITTER_HANDLE,
  THEME_COLOR,
  GOOGLE_VERIFICATION,
  EMAIL,
  SOCIAL_DEFAULTS,
  PERSON_SCHEMA_FULL,
  PERSON_SCHEMA_STUB,
  WEBSITE_SCHEMA,
  WEBSITE_SCHEMA_STUB,
};
