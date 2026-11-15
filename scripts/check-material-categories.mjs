import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as categorySchema from '../supabase/functions/_shared/schemas/material-category.ts';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('src/app/shared/components/offer-preview/material-category.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require: () => categorySchema });
const { materialCategory } = exports;

const scenarios = [
  ['Elektriker', 'El og belysning', [
    'LED-gulvspots til vådrum', 'Installationskabel til gulvspots',
    'Installationskabel, type fastlægges efter installation',
    'Forgrenings- og samledåser til gulvbelysning', 'Samledåse',
    'LED-driver', 'Strømforsyning', 'Kontakter', 'Belysningsarmatur',
    'Loftspots', 'Installationskabler',
    'Indbygningsarmatur til gulv', 'Indbygningsarmaturer til loft',
    'Gulvarmatur',
  ]],
  ['VVS', 'VVS og sanitet', [
    'Håndvask', 'Vandlås', 'Afløbsrør', 'Vandrør', 'Fittings',
    'Blandingsbatteri', 'Armatur til håndvask',
  ]],
  ['Maler', 'Maling og overflader', [
    'Vægmaling', 'Grunder', 'Væggrunder', 'Spartelmasse',
    'Sandspartelmasse', 'Malerrulle', 'Pensel',
  ]],
];

let checked = 0;
for (const [scenario, category, names] of scenarios) {
  for (const name of names) {
    assert.equal(materialCategory(name), category, `${scenario}: ${name}`);
    checked++;
  }
  console.log(`PASS: ${scenario} (${names.length} materialenavne)`);
}
for (const [name, category] of [
  ['Gulvfliser', 'Fliser, mørtel og vådrum'],
  ['Gipsplader', 'Træ, plader og isolering'],
  ['Skruer', 'Fastgørelse og forbrug'],
  ['Ukendt materiale', 'Øvrige materialer'],
  [null, 'Øvrige materialer'],
]) {
  assert.equal(materialCategory(name), category, `Regression: ${name}`);
  checked++;
}
assert.notEqual(materialCategory('Kontaktlim'), 'El og belysning',
  'Kontakt must not classify kontaktlim as an electrical component');
checked++;
for (const category of categorySchema.materialCategories) {
  assert.equal(materialCategory('Et helt nyt materialenavn', category), category);
  checked++;
}
assert.equal(materialCategory('Armatur til håndvask', 'El og belysning'), 'El og belysning',
  'A stored category must take priority over legacy name matching');
assert.equal(materialCategory('Installationskabel', 'invalid'), 'El og belysning');
assert.equal(materialCategory('Ukendt', null), 'Øvrige materialer');
assert.equal(categorySchema.isMaterialCategory('invalid'), false);
checked += 4;
console.log(`PASS: ${checked} category checks; no live AI calls.`);
