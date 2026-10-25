import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Vercel serves this with HTTP 404 for unknown URLs. Angular then shows its
// not-found screen using the original URL, without a landing-page soft 404.
const directory = new URL('../dist/tak-makker-angular/browser/', import.meta.url);
copyFileSync(new URL('index.csr.html', directory), new URL('404.html', directory));
console.log('Static 404 page prepared in', fileURLToPath(directory));
