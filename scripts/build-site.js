const fs = require("fs");
const path = require("path");

const root = process.cwd();
const dist = path.join(root, "dist");
const publicDir = path.join(root, "public");
const pagesDir = path.join(root, "src", "pages");
const adminDir = path.join(root, "src", "admin");
const postSourceDir = path.join(root, "src", "content", "posts");
const projectSourceDir = path.join(root, "src", "content", "projects");
const socialFile = path.join(root, "src", "content", "settings", "social.yml");
const BUILD_VERSION = "20260327";

const pageRoutes = [
  { source: "index.html", output: "index.html" },
  { source: "about.html", output: path.join("about", "index.html") },
  { source: "blog.html", output: path.join("blog", "index.html") },
  { source: "contact.html", output: path.join("contact", "index.html") },
  { source: "projects.html", output: path.join("projects", "index.html") }
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

function copyPublic() {
  copyDir(publicDir, dist);
}

function copyPages() {
  for (const page of pageRoutes) {
    const src = path.join(pagesDir, page.source);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(dist, page.output);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }

  const adminOutput = path.join(dist, "sawlper");
  ensureDir(adminOutput);
  copyDir(adminDir, adminOutput);
}

function stripQuotes(value) {
  let out = String(value || "").trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) out = out.slice(1, -1);
  return out;
}

function readYamlFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  const lines = fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = stripQuotes(line.slice(idx + 1));
    out[key] = value;
  }
  return out;
}

function parseValue(raw) {
  const value = stripQuotes(raw);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function readFrontMatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw.trim() };
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  const lines = match[1].replace(/\r/g, "").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const baseMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!baseMatch) {
      i += 1;
      continue;
    }
    const key = baseMatch[1];
    const rest = baseMatch[2];
    if (rest) {
      data[key] = parseValue(rest);
      i += 1;
      continue;
    }

    const list = [];
    i += 1;
    while (i < lines.length) {
      const itemLine = lines[i];
      if (!itemLine.trim()) {
        i += 1;
        continue;
      }
      if (!/^\s+/.test(itemLine)) break;
      const trimmed = itemLine.trim();
      if (trimmed.startsWith("- ")) {
        const itemValue = trimmed.slice(2).trim();
        const objMatch = itemValue.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (objMatch) list.push(parseValue(objMatch[2]));
        else list.push(parseValue(itemValue));
      }
      i += 1;
    }
    data[key] = list;
  }

  return { data, body: match[2].trim() };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function markdownToHtml(md) {
  const html = [];
  let inCode = false;
  let codeBuffer = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let listOpen = false;

  function renderInline(text) {
    let t = escapeHtml(text);
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    return t;
  }

  function closeList() {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeList();
      if (!inCode) {
        inCode = true;
        codeBuffer = [];
      } else {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    if (/^###\s+/.test(trimmed)) html.push(`<h3>${renderInline(trimmed.replace(/^###\s+/, ""))}</h3>`);
    else if (/^##\s+/.test(trimmed)) html.push(`<h2>${renderInline(trimmed.replace(/^##\s+/, ""))}</h2>`);
    else if (/^#\s+/.test(trimmed)) html.push(`<h1>${renderInline(trimmed.replace(/^#\s+/, ""))}</h1>`);
    else html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n");
}

function getPosts() {
  if (!fs.existsSync(postSourceDir)) return [];
  const files = fs.readdirSync(postSourceDir).filter((name) => name.endsWith(".md"));
  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(postSourceDir, file), "utf8");
    const { data, body } = readFrontMatter(raw);
    if (data.draft === true || data.draft === "true") continue;

    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ""));
    posts.push({
      title: data.title || slug,
      slug,
      date: data.date || "",
      description: data.description || "",
      cover: data.cover || "/assets/og/preview.png",
      body,
      bodyHtml: markdownToHtml(body)
    });
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}

function getProjects() {
  if (!fs.existsSync(projectSourceDir)) return [];
  const files = fs.readdirSync(projectSourceDir).filter((name) => name.endsWith(".md"));
  const projects = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(projectSourceDir, file), "utf8");
    const { data } = readFrontMatter(raw);
    const slug = data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, ""));
    const tools = Array.isArray(data.tools) ? data.tools.filter(Boolean).map((item) => String(item).trim()).filter(Boolean) : [];
    projects.push({
      title: data.title || slug,
      slug,
      description: data.description || "",
      tools,
      sourceCode: data.source_code || "",
      liveDemo: data.live_demo || "",
      featured: data.featured === true || data.featured === "true"
    });
  }

  projects.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
  return projects;
}

function replaceBlogIndex(posts) {
  const blogPath = path.join(dist, "blog", "index.html");
  if (!fs.existsSync(blogPath)) return;

  const cards = posts.length
    ? posts
        .map(
          (post) => `
          <article class="soft-panel flow-md" style="padding:24px">
            <div class="flow-sm">
              <p class="eyebrow">${escapeHtml(formatDate(post.date))}</p>
              <h2 style="margin:0"><a href="/blog/posts/${post.slug}/">${escapeHtml(post.title)}</a></h2>
              <p>${escapeHtml(post.description)}</p>
            </div>
            <p><a href="/blog/posts/${post.slug}/">Read article</a></p>
          </article>`
        )
        .join("\n")
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
          <p>Dev logs, project breakdowns, and learning notes from MD Anik Hasan.</p>
        </div>
      </section>
      <section class="section">
        <div class="blog-card-grid">
${cards}
        </div>
      </section>
    </main>`;

  let html = fs.readFileSync(blogPath, "utf8");
  html = html.replace(/<main id="main-content"[\s\S]*?<\/main>/, replacement);
  fs.writeFileSync(blogPath, html);
}

function replaceProjectsPage(projects) {
  const pagePath = path.join(dist, "projects", "index.html");
  if (!fs.existsSync(pagePath)) return;

  const cards = projects.length
    ? projects
        .map((project) => {
          const tools = project.tools.length
            ? `<ul class="tag-list" aria-label="${escapeHtml(project.title)} technologies">${project.tools.map((tool) => `<li>${escapeHtml(tool)}</li>`).join("")}</ul>`
            : "";
          const links = [
            project.sourceCode ? `<p><a class="text-link" href="${escapeHtml(project.sourceCode)}" target="_blank" rel="noopener noreferrer">Source Code</a></p>` : "",
            project.liveDemo ? `<p><a class="text-link" href="${escapeHtml(project.liveDemo)}" target="_blank" rel="noopener noreferrer">Live Demo</a></p>` : ""
          ].filter(Boolean).join("");
          return `
          <article class="project-entry flow-sm">
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            ${tools}
            <div class="flow-xs">${links}</div>
          </article>`;
        })
        .join("\n")
    : `<article class="project-entry flow-sm"><h3>No projects yet</h3><p>Create your first project from SAWLPER.</p></article>`;

  const mainReplacement = `
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <div class="measure flow-md">
          <h1>Projects</h1>
        </div>

        <div class="project-list">
${cards}
        </div>
      </section>
    </main>`;

  let html = fs.readFileSync(pagePath, "utf8");
  html = html.replace(/<main id="main-content"[\s\S]*?<\/main>/, mainReplacement);
  fs.writeFileSync(pagePath, html);
}

function createPostPages(posts) {
  for (const post of posts) {
    const dir = path.join(dist, "blog", "posts", post.slug);
    ensureDir(dir);

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="author" content="MD Anik Hasan">
  <meta name="description" content="${escapeHtml(post.description)}">
  <meta name="theme-color" content="#07100d">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(post.description)}">
  <meta property="og:url" content="https://mdanikhasan.com/blog/posts/${post.slug}/">
  <meta property="og:image" content="https://mdanikhasan.com${escapeHtml(post.cover)}">
  <title>${escapeHtml(post.title)} | MD Anik Hasan</title>
  <link rel="canonical" href="https://mdanikhasan.com/blog/posts/${post.slug}/">
  <script src="/assets/js/boot.js?v=${BUILD_VERSION}"></script>
  <link rel="stylesheet" href="/assets/css/main.css?v=${BUILD_VERSION}">
  <link rel="icon" href="/assets/icons/favicon.png" type="image/png">
  <link rel="manifest" href="/manifest.webmanifest">
</head>
<body class="page page-blog-post" data-page="blog-post">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="site-bg site-bg-inner" aria-hidden="true">
    <div class="bg-photo"></div>
    <div class="bg-shade"></div>
    <div class="bg-mist"></div>
  </div>
  <div class="site-shell">
    <header class="site-header" data-header>
      <nav class="site-nav shell shell-wide" aria-label="Primary">
        <a class="site-brand" href="/" aria-label="MD Anik Hasan home">MDANIKHASAN.COM</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu" data-nav-toggle>
          <span></span><span></span><span></span>
        </button>
        <div class="site-menu" id="site-menu" data-nav-panel>
          <ul class="site-nav__list">
            <li><a href="/">Home</a></li>
            <li><a href="/projects/">Projects</a></li>
            <li><a href="/blog/" aria-current="page">Blog</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
      </nav>
    </header>
    <main id="main-content" class="site-main shell shell-wide">
      <section class="section section-line">
        <article class="blog-post-card flow-md soft-panel">
          <p class="eyebrow">${escapeHtml(formatDate(post.date))}</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.description)}</p>
          ${post.cover ? `<img src="${escapeHtml(post.cover)}" alt="${escapeHtml(post.title)}" style="width:100%;height:auto;border-radius:20px;margin:8px 0 16px;display:block">` : ""}
          <div class="flow-md">${post.bodyHtml}</div>
          <p><a class="blog-back-link" href="/blog/">Back to blog</a></p>
        </article>
      </section>
    </main>
    <footer class="site-footer">
      <div class="shell shell-wide">
        <p>© 2026 MD Anik Hasan. All rights reserved.</p>
      </div>
    </footer>
  </div>
  <script defer src="/assets/js/core.js?v=${BUILD_VERSION}"></script>
  <script defer src="/assets/js/fx.js?v=${BUILD_VERSION}"></script>
  <script defer src="/assets/js/interactions.js?v=${BUILD_VERSION}"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(dir, "index.html"), page);
  }
}

function createSitemap(posts) {
  const base = "https://mdanikhasan.com";
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "weekly", lastmod: "2026-03-27" },
    { url: "/about/", priority: "0.9", changefreq: "monthly", lastmod: "2026-03-27" },
    { url: "/projects/", priority: "0.8", changefreq: "monthly", lastmod: "2026-03-27" },
    { url: "/blog/", priority: "0.7", changefreq: "weekly", lastmod: posts[0] && posts[0].date ? posts[0].date : "2026-03-27" },
    { url: "/contact/", priority: "0.6", changefreq: "yearly", lastmod: "2026-03-27" }
  ];

  const urls = staticPages.concat(
    posts.map((post) => ({
      url: `/blog/posts/${post.slug}/`,
      priority: "0.65",
      changefreq: "monthly",
      lastmod: post.date || "2026-03-27"
    }))
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${base}${item.url}</loc>
    <lastmod>${escapeHtml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n\n")}
</urlset>
`;

  fs.writeFileSync(path.join(dist, "sitemap.xml"), xml);
}

function createFeed(posts) {
  const data = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    description: post.description,
    cover: post.cover,
    url: `/blog/posts/${post.slug}/`
  }));

  ensureDir(path.join(dist, "blog"));
  fs.writeFileSync(path.join(dist, "blog", "feed.json"), JSON.stringify(data, null, 2));
}

function applySocialLinks(social) {
  const files = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.name.endsWith(".html")) files.push(full);
    }
  }
  collect(dist);

  const replacements = {
    "https://github.com/mdanikhasan-dev": social.github,
    "https://www.linkedin.com/in/mdanikhasan-dev/": social.linkedin,
    "https://www.facebook.com/mdanikhasan.dev": social.facebook,
    "https://x.com/mdanikhasan_dev": social.x,
    "https://discord.com/users/751170057664462938": social.discord,
    "https://www.instagram.com/": social.instagram,
    "https://www.youtube.com/": social.youtube
  };

  for (const file of files) {
    let html = fs.readFileSync(file, "utf8");
    for (const [from, to] of Object.entries(replacements)) {
      if (!to) continue;
      html = html.replace(new RegExp(escapeRegExp(from), "g"), to);
    }
    fs.writeFileSync(file, html);
  }
}

clearDir(dist);
copyPublic();
copyPages();
const posts = getPosts();
const projects = getProjects();
const social = readYamlFile(socialFile);
replaceBlogIndex(posts);
replaceProjectsPage(projects);
createPostPages(posts);
createFeed(posts);
createSitemap(posts);
applySocialLinks(social);
console.log(`Built ${posts.length} post(s) and ${projects.length} project(s) into ${dist}`);
