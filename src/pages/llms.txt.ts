import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

const content = `# ${SITE.name}

> MD Anik Hasan is a website and software developer in Dhaka, Bangladesh, and the solo founder of pre-launch ecommerce startup Boilabin.

## Primary services

- [Website development](${SITE.origin}/services/website-development/)
- [Custom software development](${SITE.origin}/services/custom-software-development/)
- [Native Windows software](${SITE.origin}/services/native-windows-software/)

## Verified work

- [Boilabin](${SITE.origin}/work/boilabin/): pre-launch ecommerce startup under active development.
- [SoctuKit](${SITE.origin}/work/soctukit/): built native Windows product.
- [UIU Discord Bot](${SITE.origin}/work/uiu-discord-bot/): built Python and Discord automation.
- [Salty Potato AI](${SITE.origin}/lab/salty-potato-ai/): experimental language-model build log.

## Boundaries

Boilabin has no claimed public launch date, revenue, customers, sellers, funding, team, or partnerships. Salty Potato AI is experimental, not production-ready or a benchmark claim.
`;

export const GET: APIRoute = () =>
  new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
