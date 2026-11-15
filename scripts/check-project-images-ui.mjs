import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist/hovedet-paa-soemmet-angular/browser');
const userId = '00000000-0000-4000-8000-000000000001';
const companyId = '00000000-0000-4000-8000-000000000002';
const projectId = '00000000-0000-4000-8000-000000000003';
const usage = { companyId, status: 'active', trialLimit: 10, trialUsed: 0, trialPending: 0, trialRemaining: 10, canGenerate: true, paidLimit: 200, paidUsed: 0, paidPending: 0, paidRemaining: 200 };
const project = { id: projectId, company_id: companyId, project_number: '2026-0001', title: 'Badeværelse', title_source: 'user', hourly_rate: 450, customer_name: '', customer_address: '', description: '', created_at: new Date().toISOString(), company: { name: 'Testfirma', cvr: '12345678', address: 'Testvej', phone: '12345678', email: 'test@example.com' }, workItems: [], materials: [], messages: [] };
const requests = [], errors = [], writes = [];
let failNext = false;
const origin = 'https://images.test';
const browser = await chromium.launch({ headless: true, ...(process.env.IMAGE_TEST_BROWSER ? { executablePath: process.env.IMAGE_TEST_BROWSER } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) && file !== root) return route.abort();
      if (!path.extname(file)) file = path.join(root, 'index.csr.html');
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    }
    // All remote calls are mocked; this test cannot reach production or spend API credits.
    if (url.hostname !== 'woxioycjdjucxqiyqcyr.supabase.co') return route.abort();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers });
    const body = request.postData() ? JSON.parse(request.postData()) : {};
    let data = null;
    const endpoint = url.pathname.split('/').at(-1);
    if (url.pathname.includes('/auth/v1/user')) data = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {} };
    else if (endpoint === 'get_app_access_state') data = 'active';
    else if (endpoint === 'can_access_app') data = true;
    else if (endpoint === 'is_activity_admin') data = false;
    else if (endpoint === 'get_company_billing') data = usage;
    else if (endpoint === 'billing-session') data = { checkoutReady: false, testMode: true };
    else if (endpoint === 'companies') data = { ...project.company, id: companyId, trade: 'Murer', trades: ['Murer'], hourly_rate: 450 };
    else if (endpoint === 'company_members') data = { company_id: companyId };
    else if (endpoint === 'list_task_templates') data = [];
    else if (endpoint === 'create_project') data = project;
    else if (endpoint === 'projects') data = url.searchParams.has('id') ? project : [project];
    else if (endpoint === 'project_messages' && request.method() === 'POST') {
      data = { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }; project.messages.push(data);
      assert.ok(!JSON.stringify(body).includes('base64'), 'No image payload in message history');
    } else if (endpoint === 'project_work_items' || endpoint === 'project_materials') {
      const rows = endpoint === 'project_work_items' ? project.workItems : project.materials;
      if (request.method() === 'POST') { rows.push(...(Array.isArray(body) ? body : [body])); writes.push(body); }
      data = request.method() === 'GET' ? rows : null;
    } else if (endpoint === 'offers' || endpoint === 'customers') data = [];
    else if (endpoint === 'generate-offer') {
      requests.push(body);
      if (failNext) { failNext = false; return route.fulfill({ status: 500, headers, contentType: 'application/json', body: '{"error":"AI unavailable"}' }); }
      data = { complete: false, customer: { name: null, address: null }, project: { title: null, description: null, offerDescription: null }, questions: ['Hvilke mål har rummet?'], imageObservations: body.images ? ['Der ses fliser.'] : [], scopeWarnings: [],
        workItems: body.images ? [{ id: crypto.randomUUID(), trade: 'Murer', description: 'Undersøg eksisterende fliser', descriptionSource: 'ai', status: 'accepted', estimatedHours: null, estimatedHoursSource: 'ai', estimateBasis: null }] : [], materials: [], usage, analyzedImageIds: body.images?.map(image => image.id) ?? [] };
    } else if (endpoint !== 'record_activity') throw new Error(`Unexpected endpoint ${endpoint}`);
    return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
  });
  await page.addInitScript(({ userId }) => {
    const encode = value => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('sb-woxioycjdjucxqiyqcyr-auth-token', JSON.stringify({ access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, exp, aud: 'authenticated', role: 'authenticated' })}.test`, refresh_token: 'mock', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: { id: userId, email: 'test@example.com', app_metadata: {}, user_metadata: {} } }));
  }, { userId });
  await page.goto(`${origin}/projects`);
  await page.getByRole('button', { name: 'Nyt projekt', exact: false }).first().click();
  const modal = page.locator('app-new-project-dialog dialog');
  await modal.getByRole('button', { name: 'Tilføj projektbilleder' }).waitFor();
  const jpeg = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1800;
    canvas.getContext('2d').fillRect(0, 0, 2400, 1800);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const file = { name: 'iphone.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') };
  await modal.locator('input[type=file]').setInputFiles(file);
  await modal.getByText('1 af 3 billeder brugt', { exact: false }).waitFor();
  await modal.locator('textarea').fill('Renover dette badeværelse');
  await modal.getByRole('button', { name: 'Fortsæt', exact: false }).click();
  await page.waitForURL(`**/projects/${projectId}?editDetails=1`);
  const close = page.getByRole('button', { name: 'Luk uden at gemme' });
  await close.click();
  const sidebar = page.locator('app-project-sidebar');
  const open = sidebar.getByRole('button', { name: 'Åbn samtale' });
  if (await open.isVisible()) await open.click();
  await sidebar.locator('.chat-messages img').first().waitFor();
  assert.equal(requests.length, 1); assert.equal(requests[0].images.length, 1);
  assert.ok(project.messages.some(message => message.content.includes('Synligt på billederne')));
  assert.equal(project.workItems[0].status, 'suggested', 'Images never auto-accept tasks');
  failNext = true;
  await sidebar.locator('input[type=file]').setInputFiles([file, file]);
  await sidebar.getByText('3 af 3 billeder brugt', { exact: false }).waitFor();
  await sidebar.locator('textarea').fill('Se også disse vinkler');
  await sidebar.getByRole('button', { name: 'Send besked' }).click();
  await sidebar.locator('.send-error').waitFor();
  const beforeRetry = project.messages.filter(message => message.role === 'user').length;
  await sidebar.getByRole('button', { name: 'Send besked' }).click();
  await page.waitForFunction(() => window.ng.getComponent(document.querySelector('app-project-sidebar')).isSending() === false);
  assert.equal(requests.length, 3);
  assert.equal(project.messages.filter(message => message.role === 'user').length, beforeRetry, 'Retry reuses saved user message');
  await sidebar.locator('textarea').fill('Fortsæt med opgaverne');
  await sidebar.getByRole('button', { name: 'Send besked' }).click();
  await page.waitForFunction(() => window.ng.getComponent(document.querySelector('app-project-sidebar')).isSending() === false);
  assert.equal(requests.length, 4); assert.equal(requests[3].images, undefined, 'Follow-up sends text only');
  await page.reload();
  if (await open.isVisible()) await open.click();
  await sidebar.locator('.chat-messages img').first().waitFor();
  assert.equal(requests.length, 4, 'Reload never analyzes');
  await sidebar.getByRole('button', { name: 'Slet billede' }).first().click();
  await sidebar.getByText('Billede er fjernet eller ikke tilgængeligt').first().waitFor();
  await sidebar.getByText('3 af 3 billeder brugt', { exact: false }).waitFor();
  assert.equal(await sidebar.getByRole('button', { name: 'Tilføj projektbilleder' }).isDisabled(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Samtale', exact: true }).click();
  await page.screenshot({ path: 'tmp/project-images-mobile.png', fullPage: true });
  usage.status = 'trial';
  await page.reload();
  await page.getByRole('button', { name: 'Samtale', exact: true }).click();
  await sidebar.getByRole('button', { name: 'Billeder kræver abonnement' }).waitFor();
  assert.equal(await sidebar.getByRole('button', { name: 'Billeder kræver abonnement' }).isDisabled(), true, 'Trial camera locked');
  assert.ok(await sidebar.locator('.chat-messages img').count() > 0, 'Expired subscriber can still view existing images');
  assert.equal(requests.length, 4);
  assert.deepEqual(errors, []);
  console.log('Passed: new/existing project upload, photo observations, suggested status, AI failure/retry without duplicate messages, no images on follow-ups/reload, persistent quota after deletion, mobile rendering. All Supabase calls mocked.');
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) { console.error('State:', await page.evaluate(() => { const c = window.ng?.getComponent(document.querySelector('app-project-sidebar')); const p = c?.photos(); return { value: c?.messageControl.value, sending: c?.isSending(), speech: c?.speechBusy(), busy: p?.busy(), loading: p?.loading(), pending: p?.pendingMessageId(), usage: c?.billing.usage()?.status }; }).catch(() => null)); console.error('Failure:', error.message, 'Page:', page.url(), 'Errors:', errors); console.error((await page.locator('body').innerText({ timeout: 1000 }).catch(() => '')).slice(0, 1600)); await page.screenshot({ path: 'tmp/project-images-test-error.png' }); }
  throw error;
} finally { await browser.close();  }
