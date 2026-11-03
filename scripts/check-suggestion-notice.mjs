import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync('src/app/shared/components/ai-feedback/suggestion-notice.ts','utf8')
  .replace(/^import .*;\r?\n/gm,'').replaceAll('export function ','function ');
const scope = {};
runInNewContext(stripTypeScriptTypes(source)+
  '\nglobalThis.show = shouldShowSuggestionNotice; globalThis.summary = scopeWarningSummary;',scope);
const warning='Vinduesudskiftning ligger uden for virksomhedens valgte fag: VVS og Maler.';
const summary=scope.summary([warning]);
assert.equal(scope.show(summary),true,'An out-of-trade request must show a popup without new lines');
assert.equal(summary.scopeWarnings[0],warning);
assert.equal(scope.show(scope.summary([])),false,'An ordinary chat reply must not show a popup');
assert.equal(scope.show({...scope.summary([]),updatedWorkItems:1,updatedMaterials:2}),false,
  'Updating existing lines must not reintroduce the popup');
assert.equal(scope.show({...scope.summary([]),workItems:1}),true);
assert.equal(scope.show({...scope.summary([]),materials:1}),true);
assert.equal(scope.show({...scope.summary([]),scopeWarnings:undefined}),false,
  'Older responses without warnings remain compatible');
console.log('Suggestion notice checks passed (scope warnings, new lines, ordinary replies and existing-line updates).');
