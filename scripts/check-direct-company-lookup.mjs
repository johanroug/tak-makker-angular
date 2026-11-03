import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

let calls = 0;
let status = 200;
let payload = { vat: 19555305, name: 'BAUHAUS DANMARK A/S', address: 'Anelystparken 16', zipcode: '8381', city: 'Tilst', phone: '87450500' };
const source = readFileSync('src/app/core/company/company-lookup.service.ts', 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^@Injectable\([^\n]+\)\r?\n/gm, '')
  .replace('export class ', 'class ');
const scope = {
  Response, AbortSignal, Map,
  fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'https://cvrapi.dk/api?vat=19555305&country=dk&version=6');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.headers, undefined, 'A direct lookup must not send Supabase credentials or custom headers');
    return Response.json(payload, { status });
  },
};
runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.Lookup = CompanyLookupService;', scope);
const service = new scope.Lookup();
await assert.rejects(service.lookup('invalid'), /8 cifre/);
assert.equal(calls, 0);
const found = await service.lookup('19555305');
assert.equal(found.name, 'BAUHAUS DANMARK A/S');
assert.equal(found.address, 'Anelystparken 16\n8381 Tilst');
found.name = 'changed';
assert.equal((await service.lookup('19555305')).name, 'BAUHAUS DANMARK A/S');
assert.equal(calls, 1, 'Repeated lookups should use cache');
const lookup = () => new scope.Lookup().lookup('19555305');
payload = { error: 'NOT_FOUND' };
await assert.rejects(lookup(), /Virksomheden blev ikke fundet/);
payload = { error: 'QUOTA_EXCEEDED' };
await assert.rejects(lookup(), /Grænsen/);
payload = { error: 'BANNED' }; status = 403;
await assert.rejects(lookup(), /ikke tilgængeligt/);
status = 200; payload = null;
await assert.rejects(lookup(), /ikke tilgængeligt/);
payload = { vat: 12345678, name: 'Wrong company' };
await assert.rejects(lookup(), /ugyldigt svar/);
scope.fetch = async () => { throw new TypeError('Failed to fetch'); };
await assert.rejects(lookup(), /ikke tilgængeligt/);
console.log('Direct CVR lookup checks passed (mapping, cache, errors and credential isolation).');
