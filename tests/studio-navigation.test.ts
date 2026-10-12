import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildStudioEpisodes, findStudioGroup, type StudioNode} from '../src/lib/studio-navigation';
const node=(id:string,type:string,children:StudioNode[]=[],order=0):StudioNode=>({id,type,title:id,order,children});
const scene=(id:string,nodeId:string|null,order=0)=>({id,title:id,order,node:nodeId?{id:nodeId,title:nodeId}:null});
test('isole chaque épisode et conserve tous les sous-blocs dans leur ordre',()=>{
 const tree=[node('saison','season',[node('ep1','episode',[node('bloc2','chapter',[],1),node('bloc1','chapter',[node('portion','subblock')])]),node('ep2','episode')])];
 const scenes=[scene('second','bloc1',2),scene('autre-épisode','ep2'),scene('premier','bloc1'),scene('imbriqué','portion'),scene('direct','ep1'),scene('sans-rattachement',null)];
 const result=buildStudioEpisodes(tree,scenes);
 assert.deepEqual(result[0].scenes.map(s=>s.id),['direct','premier','second','imbriqué']);
 assert.deepEqual(result[0].groups.map(g=>g.title),['Sans bloc','bloc1','bloc2']);
 assert.equal(findStudioGroup(result[0].groups,'imbriqué')?.nodeId,'portion');
 assert.deepEqual(result[1].scenes.map(s=>s.id),['autre-épisode']);
 assert.deepEqual(result.flatMap(e=>e.scenes).map(s=>s.id).sort(),scenes.map(s=>s.id).sort());
 assert.deepEqual(result[0].path,['saison','ep1']);
});
test('les projets anciens gardent leur hiérarchie et leurs références',()=>{
 const scenes=[scene('ancien','chapitre'),scene('orphelin','inconnu'),scene('libre',null)];
 const result=buildStudioEpisodes([node('roman','part',[node('chapitre','chapter')])],scenes);
 assert.equal(result[0].id,'legacy-roman');assert.strictEqual(result[0].scenes[0],scenes[0]);
 assert.deepEqual(result[1].scenes.map(s=>s.id),['libre','orphelin']);
 assert.equal(findStudioGroup(result[0].groups,'ancien')?.nodeId,'chapitre');
});
test('les épisodes vides restent accessibles et aucune scène ne se duplique',()=>{
 const result=buildStudioEpisodes([node('vide','episode'),node('saison','season',[node('parent','episode',[node('enfant','episode')])])],[scene('s','enfant')]);
 assert.equal(result.find(e=>e.id==='vide')?.scenes.length,0);
 assert.equal(result.find(e=>e.id==='parent')?.scenes.length,0);
 assert.deepEqual(result.flatMap(e=>e.scenes).map(s=>s.id),['s']);
});
test('une structure vide conserve les scènes sans rattachement',()=>{
 assert.deepEqual(buildStudioEpisodes([],[]),[]);
 assert.equal(buildStudioEpisodes([],[scene('s',null)])[0].id,'unassigned');
});
