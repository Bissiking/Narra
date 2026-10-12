const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.NARRA_PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),port=Number(process.env.NARRA_STUDIO_QA_PORT||3037);
const dir=path.join(root,'src/app/studio-layout-qa/[projectId]'),file=path.join(dir,'page.tsx');
function tone(){const rate=16000,count=rate*3,data=Buffer.alloc(44+count*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(count*2,40);for(let i=0;i<count;i++)data.writeInt16LE(Math.round(Math.sin(i/rate*180*Math.PI*2)*(0.2+Math.sin(i/rate*4)**2*.5)*8000),44+i*2);return data;}
(async()=>{
 if(fs.existsSync(file))throw Error('QA route exists');
 fs.mkdirSync(dir,{recursive:true});fs.mkdirSync('.impeccable/review',{recursive:true});
 fs.writeFileSync(file,'import EditorWorkspace from "@/components/editors/editor-workspace";export default function Page(){return <EditorWorkspace version={2}/>;}');
 const log=fs.openSync('.impeccable/studio-layout-server.log','w');
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p',String(port),'-H','127.0.0.1'],{cwd:root,env:{...process.env,NARRA_NEXT_DIST_DIR:".next-qa/studio-layout"},windowsHide:true,stdio:['ignore',log,log]});
 let browser;
 try{
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:'+port+'/icon.png');break;}catch{await new Promise(r=>setTimeout(r,500));}}
  browser=await chromium.launch({executablePath:process.env.NARRA_CHROME,headless:true});
  const page=await browser.newPage({viewport:{width:1672,height:941}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.WebSocket=class{static OPEN=1;readyState=0;close(){}send(){}};});
  const image='/uploads/41812da1-f752-4629-aa09-21e97beb55a3/220b1199-630a-489f-ad77-dbf2c35e6de5.png';
  const node=(id,type,title,children=[],order=0)=>({id,type,title,children,order});
  const structure=[node('season1','season','Saison 1 – L’Origine',[node('ep1','episode','Épisode 1',[node('b1','chapter','Prologue')]),node('empty','episode','Épisode à écrire',[],1)]),node('season2','season','Saison 2 – Les Révélations',[node('ep2','episode','Épisode 2')],1),node('season3','season','Saison 3 – L’Affrontement',[node('ep3','episode','Épisode 3')],2)];
  let scenes=Array.from({length:9},(_,i)=>({id:'s'+(i+1),title:'B1-0.'+(i+1),status:'draft',order:i,wordCount:24,readerTitle:['Prologue','Réveil','La rencontre','Un bruit au loin','Les traces','Le départ','Le retour','Conflit','Épilogue'][i],showReaderTitle:false,node:{id:i<5?'b1':i<7?'ep2':'ep3',title:i<5?'Prologue':'La suite'},location:null,characters:[],blocks:[{mediaUrl:image}],_count:{blocks:9}}));
  const blocks={};for(const scene of scenes)blocks[scene.id]=[
   {id:scene.id+'-bg',type:'background',content:'',order:0,mediaUrl:image,displayMode:'solo',animationConfig:[]},
   {id:scene.id+'-a',type:'action',content:'Moteur qui hurle au loin.',order:1},
   {id:scene.id+'-d',type:'dialogue',content:'Ma tête…',order:2,characterId:null},
   {id:scene.id+'-fx',type:'sfx',content:'Moteur_loin.wav',order:3,mediaUrl:'/studio-qa-tone.wav',volume:50},
   {id:scene.id+'-a2',type:'action',content:'Bruit de pneu puis silence.',order:4},
   {id:scene.id+'-d2',type:'dialogue',content:'Non…',order:5,characterId:null},
   {id:scene.id+'-n',type:'note',content:'Quelques secondes plus tard…',order:6},
   {id:scene.id+'-m',type:'music',content:'Ambiance_forêt.wav',order:7,mediaUrl:'/studio-qa-tone.wav',volume:20,loop:true},
   {id:scene.id+'-m2',type:'music',content:'Atmosphère.wav',order:8,mediaUrl:'/studio-qa-tone.wav',volume:10,loop:true}
  ];
  let failSave=false,failMetadata=false,viewer=false;const saved=[];
  await page.route('**/studio-qa-tone.wav',r=>r.fulfill({contentType:'audio/wav',body:tone()}));
  await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url()),p=url.pathname,method=request.method();let data,status=200;
   if(p.endsWith('/scenes/reorder')){const body=request.postDataJSON();scenes=scenes.map(s=>body.sceneIds.includes(s.id)?{...s,order:body.sceneIds.indexOf(s.id)}:s);data={ok:true};}
   else if(p.startsWith('/api/scenes/')){const id=p.split('/')[3];if(method==='PUT'){if(failSave){status=500;data={error:'Panne simulée'};}else{blocks[id]=request.postDataJSON().blocks;saved.push({id,blocks:blocks[id]});data={blocks:blocks[id]};}}else data=blocks[id]||[];}
   else if(method==='PATCH'){if(failMetadata){status=500;data={error:'Panne simulée'};}else{const id=p.split('/').at(-1);scenes=scenes.map(s=>s.id===id?{...s,...request.postDataJSON()}:s);data=scenes.find(s=>s.id===id);}}
   else if(p.endsWith('/narrative-nodes'))data=structure;else if(p.endsWith('/characters'))data=[];
   else if(p.endsWith('/presentation'))data={canEdit:!viewer};else if(p.endsWith('/scenes'))data=scenes;else if(p.includes('/media'))data=[];else data={name:'Mon projet · démonstration',type:'story'};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const go=async()=>{await page.goto('http://127.0.0.1:'+port+'/studio-layout-qa/demo',{waitUntil:'networkidle'});await page.locator('[data-studio-layout]').waitFor();await page.locator('[data-track=video] [data-block-id]').first().waitFor();};
  const scope=page.getByRole('group',{name:'Mode de navigation'});
  const disposition=async value=>{await page.getByRole('button',{name:'Disposition',exact:true}).click();await page.getByRole('button',{name:value==='compact'?'Compacte Image 1 · cinq pistes':'Détaillée Image 2 · sept pistes',exact:true}).click();await page.waitForFunction(v=>document.querySelector('[data-studio-layout]')?.getAttribute('data-studio-layout')===v,value);};
  const timeline=page.getByRole('region',{name:'Timeline du sous-bloc',exact:true});
  await go();
  assert.equal(await page.locator('[data-track]').count(),5);
  await disposition('detailed');assert.equal(await page.locator('[data-track]').count(),7);
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-studio-layout=detailed]').waitFor();assert.equal(await page.locator('[data-track]').count(),7);
  await disposition('compact');

  console.log("Layout switch and persistence passed.");
  // Meaningful interaction checks, including save-all and failure protection.
  await timeline.locator('[data-track=video] [data-block-id=s1-a]').click();
  const editor=page.locator('[data-scene-block-id=s1-a] textarea');await editor.fill('Texte conservé après un changement de disposition.');
  await page.getByRole('button',{name:'Annuler la dernière modification',exact:true}).click();assert.equal(await editor.inputValue(),'Moteur qui hurle au loin.');
  await page.getByRole('button',{name:'Rétablir la modification',exact:true}).click();assert.equal(await editor.inputValue(),'Texte conservé après un changement de disposition.');
  await disposition('detailed');assert.equal(await editor.inputValue(),'Texte conservé après un changement de disposition.');
  await page.getByRole('button',{name:'Verrouiller Action',exact:true}).click();assert.equal(await editor.getAttribute('readonly'),'');
  await page.getByRole('button',{name:'Déverrouiller Action',exact:true}).click();assert.equal(await editor.getAttribute('readonly'),null);
  await page.getByRole('button',{name:'Masquer Action',exact:true}).click();assert.equal(await page.locator('[data-track=action]').getAttribute('data-hidden'),'true');await page.getByRole('button',{name:'Afficher Action',exact:true}).click();
  await page.getByRole('slider',{name:'Position de lecture',exact:true}).count().then(n=>assert.equal(n,0));
  await page.getByRole('slider',{name:'Curseur de la timeline',exact:true}).fill('8');assert.ok((await page.locator('[class*=timeBadge]').first().textContent()).includes('00:08'));
  await page.getByRole('button',{name:'Lire le sous-bloc',exact:true}).click();await page.waitForTimeout(150);await page.getByRole('button',{name:'Mettre en pause',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter',exact:true}).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.narra.json'));

  console.log("Editing, history, track controls and transport passed.");
  failSave=true;await page.getByRole('button',{name:'B1-0.2',exact:false}).first().click();await page.getByRole('alert').filter({hasText:'Une modification attend'}).waitFor();assert.equal(await page.locator('[data-scene-block-id=s1-d]').count(),1);
  failSave=false;await page.getByRole('button',{name:'B1-0.2',exact:false}).first().click();await page.locator('[data-track=video] [data-block-id=s2-bg]').waitFor();assert.equal(saved[0].id,'s1');assert.equal(saved[0].blocks.length,9);

  await scope.getByRole('button',{name:'Épisode',exact:true}).click();await page.getByRole('region',{name:'Organisation de l’épisode'}).waitFor();assert.equal(await page.locator('[data-scene-id]').count(),5);
  await page.getByRole('button',{name:'Déplacer B1-0.1 après',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-scene-id]')?.getAttribute('data-scene-id')==='s2');
  await page.selectOption('#studio-episode','empty');assert.equal(await scope.getByRole('button',{name:'Sous-bloc',exact:true}).isDisabled(),true);
  await page.selectOption('#studio-episode','ep1');await page.locator('[data-scene-id=s1] button').filter({hasText:'Ouvrir'}).click();await timeline.locator('[data-block-id=s1-bg]').first().waitFor();
  assert.ok(!(await timeline.textContent()).includes('B1-0.2'));

  await page.getByRole('tab',{name:'Scène',exact:true}).click();
  await page.getByLabel('Statut',{exact:true}).selectOption('final');failMetadata=true;await page.getByRole('button',{name:'Enregistrer les réglages',exact:true}).click();await page.getByRole('alert').filter({hasText:'Impossible de sauvegarder les réglages'}).waitFor();
  await page.getByRole('button',{name:'B1-0.2',exact:false}).first().click();assert.ok((await page.locator('[aria-current=true]').textContent()).includes('B1-0.1'));
  failMetadata=false;await page.getByRole('button',{name:'Enregistrer les réglages',exact:true}).click();await page.getByRole('button',{name:'Enregistrer les réglages',exact:true}).waitFor({state:'hidden'});

  console.log("Navigation, save protection, reorder and metadata passed.");
  await page.getByRole('button',{name:'Insérer un élément après le plan',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Dialogue Ajouter une réplique',exact:true}).count(),1);await page.getByRole('button',{name:'Insérer un élément après le plan',exact:true}).click();
  // One batched visual round at the reference dimensions and common widths.
  await go();await disposition('compact');
  for(const layout of ['compact','detailed']){
   if(layout==='detailed')await disposition(layout);
   for(const [width,height] of [[1672,941],[1440,900],[1920,1080],[390,844],[320,740]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow '+layout+' '+width);
    if(width>=1000){
     const boxes=await page.evaluate(()=>Object.fromEntries(['library','monitor','inspector','timeline'].map(key=>{const el=document.querySelector('[class*="'+key+'"]');const b=el.getBoundingClientRect();return [key,{x:b.x,y:b.y,w:b.width,h:b.height}];})));
     assert.ok(boxes.timeline.w>width*.97);assert.ok(boxes.monitor.w>width*.44);assert.ok(boxes.library.x<20);assert.ok(boxes.inspector.x>width*.72);
    }
    await page.mouse.move(0,0);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'.impeccable/review/studio-'+layout+'-'+width+'.png',fullPage:true});
   }
  }
  await page.setViewportSize({width:1440,height:900});viewer=true;await go();
  await page.getByRole('button',{name:'Disposition',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Sauver',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Sauver',exact:true}).isDisabled(),true);
  await timeline.locator('[data-track=video] [data-block-id=s1-a]').click();assert.equal(await page.locator('[data-scene-block-id=s1-a] textarea').getAttribute('readonly'),'');
  assert.deepEqual(errors,[]);
  console.log('PASS: layouts persisted, 5/7 tracks, undo/redo, timeline playback/scrub, visibility/locking, JSON download, isolated modes, reorder, save-all and blocking failure, metadata failure/retry, viewer access, no overflow, captures 1672/1440/1920/390/320. API simulated; no real data changed.');
 }finally{
  if(browser)await browser.close();try{if(process.platform==='win32')execFileSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else server.kill();}catch{server.kill();}fs.closeSync(log);
  fs.unlinkSync(file);fs.rmdirSync(dir);fs.rmdirSync(path.dirname(dir));
  const generated=path.join(root,'.next-qa/studio-layout/types/app/studio-layout-qa/[projectId]/page.ts');if(fs.existsSync(generated)){fs.unlinkSync(generated);fs.rmdirSync(path.dirname(generated));fs.rmdirSync(path.dirname(path.dirname(generated)));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
