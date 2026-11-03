import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const trades=readFileSync('src/app/core/company/company-trades.ts','utf8').replace('export const','const');
const helper=readFileSync('src/app/shared/components/ai-feedback/warning-trade-links.ts','utf8')
  .replace(/^import .*;\r?\n/gm,'').replace('export function','function');
const scope={};
runInNewContext(stripTypeScriptTypes(trades+'\n'+helper)+'\nglobalThis.parts = warningTradeParts;',scope);
const warning='Vinduesudskiftning ligger uden for virksomhedens valgte fag: VVS og Maler.';
const parts=scope.parts(warning);
assert.equal(parts.map(part=>part.text).join(''),warning);
assert.equal(parts.filter(part=>part.link).length,1);
assert.equal(parts.find(part=>part.link).text,'VVS og Maler');
const danish=scope.parts('Valgte fag: Tømrer, Murer og VVS.');
assert.equal(danish.find(part=>part.link).text,'Tømrer, Murer og VVS');
assert.equal(scope.parts('Malerarbejde kræver afklaring.').some(part=>part.link),false,
  'Do not turn a partial word into a trade link');
console.log('Trade warning link checks passed (combined trades, Danish names, exact text and word boundaries).');
