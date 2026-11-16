import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync('src/app/core/pwa/app-install.service.ts', 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('@Injectable({ providedIn: \'root\' })', '')
  .replace('export class AppInstallService', 'class AppInstallService');
const compiled = ts.transpileModule(source + '\nglobalThis.Service = AppInstallService;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function setup({ ua = 'Android Mobile Chrome', standalone = false, iosStandalone = false, browser = true } = {}) {
  const listeners = new Map();
  const cleanup = [];
  const media = new Map();
  const window = {
    matchMedia(query) {
      const value = { matches: query.includes('standalone') && standalone, addEventListener: (_, fn) => { value.change = fn; }, removeEventListener() {} };
      media.set(query, value);
      return value;
    },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  };
  const context = vm.createContext({ window, navigator: { userAgent: ua, platform: '', maxTouchPoints: 0, standalone: iosStandalone },
    PLATFORM_ID: 'platform', DestroyRef: 'destroy',
    inject: key => key === 'platform' ? browser : { onDestroy: fn => cleanup.push(fn) },
    isPlatformBrowser: value => value,
    signal: initial => { let value = initial; const result = () => value; result.set = next => { value = next; }; return result; },
  });
  vm.runInContext(compiled, context);
  return { service: new context.Service(), listeners, media, cleanup };
}

for (const options of [{ ua: 'Desktop Chrome' }, { standalone: true }, { ua: 'iPhone', iosStandalone: true }, { browser: false }]) {
  const { service } = setup(options);
  assert.equal(service.visible(), false);
  await service.install();
  assert.equal(service.guide(), null);
}
const ios = setup({ ua: 'iPhone Safari' });
assert.equal(ios.service.guide(), null, 'No automatic guidance');
await ios.service.install();
assert.equal(ios.service.guide(), 'ios');
const android = setup();
await android.service.install();
assert.equal(android.service.guide(), 'android', 'Unsupported installation has guidance');
android.service.guide.set(null);
let prompts = 0;
let prevented = false;
android.listeners.get('beforeinstallprompt')({ preventDefault() { prevented = true; }, async prompt() { prompts++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
assert.equal(prevented, true);
assert.equal(prompts, 0, 'Never prompt automatically');
await android.service.install();
assert.equal(prompts, 1);
await android.service.install();
assert.equal(prompts, 1, 'Single-use browser event is not reused');
android.listeners.get('appinstalled')();
assert.equal(android.service.visible(), false);
assert.equal(android.service.guide(), null);
android.cleanup.forEach(fn => fn());
assert.equal(android.listeners.size, 0);
const liveMode = setup();
const mode = liveMode.media.get('(display-mode: standalone)');
mode.matches = true;
mode.change();
assert.equal(liveMode.service.visible(), false);

const output = 'dist/hovedet-paa-soemmet-angular/browser';
const manifest = JSON.parse(readFileSync(`${output}/site.webmanifest`, 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.scope, '/');
for (const icon of manifest.icons) {
  const path = new URL(icon.src, 'https://example.com').pathname;
  assert.ok(existsSync(output + path));
  const size = readFileSync(output + path);
  assert.equal(size.readUInt32BE(16), parseInt(icon.sizes));
}
console.log('Installation checks passed: mobile/desktop, iOS, standalone, manual prompt, fallback, single-use event, installed event, cleanup and built manifest icons.');
