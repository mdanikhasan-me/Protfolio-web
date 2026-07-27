interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: {
    title?: string;
  };
}

interface PagefindResult {
  data: () => Promise<PagefindResultData>;
}

interface PagefindResponse {
  results: PagefindResult[];
}

interface PagefindModule {
  search: (query: string) => Promise<PagefindResponse>;
}

const form = document.querySelector<HTMLFormElement>('#site-search');
const input = document.querySelector<HTMLInputElement>('#search-query');
const statusElement = document.querySelector<HTMLElement>('#search-status');
const list = document.querySelector<HTMLOListElement>('#search-results');

function textExcerpt(source: string) {
  const template = document.createElement('template');
  template.innerHTML = source;
  return template.content.textContent?.trim() ?? '';
}

function renderResult(result: PagefindResultData) {
  const item = document.createElement('li');
  const heading = document.createElement('h3');
  const link = document.createElement('a');
  const excerpt = document.createElement('p');

  link.href = result.url;
  link.textContent = result.meta.title ?? result.url;
  excerpt.textContent = textExcerpt(result.excerpt);
  heading.append(link);
  item.append(heading, excerpt);
  return item;
}

async function runSearch(query: string) {
  if (!statusElement || !list) return;

  const value = query.trim();
  list.replaceChildren();

  if (!value) {
    statusElement.textContent = 'Enter a term to search the production index.';
    return;
  }

  statusElement.textContent = `Searching for “${value}”…`;

  try {
    const pagefindUrl = '/pagefind/pagefind.js';
    const pagefind = (await import(/* @vite-ignore */ pagefindUrl)) as PagefindModule;
    const response = await pagefind.search(value);
    const resultData = await Promise.all(
      response.results.slice(0, 20).map((result) => result.data()),
    );

    list.replaceChildren(...resultData.map(renderResult));
    statusElement.textContent =
      resultData.length === 0
        ? `No results for “${value}”.`
        : `${resultData.length} result${resultData.length === 1 ? '' : 's'} for “${value}”.`;
  } catch {
    statusElement.textContent =
      'The search index is not available in this preview. Browse Work, Services, or Writing instead.';
  }
}

if (form && input) {
  const initialQuery = new URLSearchParams(window.location.search).get('q') ?? '';
  input.value = initialQuery;
  void runSearch(initialQuery);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    const next = new URL(window.location.href);

    if (query) next.searchParams.set('q', query);
    else next.searchParams.delete('q');

    window.history.replaceState({}, '', next);
    void runSearch(query);
  });
}
