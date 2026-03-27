# MD Anik Hasan Portfolio + CMS

Static portfolio site with a Git-based blog workflow for GitHub + Netlify.

## Stack

- Static HTML/CSS/JS frontend
- Decap CMS at `/sawlper/`
- Netlify Identity + Git Gateway for editing
- Custom Node build script for blog generation

## Project structure

- `src/pages/` — source pages
- `src/admin/` — CMS admin
- `src/content/posts/` — markdown blog posts
- `public/` — copied directly to production
- `scripts/build-site.js` — build pipeline
- `dist/` — generated deploy output

## Commands

```bash
npm install
npm run build
```

## Deployment

1. Push the repository to GitHub.
2. Connect the repo to Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Enable Netlify Identity.
6. Enable Git Gateway.
7. Open `/sawlper/` to create and publish posts.

Posts are saved in `src/content/posts/`, media uploads are stored in `public/uploads/`, and each publish triggers a new Netlify build.
