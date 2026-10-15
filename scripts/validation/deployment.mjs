import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';

const manifestName = 'release-manifest.json';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function writeManifest(directory, revision) {
  const root = resolve(directory);
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const path = relative(root, file).split(sep).join('/');
        if (path === manifestName || path === 'CNAME') continue;
        const bytes = await readFile(file);
        // Exercise actual pretty URLs, including nested project/article routes.
        const route = path.replace(/(^|\/)index\.html$/, '$1');
        files.push({ path: route, bytes: bytes.length, sha256: digest(bytes) });
      }
    }
  }
  await visit(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  if (!files.some(file => file.path === '')) throw new Error('Build has no homepage');
  const manifest = { revision, files };
  await writeFile(resolve(root, manifestName), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export async function verifyDeployment(origin, revision, {
  attempts = 12, retryMs = 5000, timeoutMs = 15000, concurrency = 6,
} = {}) {
  const base = new URL(origin);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  async function retry(operation) {
    let failure;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try { return await operation(); }
      catch (error) {
        failure = error;
        if (attempt + 1 < attempts) await setTimeout(retryMs);
      }
    }
    throw failure;
  }
  async function request(path) {
    const url = new URL(path, base);
    // Bypass an older CDN response while checking the requested release.
    url.searchParams.set('release', revision);
    const response = await globalThis.fetch(url, {
      signal: globalThis.AbortSignal.timeout(timeoutMs),
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`${path || '/'}: HTTP ${response.status}`);
    return response;
  }
  const manifest = await retry(async () => {
    const value = await (await request(manifestName)).json();
    if (value.revision !== revision) throw new Error(`Published revision ${value.revision} is not ${revision}`);
    if (!Array.isArray(value.files) || !value.files.some(file => file.path === '')) {
      throw new Error('Release manifest is missing its homepage');
    }
    for (const file of value.files) {
      if (typeof file.path !== 'string' || /(^\/|\\|[?#]|(^|\/)\.\.?($|\/))/.test(file.path)
        || new URL(file.path, base).origin !== base.origin
        || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes)) {
        throw new Error('Invalid release manifest entry');
      }
    }
    return value;
  });
  let index = 0;
  const failures = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < manifest.files.length) {
      const file = manifest.files[index++];
      try {
        await retry(async () => {
          const bytes = new Uint8Array(await (await request(file.path)).arrayBuffer());
          if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) {
            throw new Error(`${file.path || '/'}: published bytes do not match the build`);
          }
        });
      } catch (error) { failures.push(error.message); }
    }
  }));
  if (failures.length) throw new Error(failures.join('\n'));
  return { revision, files: manifest.files.length, bytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, target, explicitRevision] = process.argv.slice(2);
    const revision = explicitRevision || process.env.GITHUB_SHA
      || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (command === 'write') {
      const manifest = await writeManifest(target || 'dist', revision);
      console.log(`Release manifest: ${manifest.files.length} files, revision ${revision}`);
    } else if (command === 'verify' && target) {
      console.log('Published release verified:', await verifyDeployment(target, revision));
    } else throw new Error('Usage: deployment.mjs write [dist] | verify <origin> [revision]');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
