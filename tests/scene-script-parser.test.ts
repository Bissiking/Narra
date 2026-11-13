import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSceneScript, matchScriptCharacter } from '../src/lib/scene-script-parser';
import { canConvertTimelineBlock, timelineTypeForTrack } from '../src/lib/studio-timeline';
const characters = [
  {id:'mira',firstName:'Míra',lastName:'Du Port',alias:'La Veilleuse'},
  {id:'soren',firstName:'Soren',lastName:'Kael',alias:null},
];
test('recognizes normalized full names, first names and aliases',()=>{
  for(const name of ['mira','MIRA DU PORT','La veilleuse','Míra du-port'])assert.equal(matchScriptCharacter(name,characters)?.id,'mira');
});
test('ambiguous names stay unassigned and full names take precedence',()=>{
  const cast=[...characters,{id:'mira2',firstName:'Míra',lastName:'Val',alias:null}];
  assert.equal(matchScriptCharacter('Mira',cast),null);
  assert.equal(matchScriptCharacter('Mira Val',cast)?.id,'mira2');
});
test('Markdown headings, dialogue directions and cuts form separate blocks',()=>{
  const r=parseSceneScript('# Le port\n\n**MIRA**\n\n*(à voix basse)*\nLa lumière revient.\n\n---\n\n**SOREN**\nNous partons.',characters);
  assert.deepEqual(r.blocks.map(b=>b.type),['heading','dialogue','transition','dialogue']);
  assert.equal(r.blocks[1].characterId,'mira');assert.equal(r.blocks[1].speakerNote,'à voix basse');
  assert.equal(r.blocks[1].content,'La lumière revient.');
});
test('mixed directives and Markdown never swallow cuts or following dialogue',()=>{
  const r=parseSceneScript('[ACTION] Un pas.\n---\n## Le phare\n\nSoren: Qui est là ?\n\n[NOTE] Revoir la lumière.',characters);
  assert.deepEqual(r.blocks.map(b=>b.type),['action','transition','heading','dialogue','note']);
  assert.equal(r.blocks[0].content,'Un pas.');
});
test('Markdown thematic breaks include spaced stars, underscores and em dashes',()=>{
  for(const cut of ['---','***','* * *','___','_ _ _','———']){
    const r=parseSceneScript('Avant\n\n'+cut+'\n\nAprès',characters);
    assert.deepEqual(r.blocks.map(b=>b.type),['action','transition','action']);
  }
});
test('unknown speakers preserve the actual dialogue and can be mapped in bulk',()=>{
  const source='**VEILLEUR**\nBonjour.\n\n[DIALOGUE:VEILLEUR|worried|gauche] Venez.';
  const first=parseSceneScript(source,characters);
  assert.deepEqual(first.blocks.map(b=>b.type),['dialogue','dialogue']);
  assert.equal(first.blocks[0].speakerNote,'VEILLEUR');assert.equal(first.warnings.length,1);
  const mapped=parseSceneScript(source,characters,{VEILLEUR:'soren'});
  assert.ok(mapped.blocks.every(b=>b.characterId==='soren'));assert.equal(mapped.warnings.length,0);
  assert.equal(mapped.blocks[1].position,'left');assert.equal(mapped.blocks[1].emotion,'worried');
});
test('explicit null assignment overrides a recognized name',()=>{
  assert.equal(parseSceneScript('[DIALOGUE:Mira] Bonjour',characters,{Mira:null}).blocks[0].characterId,null);
});
test('UTF-8 BOM, CRLF, YAML metadata and code wrappers are accepted',()=>{
  const r=parseSceneScript('\uFEFF---\r\ntitle: Le port\r\n---\r\n```markdown\r\n# Le retour\r\nMira: Bonjour\r\n```',characters);
  assert.deepEqual(r.blocks.map(b=>b.type),['heading','dialogue']);assert.equal(r.blocks[1].content,'Bonjour');
});
test('multi-paragraph explicit text and audio settings remain intact',()=>{
  const r=parseSceneScript('[NARRATION] Premier paragraphe.\n\nSecond paragraphe.\n[MUSIQUE:stop|fade=2]\n[SFX:/uploads/son.wav|volume=70]',characters);
  assert.equal(r.blocks[0].content,'Premier paragraphe.\n\nSecond paragraphe.');
  assert.equal(r.blocks[1].audioAction,'stop');assert.equal(r.blocks[1].fadeDuration,2);
  assert.equal(r.blocks[2].mediaUrl,'/uploads/son.wav');assert.equal(r.blocks[2].volume,70);
});
test('inline Markdown speakers and ordinary narrative punctuation',()=>{
  const r=parseSceneScript('**Mira**: Bonjour.\n\nLe soir : les lumières brillent.',characters);
  assert.equal(r.blocks[0].type,'dialogue');assert.equal(r.blocks[0].content,'Bonjour.');assert.equal(r.blocks[1].type,'action');
});
test('text conversion excludes audio and background metadata',()=>{
  assert.equal(timelineTypeForTrack('note'),'note');assert.equal(timelineTypeForTrack('music'),null);
  assert.equal(canConvertTimelineBlock('dialogue','note'),true);assert.equal(canConvertTimelineBlock('note','dialogue'),true);
  for(const type of ['music','sfx','background'])assert.equal(canConvertTimelineBlock(type,'dialogue'),false);
});

test('cuts without blank lines stay cuts, including inside explicit blocks',()=>{
  for(const source of ['Avant\n---\nAprès','[ACTION] Avant\n---\nAprès']) {
    const blocks=parseSceneScript(source,characters).blocks;
    assert.equal(blocks.length,3);assert.equal(blocks[1].type,'transition');
  }
});
test('mixed case and quoted Markdown speakers, including colon inside bold',()=>{
  const result=parseSceneScript('> **Mira :** Bonjour.\n\n**Nora**\nNous voilà.\n\nVEILLEUR\nQui va là ?',characters);
  assert.deepEqual(result.blocks.map(block=>block.type),['dialogue','dialogue','dialogue']);
  assert.equal(result.blocks[0].content,'Bonjour.');assert.equal(result.blocks[0].characterId,'mira');
  assert.equal(result.blocks[1].speakerNote,'Nora');assert.equal(result.blocks[2].speakerNote,'VEILLEUR');
});
