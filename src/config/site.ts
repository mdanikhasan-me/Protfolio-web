export const SITE = {
  name: 'MD Anik Hasan',
  shortName: 'Anik',
  title: 'MD Anik Hasan | Website and Software Developer in Bangladesh',
  description:
    'MD Anik Hasan builds websites and custom software in Dhaka, Bangladesh, and is building Boilabin as a solo founder.',
  origin: 'https://mdanikhasan.com',
  location: 'Dhaka, Bangladesh',
  github: 'https://github.com/mdanikhasan-dev',
} as const;

export const PRIMARY_NAVIGATION = [
  { href: '/', label: 'Home' },
  { href: '/services/', label: 'Services' },
  { href: '/work/', label: 'Work' },
  { href: '/writing/', label: 'Writing' },
  { href: '/about/', label: 'About' },
  { href: '/hire/', label: 'Hire Me' },
] as const;
