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
const socialFile = path.join(root, 'src', 'content', 'settings', 'social.yml');
const analyticsFile = path.join(root, 'src', 'content', 'settings', 'analytics.yml');

const site = require('../src/data/site');
const pages = require('../src/data/pages');

const pageRoutes = [
  { source: 'index.html', output: 'index.html', meta: pages.home, activePage: '/' },
  { source: 'about.html', output: path.join('about', 'index.html'), meta: pages.about, activePage: null },
  { source: 'blog.html', output: path.join('blog', 'index.html'), meta: pages.blog, activePage: '/blog/' },
  { source: 'contact.html', output: path.join('contact', 'index.html'), meta: pages.contact, activePage: '/contact/' },
  { source: 'projects.html', output: path.join('projects', 'index.html'), meta: pages.projects, activePage: '/projects/' },
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
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (normalized === '.jpg' || normalized === '.jpeg') {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const isSOF = [0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker);
      if (isSOF) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      if (!length || length < 2) break;
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
  const buffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath);
  const size = getImageSizeFromBuffer(buffer, ext);
  return {
    width: size.width || 1200,
    height: size.height || 630,
    type: getMimeTypeByExt(ext),
  };
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
  const meta = getImageMeta(publicUrl);
  const webpUrl = getAdjacentWebp(publicUrl);
  const widthAttr = ` width="${meta.width}"`;
  const heightAttr = ` height="${meta.height}"`;
  const classAttr = className ? ` class="${className}"` : '';
  const extra = attrs ? ` ${attrs.trim()}` : '';
  const img = `<img${classAttr} src="${escapeHtml(publicUrl)}" alt="${escapeHtml(alt)}"${widthAttr}${heightAttr}${extra}>`;

  if (!webpUrl || webpUrl === publicUrl) {
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
    return `  <script defer data-domain="${escapeHtml(domain)}" src="${escapeHtml(src)}"></script>`;
  }

  if (provider === 'goatcounter' && domain) {
    const src = scriptSrc || '//gc.zgo.at/count.js';
    const endpoint = /^https?:\/\//i.test(domain) ? domain : `https://${domain.replace(/\/$/, '')}/count`;
    return `  <script data-goatcounter="${escapeHtml(endpoint)}" async src="${escapeHtml(src)}"></script>`;
  }

  return '';
}

function buildHrefLangLinks(canonicalUrl) {
  return [
    `  <link rel="alternate" href="${canonicalUrl}" hreflang="en">`,
    `  <link rel="alternate" href="${canonicalUrl}" hreflang="x-default">`,
  ].join('\n');
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

function applyContactSettings(contact) {
  if (!contact || !contact.email) return;
  const files = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  }
  collect(dist);
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/anikhasan2@icloud\.com/g, contact.email);
    if (contact.response_time) {
      html = html.replace(/I usually respond within 24 to 48 hours\./g, contact.response_time);
    }
    fs.writeFileSync(file, html);
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

function markdownToHtml(md) {
  const html = [];
  let inCode = false;
  let codeBuffer = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let listOpen = false;

  function renderInline(text) {
    let t = escapeHtml(text);
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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
    const raw = fs.readFileSync(path.join(postSourceDir, file), 'utf8');
    const { data, body } = readFrontMatter(raw);
    if (data.draft === true || data.draft === 'true') continue;
    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
    const cover = data.cover || '/assets/og/preview.png';
    posts.push({
      title: data.title || slug,
      slug,
      date: data.date || '',
      description: data.description || '',
      cover,
      coverWebp: getAdjacentWebp(cover),
      coverMeta: getImageMeta(cover),
      body,
      bodyHtml: markdownToHtml(body),
    });
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}

function getProjects() {
  if (!fs.existsSync(projectSourceDir)) return [];
  const projects = [];
  for (const file of fs.readdirSync(projectSourceDir).filter(n => n.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(projectSourceDir, file), 'utf8');
    const { data } = readFrontMatter(raw);
    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ''));
    const tools = Array.isArray(data.tools)
      ? data.tools.filter(Boolean).map(t => String(t).trim()).filter(Boolean)
      : [];
    projects.push({
      title: data.title || slug,
      slug,
      description: data.description || '',
      tools,
      sourceCode: data.source_code || '',
      liveDemo: data.live_demo || '',
      featured: data.featured === true || data.featured === 'true',
    });
  }
  projects.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  return projects;
}

function buildSeoHead(meta, buildV) {
  const seoTemplate = fs.readFileSync(path.join(partialsDir, 'seo.html'), 'utf8');

  const googleVerificationLine = meta.googleVerification
    ? `  <meta name="google-site-verification" content="${meta.googleVerification}">`
    : '';

  const preloadBg = meta.preloadHomeBackground
    ? `  <link rel="preload" as="image" href="/assets/bg/jungle-home.avif" type="image/avif" fetchpriority="high">`
    : '';

  const jsonLdBlock = meta.jsonLd
    ? `  <script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n  </script>`
    : '';

  const ogImageMeta = getImageMeta(meta.ogImage);

  return seoTemplate
    .replace('{{META_ROBOTS}}', meta.robots)
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(meta.description))
    .replace('{{THEME_COLOR}}', meta.themeColor)
    .replace('{{GOOGLE_VERIFICATION}}\n', googleVerificationLine ? `${googleVerificationLine}\n` : '')
    .replace('{{PAGE_TITLE}}', escapeHtml(meta.title))
    .replace(/\{\{CANONICAL_URL\}\}/g, meta.canonical)
    .replace('{{HREFLANG_LINKS}}', buildHrefLangLinks(meta.canonical))
    .replace('{{OG_TYPE}}', meta.ogType)
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(meta.title))
    .replace('{{OG_DESCRIPTION}}', escapeHtml(meta.ogDescription))
    .replace('{{TWITTER_DESCRIPTION}}', escapeHtml(meta.description))
    .replace(/\{\{OG_IMAGE\}\}/g, meta.ogImage)
    .replace('{{OG_IMAGE_WIDTH}}', String(ogImageMeta.width))
    .replace('{{OG_IMAGE_HEIGHT}}', String(ogImageMeta.height))
    .replace('{{OG_IMAGE_TYPE}}', ogImageMeta.type)
    .replace(/\{\{OG_IMAGE_ALT\}\}/g, escapeHtml(meta.ogImageAlt))
    .replace('{{PRELOAD_BG}}\n', preloadBg ? `${preloadBg}\n` : '')
    .replace('{{BOOT_INLINE}}', buildInlineBootScript(buildV))
    .replace('{{ANALYTICS_SNIPPET}}', buildAnalyticsSnippet())
    .replace(/\{\{BUILD_V\}\}/g, buildV)
    .replace('{{JSON_LD}}', jsonLdBlock);
}

function buildPostSeoHead(post, buildV) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      site.WEBSITE_SCHEMA_STUB,
      site.PERSON_SCHEMA_STUB,
      {
        '@type': 'BlogPosting',
        '@id': `${site.SITE_URL}/blog/posts/${post.slug}/#article`,
        headline: post.title,
        description: post.description,
        url: `${site.SITE_URL}/blog/posts/${post.slug}/`,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@id': `${site.SITE_URL}/#person` },
        publisher: { '@id': `${site.SITE_URL}/#person` },
        image: {
          '@type': 'ImageObject',
          url: post.cover.startsWith('http') ? post.cover : `${site.SITE_URL}${post.cover}`,
        },
        isPartOf: { '@id': `${site.SITE_URL}/blog/#webpage` },
        inLanguage: 'en-US',
      },
    ],
  };

  const seoTemplate = fs.readFileSync(path.join(partialsDir, 'seo.html'), 'utf8');
  const canonicalUrl = `${site.SITE_URL}/blog/posts/${post.slug}/`;
  const ogImage = post.cover.startsWith('http') ? post.cover : `${site.SITE_URL}${post.cover}`;
  const ogImageMeta = getImageMeta(post.cover);

  return seoTemplate
    .replace('{{META_ROBOTS}}', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
    .replace(/\{\{META_DESCRIPTION\}\}/g, escapeHtml(post.description))
    .replace('{{THEME_COLOR}}', site.THEME_COLOR)
    .replace('{{GOOGLE_VERIFICATION}}\n', '')
    .replace('{{PAGE_TITLE}}', escapeHtml(`${post.title} | MD Anik Hasan`))
    .replace(/\{\{CANONICAL_URL\}\}/g, canonicalUrl)
    .replace('{{HREFLANG_LINKS}}', buildHrefLangLinks(canonicalUrl))
    .replace('{{OG_TYPE}}', 'article')
    .replace(/\{\{OG_TITLE\}\}/g, escapeHtml(post.title))
    .replace('{{OG_DESCRIPTION}}', escapeHtml(post.description))
    .replace('{{TWITTER_DESCRIPTION}}', escapeHtml(post.description))
    .replace(/\{\{OG_IMAGE\}\}/g, ogImage)
    .replace('{{OG_IMAGE_WIDTH}}', String(ogImageMeta.width))
    .replace('{{OG_IMAGE_HEIGHT}}', String(ogImageMeta.height))
    .replace('{{OG_IMAGE_TYPE}}', ogImageMeta.type)
    .replace(/\{\{OG_IMAGE_ALT\}\}/g, escapeHtml(post.title))
    .replace('{{PRELOAD_BG}}\n', '')
    .replace('{{BOOT_INLINE}}', buildInlineBootScript(buildV))
    .replace('{{ANALYTICS_SNIPPET}}', buildAnalyticsSnippet())
    .replace(/\{\{BUILD_V\}\}/g, buildV)
    .replace('{{JSON_LD}}', `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>`);
}


function buildNavHeader(activePage) {
  const navLinks = ['/', '/projects/', '/blog/', '/contact/'];
  const navLabels = ['Home', 'Projects', 'Blog', 'Contact'];

  const items = navLinks.map((href, i) => {
    const label = navLabels[i];
    const isActive = href === activePage;
    return `            <li><a href="${href}"${isActive ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('\n');

  const template = fs.readFileSync(path.join(partialsDir, 'nav.html'), 'utf8');
  return template.replace('{{NAV_ITEMS}}', items);
}

function buildFooter() {
  const year = new Date().getFullYear();
  const template = fs.readFileSync(path.join(partialsDir, 'footer.html'), 'utf8');
  return template.replace('{{YEAR}}', year);
}

function buildDeferredScripts(buildV) {
  return `  <script defer src="/assets/js/core.js?v=${buildV}"></script>
  <script defer src="/assets/js/fx.js?v=${buildV}"></script>
  <script defer src="/assets/js/interactions.js?v=${buildV}"></script>`;
}

function processPage(src, dest, meta, buildV, activePage) {
  if (!fs.existsSync(src)) return;
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace('{{SEO_HEAD}}', buildSeoHead(meta, buildV));
  html = html.replace('{{NAV_HEADER}}', buildNavHeader(activePage));
  html = html.replace('{{SITE_FOOTER}}', buildFooter());
  html = html.replace(/\{\{BUILD_V\}\}/g, buildV);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, html);
}

function copyPublic() {
  copyDir(publicDir, dist);
}

function copyPages(buildV) {
  for (const route of pageRoutes) {
    processPage(
      path.join(pagesDir, route.source),
      path.join(dist, route.output),
      route.meta,
      buildV,
      route.activePage
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
                <p class="eyebrow">${escapeHtml(formatDate(post.date))}</p>
                <h2 class="blog-preview-card__title"><a href="/blog/posts/${post.slug}/">${escapeHtml(post.title)}</a></h2>
                <p class="blog-preview-card__excerpt">${escapeHtml(post.description)}</p>
              </div>
              <div class="blog-preview-card__footer">
                <a href="/blog/posts/${post.slug}/">Read article</a>
              </div>
            </div>
          </article>`;
      }).join('\n')
    : `
          <div class="soft-panel flow-md" style="padding:24px">
            <h2 style="margin:0">No posts yet</h2>
            <p>Publish your first article from SAWLPER after deployment.</p>
          </div>`;

  const replacement = `
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <div class="measure flow-md">
          <h1>Blog</h1>
          <p>
        Dev logs, learning notes, project breakdowns, and updates from MD Anik Hasan.
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
  fs.writeFileSync(blogPath, html);
}


function replaceProjectsPage(projects) {
  const pagePath = path.join(dist, 'projects', 'index.html');
  if (!fs.existsSync(pagePath)) return;

  const cards = projects.length
    ? projects.map(project => {
        const tools = project.tools.length
          ? `<ul class="tag-list" aria-label="${escapeHtml(project.title)} technologies">${project.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
          : '';
        const links = [
          project.sourceCode ? `<p><a class="text-link" href="${escapeHtml(project.sourceCode)}" target="_blank" rel="noopener noreferrer">Source Code</a></p>` : '',
          project.liveDemo ? `<p><a class="text-link" href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer">Live Demo</a></p>` : '',
        ].filter(Boolean).join('');
        return `
          <article class="project-entry flow-sm">
            <h3>${escapeHtml(project.title)}</h3>
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
        </div>

        <h2 class="sr-only">Project list</h2>
        <div class="project-list">
${cards}
        </div>
      </section>
    </main>`;

  let html = fs.readFileSync(pagePath, 'utf8');
  html = html.replace(/<main id="main-content"[\s\S]*?<\/main>/, mainReplacement);
  fs.writeFileSync(pagePath, html);
}

function createPostPages(posts, buildV) {
  for (const post of posts) {
    const dir = path.join(dist, 'blog', 'posts', post.slug);
    ensureDir(dir);

    const seoHead = buildPostSeoHead(post, buildV);
    const coverImg = post.cover
      ? buildResponsiveImage(post.cover, post.title, '', 'style="width:100%;height:auto;border-radius:20px;margin:8px 0 16px;display:block" loading="eager" decoding="async"').html
      : '';

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
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
          <p class="eyebrow">${escapeHtml(formatDate(post.date))}</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.description)}</p>
          ${coverImg}
          <div class="flow-md">${post.bodyHtml}</div>
          <p><a class="blog-back-link" href="/blog/">Back to blog</a></p>
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

function createSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: today },
    { url: '/about/', priority: '0.9', changefreq: 'monthly', lastmod: today },
    { url: '/projects/', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/blog/', priority: '0.7', changefreq: 'weekly', lastmod: posts[0]?.date || today },
    { url: '/contact/', priority: '0.6', changefreq: 'yearly', lastmod: today },
  ];

  const urls = staticPages.concat(
    posts.map(post => ({
      url: `/blog/posts/${post.slug}/`,
      priority: '0.65',
      changefreq: 'monthly',
      lastmod: post.date || today,
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
  const data = posts.map(post => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    description: post.description,
    cover: post.cover,
    url: `/blog/posts/${post.slug}/`,
  }));
  ensureDir(path.join(dist, 'blog'));
  fs.writeFileSync(path.join(dist, 'blog', 'feed.json'), JSON.stringify(data, null, 2));

  const feedItems = posts.map(post => `  <item>
    <title>${escapeHtml(post.title)}</title>
    <link>${site.SITE_URL}/blog/posts/${post.slug}/</link>
    <guid>${site.SITE_URL}/blog/posts/${post.slug}/</guid>
    <pubDate>${new Date(post.date || Date.now()).toUTCString()}</pubDate>
    <description>${escapeHtml(post.description)}</description>
  </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MD Anik Hasan Blog</title>
    <link>${site.SITE_URL}/blog/</link>
    <description>Blog posts from MD Anik Hasan.</description>
    <language>en-us</language>
${feedItems}
  </channel>
</rss>
`;
  fs.writeFileSync(path.join(dist, 'blog', 'feed.xml'), xml);
}

function applySocialLinks(social) {
  const files = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  }
  collect(dist);

  const replacements = {
    [site.SOCIAL_DEFAULTS.github]: social.github,
    [site.SOCIAL_DEFAULTS.linkedin]: social.linkedin,
    [site.SOCIAL_DEFAULTS.facebook]: social.facebook,
    [site.SOCIAL_DEFAULTS.x]: social.x,
    [site.SOCIAL_DEFAULTS.discord]: social.discord,
    [site.SOCIAL_DEFAULTS.youtube || 'https://www.youtube.com/@mdanikhasan_dev']: social.youtube,
  };

  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    for (const [from, to] of Object.entries(replacements)) {
      if (!from || !to) continue;
      html = html.replace(new RegExp(escapeRegExp(from), 'g'), to);
    }
    fs.writeFileSync(file, html);
  }
}

clearDir(dist);
copyPublic();

const buildV = buildVersion();
copyPages(buildV);

const posts = getPosts();
const projects = getProjects();
const social = readYamlFile(socialFile);
const contact = readYamlFile(path.join(root, 'src', 'content', 'settings', 'contact.yml'));

replaceBlogIndex(posts);
replaceProjectsPage(projects);
createPostPages(posts, buildV);
createFeed(posts);
createSitemap(posts);
applySocialLinks(social);
applyContactSettings(contact);
minifyDistCss();

console.log(`Built ${posts.length} post(s) and ${projects.length} project(s) into dist/ [v=${buildV}]`);
