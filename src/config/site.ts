export const SITE = {
  name: 'MD Anik Hasan',
  shortName: 'Anik',
  title: 'MD Anik Hasan | Website and Software Developer in Bangladesh',
  description:
    'MD Anik Hasan builds full-stack web products and custom software, and currently runs Boilabin, a Bangladesh-focused ecommerce marketplace.',
  origin: 'https://www.mdanikhasan.com',
  location: 'Dhaka, Bangladesh',
  email: 'hello@mdanikhasan.com',
  discord: 'https://discord.com/users/751170057664462938',
  github: 'https://github.com/mdanikhasan-me',
  linkedin: 'https://www.linkedin.com/in/mdanikhasan-me/',
  facebook: 'https://www.facebook.com/mdanikhasan.me',
  x: 'https://x.com/mdanikhasan_me',
  instagram: 'https://www.instagram.com/mdanikhasan_me/',
  youtube: 'https://www.youtube.com/@mdanikhasan_me',
  tiktok: 'https://www.tiktok.com/@mdanikhasan.me',
} as const;

export const SOCIAL_PROFILES = [
  { label: 'LinkedIn', href: SITE.linkedin },
  { label: 'GitHub', href: SITE.github },
  { label: 'X', href: SITE.x },
  { label: 'Facebook', href: SITE.facebook },
  { label: 'Instagram', href: SITE.instagram },
  { label: 'YouTube', href: SITE.youtube },
  { label: 'TikTok', href: SITE.tiktok },
] as const;

export const PRIMARY_NAVIGATION = [
  { href: '/work/', label: 'Work' },
  { href: '/services/', label: 'Services' },
  { href: '/writing/', label: 'Writing' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
] as const;
