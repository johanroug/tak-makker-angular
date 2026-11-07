import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = new URL('../dist/hovedet-paa-soemmet-angular/browser/', import.meta.url);
for (const file of ['index.html', 'index.csr.html', '404.html', 'robots.txt', 'sitemap.xml']) {
  if (!existsSync(new URL(file, output))) throw new Error(`Missing build file: ${file}. Run npm run build first.`);
}
copyFileSync(new URL('../hosting/simply/.htaccess', import.meta.url), new URL('.htaccess', output));

// Keep source files, credentials and local environment files out of the upload.
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'supabase'].includes(entry.name)) throw new Error(`Unexpected upload directory: ${entry.name}`);
      checkDirectory(path);
    } else if (/^(\.env(?:\..*)?|.*\.(?:sql|ts|map|pem|key))$/i.test(entry.name)) {
      throw new Error(`Unexpected upload file: ${entry.name}`);
    }
  }
}
checkDirectory(output);
let size = 0;
function sumDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) sumDirectory(path);
    else size += statSync(path).size;
  }
}
sumDirectory(output);
console.log(`Simply upload ready: ${fileURLToPath(output)} (${(size / 1e6).toFixed(2)} MB). Upload CONTENTS into public_html, including .htaccess.`);
