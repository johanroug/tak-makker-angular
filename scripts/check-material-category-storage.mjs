import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import { isMaterialCategory } from '../supabase/functions/_shared/schemas/material-category.ts';

let rows = [];
const writes = [];
const source = readFileSync('src/app/core/projects/project.service.ts', 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/@Injectable\([\s\S]*?\)\r?\n/, '').replace('export class ', 'class ');
const scope = {
  isMaterialCategory, ActivityService: {}, AuthService: {}, CompanyMembershipService: {}, inject: () => ({}),
  supabase: { from(table) {
    assert.equal(table, 'project_materials');
    let values;
    const query = {
      select() { return query; }, eq() { return query; }, is() { return query; },
      update(data) { values = data; return query; },
      upsert(data) { writes.push(...data); return Promise.resolve({ error: null }); },
      then(resolve, reject) {
        if (values) writes.push(values);
        return Promise.resolve({ data: structuredClone(rows), error: null }).then(resolve, reject);
      },
    };
    return query;
  } },
};
runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.service = new ProjectService();', scope);
const material = { id: 'material', name: 'Nyt fagligt materialenavn', category: 'El og belysning',
  quantity: 3, unit: 'stk.', unitPrice: 100, priceUpdateRequested: false, quantityUpdateRequested: false };
await scope.service.saveAiMaterials('project', [material], true);
assert.equal(writes[0].category, 'El og belysning');
assert.equal(writes[0].status, 'suggested');

rows = [{ id: 'material', name: material.name, category: null, status: 'accepted',
  quantity: 3, quantity_source: 'user', unit: 'stk.', unit_source: 'user', unit_price: 100 }];
writes.length = 0;
await scope.service.saveAiMaterials('project', [material]);
assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ category: 'El og belysning' }],
  'Category backfill must not change accepted status, quantities or prices');

rows[0].status = 'rejected';
writes.length = 0;
await scope.service.saveAiMaterials('project', [material]);
assert.equal(writes.length, 0, 'Do not recategorize rejected materials');
rows[0].status = 'accepted';
await scope.service.saveAiMaterials('project', [{ ...material, category: 'Invalid' }]);
assert.equal(writes.length, 0, 'Do not persist unknown categories');

rows = [];
await scope.service.saveAiMaterials('project', [{ ...material, category: undefined }], true);
assert.equal(writes[0].category, null, 'Old API responses remain compatible with fallback');
console.log('PASS: New category storage, legacy backfill, protected user values/status, rejected lines and invalid/absent categories.');
