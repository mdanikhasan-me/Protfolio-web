import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { writeManifest, verifyDeployment } from './deployment.mjs';

test('published release checks detect stale HTML, missing assets and soft 404s', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-release-'));
  let mode = 'good';
  await mkdir(join(directory, 'about'));
  await writeFile(join(directory, 'index.html'), '<h1>ANIK</h1>');
  await writeFile(join(directory, 'about/index.html'), '<h1>About</h1>');
  await writeFile(join(directory, 'site.css'), 'body{color:white}');
  const manifest = await writeManifest(directory, 'expected-revision');
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/site.css' && mode === 'missing') { response.writeHead(404).end(); return; }
    if (path === '/about/' && mode === 'soft-404') { response.end('<h1>Not found</h1>'); return; }
    if (path === '/' && mode === 'stale-html') { response.end('<h1>Old homepage</h1>'); return; }
    if (path === '/release-manifest.json' && mode === 'stale-release') {
      response.end(JSON.stringify({ ...manifest, revision: 'old-revision' })); return;
    }
    try { response.end(await readFile(join(directory, path.endsWith('/') ? path + 'index.html' : path))); }
    catch { response.writeHead(404).end(); }
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}/`;
    const options = { attempts: 1, timeoutMs: 1000 };
    assert.equal((await verifyDeployment(origin, 'expected-revision', options)).files, 3);
    for (const failure of ['missing', 'soft-404', 'stale-html', 'stale-release']) {
      mode = failure;
      await assert.rejects(verifyDeployment(origin, 'expected-revision', options), undefined, failure);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true });
  }
});
