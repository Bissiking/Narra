/* Local UI regression with intercepted APIs. Does not validate PostgreSQL or Kyros. */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const puppeteer=require(process.env.NARRA_PUPPETEER_MODULE||'puppeteer-core');
const root=process.cwd(),port=Number(process.env.NARRA_PATCH_QA_PORT||3039),base='http://127.0.0.1:'+port;
const dir=path.join(root,'src/app/studio-patch-browser-qa/[projectId]');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 if(fs.existsSync(dir))throw Error('QA route already exists');
 fs.mkdirSync(dir,{recursive:true});fs.mkdirSync('.impeccable/review',{recursive:true});
 fs.writeFileSync(path.join(dir,'page.tsx'),'export { default } from "@/app/project/[projectId]/edit/page";');
 fs.mkdirSync(path.join(dir,'navigation'),{recursive:true});
 fs.writeFileSync(path.join(dir,'navigation/page.tsx'),'import ProjectNav from "@/components/layout/project-nav";export default function Page({params,searchParams}:{params:{projectId:string};searchParams:{role?:string}}){return <ProjectNav projectId={params.projectId} projectType="vn" role={searchParams.role==="viewer"?"viewer":"owner"}/>;}');
 const log=fs.openSync('.impeccable/patch-browser-server.log','w');
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p',String(port),'-H','127.0.0.1'],{cwd:root,env:{...process.env,NARRA_NEXT_DIST_DIR:'.next-qa/patch-browser'},stdio:['ignore',log,log]});
 let browser;
 try{
  for(let i=0;i<90;i++){try{await fetch(base+'/icon.png');break}catch{await wait(400)}}
  browser=await puppeteer.launch({executablePath:process.env.NARRA_CHROME,headless:true});
  const page=await browser.newPage();await page.setViewport({width:1440,height:900});
  const errors=[],saved=[],reorders=[];let failRename=false,failReorder=false,viewer=false,failBlockSave=false;
  page.on('pageerror',error=>errors.push(error.message));
  await page.evaluateOnNewDocument(()=>{window.WebSocket=class{static OPEN=1;readyState=0;send(){}close(){}}});
  let scenes=['Le départ','Le phare','Le retour'].map((title,i)=>({id:'s'+(i+1),title,status:'draft',order:i,wordCount:12,readerTitle:null,showReaderTitle:false,node:{id:'b1',title:'Chapitre 1'},location:null,characters:[],_count:{blocks:i?1:5}}));
  const structure=[{id:'season1',type:'season',title:'Saison 1 · L’Origine',order:0,children:[
   {id:'prologue',type:'prologue',title:'Prologue',order:0,children:[]},
   {id:'intro',type:'custom',title:'Intro',order:1,children:[]},
   {id:'e1',type:'episode',title:'Épisode 1 · La nomination',order:2,children:[{id:'b1',type:'chapter',title:'Chapitre 1',order:0,children:[]}]},
   {id:'e2',type:'episode',title:'Épisode 2 — Les conséquences du passé',order:3,children:[]},
   {id:'empty',type:'episode',title:'Épisode 3 · À écrire',order:4,children:[]},
  ]}];
  const extra=(id,title,nodeId,nodeTitle)=>({...scenes[0],id,title,node:{id:nodeId,title:nodeTitle},_count:{blocks:1}});
  scenes=[extra('prologue-scene','B1-0.1','prologue','Prologue'),extra('intro-scene','B1-0.2','intro','Intro'),...scenes,extra('ep2-scene','B1-1.0','e2','Épisode 2 — Les conséquences du passé')];
  const nodeById=id=>{const find=nodes=>{for(const node of nodes){if(node.id===id)return {id:node.id,title:node.title};const nested=find(node.children);if(nested)return nested}};return find(structure)||null};
  const characters=[{id:'mira',firstName:'Mira',lastName:'Du Port',alias:'La Veilleuse',portraitUrl:null,images:[]}];
  const blocks={s1:[{id:'d1',type:'dialogue',content:'Nous partons demain.',order:0,characterId:'mira'},{id:'a1',type:'action',content:'Le navire s’éloigne.',order:1},{id:'d2',type:'dialogue',content:'Je vois le phare.',order:2,characterId:'mira'},{id:'n1',type:'note',content:'Vérifier la continuité.',order:3},{id:'m1',type:'music',content:'Thème du port',order:4,loop:true}],s2:[{id:'s2-a',type:'action',content:'Au phare.',order:0}],s3:[{id:'s3-a',type:'action',content:'Le retour.',order:0}]};
  for(const id of ['prologue-scene','intro-scene','ep2-scene'])blocks[id]=[{id:id+'-a',type:'action',content:'Texte de '+id,order:0}];
  const creations=[];
  await page.setRequestInterception(true);page.on('request',request=>{void(async()=>{
   const u=new URL(request.url()),p=u.pathname,method=request.method();if(!p.startsWith('/api/'))return request.continue();
   let data=[],status=200;const body=request.postData()?JSON.parse(request.postData()):{};
   if(p.endsWith('/scenes/reorder')){reorders.push(body);if(failReorder){status=409;data={error:'Conflit simulé'}}else{scenes=scenes.map(s=>body.sceneIds.includes(s.id)?{...s,order:body.sceneIds.indexOf(s.id)}:s);data={ok:true}}}
   else if(p.startsWith('/api/scenes/')){const id=p.split('/')[3];if(method==='PUT'){if(failBlockSave){status=500;data={error:'Panne simulée'}}else{blocks[id]=body.blocks;data={blocks:blocks[id]};saved.push(body.blocks)}}else data=blocks[id]||[];}
   else if(method==='PATCH'){if(failRename){status=500;data={error:'Panne simulée'}}else{const id=p.split('/').at(-1);scenes=scenes.map(s=>s.id===id?{...s,...body,...(Object.hasOwn(body,'nodeId')?{node:nodeById(body.nodeId)}:{})}:s);data=scenes.find(s=>s.id===id)}}
   else if(p.endsWith('/scenes')&&method==='POST'){data={...scenes[0],id:'created-'+creations.length,title:body.title,node:nodeById(body.nodeId),order:0,wordCount:0,_count:{blocks:0}};scenes.push(data);blocks[data.id]=[];creations.push(body);}
   else if(p.endsWith('/scenes'))data=scenes;
   else if(p.endsWith('/characters'))data=characters;
   else if(p.endsWith('/narrative-nodes'))data=structure;
   else if(p.endsWith('/presentation'))data={canEdit:!viewer};
   else if(p.includes('/media'))data=[{id:'image1',url:'/icon.png',originalName:'Phare.png',filename:'Phare.png',type:'image',size:2048}];
   else data={name:'Les lumières du port',type:'vn'};
   return request.respond({status,contentType:'application/json',body:JSON.stringify(data)});
  })().catch(error=>errors.push(error.message))});
  const visible=async selector=>{await page.waitForSelector(selector,{visible:true});return page.$(selector)};
  const click=async selector=>{const el=await visible(selector);await el.evaluate(e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));await el.click()};
  const textClick=async text=>{const handles=await page.$$('button');for(const el of handles){if((await el.evaluate(e=>e.textContent.trim()))===text&&await el.isVisible()){await el.evaluate(e=>e.scrollIntoView({block:'nearest'}));await el.click();return}}throw Error('Button not found: '+text)};
  const fill=async(selector,value)=>{const el=await visible(selector);await el.evaluate(e=>{e.focus();e.setSelectionRange(0,e.value.length)});await page.keyboard.type(value)};
  const drag=async(from,to)=>{await visible(from);await visible(to);await page.$eval(from,e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));const a=await (await page.$(from)).boundingBox();await page.$eval(to,e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));const b=await(await page.$(to)).boundingBox();await page.mouse.move(a.x+Math.min(a.width/2,60),a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+Math.min(a.width/2,60)+12,a.y+a.height/2,{steps:3});await wait(70);await page.mouse.move(b.x+Math.min(b.width/2,60),b.y+b.height/2,{steps:20});await wait(150);await page.mouse.up();await wait(300)};
  const save=async()=>{const before=saved.length;await textClick('Sauver');for(let i=0;i<100&&saved.length===before;i++)await wait(20);assert.ok(saved.length>before,'save request completed');await page.waitForFunction(()=>[...document.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('sauvegardé à')))};
  const layout=async name=>{await click('[aria-label="Disposition"]');await textClick(name==='compact'?'CompacteImage 1 · cinq pistes':'DétailléeImage 2 · sept pistes');await page.waitForSelector('[data-studio-layout='+name+']')};
  // Verify real HTTP aliases before the protected layout. The canonical UI below uses mocked APIs.
  for(const suffix of ['/edit-v2?scene=ep2-scene&tag=a&tag=b','/scenes?scene=ep2-scene&tag=a&tag=b','/scenes/ep2-scene?tag=a&tag=b&scene=wrong']){
   const response=await fetch(base+'/project/demo'+suffix,{redirect:'manual'});assert.equal(response.status,308,suffix);
   const destination=new URL(response.headers.get('location'),base);assert.equal(destination.pathname,'/project/demo/edit');assert.equal(destination.searchParams.get('scene'),'ep2-scene');assert.deepEqual(destination.searchParams.getAll('tag'),['a','b']);
   await page.goto(base+'/studio-patch-browser-qa/demo'+destination.search,{waitUntil:'networkidle0'});await visible('[data-library-scene=ep2-scene]');assert.equal(await page.$eval('#studio-episode',e=>e.value),'e2');
  }
  const protectedRoute=await fetch(base+'/project/demo/edit',{redirect:'manual'});assert.equal(protectedRoute.status,307);assert.ok(new URL(protectedRoute.headers.get('location'),base).pathname==='/login');
  await page.goto(base+'/studio-patch-browser-qa/demo?scene=nonexistent',{waitUntil:'networkidle0'});await visible('[data-library-scene=s1]');assert.equal(await page.$eval('#studio-episode',e=>e.value),'e1');
  await page.goto(base+'/studio-patch-browser-qa/demo/navigation',{waitUntil:'networkidle0'});assert.equal(await page.$$eval('a[href="/project/demo/edit"]',links=>links.length),1);assert.equal(await page.$$eval('a[href$="/edit-v2"]',links=>links.length),0);
  await page.goto(base+'/studio-patch-browser-qa/demo/navigation?role=viewer',{waitUntil:'networkidle0'});assert.equal(await page.$$eval('a[href="/project/demo/edit"]',links=>links.length),0);
  console.log('Canonical editor, three HTTP 308 aliases, scene targets, repeated query values, auth and single navigation entry passed.');
  await page.goto(base+'/studio-patch-browser-qa/demo',{waitUntil:'networkidle0'});await visible('[data-track=dialogue] [data-block-id=d1]');
  assert.equal(await page.$eval('#studio-episode',e=>e.value),'e1');
  assert.deepEqual(await page.$$eval('[data-library-scene]',rows=>rows.map(row=>row.dataset.libraryScene)),['s1','s2','s3']);
  assert.ok(await page.$eval('#studio-episode',e=>[...e.options].some(option=>option.textContent.includes('Hors épisodes'))));
  await click('[aria-label="Disposition"]');assert.equal(await page.$$eval('[popover]:popover-open a',links=>links.length),0);await page.keyboard.press('Escape');
  // Settings must open even when the Scene inspector was already selected (the original no-op).
  await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');assert.ok(await page.$eval('dialog[open]',e=>e.textContent.includes('Le départ')));
  await page.select('dialog[open] [aria-label="Statut"]','writing');await fill('dialog[open] [aria-label="Titre affiché en lecture"]','Le départ au petit matin');
  await textClick('Enregistrer');await page.waitForSelector('dialog[open]',{hidden:true});assert.equal(scenes.find(s=>s.id==='s1').status,'writing');assert.equal(scenes.find(s=>s.id==='s1').readerTitle,'Le départ au petit matin');
  await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');assert.equal(await page.$eval('dialog[open] [aria-label="Statut"]',e=>e.value),'writing');
  await page.select('dialog[open] [aria-label="Statut"]','revision');failRename=true;await textClick('Enregistrer');await page.waitForFunction(()=>document.querySelector('dialog[open] [role=alert]')?.textContent.includes('Impossible de sauvegarder'));
  assert.equal(await page.$eval('dialog[open] [aria-label="Statut"]',e=>e.value),'revision');failRename=false;await textClick('Enregistrer');await page.waitForSelector('dialog[open]',{hidden:true});
  await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');await page.keyboard.press('Escape');await page.waitForSelector('dialog[open]',{hidden:true});assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Réglages du sous-bloc');
  // Media opens above the settings dialog and returns to it before the combined save.
  await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');
  await textClick('Choisir une image');await page.waitForFunction(()=>document.querySelector('dialog[open] [class*=mediaPicker]'));
  await textClick('Choisir une image');await page.waitForFunction(()=>document.querySelectorAll('dialog[open]').length===2);await click('dialog[open] [aria-label="Choisir Phare.png"]');await page.waitForFunction(()=>document.querySelectorAll('dialog[open]').length===1);
  assert.ok(await page.$('dialog[open] [class*=backgroundPreview] img'));failBlockSave=true;await textClick('Enregistrer');await page.waitForFunction(()=>document.querySelector('dialog[open] [role=alert]')?.textContent.includes('Échec de la sauvegarde'));assert.ok(await page.$('dialog[open] [class*=backgroundPreview] img'));failBlockSave=false;await textClick('Enregistrer');await page.waitForSelector('dialog[open]',{hidden:true});assert.ok(saved.at(-1).some(block=>block.type==='background'&&block.mediaUrl==='/icon.png'));
  // Scene ellipsis targets that scene and uses the same settings dialog, in either navigation mode.
  await click('[aria-label="Réglages de Le phare"]');await visible('dialog[open]');await page.waitForFunction(()=>document.querySelector('dialog[open] header p')?.textContent==='Le phare');await click('[aria-label="Fermer les réglages"]');
  await click('[data-library-scene=s1] [class*=sceneButton]');await visible('[data-track=dialogue] [data-block-id=d1]');
  console.log('Settings open, save, retry, Escape/focus and scene ellipsis passed.');
  // Convert from populated track to empty space and back; retain content and character metadata.
  await drag('[data-track=dialogue] [data-block-id=d1]','[data-track=note] [class*=trackLane]');
  await visible('[data-track=note] [data-block-id=d1]');await save();
  assert.equal(saved.at(-1).find(b=>b.id==='d1').type,'note');assert.equal(saved.at(-1).find(b=>b.id==='d1').characterId,'mira');
  await drag('[data-track=note] [data-block-id=d1]','[data-track=dialogue] [class*=trackLane]');await visible('[data-track=dialogue] [data-block-id=d1]');
  await click('[aria-label="Verrouiller Notes internes"]');await drag('[data-track=dialogue] [data-block-id=d1]','[data-track=note] [class*=trackLane]');assert.ok(await page.$('[data-track=dialogue] [data-block-id=d1]'));await click('[aria-label="Déverrouiller Notes internes"]');
  // Reorder full composite plans at pointer and keyboard.
  await drag('[data-track=video] [data-block-id=d1]','[data-track=video] [data-block-id=d2]');await save();assert.ok(saved.at(-1).findIndex(b=>b.id==='d1')>saved.at(-1).findIndex(b=>b.id==='d2'));
  await (await visible('[data-track=video] [data-block-id=d1]')).focus();await page.keyboard.press('Space');await wait(120);await page.keyboard.press('ArrowLeft');await wait(150);await page.keyboard.press('Space');await wait(300);await save();assert.ok(saved.at(-1).findIndex(b=>b.id==='d1')<saved.at(-1).findIndex(b=>b.id==='d2'));
  console.log('Pointer conversion, locks, plan reorder and keyboard reorder passed.');
  // Rename directly from header, retaining failed edits for retry.
  await click('[aria-label="Renommer le sous-bloc"]');await fill('[aria-label="Nouveau titre du sous-bloc"]','Une autre lumière');failRename=true;await click('[aria-label="Enregistrer le nouveau titre"]');await page.waitForFunction(()=>document.querySelector('[role=alert]')?.textContent.includes('Impossible de renommer'));
  assert.equal(await page.$eval('[aria-label="Nouveau titre du sous-bloc"]',e=>e.value),'Une autre lumière');failRename=false;await click('[aria-label="Enregistrer le nouveau titre"]');await page.waitForFunction(()=>document.querySelector('[aria-label="Renommer le sous-bloc"]')?.textContent.includes('Une autre lumière'));
  await textClick('Épisode');await visible('[data-scene-id=s1]');failReorder=true;
  await drag('[aria-label="Réorganiser Une autre lumière"]','[aria-label="Réorganiser Le retour"]');await page.waitForFunction(()=>[...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('Impossible d’enregistrer l’ordre')));assert.equal(await page.$eval('[data-scene-id]',e=>e.dataset.sceneId),'s1');
  failReorder=false;await drag('[aria-label="Réorganiser Une autre lumière"]','[aria-label="Réorganiser Le retour"]');await page.waitForFunction(()=>document.querySelector('[data-scene-id]')?.dataset.sceneId==='s2');assert.deepEqual(reorders.at(-1).sceneIds,['s2','s3','s1']);
  await (await page.$('[aria-label="Réorganiser Une autre lumière"]')).focus();await page.keyboard.press('Space');await wait(120);await page.keyboard.press('ArrowUp');await wait(150);await page.keyboard.press('Space');await page.waitForFunction(()=>[...document.querySelectorAll('[data-scene-id]')][1]?.dataset.sceneId==='s1');
  await click('[data-scene-id=s1] [class*=episodeSceneActions] button:last-child');await visible('[data-track=video]');
  await drag('[aria-label="Ordonner Une autre lumière"]','[aria-label="Ordonner Le phare"]');await page.waitForFunction(()=>document.querySelector('[data-library-scene]')?.dataset.libraryScene==='s1');
  console.log('Rename retry, library and episode pointer/keyboard reorder passed.');
  // Compact popup lives above clipped panels; clicking lower menu entries works.
  await click('[aria-label="Ajouter un élément"]');await page.waitForFunction(()=>document.querySelector('[popover]:popover-open'));
  const menu=await page.evaluate(()=>{const e=document.querySelector('[popover]:popover-open'),r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,visible:document.elementFromPoint(r.left+20,r.top+20)?.closest('[popover]')===e}});assert.ok(menu.top>=0&&menu.bottom<=900&&menu.visible);
  await textClick('Arrière-plan');await page.waitForSelector('[data-block-type=background]');await textClick('Choisir');await visible('dialog[open]');assert.ok(await page.$('dialog h2'));await click('dialog [aria-label="Choisir Phare.png"]');await page.waitForSelector('dialog[open]',{hidden:true});
  await page.waitForFunction(()=>document.querySelector('[data-block-type=background] input')?.value==='/icon.png');
  // Help is discoverable, traps focus via native dialog, Escape returns to the trigger.
  await click('[aria-label="Aide : Durée du décor"]');await visible('dialog[open]');assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),true);await page.evaluate(()=>document.querySelector('[aria-label="Ajouter un élément"]').focus());assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),true);await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement===document.body||document.activeElement.closest('dialog')!==null));await page.keyboard.press('Escape');await page.waitForSelector('dialog[open]',{hidden:true});assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Aide : Durée du décor');
  // File import, manual source-name association, mixed syntax, preview and actual persisted payload.
  await textClick('Importer');await visible('dialog[open]');fs.writeFileSync('.impeccable/patch-import.md','# Le port\n\n**NORA**\nNous voilà.\n\n---\n\n[DIALOGUE:Mira] Je te vois.\n***\n[NOTE] Revoir la lumière.');
  await(await page.$('input[aria-label="Fichier de script"]')).uploadFile(path.join(root,'.impeccable/patch-import.md'));
  await visible('[aria-label="Personnage pour NORA"]');await page.select('[aria-label="Personnage pour NORA"]','mira');await click('input[value=replace]');await textClick('Importer 6 blocs');await page.waitForSelector('dialog[open]',{hidden:true});await save();
  assert.deepEqual(saved.at(-1).map(b=>b.type),['heading','dialogue','transition','dialogue','transition','note']);assert.ok(saved.at(-1).filter(b=>b.type==='dialogue').every(b=>b.characterId==='mira'));assert.ok(saved.at(-1).every(b=>!b.content.includes('---')));
  console.log('Compact menus, media, help focus and Markdown import passed.');
  // Reproduce season-level Prologue/Intro followed by two real episodes and an empty one.
  const choose=async id=>{await page.select('#studio-episode',id);await page.waitForFunction(value=>document.querySelector('#studio-episode')?.value===value,{},id);await wait(100)};
  const libraryIds=()=>page.$$eval('[data-library-scene]',rows=>rows.map(row=>row.dataset.libraryScene));
  await click('[data-track=video] [data-block-id]');await fill('[data-scene-block-id] textarea','Le port modifié avant changement d’épisode.');
  failBlockSave=true;await page.select('#studio-episode','e2');await page.waitForFunction(()=>[...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('Échec de la sauvegarde')));assert.equal(await page.$eval('#studio-episode',e=>e.value),'e1');assert.equal(await page.$eval('[data-scene-block-id] textarea',e=>e.value),'Le port modifié avant changement d’épisode.');
  failBlockSave=false;
  await choose('e2');assert.deepEqual(await libraryIds(),['ep2-scene']);assert.equal(await page.$eval('[data-scene-id]',e=>e.dataset.sceneId),'ep2-scene');
  await choose('legacy-season1');assert.deepEqual(await libraryIds(),['prologue-scene','intro-scene']);assert.ok((await page.$eval('[aria-label="Organisation de l’épisode"]',e=>e.textContent)).includes('Hors épisodes'));assert.equal(await page.$$eval('[data-scene-id]',rows=>rows.length),2);
  await choose('empty');assert.deepEqual(await libraryIds(),[]);assert.equal(await page.$$eval('[data-scene-id]',rows=>rows.length),0);assert.ok(await page.$eval('[role="group"][aria-label="Mode de navigation"] button:last-child',button=>button.disabled));
  await choose('e2');await click('[data-scene-id=ep2-scene] [class*=episodeSceneActions] button:last-child');await visible('[data-track=video] [data-block-id=ep2-scene-a]');
  await page.select('[aria-label="Séquence"]','b1');failRename=true;await textClick('Enregistrer les réglages');await page.waitForFunction(()=>[...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('Impossible de sauvegarder les réglages')));assert.equal(await page.$eval('#studio-episode',e=>e.value),'e2');failRename=false;await textClick('Enregistrer les réglages');await page.waitForFunction(()=>document.querySelector('#studio-episode')?.value==='e1');assert.ok((await libraryIds()).includes('ep2-scene'));
  // Empty episode creation must attach to that episode, even with a title already used elsewhere.
  await choose('e2');assert.deepEqual(await libraryIds(),[]);await click('[aria-label="Créer une scène"]');assert.equal(await page.$eval('[aria-label="Rattachement narratif"]',e=>e.value),'e2');
  await fill('[aria-label="Titre du sous-bloc"]','Une autre lumière');await textClick('Créer la scène');await visible('[data-library-scene=created-0]');assert.deepEqual(await libraryIds(),['created-0']);assert.equal(creations[0].nodeId,'e2');assert.equal(await page.$eval('#studio-episode',e=>e.value),'e2');
  if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/episode-isolation-created.png'});
  await choose('e1');await click('[data-scene-id=s1] [class*=episodeSceneActions] button:last-child');await visible('[data-track=video]');
  console.log('Prologue/Intro separated, real episodes and empty episodes visible, reassignment and creation isolated.');
  // A single batched responsive inspection, both layouts; popups stay inside the viewport.
  for(const name of ['compact','detailed']){
   if(name==='detailed')await layout(name);
   for(const width of [1440,390,320]){
    await page.setViewport({width,height:900});await wait(150);await page.evaluate(()=>scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+name+' '+width);
    await page.$eval('#studio-episode',e=>e.scrollIntoView({block:'center'}));
    assert.ok(await page.$eval('#studio-episode',e=>{const r=e.getBoundingClientRect();return r.width>100&&r.left>=0&&r.right<=innerWidth}),'episode selector visible '+name+' '+width);
    if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/episode-isolation-'+name+'-'+width+'.png',fullPage:true});
    await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');
    assert.ok(await page.evaluate(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'settings bounds '+name+' '+width);
    if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/settings-'+name+'-'+width+'.png'});await page.keyboard.press('Escape');await page.waitForSelector('dialog[open]',{hidden:true});
    await click('[aria-label="Ajouter un élément"]');await page.waitForFunction(()=>document.querySelector('[popover]:popover-open'));
    assert.ok(await page.evaluate(()=>{const r=document.querySelector('[popover]:popover-open').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'menu bounds '+name+' '+width);
    if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/patch-'+name+'-'+width+'.png',fullPage:true});await page.keyboard.press('Escape');
    await textClick('Importer');await visible('dialog[open]');assert.ok(await page.evaluate(()=>{const r=document.querySelector('dialog[open]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'dialog bounds '+name+' '+width);
    await page.keyboard.press('Escape');await page.waitForSelector('dialog[open]',{hidden:true});
   }
   await page.setViewport({width:1440,height:900});
  }
  // A production-sized scene: 267 elements over more than ten minutes.
  const longScene={...scenes.find(scene=>scene.id==='s1'),id:'long-scene',title:'B1-1.0 · 267 éléments',order:99,_count:{blocks:267}};
  scenes.push(longScene);
  blocks['long-scene']=Array.from({length:267},(_,index)=>{
   const type=index===0?'background':index===1?'heading':index%67===0?'music':index%41===0?'sfx':index%29===0?'background':index%23===0?'note':index%3===0?'action':'dialogue';
   return {id:'long-'+index,type,order:index,content:type==='dialogue'?(index%5===0?`Réplique ${index} : Nous partirons avant le lever du soleil.`:`Réplique ${index} : Le phare nous attend.`):type==='heading'?'Épisode 1 — La nomination':type==='action'?'Le vaisseau traverse la brume.':type==='note'?'Vérifier la continuité.':'',characterId:type==='dialogue'?'mira':null,mediaUrl:type==='background'?'/icon.png':null,displayMode:type==='background'&&index>0?'layer':null};
  });
  await page.goto(base+'/studio-patch-browser-qa/demo?scene=long-scene',{waitUntil:'networkidle0'});await layout('compact');await visible('[data-track=video] [data-block-id=long-0]');
  const geometry=()=>page.evaluate(()=>{
   const viewport=document.querySelector('[data-timeline-scale]'),ruler=viewport.querySelector('[class*=rulerTicks]');
   const clips=[...viewport.querySelectorAll('[data-track=video] [data-block-id]')].map(el=>({left:parseFloat(el.style.left),width:el.getBoundingClientRect().width}));
   const labels=[...ruler.children].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right}});
   return {mode:viewport.dataset.timelineScale,width:viewport.clientWidth,scrollWidth:viewport.scrollWidth,scrollLeft:viewport.scrollLeft,clips,overlaps:clips.slice(1).filter((clip,index)=>clips[index].left+clips[index].width>clip.left+.1).length,labelOverlaps:labels.slice(1).filter((label,index)=>labels[index].right>label.left-6).length};
  });
  let dimensions=await geometry();assert.equal(dimensions.mode,'readable');assert.ok(dimensions.scrollWidth>dimensions.width*10);assert.ok(dimensions.clips.every(clip=>clip.width>=180));assert.equal(dimensions.overlaps,0);assert.equal(dimensions.labelOverlaps,0);
  if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/timeline-long-readable-1440.png'});
  // Transport follows the selected plan through a long scrollable canvas; zoom preserves it.
  await click('[aria-label="Aller au dernier plan"]');await page.waitForFunction(()=>document.querySelector('[data-timeline-scale]').scrollLeft>1000);
  const selectedVisible=()=>page.evaluate(()=>{const viewport=document.querySelector('[data-timeline-scale]'),segment=viewport.querySelector('[data-track=video] [aria-pressed=true]'),v=viewport.getBoundingClientRect(),r=segment.getBoundingClientRect(),label=viewport.querySelector('[class*=rulerLabel]').getBoundingClientRect();return r.left>=label.right-1&&r.left<v.right});
  assert.ok(await selectedVisible());
  await page.$eval('[aria-label="Zoom de la timeline"]',el=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,'3');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  // Use native range keys to ensure React receives the control change.
  await(await page.$('[aria-label="Zoom de la timeline"]')).focus();await page.keyboard.press('End');await wait(100);assert.ok(await selectedVisible());assert.ok((await geometry()).clips[0].width>=500);
  await textClick('Adapter');await page.waitForSelector('[data-timeline-scale=overview]');dimensions=await geometry();assert.ok(dimensions.scrollWidth<=dimensions.width+1);assert.equal(dimensions.overlaps,0);assert.equal(dimensions.labelOverlaps,0);
  if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/timeline-long-overview-1440.png'});
  await textClick('Lisible');await page.waitForSelector('[data-timeline-scale=readable]');assert.ok(await selectedVisible());
  await click('[aria-label="Revenir au début"]');await page.waitForFunction(()=>document.querySelector('[data-timeline-scale]').scrollLeft<1);
  await drag('[data-track=dialogue] [data-block-id=long-2]','[data-track=dialogue] [data-block-id=long-4]');await save();assert.equal(saved.at(-1).length,267);assert.ok(saved.at(-1).findIndex(block=>block.id==='long-2')>saved.at(-1).findIndex(block=>block.id==='long-4'));
  for(const name of ['compact','detailed']){
   if(name==='detailed')await layout(name);
   for(const width of [1440,390,320]){
    await page.setViewport({width,height:900});await wait(150);await click('[aria-label="Revenir au début"]');
    dimensions=await geometry();assert.equal(dimensions.overlaps,0);assert.equal(dimensions.labelOverlaps,0);assert.ok(dimensions.clips.every(clip=>clip.width>=180));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.evaluate(()=>{const panel=document.querySelector('[aria-label="Timeline du sous-bloc"]'),bounds=panel.getBoundingClientRect();return [...panel.querySelectorAll('[class*=timelineToolbar] button,[class*=timelineToolbar] input')].filter(el=>el.getClientRects().length).every(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right})}),'timeline controls not clipped '+name+' '+width);
    if(!process.env.NARRA_PATCH_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/timeline-long-'+name+'-'+width+'.png',fullPage:true});
    await textClick('Adapter');await page.waitForSelector('[data-timeline-scale=overview]');dimensions=await geometry();assert.ok(dimensions.scrollWidth<=dimensions.width+1);assert.equal(dimensions.overlaps,0);assert.equal(dimensions.labelOverlaps,0);await textClick('Lisible');
   }
   await page.setViewport({width:1440,height:900});
  }
  console.log('267-element scene: readable default, overview without overlaps, adaptive ruler, follow/zoom, reorder and both layouts at 1440/390/320px passed.');
  viewer=true;await page.reload({waitUntil:'networkidle0'});await visible('[data-track=video]');assert.equal(await page.$('[aria-label^="Ordonner "]'),null);assert.equal(await page.$('[aria-label="Renommer le sous-bloc"]'),null);assert.equal(await page.$('[aria-label="Ajouter un élément"]'),null);await click('[aria-label="Réglages du sous-bloc"]');await visible('dialog[open]');assert.ok(await page.$eval('dialog[open] [aria-label="Statut"]',e=>e.disabled));assert.equal(await page.$$eval('dialog[open] button',buttons=>buttons.filter(b=>b.textContent.trim()==='Enregistrer').length),0);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);console.log('Both layouts: 1440/390/320px, popup bounds and zero page errors passed.');
  fs.writeFileSync('.impeccable/review/patch-browser-report.json',JSON.stringify({passed:true,checks:['267-element readable timeline','overview without clip or ruler overlaps','playhead follow and zoom','long-scene reorder','canonical editor page','legacy HTTP 308 redirects','scene deep links and query preservation','protected canonical route','single project edit entry','settings dialog open/save/retry/focus','scene ellipsis opens settings','settings desktop and mobile bounds','nested settings media picker','failed episode navigation preserves edits','failed metadata reassignment preserves scope','episode-only library','outside-episode prologue and intro','empty episode visibility','scene reassignment updates active episode','creation in empty episode','track conversion','locked tracks','plan pointer/keyboard reorder','rename failure/retry','episode pointer/keyboard reorder','reorder failure','compact add menu','media modal','help focus and Escape','Markdown file import','character association','responsive compact/detailed'],widths:[1440,390,320],errors,scope:'Local Next.js UI with intercepted APIs; no real PostgreSQL, SSO or deployment.'},null,2));
 }catch(error){if(browser){for(const page of await browser.pages())await page.screenshot({path:'.impeccable/review/patch-failure.png',fullPage:true}).catch(()=>{})}throw error;}
 finally{await browser?.close();server.kill('SIGTERM');fs.rmSync(path.dirname(dir),{recursive:true,force:true});fs.rmSync(path.join(root,'.next-qa/patch-browser/types/app/studio-patch-browser-qa'),{recursive:true,force:true});fs.closeSync(log)}
})().catch(error=>{console.error(error);process.exitCode=1});
