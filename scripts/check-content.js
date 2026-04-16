const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];
const warnings = [];

const folderCollections = [
  {
    name: 'projects',
    dir: path.join(root, 'src', 'content', 'projects'),
    requiredKeys: ['title', 'slug', 'description', 'tools'],
    optionalKeys: ['thumbnail', 'source_code', 'live_demo', 'featured'],
    legacyKeys: ['stack', 'github_url', 'live_url'],
    bodyRequired: false,
  },
  {
    name: 'posts',
    dir: path.join(root, 'src', 'content', 'posts'),
    requiredKeys: ['title', 'slug', 'date', 'description'],
    optionalKeys: ['cover', 'tags', 'draft'],
    legacyKeys: [],
    bodyRequired: true,
  },
];

const requiredConfigPaths = [
  'src/admin/config.yml',
  'src/content/pages/homepage.yml',
  'src/content/pages/about.yml',
  'src/content/pages/contact.yml',
  'src/content/settings/general.yml',
  'src/content/settings/seo.yml',
  'src/content/settings/social.yml',
  'src/content/settings/contact.yml',
  'src/content/settings/analytics.yml',
];

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

function hasKey(frontmatter, key) {
  return new RegExp(`^${key}:`, 'm').test(frontmatter);
}

function getScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return String(match[1]).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

function getTopLevelKeys(frontmatter) {
  return Array.from(frontmatter.matchAll(/^([A-Za-z0-9_]+):/gm), (match) => match[1]);
}

function report(file, message) {
  errors.push(`${file}: ${message}`);
}

function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

function isLocalAssetPath(value) {
  return /^(\/(assets|uploads)\/|\.\/public\/|public\/)/i.test(String(value || '').trim());
}

function resolveLocalAssetPath(value) {
  return path.join(
    root,
    String(value || '')
      .trim()
      .replace(/^\.\/public\//i, 'public/')
      .replace(/^public\//i, 'public/')
      .replace(/^\//, 'public/'),
  );
}

function checkLocalAssetReference(file, value, fieldName) {
  if (!isLocalAssetPath(value)) return;
  const resolved = resolveLocalAssetPath(value);
  if (!fs.existsSync(resolved)) {
    report(file, `${fieldName} references missing local asset "${value}"`);
  }
}

function checkBody(file, body) {
  if (!body.trim()) return;

  if (/Â|Ã/.test(body)) warn(file, 'body contains mojibake characters');
  if (/<p \*align\*=/.test(body)) warn(file, 'body contains broken rich-text align markup');
  if (/^\s*\\#{1,6}\s/m.test(body) || /\*\*\\#{1,6}\s/.test(body)) {
    warn(file, 'body contains broken pasted heading markup');
  }
  if (/```(?:bash|html|css|js|javascript|json|yaml|yml|md|markdown|text)[A-Za-z0-9]/i.test(body)) {
    warn(file, 'body contains collapsed code fence syntax');
  }
  if (/\d+\.\s+[^\n]+\d+\.\s+/.test(body)) {
    warn(file, 'body contains collapsed ordered list items');
  }

  for (const match of body.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    checkLocalAssetReference(file, match[1], 'body');
  }

  for (const match of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    checkLocalAssetReference(file, match[1], 'body');
  }
}

function validateFolderCollection(config) {
  const allowedKeys = new Set([...config.requiredKeys, ...config.optionalKeys, ...config.legacyKeys]);
  const slugs = new Map();

  for (const file of fs.readdirSync(config.dir).filter((name) => name.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(config.dir, file), 'utf8');
    const { frontmatter, body } = readFrontMatter(raw);
    const basename = file.replace(/\.md$/, '');
    const slug = getScalar(frontmatter, 'slug');
    const title = getScalar(frontmatter, 'title');
    const thumbnail = getScalar(frontmatter, 'thumbnail');
    const cover = getScalar(frontmatter, 'cover');
    const label = `${config.name}/${file}`;

    if (!frontmatter) {
      report(label, 'missing frontmatter block');
      continue;
    }

    for (const key of config.requiredKeys) {
      if (!hasKey(frontmatter, key)) {
        report(label, `missing required "${key}" field`);
      }
    }

    if (slug && basename !== slug) {
      report(label, `filename does not match slug (${basename} != ${slug})`);
    }

    if (slug) {
      if (slugs.has(slug)) {
        report(label, `duplicate slug "${slug}" also used by ${slugs.get(slug)}`);
      } else {
        slugs.set(slug, file);
      }
    }

    if (title && title.trim() !== title) {
      report(label, 'title has leading or trailing whitespace');
    }

    const topLevelKeys = getTopLevelKeys(frontmatter);
    for (const key of topLevelKeys) {
      if (!allowedKeys.has(key)) {
        report(label, `uses unexpected "${key}" field`);
      }
    }

    for (const legacyKey of config.legacyKeys) {
      if (hasKey(frontmatter, legacyKey)) {
        report(label, `uses legacy "${legacyKey}" field`);
      }
    }

    if (config.bodyRequired && !body.trim()) {
      report(label, 'missing body content');
    }

    checkLocalAssetReference(label, thumbnail, 'thumbnail');
    checkLocalAssetReference(label, cover, 'cover');
    checkBody(label, body);
  }
}

function validateAdminConfig() {
  const configPath = path.join(root, 'src', 'admin', 'config.yml');
  const config = fs.readFileSync(configPath, 'utf8').replace(/\uFEFF/g, '').replace(/\r/g, '');

  if (/Â|Ã/.test(config)) {
    warn('src/admin/config.yml', 'contains mojibake characters');
  }

  const pathRefs = Array.from(
    config.matchAll(/^\s*(?:media_folder|folder|file):\s*"([^"]+)"/gm),
    (match) => match[1],
  );

  for (const relPath of pathRefs) {
    if (!fs.existsSync(path.join(root, relPath))) {
      report('src/admin/config.yml', `references missing path "${relPath}"`);
    }
  }
}

for (const relPath of requiredConfigPaths) {
  if (!fs.existsSync(path.join(root, relPath))) {
    report(relPath, 'required file is missing');
  }
}

validateAdminConfig();

for (const collection of folderCollections) {
  validateFolderCollection(collection);
}

if (errors.length) {
  console.error('Content check failed:\n');
  for (const issue of errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

if (warnings.length) {
  console.warn('Content warnings:\n');
  for (const issue of warnings) {
    console.warn(`- ${issue}`);
  }
}

console.log('Content OK');
