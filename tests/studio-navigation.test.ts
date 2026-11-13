import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildStudioEpisodes, findStudioGroup, defaultStudioEpisode, activeStudioEpisode, studioLibraryGroups, type StudioNode} from '../src/lib/studio-navigation';
const node=(id:string,type:string,children:StudioNode[]=[],order=0):StudioNode=>({id,type,title:id,order,children});
const scene=(id:string,nodeId:string|null,order=0)=>({id,title:id,order,node:nodeId?{id:nodeId,title:nodeId}:null});
test('isole chaque épisode et conserve tous les sous-blocs dans leur ordre',()=>{
 const tree=[node('saison','season',[node('ep1','episode',[node('bloc2','chapter',[],1),node('bloc1','chapter',[node('portion','subblock')])]),node('ep2','episode')])];
 const scenes=[scene('second','bloc1',2),scene('autre-épisode','ep2'),scene('premier','bloc1'),scene('imbriqué','portion'),scene('direct','ep1'),scene('sans-rattachement',null)];
 const result=buildStudioEpisodes(tree,scenes);
 assert.deepEqual(result[0].scenes.map(s=>s.id),['direct','premier','second','imbriqué']);
 assert.deepEqual(result[0].groups.map(g=>g.title),['Sous-blocs directs','bloc1','bloc2']);
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

test('une saison avec prologue, intro et deux épisodes ne mélange aucun sous-bloc',()=>{
 const tree=[node('saison','season',[
  node('prologue','prologue',[],0),node('intro','custom',[],1),
  node('ep1','episode',[node('bloc1','chapter')],2),node('ep2','episode',[],3),node('vide','episode',[],4),
 ])];
 const scenes=[scene('préambule','prologue'),scene('introduction','intro'),scene('ep1-a','ep1'),scene('ep1-b','bloc1'),scene('ep2-a','ep2')];
 const episodes=buildStudioEpisodes(tree,scenes);
 assert.deepEqual(episodes.map(episode=>episode.id),['ep1','ep2','vide','legacy-saison']);
 const outside=episodes.at(-1)!;
 assert.equal(outside.kind,'outside');assert.equal(outside.title,'Hors épisodes · saison');
 assert.deepEqual(outside.groups.map(group=>group.title),['prologue','intro']);
 assert.deepEqual(outside.scenes.map(s=>s.id),['préambule','introduction']);
 assert.deepEqual(episodes[0].scenes.map(s=>s.id),['ep1-a','ep1-b']);
 assert.deepEqual(episodes[1].scenes.map(s=>s.id),['ep2-a']);
 assert.deepEqual(episodes.flatMap(episode=>episode.scenes).map(s=>s.id).sort(),scenes.map(s=>s.id).sort());
});

test('la bibliothèque utilise uniquement les groupes de l’épisode actif, y compris ses descendants',()=>{
 const episodes=buildStudioEpisodes([node('saison','season',[node('ep1','episode',[node('bloc','chapter',[node('portion','subblock')])]),node('ep2','episode')])],[scene('a','ep1'),scene('b','bloc'),scene('c','portion'),scene('d','ep2')]);
 const groups=studioLibraryGroups(episodes[0]);
 assert.deepEqual(groups.map(g=>g.title),['Sous-blocs directs','bloc','bloc / portion']);
 assert.deepEqual(groups.flatMap(g=>g.scenes).map(s=>s.id),['a','b','c']);
 assert.deepEqual(studioLibraryGroups(episodes[1]).flatMap(g=>g.scenes).map(s=>s.id),['d']);
 assert.deepEqual(studioLibraryGroups(undefined),[]);
});

test('le premier épisode réel est sélectionné avant le prologue, même vide',()=>{
 const episodes=buildStudioEpisodes([node('saison','season',[node('prologue','prologue'),node('vide','episode')])],[scene('p','prologue')]);
 assert.equal(defaultStudioEpisode(episodes)?.id,'vide');
 assert.equal(activeStudioEpisode(episodes,null,null)?.id,'vide');
 assert.equal(defaultStudioEpisode(buildStudioEpisodes([node('roman','part')],[scene('s','roman')]))?.id,'legacy-roman');
});

test('changer le rattachement d’une scène actualise aussi son épisode actif',()=>{
 const episodes=buildStudioEpisodes([node('ep1','episode'),node('ep2','episode')],[scene('déplacé','ep2')]);
 assert.equal(activeStudioEpisode(episodes,'ep1','déplacé')?.id,'ep2');
 assert.equal(activeStudioEpisode(episodes,'ep1',null)?.id,'ep1');
});
