const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const pagesDir = path.join(root, 'src', 'pages');
const adminDir = path.join(root, 'src', 'admin');
const partialsDir = path.join(root, 'src', 'partials');
const postSourceDir = path.join(root, 'src', 'content', 'posts');
const projectSourceDir = path.join(root, 'src', 'content', 'projects');
const analyticsFile = path.join(root, 'src', 'content', 'settings', 'analytics.yml');

const site = require('../src/data/site');
const pages = require('../src/data/pages');

const pageRoutes = [
  { source: 'index.html', output: 'index.html', meta: pages.home, activePage: '/' },
  { source: 'about.html', output: path.join('about', 'index.html'), meta: pages.about, activePage: null },
  { source: 'blog.html', output: path.join('blog', 'index.html'), meta: pages.blog, activePage: '/blog/' },
  { source: 'contact.html', output: path.join('contact', 'index.html'), meta: pages.contact, activePage: '/contact/' },
  { source: 'projects.html', output: path.join('projects', 'index.html'), meta: pages.projects, activePage: '/projects/' },
  { source: 'sitemap.html', output: path.join('sitemap', 'index.html'), meta: pages.sitemap, activePage: null },
  { source: '404.html', output: '404.html', meta: pages.notFound, activePage: null },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clearDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function buildVersion() {
  const assetPaths = [
    path.join(publicDir, 'assets', 'css', 'main.css'),
    path.join(publicDir, 'assets', 'js', 'boot.js'),
    path.join(publicDir, 'assets', 'js', 'core.js'),
    path.join(publicDir, 'assets', 'js', 'fx.js'),
    path.join(publicDir, 'assets', 'js', 'interactions.js'),
  ];
  const content = assetPaths.filter(fs.existsSync).map(p => fs.readFileSync(p)).join('');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function getMimeTypeByExt(file) {
  const raw = String(file || '').toLowerCase();
  const ext = raw.startsWith('.') ? raw : path.extname(raw);
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.avif') return 'image/avif';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.ico') return 'image/x-icon';
  return 'image/png';
}

function getImageSizeFromBuffer(buffer, ext) {
  const normalized = String(ext || '').toLowerCase();
  if (normalized === '.png') {
    if (buffer.length < 24) return { width: 1200, height: 630 };
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (normalized === '.jpg' || normalized === '.jpeg') {
    let offset = 2;
    while (offset + 3 < buffer.length) {
      if (buffer[offset] !== 0xFF) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      if (offset + 4 > buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      const isSOF = [0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker);
      if (isSOF) {
        if (offset + 8 >= buffer.length) break;
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      if (!length || length < 2) break;
      if (offset + 2 + length > buffer.length) break;
      offset += 2 + length;
    }
  }

  return { width: 1200, height: 630 };
}

function getImageMeta(publicUrl) {
  const cleanUrl = String(publicUrl || '').split('?')[0];
  if (!cleanUrl.startsWith('/')) {
    return { width: 1200, height: 630, type: getMimeTypeByExt(cleanUrl || '.png') };
  }
  const localPath = path.join(publicDir, cleanUrl.replace(/^\//, ''));
  if (!fs.existsSync(localPath)) {
    return { width: 1200, height: 630, type: getMimeTypeByExt(cleanUrl || '.png') };
  }
  try {
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath);
    const size = getImageSizeFromBuffer(buffer, ext);
    return {
      width: size.width || 1200,
      height: size.height || 630,
      type: getMimeTypeByExt(ext),
    };
  } catch (error) {
    return { width: 1200, height: 630, type: getMimeTypeByExt(cleanUrl || '.png') };
  }
}

function getAdjacentWebp(publicUrl) {
  const cleanUrl = String(publicUrl || '').split('?')[0];
  if (!cleanUrl.startsWith('/')) return '';
  const localPath = path.join(publicDir, cleanUrl.replace(/^\//, ''));
  const parsed = path.parse(localPath);
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);
  if (!fs.existsSync(webpPath)) return '';
  return `${path.posix.dirname(cleanUrl)}/${parsed.name}.webp`.replace(/\/+/g, '/').replace(/^\.\//, '/');
}

function buildResponsiveImage(publicUrl, alt, className, attrs = '') {
  const safeUrl = sanitizeUrl(publicUrl, { allowDataImage: true }) || '/assets/og/preview.png';
  const meta = getImageMeta(safeUrl);
  const webpUrl = getAdjacentWebp(safeUrl);
  const widthAttr = ` width="${meta.width}"`;
  const heightAttr = ` height="${meta.height}"`;
  const classAttr = className ? ` class="${className}"` : '';
  const extra = attrs ? ` ${attrs.trim()}` : '';
  const img = `<img${classAttr} src="${escapeHtml(safeUrl)}" alt="${escapeHtml(alt)}"${widthAttr}${heightAttr}${extra}>`;

  if (!webpUrl || webpUrl === safeUrl) {
    return { html: img, meta };
  }

  return {
    html: `<picture>${`<source srcset="${escapeHtml(webpUrl)}" type="image/webp">`}${img}</picture>`,
    meta,
  };
}

function buildInlineBootScript(buildV) {
  const bootPath = path.join(publicDir, 'assets', 'js', 'boot.js');
  if (!fs.existsSync(bootPath)) return '';
  const code = fs.readFileSync(bootPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `  <script>${code}</script>`;
}

function buildAnalyticsSnippet() {
  const analytics = readYamlFile(analyticsFile);
  const provider = String(analytics.provider || '').trim().toLowerCase();
  const domain = String(analytics.domain || '').trim();
  const scriptSrc = String(analytics.script_src || '').trim();

  if (provider === 'plausible' && domain) {
    const src = scriptSrc || 'https://plausible.io/js/script.js';
    const safeSrc = sanitizeUrl(src, { allowProtocolRelative: true });
    if (!safeSrc) return '';
    return `  <script defer data-domain="${escapeHtml(domain)}" src="${escapeHtml(safeSrc)}"></script>`;
  }

  if (provider === 'goatcounter' && domain) {
    const src = scriptSrc || '//gc.zgo.at/count.js';
    const endpoint = /^https?:\/\//i.test(domain) ? domain : `https://${domain.replace(/\/$/, '')}/count`;
    const safeSrc = sanitizeUrl(src, { allowProtocolRelative: true });
    if (!safeSrc) return '';
    return `  <script data-goatcounter="${escapeHtml(endpoint)}" async src="${escapeHtml(safeSrc)}"></script>`;
  }

  return '';
}

function buildHrefLangLinks(canonicalUrl) {
  return [
    `  <link rel="alternate" href="${escapeHtml(canonicalUrl)}" hreflang="en">`,
    `  <link rel="alternate" href="${escapeHtml(canonicalUrl)}" hreflang="x-default">`,
  ].join('\n');
}

function buildIdentityLinks() {
  const urls = Object.values(site.SOCIAL_LINKS || {})
    .map(url => sanitizeUrl(url))
    .filter(Boolean);

  return urls.map(url => `  <link rel="me" href="${escapeHtml(url)}">`).join('\n');
}

function minifyCss(css) {
  return String(css)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyDistCss() {
  const cssDir = path.join(dist, 'assets', 'css');
  if (!fs.existsSync(cssDir)) return;
  for (const entry of fs.readdirSync(cssDir)) {
    if (!entry.endsWith('.css')) continue;
    const full = path.join(cssDir, entry);
    const css = fs.readFileSync(full, 'utf8');
    fs.writeFileSync(full, minifyCss(css));
  }
}

function stripQuotes(value) {
  let out = String(value || '').trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1);
  }
  return out;
}

function readYamlFile(file) {
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

// Parses a page YML file reusing readFrontMatter (handles strings + lists)
function readPageYml(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const { data } = readFrontMatter(`---\n${raw}\n---\n`);
  return data;
}

// Estimate reading time in minutes (200 wpm average)
function estimateReadingTime(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Generic placeholder injection: replaces {{KEY}} with value for every entry in vars
function injectContentVars(html, vars) {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'), String(value));
  }
  return result;
}

function buildHomeDiscoverySection(posts, projects) {
  const latestPost = [...posts].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())[0] || null;
  const latestProject = [...projects].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())[0] || null;
  const cards = [];

  if (latestPost) {
    cards.push(`
          <article class="feature-item flow-sm">
            <p class="eyebrow">Latest blog post</p>
            <h3><a href="/blog/posts/${latestPost.slug}/">${escapeHtml(latestPost.title)}</a></h3>
            <p>${escapeHtml(latestPost.description)}</p>
            <p><a class="text-link" href="/blog/posts/${latestPost.slug}/">Read ${escapeHtml(latestPost.title)}</a></p>
          </article>`);
  }

  if (latestProject) {
    cards.push(`
          <article class="feature-item flow-sm">
            <p class="eyebrow">Latest project page</p>
            <h3><a href="/projects/${latestProject.slug}/">${escapeHtml(latestProject.title)}</a></h3>
            <p>${escapeHtml(latestProject.description)}</p>
            <p><a class="text-link" href="/projects/${latestProject.slug}/">View ${escapeHtml(latestProject.title)} details</a></p>
          </article>`);
  }

  cards.push(`
          <article class="feature-item flow-sm">
            <p class="eyebrow">Discovery</p>
            <h3><a href="/sitemap/">HTML Sitemap</a></h3>
            <p>Browse every main page, blog post, and project from one crawlable page designed to help people and search crawlers discover content faster.</p>
            <p><a class="text-link" href="/sitemap/">Open the HTML sitemap</a></p>
          </article>`);

  return `
      <section class="section section-line home-discovery">
        <div class="measure flow-md">
          <h2>Latest updates and crawl paths</h2>
          <p>Fresh content is linked from the homepage so visitors and search crawlers can reach new blog posts, projects, and the full HTML sitemap more easily.</p>
        </div>
        <div class="feature-list" aria-label="Latest updates and discovery links">
${cards.join('\n')}
        </div>
      </section>`;
}

// Build homepage template variables from CMS YML content
function buildHomeVars(c, posts, projects) {
  const skills = Array.isArray(c.skills) ? c.skills : ['C','C++','JavaScript','Python','HTML','CSS','Three.js','Unreal Engine','Blender','Unity','Aseprite','Docker'];
  const skillsHtml = skills.map(s => `            <li>${escapeHtml(String(s))}</li>`).join('\n');
  const whatidoTags = Array.isArray(c.whatido_tags) ? c.whatido_tags : ['3D games with pixel art aesthetics','Unreal Engine world building','Self made 3D models'];
  const whatidoTagsHtml = whatidoTags.map(t => `              <li>${escapeHtml(String(t))}</li>`).join('\n');
  return {
    HOME_HERO_TITLE:         escapeHtml(c.hero_title         || site.SITE_NAME),
    HOME_HERO_BODY:          escapeHtml(c.hero_body          || ''),
    HOME_HERO_CTA_LABEL:     escapeHtml(c.hero_cta_label     || `Who is ${site.SITE_NAME}?`),
    HOME_HERO_CTA_URL:       escapeHtml(c.hero_cta_url       || '/about/'),
    HOME_SKILLS_HEADING:     escapeHtml(c.skills_heading     || 'Skills and tools'),
    HOME_SKILLS_SUB:         escapeHtml(c.skills_sub         || 'Only the real stuff. The rest can come later.'),
    HOME_SKILLS_LIST:        skillsHtml,
    HOME_WHATIDO_HEADING:    escapeHtml(c.whatido_heading    || 'What I do'),
    HOME_WHATIDO_BODY:       escapeHtml(c.whatido_body       || ''),
    HOME_WHATIDO_TAGS:       whatidoTagsHtml,
    HOME_OPENSOURCE_HEADING: escapeHtml(c.opensource_heading || 'Open source'),
    HOME_OPENSOURCE_BODY:    escapeHtml(c.opensource_body    || ''),
    HOME_TIMELINE_HEADING:   escapeHtml(c.timeline_heading   || "Where I'm heading"),
    HOME_TIMELINE_SUB:       escapeHtml(c.timeline_sub       || ''),
    HOME_TIMELINE_1_TITLE:   escapeHtml(c.timeline_1_title   || ''),
    HOME_TIMELINE_1_DATE:    escapeHtml(c.timeline_1_date    || ''),
    HOME_TIMELINE_1_BODY:    escapeHtml(c.timeline_1_body    || ''),
    HOME_TIMELINE_2_TITLE:   escapeHtml(c.timeline_2_title   || ''),
    HOME_TIMELINE_2_DATE:    escapeHtml(c.timeline_2_date    || ''),
    HOME_TIMELINE_2_BODY:    escapeHtml(c.timeline_2_body    || ''),
    HOME_TIMELINE_3_TITLE:   escapeHtml(c.timeline_3_title   || ''),
    HOME_TIMELINE_3_DATE:    escapeHtml(c.timeline_3_date    || ''),
    HOME_TIMELINE_3_BODY:    escapeHtml(c.timeline_3_body    || ''),
    HOME_CLOSING_CTA:        escapeHtml(c.closing_cta        || "Let's build something real."),
    HOME_DISCOVERY_SECTION:  buildHomeDiscoverySection(posts, projects),
  };
}

// Build about page template variables from CMS YML content
function buildAboutVars(c) {
  return {
    ABOUT_STORY_HEADING: escapeHtml(c.story_heading || `Who is ${site.SITE_NAME}?`),
    ABOUT_BODY_1: escapeHtml(c.body_1 || ''),
    ABOUT_BODY_2: escapeHtml(c.body_2 || ''),
    ABOUT_BODY_3: escapeHtml(c.body_3 || ''),
    ABOUT_BODY_4: escapeHtml(c.body_4 || ''),
    ABOUT_BODY_5: escapeHtml(c.body_5 || ''),
    ABOUT_BODY_6: escapeHtml(c.body_6 || ''),
  };
}

// Build contact page template variables from CMS YML content
function buildContactVars(c) {
  return {
    CONTACT_INTRO: escapeHtml(c.intro || ''),
    CONTACT_NOTE:  escapeHtml(c.note  || ''),
    CONTACT_EMAIL: escapeHtml(site.EMAIL || ''),
    CONTACT_RESPONSE_TIME: escapeHtml(site.RESPONSE_TIME || ''),
    ...buildSocialVars(),
  };
}

function buildSitemapVars(posts, projects) {
  const pageLinks = [
    { href: '/', label: site.SITE_NAME },
    { href: '/about/', label: `Who Is ${site.SITE_NAME}?` },
    { href: '/projects/', label: `${site.SITE_NAME} Projects` },
    { href: '/blog/', label: `${site.SITE_NAME} Blog` },
    { href: '/contact/', label: `Contact ${site.SITE_NAME}` },
    { href: '/sitemap.xml', label: 'XML Sitemap' },
    { href: '/blog/feed.xml', label: 'Blog RSS Feed' },
    { href: '/blog/feed.json', label: 'Blog JSON Feed' },
  ];

  const pageLinksHtml = pageLinks.map(link => `                <li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`).join('\n');
  const postLinksHtml = posts.length
    ? posts.map(post => `                <li><a href="/blog/posts/${post.slug}/">${escapeHtml(post.title)}</a></li>`).join('\n')
    : '                <li>No blog posts published yet.</li>';
  const projectLinksHtml = projects.length
    ? projects.map(project => `                <li><a href="/projects/${project.slug}/">${escapeHtml(project.title)}</a></li>`).join('\n')
    : '                <li>No project pages published yet.</li>';

  return {
    HTML_SITEMAP_CONTENT: `
        <div class="feature-list" aria-label="${escapeHtml(site.SITE_NAME)} HTML sitemap sections">
          <section class="feature-item flow-sm">
            <p class="eyebrow">Main pages</p>
            <h2>Core site sections</h2>
            <ul class="simple-list">
${pageLinksHtml}
            </ul>
          </section>

          <section class="feature-item flow-sm">
            <p class="eyebrow">Blog</p>
            <h2>Published blog posts</h2>
            <ul class="simple-list">
${postLinksHtml}
            </ul>
          </section>

          <section class="feature-item flow-sm">
            <p class="eyebrow">Projects</p>
            <h2>Project detail pages</h2>
            <ul class="simple-list">
${projectLinksHtml}
            </ul>
          </section>
        </div>`,
  };
}

function getSiteHostLabel(siteUrl) {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./i, '').toUpperCase();
  } catch (error) {
    return String(siteUrl || '')
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toUpperCase();
  }
}

function buildSocialVars() {
  const socialLinks = site.SOCIAL_LINKS || {};
  return {
    SOCIAL_GITHUB_URL: escapeHtml(sanitizeUrl(socialLinks.github) || '#'),
    SOCIAL_DISCORD_URL: escapeHtml(sanitizeUrl(socialLinks.discord) || '#'),
    SOCIAL_X_URL: escapeHtml(sanitizeUrl(socialLinks.x) || '#'),
    SOCIAL_LINKEDIN_URL: escapeHtml(sanitizeUrl(socialLinks.linkedin) || '#'),
    SOCIAL_FACEBOOK_URL: escapeHtml(sanitizeUrl(socialLinks.facebook) || '#'),
    SOCIAL_YOUTUBE_URL: escapeHtml(sanitizeUrl(socialLinks.youtube) || '#'),
  };
}

function buildSharedVars() {
  return {
    SITE_NAME: escapeHtml(site.SITE_NAME),
    SITE_DOMAIN_LABEL: escapeHtml(getSiteHostLabel(site.SITE_URL)),
    ...buildSocialVars(),
  };
}

function replaceMarkerBlock(html, key, replacement) {
  if (!replacement) return html;
  const pattern = new RegExp(`<!-- ${escapeRegExp(key)}_START -->[\\s\\S]*?<!-- ${escapeRegExp(key)}_END -->`);
  return html.replace(pattern, replacement);
}

function parseValue(raw) {
  const value = stripQuotes(raw);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function readFrontMatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw.trim() };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  const lines = match[1].replace(/\r/g, '').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const baseMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!baseMatch) { i += 1; continue; }
    const key = baseMatch[1];
    const rest = baseMatch[2];
    if (rest) {
      const continuation = [];
      let next = i + 1;
      while (next < lines.length) {
        const continuationLine = lines[next];
        if (!continuationLine.trim()) { break; }
        if (!/^\s+/.test(continuationLine) || continuationLine.trim().startsWith('- ')) { break; }
        continuation.push(continuationLine.trim());
        next += 1;
      }
      data[key] = parseValue([rest].concat(continuation).join(' '));
      i = next;
      continue;
    }

    const list = [];
    const scalarLines = [];
    i += 1;
    while (i < lines.length) {
      const itemLine = lines[i];
      if (!itemLine.trim()) {
        if (scalarLines.length) { break; }
        i += 1;
        continue;
      }
      if (!/^\s+/.test(itemLine)) break;
      const trimmed = itemLine.trim();
      if (trimmed.startsWith('- ')) {
        if (scalarLines.length) { break; }
        const itemValue = trimmed.slice(2).trim();
        const objMatch = itemValue.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (objMatch) list.push(parseValue(objMatch[2]));
        else list.push(parseValue(itemValue));
        i += 1;
        continue;
      }
      if (list.length) { break; }
      scalarLines.push(trimmed);
      i += 1;
    }
    data[key] = list.length ? list : parseValue(scalarLines.join(' '));
  }

  return { data, body: match[2].trim() };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeUrl(value, options = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  const hasExplicitScheme = /^[a-z][a-z0-9+.-]*:/i.test(normalized);

  if (options.allowDataImage && /^data:image\//i.test(normalized)) {
    return raw;
  }

  if (options.allowProtocolRelative && raw.startsWith('//')) {
    return raw;
  }

  if (/^(https?:|mailto:|tel:)/i.test(normalized)) {
    return raw;
  }

  if (/^(\/(?!\/)|\.\/|\.\.\/|#|\?)/.test(raw)) {
    return raw;
  }

  if (!hasExplicitScheme) {
    return raw;
  }

  return '';
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function markdownToPlainText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[`*_>#]/g, ' ')
    .replace(/^\s*[-*]\s+/gm, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(text, maxLength = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= maxLength) return clean;
  const slice = clean.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : clean.slice(0, maxLength)).trim()}...`;
}

function toIsoDateTime(value, fallback) {
  const raw = String(value || '').trim();
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00Z`).toISOString();
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const fallbackDate = fallback instanceof Date ? fallback : new Date(fallback || Date.now());
  if (!Number.isNaN(fallbackDate.getTime())) return fallbackDate.toISOString();
  return new Date().toISOString();
}

function latestIsoDate() {
  const dates = Array.from(arguments)
    .flat()
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] ? dates[0].toISOString() : new Date().toISOString();
}

function buildAbsoluteSiteUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return site.SITE_URL;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${site.SITE_URL}${raw.startsWith('/') ? raw : `/${raw.replace(/^\.?\//, '')}`}`;
}

function markdownToHtml(md) {
  const html = [];
  let inCode = false;
  let codeBuffer = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let listOpen = false;

  function renderInline(text) {
    let t = escapeHtml(text);
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, url) {
      const safeUrl = sanitizeUrl(url, { allowDataImage: true });
      return safeUrl ? `<img src="${escapeHtml(safeUrl)}" alt="${alt}">` : alt;
    });
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      const safeUrl = sanitizeUrl(url);
      return safeUrl ? `<a href="${escapeHtml(safeUrl)}">${label}</a>` : label;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    return t;
  }

  function closeList() {
    if (listOpen) { html.push('</ul>'); listOpen = false; }
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList();
      if (!inCode) { inCode = true; codeBuffer = []; }
      else { html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`); inCode = false; }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }
    const trimmed = line.trim();
    if (!trimmed) { closeList(); continue; }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!listOpen) { html.push('<ul>'); listOpen = true; }
      html.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    if (/^###\s+/.test(trimmed)) html.push(`<h3>${renderInline(trimmed.replace(/^###\s+/, ''))}</h3>`);
    else if (/^##\s+/.test(trimmed)) html.push(`<h2>${renderInline(trimmed.replace(/^##\s+/, ''))}</h2>`);
    else if (/^#\s+/.test(trimmed)) html.push(`<h1>${renderInline(trimmed.replace(/^#\s+/, ''))}</h1>`);
    else html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  return html.join('\n');
}

function getPosts() {
  if (!fs.existsSync(postSourceDir)) return [];
  const posts = [];
  for (const file of fs.readdirSync(postSourceDir).filter(n => n.endsWith('.md'))) {
    const sourcePath = path.join(postSourceDir, file);
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const stat = fs.statSync(sourcePath);
    const { data, body } = readFrontMatter(raw);
    if (data.draft === true || data.draft === 'true') continue;
    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
    const cover = sanitizeUrl(data.cover, { allowDataImage: true }) || '/assets/og/preview.png';
    const plainText = markdownToPlainText(body);
    const publishedAt = toIsoDateTime(data.date, stat.mtime);
    const modifiedAt = latestIsoDate(
      toIsoDateTime(data.updated || data.modified, stat.mtime),
      publishedAt
    );
    posts.push({
      title: data.title || slug,
      slug,
      date: data.date || publishedAt.slice(0, 10),
      description: data.description || makeExcerpt(plainText),
      cover,
      body,
      bodyHtml: markdownToHtml(body),
      tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(t => String(t).trim()).filter(Boolean) : [],
      readingTime: estimateReadingTime(body),
      wordCount: plainText ? plainText.split(/\s+/).filter(Boolean).length : 0,
      publishedAt,
      modifiedAt,
      sourcePath,
    });
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}

function getProjects() {
  if (!fs.existsSync(projectSourceDir)) return [];
  const projects = [];
  for (const file of fs.readdirSync(projectSourceDir).filter(n => n.endsWith('.md'))) {
    const sourcePath = path.join(projectSourceDir, file);
    const raw = fs.readFileSync(sourcePath, 'utf8');
    const stat = fs.statSync(sourcePath);
    const { data, body } = readFrontMatter(raw);
    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
    const tools = Array.isArray(data.tools)
      ? data.tools.filter(Boolean).map(t => String(t).trim()).filter(Boolean)
      : (Array.isArray(data.stack) ? data.stack.filter(Boolean).map(t => String(t).trim()).filter(Boolean) : []);
    const plainText = markdownToPlainText(body);
    const description = data.description || makeExcerpt(plainText);
    const thumbnail = sanitizeUrl(data.thumbnail || data.cover, { allowDataImage: true }) || '/assets/og/preview.png';
    const publishedAt = toIsoDateTime(data.date, stat.mtime);
    const modifiedAt = latestIsoDate(
      toIsoDateTime(data.updated || data.modified, stat.mtime),
      publishedAt
    );
    projects.push({
      title: data.title || slug,
      slug,
      description,
      tools,
      sourceCode: sanitizeUrl(data.source_code) || '',
      liveDemo: sanitizeUrl(data.live_demo) || '',
      featured: data.featured === true || data.featured === 'true',
      thumbnail,
      body,
      bodyHtml: markdownToHtml(body),
      publishedAt,
      modifiedAt,
      sourcePath,
    });
  }
  projects.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  return projects;
}

function buildSeoHead(meta, buildV) {
  const seoTemplate = fs.readFileSync(path.join(partialsDir, 'seo.tpl'), 'utf8');

  const googleVerificationLine = meta.googleVerification
    ? `  <meta name="google-site-verification" content="${escapeHtml(meta.googleVerification)}">`
    : '';

  const preloadBg = meta.preloadHomeBackground
    ? `  <link rel="preload" as="image" href="/assets/bg/jungle-home.avif" type="image/avif">`
    : '';

  const jsonLdBlock = meta.jsonLd
    ? `  <script type="application/ld+json">\n${serializeJsonForHtml(meta.jsonLd)}\n  </script>`
    : '';
  const extraHead = meta.extraHead || '';

  const ogImageMeta = getImageMeta(meta.ogImage);

  return seoTemplate
    .replace(/\{\{SITE_NAME\}\}/g, escapeHtml(site.SITE_NAME))
    .replace('{{AUTHOR_URL}}', escapeHtml(site.AUTHOR_URL || `${site.SITE_URL}/about/`))
    .replace('{{IDENTITY_LINKS}}', buildIdentityLinks())
    .replace('{{META_ROBOTS}}', meta.robots)
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(meta.description))
    .replace(/\{\{TWITTER_HANDLE\}\}/g, escapeHtml(site.TWITTER_HANDLE || ''))
    .replace('{{THEME_COLOR}}', meta.themeColor)
    .replace('{{GOOGLE_VERIFICATION}}\n', googleVerificationLine ? `${googleVerificationLine}\n` : '')
    .replace(/\{\{CANONICAL_URL\}\}/g, escapeHtml(meta.canonical))
    .replace('{{HREFLANG_LINKS}}', buildHrefLangLinks(meta.canonical))
    .replace('{{OG_TYPE}}', meta.ogType)
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(meta.title))
    .replace('{{OG_DESCRIPTION}}', escapeHtml(meta.ogDescription))
    .replace('{{TWITTER_DESCRIPTION}}', escapeHtml(meta.description))
    .replace(/\{\{OG_IMAGE\}\}/g, escapeHtml(meta.ogImage))
    .replace('{{OG_IMAGE_WIDTH}}', String(ogImageMeta.width))
    .replace('{{OG_IMAGE_HEIGHT}}', String(ogImageMeta.height))
    .replace('{{OG_IMAGE_TYPE}}', ogImageMeta.type)
    .replace(/\{\{OG_IMAGE_ALT\}\}/g, escapeHtml(meta.ogImageAlt))
    .replace('{{PRELOAD_BG}}\n', preloadBg ? `${preloadBg}\n` : '')
    .replace('{{BOOT_INLINE}}', buildInlineBootScript(buildV))
    .replace('{{ANALYTICS_SNIPPET}}', buildAnalyticsSnippet())
    .replace(/\{\{BUILD_V\}\}/g, buildV)
    .replace('{{EXTRA_HEAD}}', extraHead)
    .replace('{{JSON_LD}}', jsonLdBlock)
    .replace('{{ARTICLE_META}}', '');
}

function buildPostPageTitle(post) {
  return `${post.title}, ${site.SITE_NAME} Blog`;
}

function buildProjectPageTitle(project) {
  return `${project.title}, ${site.SITE_NAME} Project`;
}

function buildPostSeoHead(post, buildV) {
  const coverImageMeta = getImageMeta(post.cover);
  const coverAbsoluteUrl = buildAbsoluteSiteUrl(post.cover);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      site.WEBSITE_SCHEMA_STUB,
      site.PERSON_SCHEMA_FULL,
      {
        '@type': 'BlogPosting',
        '@id': `${site.SITE_URL}/blog/posts/${post.slug}/#article`,
        headline: post.title,
        description: post.description,
        url: `${site.SITE_URL}/blog/posts/${post.slug}/`,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${site.SITE_URL}/blog/posts/${post.slug}/`,
        },
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt,
        author: { '@id': `${site.SITE_URL}/#person` },
        publisher: { '@id': `${site.SITE_URL}/#person` },
        about: { '@id': `${site.SITE_URL}/#person` },
        image: {
          '@type': 'ImageObject',
          url: coverAbsoluteUrl,
          width: coverImageMeta.width,
          height: coverImageMeta.height,
        },
        isPartOf: { '@id': `${site.SITE_URL}/blog/#webpage` },
        inLanguage: 'en-US',
        wordCount: post.wordCount,
        timeRequired: `PT${post.readingTime || 1}M`,
        ...(post.tags && post.tags.length ? { keywords: post.tags.join(', ') } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${site.SITE_URL}/blog/posts/${post.slug}/#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${site.SITE_URL}/blog/` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${site.SITE_URL}/blog/posts/${post.slug}/` },
        ],
      },
    ],
  };

  const seoTemplate = fs.readFileSync(path.join(partialsDir, 'seo.tpl'), 'utf8');
  const canonicalUrl = `${site.SITE_URL}/blog/posts/${post.slug}/`;
  const ogImage = coverAbsoluteUrl;
  const ogImageMeta = coverImageMeta;
  const extraHead = [
    `  <link rel="alternate" type="application/feed+json" title="${escapeHtml(site.SITE_NAME)} Blog JSON Feed" href="/blog/feed.json">`,
  ].join('\n');

  // Article-specific Open Graph + Twitter card extras
  const tagMeta = (post.tags || []).map(t => `  <meta property="article:tag" content="${escapeHtml(t)}">`).join('\n');
  const articleMeta = [
    `  <meta property="article:published_time" content="${escapeHtml(post.publishedAt)}">`,
    `  <meta property="article:modified_time"  content="${escapeHtml(post.modifiedAt)}">`,
    `  <meta property="og:updated_time" content="${escapeHtml(post.modifiedAt)}">`,
    `  <meta property="article:author" content="${escapeHtml(site.SITE_URL)}/#person">`,
    `  <meta property="article:section" content="Development">`,
    tagMeta,
    post.readingTime ? `  <meta name="twitter:label1" content="Reading time">` : '',
    post.readingTime ? `  <meta name="twitter:data1" content="${post.readingTime} min read">` : '',
    `  <meta name="twitter:label2" content="Written by">`,
    `  <meta name="twitter:data2" content="${escapeHtml(site.SITE_NAME)}">`,
  ].filter(Boolean).join('\n');

  return seoTemplate
    .replace(/\{\{SITE_NAME\}\}/g, escapeHtml(site.SITE_NAME))
    .replace('{{AUTHOR_URL}}', escapeHtml(site.AUTHOR_URL || `${site.SITE_URL}/about/`))
    .replace('{{IDENTITY_LINKS}}', buildIdentityLinks())
    .replace('{{META_ROBOTS}}', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(post.description))
    .replace(/\{\{TWITTER_HANDLE\}\}/g, escapeHtml(site.TWITTER_HANDLE || ''))
    .replace('{{THEME_COLOR}}', site.THEME_COLOR)
    .replace('{{GOOGLE_VERIFICATION}}\n', '')
    .replace(/\{\{CANONICAL_URL\}\}/g, escapeHtml(canonicalUrl))
    .replace('{{HREFLANG_LINKS}}', buildHrefLangLinks(canonicalUrl))
    .replace('{{OG_TYPE}}', 'article')
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(post.title))
    .replace('{{OG_DESCRIPTION}}', escapeHtml(post.description))
    .replace('{{TWITTER_DESCRIPTION}}', escapeHtml(post.description))
    .replace(/\{\{OG_IMAGE\}\}/g, escapeHtml(ogImage))
    .replace('{{OG_IMAGE_WIDTH}}', String(ogImageMeta.width))
    .replace('{{OG_IMAGE_HEIGHT}}', String(ogImageMeta.height))
    .replace('{{OG_IMAGE_TYPE}}', ogImageMeta.type)
    .replace(/\{\{OG_IMAGE_ALT\}\}/g, escapeHtml(post.title))
    .replace('{{PRELOAD_BG}}\n', '')
    .replace('{{BOOT_INLINE}}', buildInlineBootScript(buildV))
    .replace('{{ANALYTICS_SNIPPET}}', buildAnalyticsSnippet())
    .replace(/\{\{BUILD_V\}\}/g, buildV)
    .replace('{{EXTRA_HEAD}}', extraHead)
    .replace('{{JSON_LD}}', `  <script type="application/ld+json">\n${serializeJsonForHtml(jsonLd)}\n  </script>`)
    .replace('{{ARTICLE_META}}', articleMeta);
}

function buildProjectSchemaEntity(project, canonicalUrl, imageUrl, imageMeta) {
  const baseEntity = {
    '@id': `${canonicalUrl}#project`,
    name: project.title,
    description: project.description,
    image: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: imageMeta.width,
      height: imageMeta.height,
    },
    author: { '@id': `${site.SITE_URL}/#person` },
    creator: { '@id': `${site.SITE_URL}/#person` },
    ...(project.liveDemo || project.sourceCode ? { sameAs: [project.liveDemo, project.sourceCode].filter(Boolean) } : {}),
    ...(project.tools.length ? { keywords: project.tools.join(', ') } : {}),
  };

  if (project.sourceCode) {
    return {
      '@type': 'SoftwareSourceCode',
      ...baseEntity,
      url: canonicalUrl,
      codeRepository: project.sourceCode,
      ...(project.tools.length ? { programmingLanguage: project.tools } : {}),
      ...(project.liveDemo ? {
        targetProduct: {
          '@type': 'WebSite',
          name: project.title,
          url: project.liveDemo,
        },
      } : {}),
    };
  }

  if (project.liveDemo) {
    return {
      '@type': 'WebSite',
      ...baseEntity,
      url: project.liveDemo,
    };
  }

  return {
    '@type': 'CreativeWork',
    ...baseEntity,
    url: canonicalUrl,
  };
}

function buildProjectSeoHead(project, buildV) {
  const seoTemplate = fs.readFileSync(path.join(partialsDir, 'seo.tpl'), 'utf8');
  const canonicalUrl = `${site.SITE_URL}/projects/${project.slug}/`;
  const ogImage = buildAbsoluteSiteUrl(project.thumbnail);
  const ogImageMeta = getImageMeta(project.thumbnail);
  const projectEntity = buildProjectSchemaEntity(project, canonicalUrl, ogImage, ogImageMeta);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      site.WEBSITE_SCHEMA_STUB,
      site.PERSON_SCHEMA_FULL,
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${project.title}, ${site.SITE_NAME} Project`,
        description: project.description,
        inLanguage: 'en-US',
        isPartOf: { '@id': `${site.SITE_URL}/#website` },
        about: { '@id': `${site.SITE_URL}/#person` },
        mainEntity: { '@id': `${canonicalUrl}#project` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: ogImage,
        },
        datePublished: project.publishedAt,
        dateModified: project.modifiedAt,
      },
      projectEntity,
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Projects', item: `${site.SITE_URL}/projects/` },
          { '@type': 'ListItem', position: 3, name: project.title, item: canonicalUrl },
        ],
      },
    ],
  };

  const extraHead = [
    `  <meta property="og:updated_time" content="${escapeHtml(project.modifiedAt)}">`,
  ].filter(Boolean).join('\n');

  return seoTemplate
    .replace(/\{\{SITE_NAME\}\}/g, escapeHtml(site.SITE_NAME))
    .replace('{{AUTHOR_URL}}', escapeHtml(site.AUTHOR_URL || `${site.SITE_URL}/about/`))
    .replace('{{IDENTITY_LINKS}}', buildIdentityLinks())
    .replace('{{META_ROBOTS}}', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(project.description))
    .replace(/\{\{TWITTER_HANDLE\}\}/g, escapeHtml(site.TWITTER_HANDLE || ''))
    .replace('{{THEME_COLOR}}', site.THEME_COLOR)
    .replace('{{GOOGLE_VERIFICATION}}\n', '')
    .replace(/\{\{CANONICAL_URL\}\}/g, escapeHtml(canonicalUrl))
    .replace('{{HREFLANG_LINKS}}', buildHrefLangLinks(canonicalUrl))
    .replace('{{OG_TYPE}}', 'website')
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(project.title))
    .replace('{{OG_DESCRIPTION}}', escapeHtml(project.description))
    .replace('{{TWITTER_DESCRIPTION}}', escapeHtml(project.description))
    .replace(/\{\{OG_IMAGE\}\}/g, escapeHtml(ogImage))
    .replace('{{OG_IMAGE_WIDTH}}', String(ogImageMeta.width))
    .replace('{{OG_IMAGE_HEIGHT}}', String(ogImageMeta.height))
    .replace('{{OG_IMAGE_TYPE}}', ogImageMeta.type)
    .replace(/\{\{OG_IMAGE_ALT\}\}/g, escapeHtml(`${project.title} preview`))
    .replace('{{PRELOAD_BG}}\n', '')
    .replace('{{BOOT_INLINE}}', buildInlineBootScript(buildV))
    .replace('{{ANALYTICS_SNIPPET}}', buildAnalyticsSnippet())
    .replace(/\{\{BUILD_V\}\}/g, buildV)
    .replace('{{EXTRA_HEAD}}', extraHead)
    .replace('{{JSON_LD}}', `  <script type="application/ld+json">\n${serializeJsonForHtml(jsonLd)}\n  </script>`)
    .replace('{{ARTICLE_META}}', '');
}


function buildNavHeader(activePage) {
  const navLinks = ['/', '/projects/', '/blog/', '/contact/'];
  const navLabels = ['Home', 'Projects', 'Blog', 'Contact'];

  const items = navLinks.map((href, i) => {
    const label = navLabels[i];
    const isActive = href === activePage;
    return `            <li><a href="${href}"${isActive ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('\n');

  const template = fs.readFileSync(path.join(partialsDir, 'nav.tpl'), 'utf8');
  return injectContentVars(template.replace('{{NAV_ITEMS}}', items), buildSharedVars());
}

function buildFooter() {
  const year = new Date().getFullYear();
  const template = fs.readFileSync(path.join(partialsDir, 'footer.html'), 'utf8');
  return injectContentVars(template.replace('{{YEAR}}', year), buildSharedVars());
}

function buildDeferredScripts(buildV) {
  return `  <script defer src="/assets/js/core.js?v=${buildV}"></script>
  <script defer src="/assets/js/fx.js?v=${buildV}"></script>
  <script defer src="/assets/js/interactions.js?v=${buildV}"></script>`;
}

function processPage(src, dest, meta, buildV, activePage, contentVars) {
  if (!fs.existsSync(src)) return;
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace('{{SEO_HEAD}}', buildSeoHead(meta, buildV));
  html = html.replace('{{NAV_HEADER}}', buildNavHeader(activePage));
  html = html.replace('{{SITE_FOOTER}}', buildFooter());
  html = html.replace(/\{\{BUILD_V\}\}/g, buildV);
  html = injectContentVars(html, { ...buildSharedVars(), ...(contentVars || {}) });
  html = replaceMarkerBlock(html, 'HOME_SKILLS_LIST', contentVars && contentVars.HOME_SKILLS_LIST);
  html = replaceMarkerBlock(html, 'HOME_WHATIDO_TAGS', contentVars && contentVars.HOME_WHATIDO_TAGS);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, html);
}

function copyPublic() {
  copyDir(publicDir, dist);
}

function copyPages(buildV, posts, projects) {
  const homepageContent = readPageYml(path.join(root, 'src', 'content', 'pages', 'homepage.yml'));
  const aboutContent    = readPageYml(path.join(root, 'src', 'content', 'pages', 'about.yml'));
  const contactContent  = readPageYml(path.join(root, 'src', 'content', 'pages', 'contact.yml'));

  const varsBySource = {
    'index.html':   buildHomeVars(homepageContent, posts, projects),
    'about.html':   buildAboutVars(aboutContent),
    'contact.html': buildContactVars(contactContent),
    'sitemap.html': buildSitemapVars(posts, projects),
  };

  for (const route of pageRoutes) {
    processPage(
      path.join(pagesDir, route.source),
      path.join(dist, route.output),
      route.meta,
      buildV,
      route.activePage,
      varsBySource[route.source] || null
    );
  }
  const adminOutput = path.join(dist, 'sawlper');
  ensureDir(adminOutput);
  copyDir(adminDir, adminOutput);
}

function replaceBlogIndex(posts) {
  const blogPath = path.join(dist, 'blog', 'index.html');
  if (!fs.existsSync(blogPath)) return;

  const cards = posts.length
      ? posts.map(post => {
        const cover = buildResponsiveImage(post.cover, post.title, 'blog-preview-card__media', 'loading="lazy" decoding="async"');
        return `
          <article class="soft-panel blog-preview-card">
            <a class="blog-preview-card__media-link" href="/blog/posts/${post.slug}/" aria-label="Read ${escapeHtml(post.title)}">
              ${cover.html}
            </a>
            <div class="blog-preview-card__body">
              <div class="flow-sm">
                <p class="eyebrow"><time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.date))}</time></p>
                <h2 class="blog-preview-card__title"><a href="/blog/posts/${post.slug}/">${escapeHtml(post.title)}</a></h2>
                <p class="blog-preview-card__excerpt">${escapeHtml(post.description)}</p>
              </div>
              <div class="blog-preview-card__footer">
                <a href="/blog/posts/${post.slug}/">Read ${escapeHtml(post.title)}</a>
              </div>
            </div>
          </article>`;
      }).join('\n')
    : `
          <div class="soft-panel flow-md empty-state">
            <h2 class="empty-state__title">No posts yet</h2>
            <p>Publish your first article from SAWLPER after deployment.</p>
          </div>`;

  const replacement = `
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <div class="measure flow-md">
          <h1>Blog</h1>
          <p>
        Programming notes, game development updates, and technical writeups by ${escapeHtml(site.SITE_NAME)}, a game developer from Bangladesh.
      </p>
        </div>
      </section>
      <section class="section">
        <div class="blog-card-grid">
${cards}
        </div>
      </section>
    </main>`;

  let html = fs.readFileSync(blogPath, 'utf8');
  html = html.replace(/<main id="main-content"[\s\S]*?<\/main>/, replacement);

  if (posts.length > 0) {
    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${site.SITE_URL}/blog/#itemlist`,
      name: `Blog posts by ${site.SITE_NAME}`,
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.title,
        url: `${site.SITE_URL}/blog/posts/${p.slug}/`,
      })),
    };
    html = html.replace('</body>', `  <script type="application/ld+json">\n${serializeJsonForHtml(itemListLd)}\n  </script>\n</body>`);
  }

  fs.writeFileSync(blogPath, html);
}


function replaceProjectsPage(projects) {
  const pagePath = path.join(dist, 'projects', 'index.html');
  if (!fs.existsSync(pagePath)) return;

  const cards = projects.length
    ? projects.map(project => {
        const detailUrl = `/projects/${project.slug}/`;
        const tools = project.tools.length
          ? `<ul class="tag-list" aria-label="${escapeHtml(project.title)} technologies">${project.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
          : '';
          const links = [
            `<p><a class="text-link" href="${detailUrl}">View ${escapeHtml(project.title)} project details</a></p>`,
            project.sourceCode ? `<p><a class="text-link" href="${escapeHtml(project.sourceCode)}" target="_blank" rel="noopener noreferrer">Source Code</a></p>` : '',
            project.liveDemo ? `<p><a class="text-link" href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer">Live Demo</a></p>` : '',
          ].filter(Boolean).join('');
        return `
          <article class="project-entry flow-sm">
            <h3><a href="${detailUrl}">${escapeHtml(project.title)}</a></h3>
            <p>${escapeHtml(project.description)}</p>
            ${tools}
            <div class="flow-xs">${links}</div>
          </article>`;
      }).join('\n')
    : `<article class="project-entry flow-sm"><h3>No projects yet</h3><p>Create your first project from SAWLPER.</p></article>`;

  const mainReplacement = `
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <div class="measure flow-md">
          <h1>Projects</h1>
          <p>Explore game development, programming, and web projects by ${escapeHtml(site.SITE_NAME)} with source code and live demos when available.</p>
        </div>

        <h2 class="sr-only">Project list</h2>
        <div class="project-list">
${cards}
        </div>
      </section>
    </main>`;

  let html = fs.readFileSync(pagePath, 'utf8');
  html = html.replace(/<main id="main-content"[\s\S]*?<\/main>/, mainReplacement);

  if (projects.length > 0) {
    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${site.SITE_URL}/projects/#itemlist`,
      name: `Projects by ${site.SITE_NAME}`,
      itemListElement: projects.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.title,
        url: `${site.SITE_URL}/projects/${p.slug}/`,
      })),
    };
    html = html.replace('</body>', `  <script type="application/ld+json">\n${serializeJsonForHtml(itemListLd)}\n  </script>\n</body>`);
  }

  fs.writeFileSync(pagePath, html);
}

function createPostPages(posts, buildV) {
  for (const post of posts) {
    const dir = path.join(dist, 'blog', 'posts', post.slug);
    ensureDir(dir);

    const seoHead = buildPostSeoHead(post, buildV);
    const coverImg = post.cover
      ? buildResponsiveImage(post.cover, post.title, 'detail-cover-image', 'loading="eager" decoding="async"').html
      : '';

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(buildPostPageTitle(post))}</title>
${seoHead}
</head>
<body class="page page-blog-post" data-page="blog-post">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-bg site-bg-inner" aria-hidden="true">
    <div class="bg-photo"></div>
    <div class="bg-shade"></div>
    <div class="bg-mist"></div>
  </div>
  <div class="site-shell">
${buildNavHeader('/blog/')}
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <article class="blog-post-card flow-md soft-panel">
          <p class="eyebrow"><time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(formatDate(post.date))}</time></p>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.description)}</p>
          ${coverImg}
          <div class="flow-md">${post.bodyHtml}</div>
          <p><a class="blog-back-link" href="/blog/">Back to ${escapeHtml(site.SITE_NAME)} blog</a></p>
        </article>
      </section>
    </main>
${buildFooter()}
  </div>
${buildDeferredScripts(buildV)}
</body>
</html>`;

    fs.writeFileSync(path.join(dir, 'index.html'), page);
  }
}

function createProjectPages(projects, buildV) {
  for (const project of projects) {
    const dir = path.join(dist, 'projects', project.slug);
    ensureDir(dir);

    const seoHead = buildProjectSeoHead(project, buildV);
    const coverImg = project.thumbnail
      ? buildResponsiveImage(project.thumbnail, project.title, 'detail-cover-image', 'loading="eager" decoding="async"').html
      : '';
    const tools = project.tools.length
      ? `<ul class="tag-list" aria-label="${escapeHtml(project.title)} technologies">${project.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
      : '';
    const links = [
      project.sourceCode ? `<p><a class="text-link" href="${escapeHtml(project.sourceCode)}" target="_blank" rel="noopener noreferrer">Source Code</a></p>` : '',
      project.liveDemo ? `<p><a class="text-link" href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer">Live Demo</a></p>` : '',
    ].filter(Boolean).join('');
    const bodyPlainText = markdownToPlainText(project.body);
    const body = /use this entry as a starting point for portfolio items\./i.test(bodyPlainText)
      ? ''
      : String(project.bodyHtml || '').trim();

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${escapeHtml(buildProjectPageTitle(project))}</title>
${seoHead}
</head>
<body class="page page-blog-post page-project-detail" data-page="project-detail">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-bg site-bg-inner" aria-hidden="true">
    <div class="bg-photo"></div>
    <div class="bg-shade"></div>
    <div class="bg-mist"></div>
  </div>
  <div class="site-shell">
${buildNavHeader('/projects/')}
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <article class="blog-post-card flow-md soft-panel">
          <p class="eyebrow">Project updated <time datetime="${escapeHtml(project.modifiedAt)}">${escapeHtml(formatDate(project.modifiedAt))}</time></p>
          <h1>${escapeHtml(project.title)}</h1>
          <p>${escapeHtml(project.description)}</p>
          ${coverImg}
            ${tools}
            ${links ? `<div class="flow-xs">${links}</div>` : ''}
            ${body ? `<div class="flow-md">${body}</div>` : ''}
            <p><a class="blog-back-link" href="/projects/">Back to ${escapeHtml(site.SITE_NAME)} projects</a></p>
          </article>
      </section>
    </main>
${buildFooter()}
  </div>
${buildDeferredScripts(buildV)}
</body>
</html>`;

    fs.writeFileSync(path.join(dir, 'index.html'), page);
  }
}

function createSitemap(posts, projects) {
  const pageLastmods = {
    '/': latestIsoDate(
      fs.existsSync(path.join(root, 'src', 'content', 'pages', 'homepage.yml')) ? fs.statSync(path.join(root, 'src', 'content', 'pages', 'homepage.yml')).mtime : null,
      fs.existsSync(path.join(pagesDir, 'index.html')) ? fs.statSync(path.join(pagesDir, 'index.html')).mtime : null
    ),
    '/about/': latestIsoDate(
      fs.existsSync(path.join(root, 'src', 'content', 'pages', 'about.yml')) ? fs.statSync(path.join(root, 'src', 'content', 'pages', 'about.yml')).mtime : null,
      fs.existsSync(path.join(pagesDir, 'about.html')) ? fs.statSync(path.join(pagesDir, 'about.html')).mtime : null
    ),
    '/projects/': latestIsoDate(
      projects.map(project => project.modifiedAt),
      fs.existsSync(path.join(pagesDir, 'projects.html')) ? fs.statSync(path.join(pagesDir, 'projects.html')).mtime : null
    ),
    '/blog/': latestIsoDate(
      posts.map(post => post.modifiedAt),
      fs.existsSync(path.join(pagesDir, 'blog.html')) ? fs.statSync(path.join(pagesDir, 'blog.html')).mtime : null
    ),
    '/contact/': latestIsoDate(
      fs.existsSync(path.join(root, 'src', 'content', 'pages', 'contact.yml')) ? fs.statSync(path.join(root, 'src', 'content', 'pages', 'contact.yml')).mtime : null,
      fs.existsSync(path.join(pagesDir, 'contact.html')) ? fs.statSync(path.join(pagesDir, 'contact.html')).mtime : null
    ),
    '/sitemap/': latestIsoDate(
      posts.map(post => post.modifiedAt),
      projects.map(project => project.modifiedAt),
      fs.existsSync(path.join(pagesDir, 'sitemap.html')) ? fs.statSync(path.join(pagesDir, 'sitemap.html')).mtime : null,
      fs.statSync(__filename).mtime
    ),
  };

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: pageLastmods['/'] },
    { url: '/about/', priority: '0.9', changefreq: 'monthly', lastmod: pageLastmods['/about/'] },
    { url: '/projects/', priority: '0.8', changefreq: 'weekly', lastmod: pageLastmods['/projects/'] },
    { url: '/blog/', priority: '0.8', changefreq: 'weekly', lastmod: pageLastmods['/blog/'] },
    { url: '/contact/', priority: '0.6', changefreq: 'yearly', lastmod: pageLastmods['/contact/'] },
    { url: '/sitemap/', priority: '0.5', changefreq: 'weekly', lastmod: pageLastmods['/sitemap/'] },
  ];

  const urls = staticPages.concat(
    posts.map(post => ({
      url: `/blog/posts/${post.slug}/`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: post.modifiedAt,
    })),
    projects.map(project => ({
      url: `/projects/${project.slug}/`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: project.modifiedAt,
    }))
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${site.SITE_URL}${item.url}</loc>
    <lastmod>${escapeHtml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n\n')}
</urlset>
`;

  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
}

function createFeed(posts) {
  const data = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${site.SITE_NAME} Blog and Dev Logs`,
    home_page_url: `${site.SITE_URL}/blog/`,
    feed_url: `${site.SITE_URL}/blog/feed.json`,
    description: `Programming notes and game development updates by ${site.SITE_NAME} from Bangladesh.`,
    authors: [
      {
        name: site.SITE_NAME,
        url: site.AUTHOR_URL || `${site.SITE_URL}/about/`,
      },
    ],
    items: posts.map(post => ({
      id: `${site.SITE_URL}/blog/posts/${post.slug}/`,
      url: `${site.SITE_URL}/blog/posts/${post.slug}/`,
      title: post.title,
      summary: post.description,
      image: buildAbsoluteSiteUrl(post.cover),
      date_published: post.publishedAt,
      date_modified: post.modifiedAt,
      tags: post.tags || [],
      content_html: post.bodyHtml || '',
    })),
  };
  ensureDir(path.join(dist, 'blog'));
  fs.writeFileSync(path.join(dist, 'blog', 'feed.json'), JSON.stringify(data, null, 2));

  const feedItems = posts.map(post => `  <item>
    <title>${escapeHtml(post.title)}</title>
    <link>${site.SITE_URL}/blog/posts/${post.slug}/</link>
    <guid isPermaLink="true">${site.SITE_URL}/blog/posts/${post.slug}/</guid>
    <pubDate>${new Date(post.publishedAt || Date.now()).toUTCString()}</pubDate>
    <description>${escapeHtml(post.description)}</description>
    <content:encoded><![CDATA[${post.bodyHtml || ''}]]></content:encoded>
    ${(post.tags || []).map(t => `<category>${escapeHtml(t)}</category>`).join('\n    ')}
  </item>`).join('\n');

  const lastBuildDate = latestIsoDate(posts.map(post => post.modifiedAt));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.SITE_NAME)} Blog and Dev Logs</title>
    <link>${site.SITE_URL}/blog/</link>
    <atom:link href="${site.SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Programming notes and game development updates by ${escapeHtml(site.SITE_NAME)} from Bangladesh.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
    <image>
      <url>${site.OG_IMAGE || `${site.SITE_URL}/assets/og/preview.png`}</url>
      <title>${escapeHtml(site.SITE_NAME)} Blog and Dev Logs</title>
      <link>${site.SITE_URL}/blog/</link>
    </image>
${feedItems}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(dist, 'blog', 'feed.xml'), xml);
}

clearDir(dist);
copyPublic();

const buildV = buildVersion();
const posts = getPosts();
const projects = getProjects();
copyPages(buildV, posts, projects);

replaceBlogIndex(posts);
replaceProjectsPage(projects);
createPostPages(posts, buildV);
createProjectPages(projects, buildV);
createFeed(posts);
createSitemap(posts, projects);
minifyDistCss();

console.log(`Built ${posts.length} post(s) and ${projects.length} project(s) into dist/ [v=${buildV}]`);
