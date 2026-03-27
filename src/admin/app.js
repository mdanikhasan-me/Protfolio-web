(() => {
  const state = {
    config: null,
    route: 'overview',
    user: null,
    posts: [],
    projects: [],
    social: {},
    media: [],
    loading: false,
    postForm: null,
    projectForm: null,
    status: null
  };

  const dom = {
    gate: document.getElementById('gate'),
    gateStatus: document.getElementById('gateStatus'),
    enterPortal: document.getElementById('enterPortal'),
    appShell: document.getElementById('appShell'),
    appContent: document.getElementById('appContent'),
    topbarTitle: document.getElementById('topbarTitle'),
    topbarEyebrow: document.getElementById('topbarEyebrow'),
    identityEmail: document.getElementById('identityEmail'),
    syncBtn: document.getElementById('syncBtn'),
    logoutBtn: document.getElementById('logoutBtn')
  };

  const routeMeta = {
    overview: { title: 'Overview', eyebrow: 'Private admin' },
    blog: { title: 'Blog', eyebrow: 'Publishing' },
    projects: { title: 'Projects', eyebrow: 'Portfolio' },
    social: { title: 'Social links', eyebrow: 'Site profiles' },
    media: { title: 'Media', eyebrow: 'Uploads' }
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
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

  function readFrontMatter(raw) {
    if (!raw.startsWith('---')) return { data: {}, body: raw.trim() };
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { data: {}, body: raw.trim() };
    const lines = match[1].replace(/\r/g, '').split('\n');
    const data = {};
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const top = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!top) {
        i += 1;
        continue;
      }
      const key = top[1];
      const rest = top[2].trim();
      if (rest) {
        data[key] = parseValue(rest);
        i += 1;
        continue;
      }
      const list = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (!/^\s+/.test(next)) break;
        const trimmed = next.trim();
        if (trimmed.startsWith('- ')) list.push(parseValue(trimmed.slice(2)));
        i += 1;
      }
      data[key] = list;
    }
    return { data, body: match[2].trim() };
  }

  function parseValue(raw) {
    const value = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  function toYamlValue(value) {
    return JSON.stringify(String(value ?? ''));
  }

  function buildFrontMatter(data, body) {
    const lines = ['---'];
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        value.filter(Boolean).forEach((item) => lines.push(`  - ${String(item)}`));
      } else if (typeof value === 'boolean') {
        lines.push(`${key}: ${value ? 'true' : 'false'}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    });
    lines.push('---', '', body || '');
    return `${lines.join('\n')}\n`;
  }

  function buildYaml(obj) {
    return Object.entries(obj).map(([key, value]) => `${key}: ${toYamlValue(value)}`).join('\n') + '\n';
  }

  function githubApi(path) {
    const { owner, repo, branch } = state.config;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  }

  function githubProxy(path) {
    const { owner, repo } = state.config;
    return `${location.origin}/.netlify/git/github/repos/${owner}/${repo}/contents/${path}`;
  }

  async function getJwt() {
    if (!state.user) throw new Error('Sign in required.');
    return state.user.jwt();
  }

  async function githubGet(path) {
    const response = await fetch(githubApi(path), { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  async function githubPut(path, content, message, sha) {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    return githubPutBase64(path, base64, message, sha);
  }

  async function githubPutBase64(path, base64, message, sha) {
    const token = await getJwt();
    const response = await fetch(githubProxy(path), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        message,
        content: base64,
        branch: state.config.branch,
        sha
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to save ${path}`);
    }
    return response.json();
  }

  async function githubDelete(path, sha, message) {
    const token = await getJwt();
    const response = await fetch(githubProxy(path), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({ message, branch: state.config.branch, sha })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to delete ${path}`);
    }
  }

  async function loadCollection(dirPath, type) {
    const listing = await githubGet(dirPath);
    const files = Array.isArray(listing) ? listing.filter((item) => item.type === 'file') : [];
    const items = await Promise.all(files.map(async (file) => {
      const source = await fetch(file.download_url, { cache: 'no-store' });
      const raw = await source.text();
      const { data, body } = readFrontMatter(raw);
      return {
        type,
        path: file.path,
        sha: file.sha,
        name: file.name,
        slug: slugify(data.slug || file.name.replace(/\.md$/, '')),
        title: data.title || file.name.replace(/\.md$/, ''),
        description: data.description || '',
        date: data.date || '',
        cover: data.cover || '',
        draft: data.draft === true || data.draft === 'true',
        tools: Array.isArray(data.tools) ? data.tools : Array.isArray(data.stack) ? data.stack : [],
        source_code: data.source_code || data.github_url || '',
        live_demo: data.live_demo || data.live_url || '',
        featured: data.featured === true || data.featured === 'true',
        body,
        raw
      };
    }));
    return items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || a.title.localeCompare(b.title));
  }

  async function loadSocial() {
    const file = await githubGet(state.config.paths.social);
    const raw = await fetch(file.download_url, { cache: 'no-store' }).then((r) => r.text());
    const social = {};
    raw.replace(/\r/g, '').split('\n').forEach((line) => {
      const match = line.match(/^([^:#]+):\s*(.*)$/);
      if (!match) return;
      social[match[1].trim()] = parseValue(match[2]);
    });
    social.__sha = file.sha;
    social.__path = file.path;
    return social;
  }

  async function loadMedia() {
    try {
      const listing = await githubGet(state.config.paths.media);
      return Array.isArray(listing) ? listing.filter((item) => item.type === 'file').sort((a, b) => b.name.localeCompare(a.name)) : [];
    } catch (error) {
      return [];
    }
  }

  async function refreshData(withNotice = true) {
    try {
      state.posts = await loadCollection(state.config.paths.posts, 'post');
      state.projects = await loadCollection(state.config.paths.projects, 'project');
      state.social = await loadSocial();
      state.media = await loadMedia();
      if (withNotice) flashNotice('Content synced successfully.', 'success');
      render();
    } catch (error) {
      flashNotice(error.message || 'Failed to load content.', 'error');
    }
  }

  function flashNotice(message, type = '') {
    state.status = { message, type };
    renderStatus();
  }

  function renderStatus() {
    const existing = document.querySelector('[data-global-status]');
    if (!state.status) {
      if (existing) existing.remove();
      return;
    }
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = `notice ${state.status.type ? `is-${state.status.type}` : ''}`;
    el.dataset.globalStatus = '1';
    el.textContent = state.status.message;
    dom.appContent.prepend(el);
    window.clearTimeout(renderStatus._timer);
    renderStatus._timer = window.setTimeout(() => {
      state.status = null;
      const node = document.querySelector('[data-global-status]');
      if (node) node.remove();
    }, 3200);
  }

  function getRoute() {
    const hash = (location.hash || '#overview').replace('#', '').trim().toLowerCase();
    return routeMeta[hash] ? hash : 'overview';
  }

  function setRoute(route) {
    location.hash = route;
  }

  function attachCommonActions(scope = document) {
    scope.querySelectorAll('[data-route-jump]').forEach((button) => {
      button.addEventListener('click', () => setRoute(button.dataset.routeJump));
    });
    scope.querySelectorAll('[data-action="new-post"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.postForm = createEmptyPost();
        setRoute('blog');
        render();
      });
    });
    scope.querySelectorAll('[data-action="new-project"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.projectForm = createEmptyProject();
        setRoute('projects');
        render();
      });
    });
  }

  function createEmptyPost() {
    const today = new Date().toISOString().slice(0, 10);
    return { title: '', slug: '', date: today, description: '', cover: '', draft: false, body: '', path: '', sha: '' };
  }

  function createEmptyProject() {
    return { title: '', slug: '', description: '', tools: [], source_code: '', live_demo: '', featured: false, body: '', path: '', sha: '' };
  }

  function renderOverview() {
    const tpl = document.getElementById('overviewTemplate');
    const node = tpl.content.cloneNode(true);
    node.querySelector('[data-count-posts]').textContent = String(state.posts.length);
    node.querySelector('[data-count-projects]').textContent = String(state.projects.length);
    node.querySelector('[data-count-social]').textContent = String(Object.entries(state.social).filter(([key, value]) => !key.startsWith('__') && value).length);
    node.querySelector('[data-count-media]').textContent = String(state.media.length);

    const postsHost = node.querySelector('[data-overview-posts]');
    const projectsHost = node.querySelector('[data-overview-projects]');
    renderLineItems(postsHost, state.posts.slice(0, 4), 'post');
    renderLineItems(projectsHost, state.projects.slice(0, 4), 'project');
    return node;
  }

  function renderLineItems(host, items, type) {
    if (!items.length) {
      host.innerHTML = `<p class="empty-state">Nothing here yet.</p>`;
      return;
    }
    host.innerHTML = items.map((item, index) => `
      <button class="line-row line-row--button" data-edit-type="${type}" data-edit-index="${index}">
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.description || (type === 'post' ? item.date || 'Blog entry' : 'Project entry'))}</small>
        </span>
        <em>Edit</em>
      </button>
    `).join('');
    host.querySelectorAll('[data-edit-type]').forEach((button) => {
      button.addEventListener('click', () => {
        const list = button.dataset.editType === 'post' ? state.posts : state.projects;
        const item = structuredClone(list[Number(button.dataset.editIndex)]);
        if (button.dataset.editType === 'post') {
          state.postForm = item;
          setRoute('blog');
        } else {
          state.projectForm = item;
          setRoute('projects');
        }
        render();
      });
    });
  }

  function renderBlog() {
    const wrap = document.createElement('section');
    wrap.className = 'flow-gap';
    const editing = state.postForm || null;
    wrap.innerHTML = `
      <div class="section-block flow-gap">
        <div class="toolbar">
          <div>
            <p class="label">Publishing</p>
            <h2>Posts</h2>
          </div>
          <button class="primary-btn" type="button" data-new-post>${editing ? 'New empty post' : 'New post'}</button>
        </div>
        <div class="line-list" data-post-list></div>
      </div>
      <div class="section-block flow-gap">
        <div class="section-head">
          <div>
            <p class="label">Editor</p>
            <h2>${editing && editing.path ? 'Edit post' : 'Write post'}</h2>
          </div>
        </div>
        <form class="editor" data-post-form>
          <div class="grid-2">
            <label><span>Title</span><input name="title" value="${escapeHtml(editing?.title || '')}" required></label>
            <label><span>Slug</span><input name="slug" value="${escapeHtml(editing?.slug || '')}" placeholder="my-post-slug" required></label>
          </div>
          <div class="grid-2">
            <label><span>Publish date</span><input type="date" name="date" value="${escapeHtml(editing?.date || '')}"></label>
            <label><span>Cover image</span><input name="cover" value="${escapeHtml(editing?.cover || '')}" placeholder="/uploads/image.webp"></label>
          </div>
          <label><span>Short description</span><textarea name="description">${escapeHtml(editing?.description || '')}</textarea></label>
          <label><span>Article</span><textarea name="body">${escapeHtml(editing?.body || '')}</textarea></label>
          <label class="check-row"><input type="checkbox" name="draft" ${editing?.draft ? 'checked' : ''}><span>Save as draft</span></label>
          <div class="form-actions">
            <button class="primary-btn" type="submit">Save post</button>
            ${editing?.path ? '<button class="danger-btn" type="button" data-delete-post>Delete post</button>' : ''}
          </div>
        </form>
      </div>
    `;

    const listHost = wrap.querySelector('[data-post-list]');
    if (!state.posts.length) listHost.innerHTML = '<p class="empty-state">No posts yet.</p>';
    else {
      listHost.innerHTML = state.posts.map((post, index) => `
        <button class="line-row line-row--button" type="button" data-open-post="${index}">
          <span>
            <strong>${escapeHtml(post.title)}</strong>
            <small>${escapeHtml(post.description || post.date || '')}</small>
          </span>
          <em>${post.draft ? 'Draft' : 'Open'}</em>
        </button>
      `).join('');
    }

    wrap.querySelector('[data-new-post]').addEventListener('click', () => {
      state.postForm = createEmptyPost();
      render();
    });
    listHost.querySelectorAll('[data-open-post]').forEach((button) => {
      button.addEventListener('click', () => {
        state.postForm = structuredClone(state.posts[Number(button.dataset.openPost)]);
        render();
      });
    });

    const form = wrap.querySelector('[data-post-form]');
    form.addEventListener('submit', savePost);
    const titleInput = form.elements.title;
    const slugInput = form.elements.slug;
    titleInput.addEventListener('input', () => {
      if (!slugInput.dataset.manual) slugInput.value = slugify(titleInput.value);
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.manual = '1';
      slugInput.value = slugify(slugInput.value);
    });
    const deleteBtn = wrap.querySelector('[data-delete-post]');
    if (deleteBtn) deleteBtn.addEventListener('click', deletePost);
    return wrap;
  }

  function renderProjects() {
    const wrap = document.createElement('section');
    wrap.className = 'flow-gap';
    const editing = state.projectForm || null;
    wrap.innerHTML = `
      <div class="section-block flow-gap">
        <div class="toolbar">
          <div>
            <p class="label">Portfolio</p>
            <h2>Projects</h2>
          </div>
          <button class="primary-btn" type="button" data-new-project>${editing ? 'New empty project' : 'New project'}</button>
        </div>
        <div class="line-list" data-project-list></div>
      </div>
      <div class="section-block flow-gap">
        <div class="section-head">
          <div>
            <p class="label">Editor</p>
            <h2>${editing && editing.path ? 'Edit project' : 'Write project'}</h2>
          </div>
        </div>
        <form class="editor" data-project-form>
          <div class="grid-2">
            <label><span>Title</span><input name="title" value="${escapeHtml(editing?.title || '')}" required></label>
            <label><span>Slug</span><input name="slug" value="${escapeHtml(editing?.slug || '')}" required></label>
          </div>
          <label><span>Description</span><textarea name="description">${escapeHtml(editing?.description || '')}</textarea></label>
          <label><span>Tools used</span><textarea name="tools" placeholder="One tool per line">${escapeHtml((editing?.tools || []).join('\n'))}</textarea></label>
          <div class="grid-2">
            <label><span>Source code</span><input name="source_code" value="${escapeHtml(editing?.source_code || '')}"></label>
            <label><span>Live demo</span><input name="live_demo" value="${escapeHtml(editing?.live_demo || '')}"></label>
          </div>
          <label><span>Notes</span><textarea name="body">${escapeHtml(editing?.body || '')}</textarea></label>
          <label class="check-row"><input type="checkbox" name="featured" ${editing?.featured ? 'checked' : ''}><span>Featured project</span></label>
          <div class="form-actions">
            <button class="primary-btn" type="submit">Save project</button>
            ${editing?.path ? '<button class="danger-btn" type="button" data-delete-project>Delete project</button>' : ''}
          </div>
        </form>
      </div>
    `;

    const listHost = wrap.querySelector('[data-project-list]');
    if (!state.projects.length) listHost.innerHTML = '<p class="empty-state">No projects yet.</p>';
    else {
      listHost.innerHTML = state.projects.map((project, index) => `
        <button class="line-row line-row--button" type="button" data-open-project="${index}">
          <span>
            <strong>${escapeHtml(project.title)}</strong>
            <small>${escapeHtml(project.description || '')}</small>
          </span>
          <em>${project.featured ? 'Featured' : 'Open'}</em>
        </button>
      `).join('');
    }

    wrap.querySelector('[data-new-project]').addEventListener('click', () => {
      state.projectForm = createEmptyProject();
      render();
    });
    listHost.querySelectorAll('[data-open-project]').forEach((button) => {
      button.addEventListener('click', () => {
        state.projectForm = structuredClone(state.projects[Number(button.dataset.openProject)]);
        render();
      });
    });

    const form = wrap.querySelector('[data-project-form]');
    form.addEventListener('submit', saveProject);
    const titleInput = form.elements.title;
    const slugInput = form.elements.slug;
    titleInput.addEventListener('input', () => {
      if (!slugInput.dataset.manual) slugInput.value = slugify(titleInput.value);
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.manual = '1';
      slugInput.value = slugify(slugInput.value);
    });
    const deleteBtn = wrap.querySelector('[data-delete-project]');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteProject);
    return wrap;
  }

  function renderSocial() {
    const entries = Object.entries(state.social).filter(([key]) => !key.startsWith('__'));
    const wrap = document.createElement('section');
    wrap.className = 'flow-gap';
    wrap.innerHTML = `
      <div class="section-block flow-gap">
        <div class="section-head">
          <div>
            <p class="label">Site profiles</p>
            <h2>Links</h2>
          </div>
        </div>
        <form class="editor" data-social-form>
          ${entries.map(([key, value]) => `<label><span>${escapeHtml(key)}</span><input name="${escapeHtml(key)}" value="${escapeHtml(value || '')}" placeholder="https://"></label>`).join('')}
          <div class="form-actions">
            <button class="primary-btn" type="submit">Save links</button>
          </div>
        </form>
      </div>
    `;
    wrap.querySelector('[data-social-form]').addEventListener('submit', saveSocial);
    return wrap;
  }

  function renderMedia() {
    const wrap = document.createElement('section');
    wrap.className = 'flow-gap';
    wrap.innerHTML = `
      <div class="section-block flow-gap">
        <div class="section-head">
          <div>
            <p class="label">Uploads</p>
            <h2>Drag and drop</h2>
          </div>
        </div>
        <div class="dropzone" data-dropzone>
          <input type="file" accept="image/*" multiple data-file-input>
          <p>Drop image files here or</p>
          <button class="upload-trigger" type="button" data-pick-files>Choose files</button>
          <p class="muted">Files save into <span class="inline-code">public/uploads</span>.</p>
        </div>
      </div>
      <div class="section-block flow-gap">
        <div class="section-head">
          <div>
            <p class="label">Library</p>
            <h2>Uploaded files</h2>
          </div>
        </div>
        <div class="upload-list" data-upload-list></div>
      </div>
    `;

    const dropzone = wrap.querySelector('[data-dropzone]');
    const fileInput = wrap.querySelector('[data-file-input]');
    const pickBtn = wrap.querySelector('[data-pick-files]');
    pickBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));
    ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-over');
    }));
    dropzone.addEventListener('drop', (event) => {
      handleFiles([...(event.dataTransfer?.files || [])]);
    });

    const host = wrap.querySelector('[data-upload-list]');
    if (!state.media.length) {
      host.innerHTML = '<p class="empty-state">No uploaded media yet.</p>';
    } else {
      host.innerHTML = state.media.map((file, index) => `
        <div class="upload-item">
          <img src="${escapeHtml(file.download_url)}" alt="${escapeHtml(file.name)}">
          <div>
            <strong>${escapeHtml(file.name)}</strong>
            <div class="inline-code">/uploads/${escapeHtml(file.name)}</div>
          </div>
          <button class="ghost-btn" type="button" data-copy-path="${index}">Copy path</button>
        </div>
      `).join('');
      host.querySelectorAll('[data-copy-path]').forEach((button) => {
        button.addEventListener('click', async () => {
          const file = state.media[Number(button.dataset.copyPath)];
          await navigator.clipboard.writeText(`/uploads/${file.name}`);
          flashNotice('Media path copied.', 'success');
        });
      });
    }
    return wrap;
  }

  async function savePost(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const slug = slugify(values.slug || values.title);
    const targetPath = `${state.config.paths.posts}/${slug}.md`;
    const existing = state.postForm?.path ? state.posts.find((item) => item.path === state.postForm.path) : null;
    const currentSha = existing?.sha || state.postForm?.sha || undefined;
    const frontMatter = {
      title: values.title,
      slug,
      date: values.date || new Date().toISOString().slice(0, 10),
      description: values.description || '',
      cover: values.cover || '',
      draft: form.elements.draft.checked
    };
    try {
      await githubPut(targetPath, buildFrontMatter(frontMatter, values.body || ''), `${existing ? 'Update' : 'Create'} blog post ${slug}`, currentSha);
      if (existing && existing.path !== targetPath) await githubDelete(existing.path, existing.sha, `Remove renamed blog post ${existing.slug}`);
      state.postForm = null;
      await refreshData(false);
      flashNotice('Post saved.', 'success');
      setRoute('blog');
    } catch (error) {
      flashNotice(error.message || 'Failed to save post.', 'error');
    }
  }

  async function deletePost() {
    if (!state.postForm?.path || !confirm('Delete this post?')) return;
    try {
      await githubDelete(state.postForm.path, state.postForm.sha, `Delete blog post ${state.postForm.slug}`);
      state.postForm = null;
      await refreshData(false);
      flashNotice('Post deleted.', 'success');
    } catch (error) {
      flashNotice(error.message || 'Failed to delete post.', 'error');
    }
  }

  async function saveProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const slug = slugify(values.slug || values.title);
    const targetPath = `${state.config.paths.projects}/${slug}.md`;
    const tools = String(values.tools || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const existing = state.projectForm?.path ? state.projects.find((item) => item.path === state.projectForm.path) : null;
    const currentSha = existing?.sha || state.projectForm?.sha || undefined;
    const frontMatter = {
      title: values.title,
      slug,
      description: values.description || '',
      tools,
      source_code: values.source_code || '',
      live_demo: values.live_demo || '',
      featured: form.elements.featured.checked
    };
    try {
      await githubPut(targetPath, buildFrontMatter(frontMatter, values.body || ''), `${existing ? 'Update' : 'Create'} project ${slug}`, currentSha);
      if (existing && existing.path !== targetPath) await githubDelete(existing.path, existing.sha, `Remove renamed project ${existing.slug}`);
      state.projectForm = null;
      await refreshData(false);
      flashNotice('Project saved.', 'success');
      setRoute('projects');
    } catch (error) {
      flashNotice(error.message || 'Failed to save project.', 'error');
    }
  }

  async function deleteProject() {
    if (!state.projectForm?.path || !confirm('Delete this project?')) return;
    try {
      await githubDelete(state.projectForm.path, state.projectForm.sha, `Delete project ${state.projectForm.slug}`);
      state.projectForm = null;
      await refreshData(false);
      flashNotice('Project deleted.', 'success');
    } catch (error) {
      flashNotice(error.message || 'Failed to delete project.', 'error');
    }
  }

  async function saveSocial(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const next = {};
    formData.forEach((value, key) => { next[key] = value; });
    try {
      await githubPut(state.social.__path, buildYaml(next), 'Update social links', state.social.__sha);
      await refreshData(false);
      flashNotice('Social links saved.', 'success');
    } catch (error) {
      flashNotice(error.message || 'Failed to save social links.', 'error');
    }
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    if (!files.length) return;
    for (const file of files) {
      try {
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
        const base64 = await fileToBase64(file);
        await githubPutBase64(`${state.config.paths.media}/${safeName}`, base64, `Upload media ${safeName}`);
      } catch (error) {
        flashNotice(error.message || `Failed to upload ${file.name}`, 'error');
        return;
      }
    }
    await refreshData(false);
    flashNotice('Media uploaded.', 'success');
    setRoute('media');
  }

  function render() {
    state.route = getRoute();
    Object.entries(routeMeta).forEach(([route, meta]) => {
      const link = document.querySelector(`[data-route-link="${route}"]`);
      if (link) {
        if (route === state.route) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    });
    dom.topbarTitle.textContent = routeMeta[state.route].title;
    dom.topbarEyebrow.textContent = routeMeta[state.route].eyebrow;
    dom.appContent.innerHTML = '';
    let node;
    if (state.route === 'blog') node = renderBlog();
    else if (state.route === 'projects') node = renderProjects();
    else if (state.route === 'social') node = renderSocial();
    else if (state.route === 'media') node = renderMedia();
    else node = renderOverview();
    dom.appContent.append(node);
    attachCommonActions(dom.appContent);
    renderStatus();
  }

  async function openApp() {
    state.user = window.netlifyIdentity.currentUser();
    if (!state.user) {
      closeApp();
      return;
    }
    dom.identityEmail.textContent = state.user.email || 'Signed in';
    dom.gate.classList.add('is-hidden');
    dom.appShell.classList.remove('is-hidden');
    await refreshData(false);
    render();
  }

  function closeApp() {
    dom.appShell.classList.add('is-hidden');
    dom.gate.classList.remove('is-hidden');
  }

  async function init() {
    state.config = await fetch('./config.json?v=20260327b').then((r) => r.json());

    dom.enterPortal.addEventListener('click', () => {
      dom.gateStatus.textContent = 'Opening login…';
      window.netlifyIdentity.open();
    });
    dom.logoutBtn.addEventListener('click', () => window.netlifyIdentity.logout());
    dom.syncBtn.addEventListener('click', () => refreshData());
    window.addEventListener('hashchange', render);

    if (!window.netlifyIdentity) {
      dom.gateStatus.textContent = 'Netlify Identity failed to load.';
      return;
    }

    window.netlifyIdentity.on('init', async (user) => {
      state.user = user || null;
      if (state.user) await openApp();
      else dom.gateStatus.textContent = 'Secure access for site content.';
    });
    window.netlifyIdentity.on('login', async () => {
      window.netlifyIdentity.close();
      state.user = window.netlifyIdentity.currentUser();
      await openApp();
      dom.gateStatus.textContent = 'Signed in.';
    });
    window.netlifyIdentity.on('logout', () => {
      state.user = null;
      closeApp();
      dom.gateStatus.textContent = 'Signed out.';
    });
    window.netlifyIdentity.on('error', (error) => {
      dom.gateStatus.textContent = error?.message || 'Authentication error.';
    });

    window.netlifyIdentity.init();
  }

  init();
})();
