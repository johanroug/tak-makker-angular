import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { ImageInputError, MAX_IMAGE_REQUEST_BYTES, readImageRequest, validateImageInput } from '../supabase/functions/_shared/ai/image-input.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.IMAGE_TEST_BROWSER ? { executablePath: process.env.IMAGE_TEST_BROWSER } : {}) });
try {
  const page = await browser.newPage();
  await page.route('https://images.test/**', route => route.fulfill({ body: '<!doctype html><title>Image storage tests</title>', contentType: 'text/html' }));
  await page.goto('https://images.test/');
  // Exercise the actual service against Chromium IndexedDB/canvas. Only Angular's
  // decorator and signal are replaced; storage, transactions and encoding are real.
  const source = (await readFile(new URL('../src/app/core/projects/project-images.service.ts', import.meta.url), 'utf8'))
    .replace("import { Injectable, signal } from '@angular/core';", 'const signal = (initial) => { let value = initial; const read = () => value; read.update = fn => value = fn(value); return read; };')
    .replace("@Injectable({ providedIn: 'root' })", '').replace('export class ProjectImagesService', 'class ProjectImagesService');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/export \{\};?/, '');
  await page.addScriptTag({ content: `${compiled}\nwindow.imageService = new ProjectImagesService();` });
  const result = await page.evaluate(async () => {
    const service = window.imageService;
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const photo = async (width = 2400, height = 1800) => {
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      canvas.getContext('2d').fillRect(0, 0, width, height);
      return new File([await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .95))], 'iphone.jpg', { type: 'image/jpeg' });
    };
    const file = await photo();
    await service.add('alice', 'one', [file, file]);
    let record = await service.read('alice', 'one');
    check(record.submitted === 0 && record.images.length === 2 && record.images[0].blob instanceof Blob, 'Local selection consumes no AI quota');
    const bitmap = await createImageBitmap(record.images[0].blob);
    check(bitmap.width === 1600 && bitmap.height === 1200, 'Aspect ratio and dimension limit'); bitmap.close();
    check(record.images[0].type === 'image/webp', 'WebP encoding');
    check((await service.read('bob', 'one')).submitted === 0, 'Account isolation');
    check((await service.read('alice', 'two')).images.length === 0, 'Project isolation');
    await service.remove('alice', 'one', record.images[0].id);
    record = await service.read('alice', 'one');
    check(record.submitted === 0 && record.images.length === 1, 'Unsent deletion removes data without consuming quota');
    for (let index = 0; index < 5; index++) {
      await service.add('alice', 'one', [file]);
      await service.remove('alice', 'one', (await service.read('alice', 'one')).images.at(-1).id);
    }
    check((await service.read('alice', 'one')).submitted === 0, 'Unlimited local replacements');
    const concurrent = await Promise.allSettled([service.add('alice', 'one', [file, file]), service.add('alice', 'one', [file, file])]);
    check(concurrent.filter(item => item.status === 'fulfilled').length === 1, 'Concurrent uploads cannot exceed quota');
    check((await service.read('alice', 'one')).images.filter(image => image.blob).length === 3, 'At most three local images');
    await service.update('alice', 'one', record => { for (const image of record.images) image.messageId = 'message-one'; });
    let ids = (await service.read('alice', 'one')).images.map(image => image.id);
    check((await service.read('alice', 'one')).submitted === 0, 'Preparing a message does not consume AI quota');
    await service.reserveAnalysis('alice', 'one', 'message-one', ids.slice(0, 1));
    check((await service.read('alice', 'one')).submitted === 1, 'Only submitted images count');
    await service.reserveAnalysis('alice', 'one', 'message-one', ids.slice(0, 1));
    check((await service.read('alice', 'one')).submitted === 1, 'Failed-call retry is idempotent');
    await service.reserveAnalysis('alice', 'one', 'message-one', ids);
    check((await service.read('alice', 'one')).submitted === 3, 'Sending two more consumes remaining quota');
    await service.remove('alice', 'one', ids[0]);
    await service.add('alice', 'one', [file]);
    await service.update('alice', 'one', record => { record.images.at(-1).messageId = 'message-two'; });
    ids = (await service.read('alice', 'one')).images.map(image => image.id);
    const rejected = await Promise.allSettled([service.reserveAnalysis('alice', 'one', 'message-two', ids.slice(-1))]);
    check(rejected[0].status === 'rejected' && (await service.read('alice', 'one')).submitted === 3, 'Deleted sent images do not release AI quota; new local images remain allowed');
    await service.add('alice', 'race', [file, file, file]);
    await service.update('alice', 'race', record => { for (const image of record.images) image.messageId = 'race-message'; });
    const raceIds = (await service.read('alice', 'race')).images.map(image => image.id);
    await Promise.all([service.reserveAnalysis('alice', 'race', 'race-message', raceIds), service.reserveAnalysis('alice', 'race', 'race-message', raceIds)]);
    check((await service.read('alice', 'race')).submitted === 3, 'Concurrent retries never double count');
    await service.add('alice', 'draft', [file]);
    await service.move('alice', 'draft', 'created');
    check((await service.read('alice', 'created')).images.length === 1 && (await service.read('alice', 'draft')).images.length === 0, 'Draft transfer');
    await service.update('alice', 'created', record => record.images[0].messageId = 'message-one');
    check((await service.read('alice', 'created')).images[0].messageId === 'message-one', 'Message association');
    const invalid = await Promise.allSettled([service.add('alice', 'bad', [new File(['not an image'], 'bad.jpg', { type: 'image/jpeg' })])]);
    check(invalid[0].status === 'rejected' && (await service.read('alice', 'bad')).submitted === 0, 'Invalid files do not consume quota');
    await service.update('alice', 'legacy', record => {
      delete record.quotaVersion; record.uploaded = 3;
      record.images = [
        { id: 'unsent', analyzed: false, blob: file },
        { id: 'deleted-unsent', analyzed: true },
        { id: 'previously-sent', analyzed: true, messageId: 'old-message' },
      ];
    });
    const legacy = await service.read('alice', 'legacy');
    check(legacy.submitted === 1 && !legacy.images[0].sentToAi && legacy.images[2].sentToAi, 'Legacy records only charge message-associated images');
    await service.deleteProject('alice', 'created');
    check((await service.read('alice', 'created')).images.length === 0, 'Project cleanup');
    const blob = (await service.read('alice', 'one')).images.find(image => image.blob).blob;
    return { dataUrl: await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); }) };
  });
  await page.reload();
  await page.addScriptTag({ content: `${compiled}\nwindow.imageService = new ProjectImagesService();` });
  assert.equal(await page.evaluate(async () => (await window.imageService.read('alice', 'one')).submitted), 3, 'Persistence after reload');

  const messageId = '11111111-1111-4111-8111-111111111111';
  const image = { id: '22222222-2222-4222-8222-222222222222', dataUrl: result.dataUrl };
  assert.equal(validateImageInput({ images: [image], messageId }).images.length, 1, 'Real optimized image accepted');
  assert.equal(validateImageInput({ projectId: 'old-text-only' }), undefined, 'Legacy text requests');
  for (const body of [
    { images: [image, image, image, image], messageId },
    { images: [image, image], messageId },
    { images: [image], messageId: 'wrong' },
    { images: [{ ...image, dataUrl: 'https://example.com/image.jpg' }], messageId },
    { images: [{ ...image, dataUrl: 'data:image/jpeg;base64,AAAA' }], messageId },
    { images: [{ ...image, dataUrl: 'x'.repeat(1_400_001) }], messageId },
  ]) assert.throws(() => validateImageInput(body), ImageInputError);
  const oversized = new Request('http://test', { method: 'POST', body: 'x'.repeat(MAX_IMAGE_REQUEST_BYTES + 1) });
  await assert.rejects(readImageRequest(oversized), ImageInputError);
  await assert.rejects(readImageRequest(new Request('http://test', { method: 'POST', body: '{' })), ImageInputError);
  assert.deepEqual(await readImageRequest(new Request('http://test', { method: 'POST', body: '{"projectId":"legacy"}' })), { projectId: 'legacy' });
  console.log('Passed: real IndexedDB persistence/isolation, image optimization, lifetime quota/concurrency, deletion, draft transfer, message references, invalid files and backend payload validation.');
} finally { await browser.close(); }
