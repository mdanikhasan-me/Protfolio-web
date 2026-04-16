<p align="center">
  <img src="./public/assets/icons/icon-192.png" alt="MD Anik Hasan portfolio icon" width="96" height="96">
</p>

<h1 align="center">MD Anik Hasan Portfolio and CMS</h1>

<p align="center">
  Personal website, project archive, and publishing workflow for
  <a href="https://mdanikhasan.com">mdanikhasan.com</a>
</p>

<p align="center">
  I wanted this repo to feel like my own space, not a copy pasted starter.
  It stays lightweight, fast, and easy to update while still giving me a clean portfolio,
  a blog, a CMS workflow, and strong SEO output.
</p>

<p align="center">
  <a href="https://mdanikhasan.com">Live site</a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://mdanikhasan.com/about/">About</a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://mdanikhasan.com/projects/">Projects</a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://mdanikhasan.com/blog/">Blog</a>
</p>

## What this repo is

This is the codebase behind my portfolio and content workflow. I kept it simple on purpose:
static pages, markdown content, custom build logic, and final files shipped from `dist`.
I care more about control, speed, and clean output than piling on a heavy stack just to publish projects and posts.

<table>
  <tr>
    <td width="33%">
      <strong>Portfolio first</strong><br>
      Home, about, projects, contact, and blog pages are built for a personal brand site instead of a generic theme.
    </td>
    <td width="33%">
      <strong>Custom publishing</strong><br>
      Markdown content and structured settings flow through a Node build script that writes the final site into <code>dist</code>.
    </td>
    <td width="33%">
      <strong>Netlify ready</strong><br>
      The repo works with free Netlify hosting, with optional Decap CMS editing at <code>/sawlper/</code>.
    </td>
  </tr>
</table>

## Featured projects

<table>
  <tr>
    <td><strong>Portfolio</strong></td>
    <td>The main personal site and brand hub for my work, writing, and SEO focused web presence.</td>
    <td>
      <a href="https://mdanikhasan.com/">Live site</a><br>
      <a href="https://github.com/mdanikhasan-dev/Protfolio-web">Repository</a>
    </td>
  </tr>
  <tr>
    <td><strong>UIU Bot</strong></td>
    <td>A Discord bot built around UIU student utility, moderation, and day to day automation.</td>
    <td>Project showcase only</td>
  </tr>
  <tr>
    <td><strong>Boilabin</strong></td>
    <td>A project I want represented in this README as part of my work, without adding any source code link here.</td>
    <td>Listed without source code</td>
  </tr>
</table>

## Inside the project

<table>
  <tr>
    <td><code>src/pages</code></td>
    <td>Source page templates</td>
  </tr>
  <tr>
    <td><code>src/partials</code></td>
    <td>Shared layout pieces for nav, SEO output, and footer content</td>
  </tr>
  <tr>
    <td><code>src/content/posts</code></td>
    <td>Markdown blog posts</td>
  </tr>
  <tr>
    <td><code>src/content/projects</code></td>
    <td>Project entries and case study style content</td>
  </tr>
  <tr>
    <td><code>src/content/settings</code></td>
    <td>Site identity, SEO, and social settings</td>
  </tr>
  <tr>
    <td><code>src/admin</code></td>
    <td>CMS entry point</td>
  </tr>
  <tr>
    <td><code>public</code></td>
    <td>Static assets copied into the final deploy</td>
  </tr>
  <tr>
    <td><code>scripts/build-site.js</code></td>
    <td>Custom build pipeline</td>
  </tr>
  <tr>
    <td><code>dist</code></td>
    <td>Generated production output</td>
  </tr>
</table>

## Local use

```bash
npm install
npm run check
npm run build
```

Open the generated output from `dist` after build, or deploy it directly through Netlify.

## What gets generated for you

1. Clean static HTML pages
2. Blog post pages and project pages
3. XML sitemap, HTML sitemap, RSS, and JSON Feed so crawlers and readers can discover fresh content faster
4. Open Graph tags, Twitter cards, canonical data, and JSON LD so pages look better when shared and read more clearly in search
5. Internal links and SEO metadata shaped around crawlability, branded search, and portfolio discoverability

## Netlify setup

This repo works on the free Netlify plan.

1. Connect the repository to Netlify.
2. Use build command `npm run build`.
3. Use publish directory `dist`.
4. Enable Identity and Git Gateway if you want CMS editing.
5. Open `/sawlper/` after setup to publish posts and manage content.

## Good places to edit first

1. `src/content/settings/general.yml` for the core site identity and global details
2. `src/content/settings/seo.yml` for SEO defaults, titles, and metadata
3. `src/content/settings/social.yml` for profile links and identity signals
4. `src/content/pages/homepage.yml` for the home page copy and highlights
5. `src/content/pages/about.yml` for the about page content
6. `src/data/site.js` for sitewide metadata, schema, and shared SEO output
7. `src/data/pages.js` for page specific SEO rules and metadata generation

## Why I built it this way

I wanted a site that feels personal, loads fast, stays easy to update, and does not turn into framework noise just to publish text, projects, and profile content. This setup keeps the output simple while still giving me CMS editing, structured SEO, feeds, and a clean deploy flow.
