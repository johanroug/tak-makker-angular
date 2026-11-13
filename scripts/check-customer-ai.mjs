import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
let row;
let race=false;
const source=readFileSync('src/app/core/projects/project.service.ts','utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/@Injectable\([\s\S]*?\)\r?\n/,'').replace('export class ','class ');
const scope={ActivityService:{},AuthService:{},CompanyMembershipService:{},inject:()=>({}),
  supabase:{from(table){
    assert.equal(table,'projects'); let updates; const filters=[];
    const query={select(){return query;},single(){return Promise.resolve({data:structuredClone(row),error:null});},
      eq(key,value){filters.push([key,value]);return query;},is(key,value){filters.push([key,value]);return query;},
      update(values){updates=values;return query;},then(resolve,reject){
        if(race){row.customer_id='chosen-while-waiting';race=false;}
        if(filters.every(([key,value])=>key==='id'||row[key]===value))Object.assign(row,updates);
        return Promise.resolve({error:null}).then(resolve,reject);
      }};return query;
  }}};
runInNewContext(stripTypeScriptTypes(source)+'\nglobalThis.Service=ProjectService;',scope);
const service=new scope.Service();
const base={customer_id:null,customer_name:null,customer_name_source:null,customer_address:null,customer_address_source:null,
  work_address:null,work_address_source:null,pending_customer_email:null,pending_customer_phone:null,
  title:null,title_source:null,description:null,description_source:null,offer_description:null,offer_description_source:null};
const response={customer:{name:'Mette',address:'Kontaktvej',email:'mette@example.test',phone:'12345678'},
  project:{title:'Bad',description:'Beskrivelse',offerDescription:'Tilbud',workAddress:'Arbejdsvej'}};
row={...base};await service.saveAiProjectDetails('project',response);
assert.equal(row.work_address,'Arbejdsvej');assert.equal(row.customer_address,'Kontaktvej');
assert.equal(row.pending_customer_email,'mette@example.test');
row={...base,customer_id:'existing',customer_name:'Registered name',customer_name_source:'user',customer_address:'Registered address',customer_address_source:'user'};
await service.saveAiProjectDetails('project',response);
assert.equal(row.customer_name,'Registered name');assert.equal(row.customer_address,'Registered address');
assert.equal(row.work_address,'Arbejdsvej');assert.equal(row.pending_customer_phone,null);
row={...base,work_address:'Manual job address',work_address_source:'user'};
await service.saveAiProjectDetails('project',response);assert.equal(row.work_address,'Manual job address');
row={...base,work_address:'Old AI job',work_address_source:'ai'};
await service.saveAiProjectDetails('project',response);assert.equal(row.work_address,'Arbejdsvej');
row={...base};await service.saveAiProjectDetails('project',{...response,project:{...response.project,workAddress:null}});
assert.equal(row.work_address,null,'An explicitly unknown work address must not be inferred from a contact address');
row={...base};race=true;await service.saveAiProjectDetails('project',response);
assert.equal(row.customer_id,'chosen-while-waiting');assert.equal(row.customer_name,null,'Concurrent customer choices must win');
console.log('PASS: AI contact protection, address separation, extracted contacts, manual work addresses, AI corrections and concurrent selection.');
