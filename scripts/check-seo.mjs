import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { TRADE_PAGES } from '../src/app/features/trades/trade-pages.ts';

const origin = 'https://www.takmakker.dk';
const output = new URL('../dist/tak-makker-angular/browser/', import.meta.url);
const read = (path) => readFileSync(new URL(path, output), 'utf8');
// These checks inspect HTML, not CSS. Remove critical styles that JSDOM's
// stylesheet parser does not understand (for example modern Tailwind rules).
const parseHtml = (html) =>
  new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')).window.document;
const pages = [
  { slug: '', heading: 'Byg mere.', title: 'Tak Makker – tilbud til håndværkere' },
  ...TRADE_PAGES,
];
const titles = new Set();
const descriptions = new Set();
const urls = new Set(pages.map((page) => origin + '/' + page.slug));

for (const page of pages) {
  const file = page.slug ? page.slug + '/index.html' : 'index.html';
  const document = parseHtml(read(file));
  assert.equal(document.documentElement.lang, 'da', `${file}: Danish document language`);
  assert.equal(document.title, page.title, `${file}: correct title`);
  assert(!titles.has(document.title), `${file}: unique title`);
  titles.add(document.title);
  const description = document.querySelector('meta[name="description"]')?.content;
  assert(
    description?.length > 50 && !descriptions.has(description),
    `${file}: meaningful unique description`,
  );
  descriptions.add(description);
  assert.equal(
    document.querySelector('meta[name="robots"]')?.content,
    'index, follow',
    `${file}: indexable`,
  );
  assert.equal(
    document.querySelectorAll('link[rel="canonical"]').length,
    1,
    `${file}: one canonical`,
  );
  assert.equal(document.querySelector('link[rel="canonical"]').href, origin + '/' + page.slug);
  assert.equal(
    document.querySelector('meta[property="og:url"]')?.content,
    origin + '/' + page.slug,
  );
  assert.equal(
    document.querySelectorAll('h1').length,
    1,
    `${file}: one heading rendered without JavaScript`,
  );
  assert(
    document.querySelector('h1').textContent.includes(page.heading),
    `${file}: expected public content`,
  );
  assert.equal(
    document.querySelectorAll('input[type="password"]').length,
    0,
    `${file}: no login form`,
  );
  for (const other of TRADE_PAGES) {
    assert(
      document.querySelector(`a[href="/${other.slug}"]`),
      `${file}: discoverable link to ${other.slug}`,
    );
  }
  assert(
    document.querySelector('a[href="/register"]'),
    `${file}: working registration destination`,
  );
}

for (const file of ['index.csr.html', '404.html']) {
  const document = parseHtml(read(file));
  assert.equal(
    document.querySelector('meta[name="robots"]')?.content,
    'noindex, follow',
    `${file}: not indexed`,
  );
  assert.equal(
    document.querySelectorAll('link[rel="canonical"]').length,
    0,
    `${file}: no misleading homepage canonical`,
  );
  assert.equal(
    document.querySelector('app-root')?.textContent.trim(),
    '',
    `${file}: clean client shell`,
  );
}

const sitemap = new JSDOM(read('sitemap.xml'), { contentType: 'application/xml' }).window.document;
assert.deepEqual(
  new Set([...sitemap.querySelectorAll('loc')].map((node) => node.textContent)),
  urls,
  'sitemap contains exactly the four public pages',
);
assert(
  read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`),
  'robots.txt references sitemap',
);
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
assert(
  !config.rewrites.some((route) => route.source === '/(.*)'),
  'unknown URLs must not become homepage responses',
);
assert(
  config.rewrites.some((route) => route.destination === '/index.csr.html'),
  'private app uses non-prerendered shell',
);
console.log(
  'SEO checks passed: 4 prerendered public pages, metadata, internal links, sitemap, robots, client shell and static 404.',
);
