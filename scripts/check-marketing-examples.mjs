import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { TRADE_PAGES } from '../src/app/features/trades/trade-pages.ts';

const root = new URL('../dist/hovedet-paa-soemmet-angular/browser/', import.meta.url);
const retired = new Set([
  'tilbud-vvs-v3.jpg', 'tilbud-toemrer-v3.jpg', 'tilbud-murer-v3.jpg', 'tilbud-maler-v3.jpg',
  'workspace-v3.jpg', 'trin-1-beskriv-opgaven.png', 'trin-2-tilpas-tilbuddet.png', 'trin-3-hent-pdf.png',
]);
const concreteValue = /\d[\d.,]*\s*(?:kr\.?|timer?\b|t\b)/i;
let count = 0;
for (const slug of ['', ...TRADE_PAGES.map(page => page.slug)]) {
  const file = slug ? `${slug}/index.html` : 'index.html';
  const html = readFileSync(new URL(file, root), 'utf8').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const document = new JSDOM(html).window.document;
  for (const node of document.querySelectorAll('img[src],a[href]')) {
    const url = node.getAttribute('src') ?? node.getAttribute('href');
    const name = url?.split('/').at(-1);
    assert(!retired.has(name), `${file}: no retired illustration (${name})`);
    if (url?.startsWith('/marketing/') && /\.(jpg|png|webp)$/.test(url)) {
      assert(existsSync(new URL(url.slice(1), root)), `${file}: illustration exists (${url})`);
    }
  }
  for (const illustration of document.querySelectorAll('app-marketing-phone,.proof-paper')) {
    assert(!concreteValue.test(illustration.textContent), `${file}: no numeric price or time estimate in mockups`);
  }
  if (!slug) {
    assert.equal(document.querySelectorAll('.product-control-note').length, 1, 'Control message appears once');
    assert.equal(document.querySelector('.product-control-note').textContent, 'Dine timepriser. Dine materialer. Dine tilbud.');
  }
  count++;
}
const source = readFileSync(new URL('../src/app/shared/marketing/marketing-product-preview.component.html', import.meta.url), 'utf8');
assert(!concreteValue.test(source), 'Illustration source contains no concrete price or hour example');
for (const file of ['trin-1-beskriv-opgaven-flexible.jpg', 'workspace-flexible.jpg', 'trin-3-hent-pdf-flexible.jpg']) {
  assert(existsSync(new URL(`marketing/${file}`, root)), `Demo illustration exists (${file})`);
}
console.log(`Marketing checks passed: ${count} public pages, price-neutral mockups, current assets and one control message.`);
