import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

const source=readFileSync('src/app/shared/components/project-sidebar/project-sidebar.component.ts','utf8');
const ast=ts.createSourceFile('sidebar.ts',source,ts.ScriptTarget.Latest,true);
const component=ast.statements.find((node)=>ts.isClassDeclaration(node));
const method=component.members.find((node)=>node.name?.getText(ast)==='openAiTarget');
const code=stripTypeScriptTypes('function openAiTarget(tab: string) '+method.body.getText(ast));
let reduceMotion=false;
let focusOptions;
const scrolls=[];
const sections=[];
const target={getBoundingClientRect:()=>({top:350}),focus:(options)=>focusOptions=options,
  scrollIntoView:()=>{throw new Error('Ancestor scrolling is forbidden');}};
const messages={scrollTop:200,clientTop:1,getBoundingClientRect:()=>({top:100}),
  querySelector:()=>target,scrollTo:(options)=>scrolls.push(options)};
const scope={afterNextRender:(callback)=>callback(),window:{matchMedia:()=>({matches:reduceMotion}),
  scrollTo:()=>{throw new Error('Main-window scrolling is forbidden');}}};
runInNewContext(code+'\nglobalThis.open = openAiTarget;',scope);
const sidebar={destroyed:false,chatOpen:{set(){}},chatMessages:()=>({nativeElement:messages}),
  sectionRequested:{emit:(section)=>sections.push(section)},injector:{}};
scope.open.call(sidebar,'chat');
assert.equal(scrolls[0].top,441);
assert.equal(scrolls[0].behavior,'smooth');
assert.equal(focusOptions.preventScroll,true);
reduceMotion=true;
scope.open.call(sidebar,'chat');
assert.equal(scrolls[1].behavior,'auto');
scope.open.call(sidebar,'tasks');
assert.equal(sections[0],'tasks');
assert.equal(scrolls.length,2);
sidebar.destroyed=true;
scope.open.call(sidebar,'chat');
assert.equal(scrolls.length,2);
console.log('Chat scroll checks passed: only conversation scrolls, focus preserves page, reduced motion and section links.');
