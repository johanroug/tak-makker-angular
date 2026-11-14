import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { TRADE_PAGES } from '../src/app/features/trades/trade-pages.ts';
import { BRAND_NAME, SITE_ORIGIN } from '../src/app/core/brand.ts';
import { LEGAL_PAGES } from '../src/app/features/legal/legal-pages.ts';
import { PRODUCT_PAGES } from '../src/app/features/product/product-pages.ts';

const origin = SITE_ORIGIN;
const output = new URL('../dist/hovedet-paa-soemmet-angular/browser/', import.meta.url);
const read = (path) => readFileSync(new URL(path, output), 'utf8');
// These checks inspect HTML, not CSS. Remove critical styles that JSDOM's
// stylesheet parser does not understand (for example modern Tailwind rules).
const parseHtml = (html) =>
  new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')).window.document;
const pages = [
  { slug: '', heading: 'Lav professionelle tilbud.', title: `Tilbudsprogram til håndværkere med AI | ${BRAND_NAME}` },
  ...TRADE_PAGES,
  ...PRODUCT_PAGES,
];
const titles = new Set();
const descriptions = new Set();
const urls = new Set([...pages, ...LEGAL_PAGES].map((page) => origin + '/' + page.slug));

for (const page of pages) {
  const file = page.slug ? page.slug + '/index.html' : 'index.html';
  const document = parseHtml(read(file));
  assert.equal(document.documentElement.lang, 'da', `${file}: Danish document language`);
  assert.equal(document.title, page.title, `${file}: correct title`);
  assert.equal(
    document.querySelector('app-marketing-header app-public-brand a')
      ?.getAttribute('aria-label')?.toLocaleLowerCase('da-DK'),
    BRAND_NAME.toLocaleLowerCase('da-DK'),
    `${file}: navigation uses the current brand`,
  );
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
  assert(document.querySelector('h2'), `${file}: public sections have headings`);
  const graph = JSON.parse(document.querySelector('#page-structured-data').textContent)['@graph'];
  assert(graph.some((node) => node['@type'] === 'Organization' && node.identifier.value === '46908171'));
  if (page.slug) {
    const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumb.itemListElement[1].item, origin + '/' + page.slug);
    if (document.querySelector('.trade-photo')) {
      assert(document.querySelector('.trade-photo').getAttribute('srcset').includes('768w'));
    }
  } else {
    assert(graph.some((node) => node['@type'] === 'SoftwareApplication' && !node.aggregateRating && !node.offers));
  }
  const websiteData = document.querySelector('#website-structured-data');
  if (!page.slug) {
    assert(websiteData, `${file}: website structured data is prerendered`);
    const schema = JSON.parse(websiteData.textContent);
    assert.equal(schema['@context'], 'https://schema.org');
    assert.equal(schema['@type'], 'WebSite');
    assert.equal(schema.name, BRAND_NAME);
    assert.equal(schema.url, origin + '/');
    assert.equal(schema.inLanguage, 'da-DK');
    assert(document.querySelector('.hero .eyebrow').textContent.includes('TILBUDSPROGRAM TIL HÅNDVÆRKERE'));
    assert(document.querySelector('h1 em').textContent.includes('På få minutter med AI.'));
  } else {
    assert.equal(websiteData, null, `${file}: homepage schema is not carried onto other pages`);
  }
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
  for (const product of PRODUCT_PAGES) {
    if (page.slug !== product.slug) assert(document.querySelector(`a[href="/${product.slug}"]`), `${file}: product page discoverable`);
  }
  if (PRODUCT_PAGES.some((product) => product.slug === page.slug)) {
    assert(configuredHosting(page.slug), `${file}: direct visits supported by Simply`);
    assert(document.querySelectorAll('details').length >= 3);
    assert(document.querySelector('a[href="/"]'));
  }
}

function configuredHosting(slug) {
  const apache = readFileSync(new URL('../hosting/simply/.htaccess', import.meta.url), 'utf8');
  return apache.split(/\r?\n/).some((line) => line.startsWith('RewriteRule ^(') && line.includes(slug) && line.endsWith('$ $1/index.html [END]'));
}

for (const page of LEGAL_PAGES) {
  const document = parseHtml(read(page.slug + '/index.html'));
  assert.equal(document.title, `${page.title} | ${BRAND_NAME}`);
  assert.equal(document.querySelector('h1')?.textContent.trim(), page.title);
  assert.equal(document.querySelector('link[rel="canonical"]')?.href, origin + '/' + page.slug);
  assert.equal(document.querySelector('meta[name="robots"]')?.content, 'index, follow');
  assert(document.querySelector('main')?.textContent.includes('Birkerød Kongevej 126'));
  assert(document.querySelector('a[href="/privatlivspolitik"]'));
  assert(document.querySelector('a[href="/handelsbetingelser"]'));
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
  assert.equal(document.querySelectorAll('script[type="application/ld+json"]').length, 0, `${file}: no public schema in private shell`);
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
  'sitemap contains all public pages',
);
assert(
  read('robots.txt').includes(`Sitemap: ${origin}/sitemap.xml`),
  'robots.txt references sitemap',
);
const apache = readFileSync(new URL('../hosting/simply/.htaccess', import.meta.url), 'utf8');
const privateRule = apache.split(/\r?\n/).find((line) => line.startsWith('RewriteRule ^(') && line.endsWith(' index.csr.html [END]'));
assert(privateRule, 'private app uses non-prerendered shell');
for (const path of ['login', 'register', 'forgot-password', 'reset-password', 'customers', 'projects', 'offers', 'activity', 'users', 'company-profile']) {
  assert(privateRule.includes(path), `${path}: private rewrite`);
}
for (const page of [...TRADE_PAGES, ...PRODUCT_PAGES, ...LEGAL_PAGES]) {
  assert(configuredHosting(page.slug), `${page.slug}: public HTML served directly`);
}
assert(apache.includes('ErrorDocument 404 /404.html'), 'unknown URLs have a static 404');
assert(!apache.split(/\r?\n/).some((line) => /^RewriteRule\s+\^(?:\.\*|\(\.\*\))\$?\s+\/?index\.html\b/.test(line)), 'no catch-all rewrite to homepage');
assert(/<FilesMatch "\^\(index\\\.csr\|404\)\\\.html\$">\s*Header always set X-Robots-Tag "noindex, follow"\s*<\/FilesMatch>/.test(apache), 'private shell and 404 carry noindex headers');
console.log(
  `SEO checks passed: ${urls.size} prerendered public pages, metadata, legal/contact content, internal links, sitemap, robots, client shell and static 404.`,
);
