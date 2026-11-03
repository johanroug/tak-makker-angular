import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

let rows = [];
let race = false;
const source = readFileSync('src/app/core/projects/project.service.ts','utf8')
  .replace(/^import .*;\r?\n/gm,'')
  .replace(/@Injectable\([\s\S]*?\)\r?\n/,'').replace('export class ','class ');
const scope = { ActivityService: {}, AuthService: {}, CompanyMembershipService: {}, inject: () => ({}),
  supabase: { from(table) {
    assert.equal(table,'project_work_items');
    let updates; const filters = [];
    const query = {
      select() { return query; },
      eq(key,value) { filters.push([key,value]); return query; },
      is(key,value) { filters.push([key,value]); return query; },
      update(value) { updates=value; return query; },
      upsert(items) { rows.push(...structuredClone(items)); return Promise.resolve({ error:null }); },
      then(resolve,reject) {
        if (updates) {
          if (race) { rows[0].description='Manual edit while waiting'; race=false; }
          for (const row of rows) if (filters.every(([key,value]) => row[key]===value)) Object.assign(row,updates);
        }
        return Promise.resolve({data:structuredClone(rows),error:null}).then(resolve,reject);
      },
    };
    return query;
  } },
};
runInNewContext(stripTypeScriptTypes(source)+'\nglobalThis.Service = ProjectService;',scope);
const service = new scope.Service();
const row = { id:'task',project_id:'project',description:'My own description',trade:'VVS',
  status:'accepted',estimated_hours:7,estimated_hours_source:'user',estimate_basis:'Antal skal bekræftes' };
const item = { id:'task',description:'Should not overwrite',trade:'VVS',status:'suggested',
  estimatedHours:2,estimatedHoursSource:'ai',estimateBasis:null };
rows=[{...row}];
await service.saveAiWorkItems('project',[item]);
assert.equal(rows[0].estimate_basis,null,'A note must clear even with manual hours');
assert.equal(rows[0].estimated_hours,7);
assert.equal(rows[0].description,'My own description');
assert.equal(rows[0].status,'accepted');
rows=[{...row}];
const legacy = {...item}; delete legacy.estimateBasis;
await service.saveAiWorkItems('project',[legacy]);
assert.equal(rows[0].estimate_basis,row.estimate_basis,'Older responses must preserve notes');
rows=[{...row}]; race=true;
await service.saveAiWorkItems('project',[item]);
assert.equal(rows[0].description,'Manual edit while waiting');
assert.equal(rows[0].estimate_basis,row.estimate_basis,'Concurrent manual changes must win the snapshot comparison');
rows=[];
await service.saveAiWorkItems('project',[{...item,estimateBasis:'Beregnet ud fra 1 radiator · Antal skal bekræftes'}]);
assert.match(rows[0].estimate_basis,/1 radiator/);
assert.equal(rows[0].status,'suggested');
console.log('Work item note checks passed: new notes, clearing, manual fields, old responses and concurrent edits.');
