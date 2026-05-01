import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

const content = `# ${SITE.name}

> MD Anik Hasan is a full-stack web and software developer in Dhaka, Bangladesh, and the founder of Boilabin, a Bangladesh-focused ecommerce marketplace he currently runs.

## Primary services

- [Website development](${SITE.origin}/services/website-development/)
- [Custom software development](${SITE.origin}/services/custom-software-development/)
- [Native Windows software](${SITE.origin}/services/native-windows-software/)

## Verified work

- [Boilabin](${SITE.origin}/work/boilabin/): ecommerce marketplace founded, built, and currently run by MD Anik Hasan.
- [SoctuKit](${SITE.origin}/work/soctukit/): native Windows social-media automation product.
- [UIU Discord Bot](${SITE.origin}/work/uiu-discord-bot/): Python and Discord automation for UIU notices and university information.
- [Salty Potato AI](${SITE.origin}/lab/salty-potato-ai/): in-development language-model system and desktop software.

## Boundaries

Boilabin's private code, customer data, suppliers, and operational details are not published. Salty Potato AI is in development, not production-ready or a benchmark claim.
`;

export const GET: APIRoute = () =>
  new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
