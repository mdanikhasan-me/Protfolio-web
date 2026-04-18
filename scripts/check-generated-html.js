const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const projectSourceDir = path.join(root, 'src', 'content', 'projects');
const errors = [];

function report(file, message) {
  errors.push(`${file}: ${message}`);
}

function walkHtmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }

  return out;
}

function readFrontMatter(raw) {
  const text = String(raw || '').replace(/\uFEFF/g, '').replace(/\r/g, '');
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { frontmatter: '', body: text };
  }

  return {
    frontmatter: match[1],
    body: text.slice(match[0].length),
  };
}

function getScalar(frontmatter, key) {
  const match = String(frontmatter || '').match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return String(match[1]).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

function hasMeaningfulBody(body) {
  const clean = String(body || '').trim();
  if (!clean) return false;
  return !/^use this entry as a starting point for portfolio items\.?$/i.test(clean);
}

function checkHtmlFile(fullPath) {
  const rel = path.relative(root, fullPath).replace(/\\/g, '/');
  const html = fs.readFileSync(fullPath, 'utf8');

  if (/^<!doctype html>/.test(html)) {
    report(rel, 'uses lowercase doctype');
  }
  if (/\salign=(["'])/i.test(html)) {
    report(rel, 'contains deprecated align attribute');
  }
  if (/\swidth=(["'])100%\1/i.test(html)) {
    report(rel, 'contains raw width="100%" attribute');
  }
  if (/<(?:img|br|hr|meta|link|source|input)\b[^>]*\/>/i.test(html)) {
    report(rel, 'contains self-closing void HTML element');
  }
  if (/<table>\s*<tr\b/i.test(html)) {
    report(rel, 'contains table rows without tbody');
  }
  if (/\\#{1,6}\s|```|\*\*\\#{1,6}\s/.test(html)) {
    report(rel, 'contains leaked markdown syntax');
  }

  for (const match of html.matchAll(/\s(?:src|href)\s*=\s*["'](\/(?:assets|uploads)\/[^"']+)["']/gi)) {
    const publicPath = match[1];
    const cleanPath = publicPath.split('?')[0].split('#')[0];
    const resolvedPath = path.join(dist, cleanPath.replace(/^\//, '').replace(/\//g, path.sep));
    if (!fs.existsSync(resolvedPath)) {
      report(rel, `references missing generated asset "${publicPath}"`);
    }
  }
}

function checkProjectPages() {
  if (!fs.existsSync(projectSourceDir)) return;

  for (const file of fs.readdirSync(projectSourceDir).filter(name => name.endsWith('.md')).sort()) {
    const source = fs.readFileSync(path.join(projectSourceDir, file), 'utf8');
    const { frontmatter, body } = readFrontMatter(source);
    const slug = getScalar(frontmatter, 'slug') || file.replace(/\.md$/, '');
    const thumbnail = getScalar(frontmatter, 'thumbnail') || getScalar(frontmatter, 'cover');
    const outputPath = path.join(dist, 'projects', slug, 'index.html');
    const rel = `dist/projects/${slug}/index.html`;

    if (!fs.existsSync(outputPath)) {
      report(rel, 'project detail page was not generated');
      continue;
    }

    const html = fs.readFileSync(outputPath, 'utf8');

    if (thumbnail && !/class="detail-cover-image"/.test(html)) {
      report(rel, 'project thumbnail exists in source but detail image is missing');
    }

    if (hasMeaningfulBody(body) && !/class="blog-post-content flow-md"/.test(html)) {
      report(rel, 'project body exists in source but detail content is missing');
    }
  }
}

if (!fs.existsSync(dist)) {
  report('dist', 'generated output directory is missing');
}

for (const file of walkHtmlFiles(dist)) {
  checkHtmlFile(file);
}

checkProjectPages();

if (errors.length) {
  console.error('Generated HTML check failed:\n');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Generated HTML OK');
