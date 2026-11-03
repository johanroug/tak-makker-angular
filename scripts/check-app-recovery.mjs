import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const listeners = new Map();
const panels = [];
let reloads = 0;
class Script { src = '/chunk-old.js'; }
const document = {
  getElementById: (id) => panels.find((panel) => panel.id === id),
  createElement: (tag) => ({
    tag, style: {}, children: [], setAttribute() {}, focus() {},
    append(...items) { this.children.push(...items); },
    remove() { panels.splice(panels.indexOf(this), 1); },
  }),
  body: { append: (panel) => panels.push(panel) },
};
runInNewContext(readFileSync('public/app-recovery.js', 'utf8'), {
  document, HTMLScriptElement: Script,
  window: {
    addEventListener: (name, callback) => listeners.set(name, callback),
    location: { reload: () => reloads++ },
  },
});
listeners.get('unhandledrejection')({ reason: new Error('Failed to fetch') });
assert.equal(panels.length, 0, 'An API failure alone should not cover the app');
listeners.get('unhandledrejection')({ reason: new TypeError('Failed to fetch dynamically imported module: /chunk.js') });
assert.equal(panels.length, 1);
listeners.get('app-load-failed')();
assert.equal(panels.length, 1, 'Repeated errors must not create duplicate panels');
assert.equal(reloads, 0, 'Never automatically reload potentially unsaved work');
panels[0].children.find((child) => child.textContent === 'Indlæs siden igen').onclick();
assert.equal(reloads, 1);
panels[0].children.find((child) => child.textContent === 'Tilbage til siden').onclick();
assert.equal(panels.length, 0);
listeners.get('error')({ target: new Script() });
assert.equal(panels.length, 1, 'Startup script failures should also show recovery');
console.log('App recovery checks passed.');
