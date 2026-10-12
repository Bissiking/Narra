const fs = require('node:fs');
const path = require('node:path');
const {spawn,execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.NARRA_PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), port=Number(process.env.NARRA_NAVIGATION_QA_PORT || 3035);
const routeDir=path.join(root,'src/app/navigation-qa/[projectId]'), routeFile=path.join(routeDir,'page.tsx');
(async()=>{
 if(fs.existsSync(routeFile)) throw Error('Le chemin du banc de test existe déjà.');
 fs.mkdirSync(routeDir,{recursive:true});fs.mkdirSync('.impeccable/review',{recursive:true});
 fs.writeFileSync(routeFile,'import EditorWorkspace from "@/components/editors/editor-workspace"; export default function Page(){return <EditorWorkspace version={2}/>;}');
 const log=fs.openSync('.impeccable/navigation-qa.log','w');
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p',String(port),'-H','127.0.0.1'],{cwd:root,env:{...process.env,NARRA_NEXT_DIST_DIR:".next-qa/navigation"},windowsHide:true,stdio:['ignore',log,log]});
 let browser;
 try {
  for(let i=0;i<60;i++){try{await fetch('http://127.0.0.1:'+port+'/icon.png');break;}catch{await new Promise(r=>setTimeout(r,500));}}
  browser=await chromium.launch({executablePath:process.env.NARRA_CHROME,headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.WebSocket=class {static OPEN=1;readyState=0;close(){};send(){}};});
  const node=(id,type,title,children=[],order=0)=>({id,type,title,children,order});
  const structure=[node('season','season','Saison 1 — L’Origine',[node('ep1','episode','Épisode 01 — Soren',[node('b1','chapter','Bloc 01 — Introduction'),node('b2','chapter','Bloc 02 — La mission',[],1)]),node('ep2','episode','Épisode 02 — Le départ',[],1),node('empty','episode','Épisode 03 — À écrire',[],2)])];
  const scene=(id,title,n,order=0)=>({id,title,status:'draft',node:{id:n,title:n==='b1'?'Introduction':'La mission'},order,wordCount:12,readerTitle:null,showReaderTitle:false,location:null,characters:[],_count:{blocks:3}});
  let scenes=[scene('s1','Couloir O.R.I.','b1'),scene('s2','Bureau de Maria','b1',1),scene('s3','Briefing','b2'),scene('s4','Le quai','ep2')];
  const blocks={};for(const s of scenes)blocks[s.id]=[{id:s.id+'-bg',type:'background',content:'',order:0,displayMode:'layer',mediaUrl:null,animationConfig:[]},{id:s.id+'-a',type:'action',content:s.title+' : une lumière au fond de la pièce.',order:1},{id:s.id+'-d',type:'dialogue',content:'Nous sommes prêts. '+s.title,order:2,characterId:null}];
  let failSave=false, viewer=false;const saved=[];
  await page.route('**/api/**',async route=>{
   const request=route.request(), url=new URL(request.url()), p=url.pathname, method=request.method();let data, status=200;
   if(p.endsWith('/scenes/reorder')){const body=request.postDataJSON();scenes=scenes.map(s=>body.sceneIds.includes(s.id)?{...s,order:body.sceneIds.indexOf(s.id)}:s);data={ok:true};}
   else if(p.startsWith('/api/scenes/')){const id=p.split('/')[3];if(method==='PUT'){const body=request.postDataJSON();if(failSave){status=500;data={error:'Simulation de panne'};}else{blocks[id]=body.blocks;saved.push({id,blocks:body.blocks});data={blocks:blocks[id]};}}else data=blocks[id]||[];}
   else if(p.endsWith('/narrative-nodes'))data=structure;
   else if(p.endsWith('/characters'))data=[];
   else if(p.endsWith('/presentation'))data={canEdit:!viewer};
   else if(p.endsWith('/scenes'))data=scenes;
   else data={name:'A.R.C. Origines · démonstration',type:'vn'};
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const go=async()=>{await page.goto('http://127.0.0.1:'+port+'/navigation-qa/demo',{waitUntil:'networkidle'});await page.getByRole('group',{name:'Mode de navigation'}).getByRole('button',{name:'Épisode',exact:true}).click();await page.getByRole('region',{name:'Organisation de l’épisode'}).waitFor();};
  const mode=page.getByRole('group',{name:'Mode de navigation'});
  const open=async id=>{await page.locator('[data-scene-id="'+id+'"] button').filter({hasText:'Ouvrir'}).click();await page.locator('[data-track=video] [data-block-id="'+id+'-a"]').waitFor();await page.locator('[data-track=video] [data-block-id="'+id+'-a"]').click();await page.locator('[data-scene-block-id] textarea').waitFor();};
  await go();assert.equal(await page.locator('[data-scene-id]').count(),3);
  await page.getByRole('button',{name:'Déplacer Couloir O.R.I. après',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-scene-id]')?.getAttribute('data-scene-id')==='s2');
  await page.reload({waitUntil:'networkidle'});await mode.getByRole('button',{name:'Épisode',exact:true}).click();await page.getByRole('region',{name:'Organisation de l’épisode'}).waitFor();assert.equal(await page.locator('[data-scene-id]').first().getAttribute('data-scene-id'),'s2');
  await open('s1');assert.equal(await page.getByRole('region',{name:'Timeline du sous-bloc'}).count(),1);assert.equal(await page.locator('[data-scene-block-id]').count(),1);
  assert.ok(!(await page.getByRole('region',{name:'Timeline du sous-bloc'}).textContent()).includes('Bureau de Maria'));
  await page.locator('[data-scene-block-id] textarea').fill('Texte conservé pendant la navigation.');
  await mode.getByRole('button',{name:'Épisode',exact:true}).click();failSave=true;
  await page.locator('[data-scene-id="s2"] button').filter({hasText:'Ouvrir'}).click();await page.getByRole('alert').filter({hasText:'Une modification attend'}).waitFor();assert.equal(await mode.getByRole('button',{name:'Épisode',pressed:true,exact:true}).count(),1);
  await mode.getByRole('button',{name:'Sous-bloc',exact:true}).click();assert.equal(await page.locator('[data-scene-block-id] textarea').inputValue(),'Texte conservé pendant la navigation.');
  await mode.getByRole('button',{name:'Épisode',exact:true}).click();failSave=false;await open('s2');assert.equal(saved[0].id,'s1');assert.equal(saved[0].blocks.length,3);assert.equal(saved[0].blocks[0].id,'s1-bg');
  await mode.getByRole('button',{name:'Épisode',exact:true}).click();await page.selectOption('#studio-episode','ep2');assert.equal(await page.locator('[data-scene-id]').count(),1);assert.equal(await page.locator('[data-scene-id]').getAttribute('data-scene-id'),'s4');
  await page.selectOption('#studio-episode','empty');assert.equal(await mode.getByRole('button',{name:'Sous-bloc',exact:true}).isDisabled(),true);
  await page.selectOption('#studio-episode','ep1');
  for(const width of [1920,1440,390]){
    await page.setViewportSize({width,height:width===390?844:1080});await mode.getByRole('button',{name:'Épisode',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Episode overflow '+width);
    await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    if(!process.env.NARRA_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/navigation-episode-'+width+'.png',fullPage:true});
    await open('s1');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Subblock overflow '+width);
    await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    if(!process.env.NARRA_QA_SKIP_CAPTURE)await page.screenshot({path:'.impeccable/review/navigation-subblock-'+width+'.png',fullPage:true});
  }
  viewer=true;await go();assert.equal(await page.getByRole('button',{name:'Déplacer Couloir O.R.I. après',exact:true}).count(),0);await open('s1');assert.equal(await page.locator('[data-scene-block-id] textarea').getAttribute('readonly'),'');
  assert.deepEqual(errors,[]);console.log('PASS: deux modes, isolation, réordonnancement/rechargement simulé, sauvegarde complète, panne bloquante, épisodes vides, accès lecture et captures 1920/1440/390. API simulées, aucune donnée réelle modifiée.');
 } finally {if(browser)await browser.close();if(process.platform==='win32'){try{execFileSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}}else server.kill();fs.closeSync(log);fs.unlinkSync(routeFile);fs.rmdirSync(routeDir);fs.rmdirSync(path.dirname(routeDir));const generated=path.join(root,'.next-qa/navigation/types/app/navigation-qa/[projectId]/page.ts');if(fs.existsSync(generated)){fs.unlinkSync(generated);fs.rmdirSync(path.dirname(generated));fs.rmdirSync(path.dirname(path.dirname(generated)));}} 
})().catch(e=>{console.error(e);process.exitCode=1});
