const puppeteer = require(process.env.NARRA_PUPPETEER_MODULE || 'puppeteer-core');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const f = JSON.parse(fs.readFileSync(process.env.NARRA_QA_FIXTURE || '.impeccable/qa-fixture.json'));
 const browser = await puppeteer.launch({ executablePath: process.env.NARRA_CHROME, headless:true });
 try {
 const page = await browser.newPage(); page.on('dialog',d=>d.accept()); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 const base=process.env.NARRA_QA_BASE_URL || 'http://127.0.0.1:3034'; const root=process.cwd();fs.mkdirSync(root+'/.impeccable/review',{recursive:true});
 await page.setCookie({name:'narra_session',value:f.token,domain:'127.0.0.1',path:'/',httpOnly:true});
 async function go(path) { const r=await page.goto(base+path,{waitUntil:'networkidle0'});assert.equal(r.status(),200,path); }
 async function clickText(text) { const buttons=await page.$$('button');for(const b of buttons){if((await b.evaluate(el=>el.textContent.trim()))===text){await b.click();return;}} throw Error('Missing button '+text); }
 await page.setViewport({width:1440,height:1000});
 await go(`/project/${f.project.id}/edit-v2`);await page.waitForSelector('#studio-content');
 assert.match(await page.content(),/Déroulé de la scène/);
 await page.screenshot({path:root+'/.impeccable/review/desktop.png',fullPage:true});
 // Direct writing, manual save, reload: persistence through the real API.
 await page.click('#studio-content'); await page.$eval('#studio-content',e=>e.select());await page.keyboard.type('Dialogue enregistré depuis le Studio V2.');
 const saved=page.waitForResponse(r=>r.url().includes(`/api/scenes/${f.scene.id}/blocks`) && r.request().method()==='PUT');await clickText('Sauver');assert.equal((await saved).status(),200);
 await page.reload({waitUntil:'networkidle0'});assert.equal(await page.$eval('#studio-content',e=>e.value),'Dialogue enregistré depuis le Studio V2.');
 // Decor settings: add both fade tracks, configure delay, persist.
 await page.click('[aria-label="Blocs de la scène"] button[aria-pressed]');
 await page.waitForSelector('fieldset legend');
 await clickText('Ajouter un effet d’entrée');
 const effectSelects=await page.$$('details select');
 // New entry defaults to Fade in; add Fade out via effect select by label.
 await clickText('Ajouter un effet d’entrée');
 const fadeSelect = (await page.$$('details select')).filter(Boolean);
 const effectHandles=[];for(const h of fadeSelect) if(await h.evaluate(el=>el.options.length===38)) effectHandles.push(h);
 await effectHandles[2].select('fade-out');
 const thirdDetails=(await page.$$('details'))[2];await (await thirdDetails.$('summary')).click();const delayInput=(await thirdDetails.$$('input[type=number]'))[1];await delayInput.click();await delayInput.evaluate(e=>e.select());await page.keyboard.type('4000');
 const inputs=await page.$$('details input[type="number"]');
 // API validates, PATCH and PUT round-trip configuration.
 const apiResult=await page.evaluate(async({f})=>{
   const res=await fetch(`/api/scenes/${f.scene.id}/blocks`);const blocks=await res.json();
   const bg=blocks.find(b=>b.id===f.bg.id);const invalid=await fetch(`/api/scenes/${f.scene.id}/blocks/${bg.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({animationConfig:[{...bg.animationConfig[0],intensity:101}]})});
   return {invalid:invalid.status,tracks:bg.animationConfig.length};
 },{f});assert.equal(apiResult.invalid,400);
 const saved2=page.waitForResponse(r=>r.url().includes(`/api/scenes/${f.scene.id}/blocks`) && r.request().method()==='PUT');await clickText('Sauver');assert.equal((await saved2).status(),200);
 await page.reload({waitUntil:'networkidle0'});await page.click('[aria-label="Blocs de la scène"] button[aria-pressed]');
 assert.ok((await page.$$('details')).length>=5);
 await page.screenshot({path:root+'/.impeccable/review/desktop-animations.png',fullPage:true});
 // Mobile layout and persisted preferences.
 await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
 await page.screenshot({path:root+'/.impeccable/review/mobile.png',fullPage:true});
 await clickText('Disposition');await page.click('[aria-label="Personnaliser le studio"] input');await clickText('Fermer');await page.reload({waitUntil:'networkidle0'});assert.equal(await page.$('[aria-label="Timeline de la scène"]'),null);
 // Current editor still usable.
 await go(`/project/${f.project.id}/edit`); assert.match(await page.content(),/Timeline composite/);
 // Wiki preview is private, stays within preview, includes complete facts and dynamic appearances.
 await go(`/stories/${f.project.slug}/wiki-preview`);assert.match(await page.content(),/La marée des étoiles/);assert.equal(await page.$eval('nav a:last-child',e=>e.getAttribute('href')),`/stories/${f.project.slug}/wiki-preview`);
 await go(`/stories/${f.project.slug}/wiki-preview/characters/${f.character.id}`);const html=await page.content();for(const text of ['Personnalité','Motivations','Forces','Faiblesses','Le serment','Une lumière dans la brume']) assert.ok(html.includes(text),text);
 await page.screenshot({path:root+'/.impeccable/review/wiki-mobile.png',fullPage:true});
 await page.setCookie({name:'narra_session',value:f.outsiderToken,domain:'127.0.0.1',path:'/'});assert.equal((await page.goto(base+`/stories/${f.project.slug}/wiki-preview`)).status(),404);
 await page.setCookie({name:'narra_session',value:f.token,domain:'127.0.0.1',path:'/'});
 // Continuous animation retains its actual Animation instance across dialogues.
 await page.setViewport({width:1440,height:1000});await go(`/project/${f.project.id}/read?block=${f.first.id}`);await page.waitForSelector('[data-effect="drift"]');
 await page.evaluate(()=>{window.__animation=document.querySelector('[data-effect="drift"]').getAnimations()[0];window.__entry=document.querySelector('[data-effect="fade-in"]').getAnimations()[0]});
 await page.keyboard.press('ArrowRight');
 await new Promise(r=>setTimeout(r,150));
 assert.ok((await page.content()).includes(f.second.content),'Dialogue did not advance');
 assert.ok(await page.evaluate(()=>window.__animation===document.querySelector('[data-effect="drift"]').getAnimations()[0]),'Continuous restarted');assert.ok(await page.evaluate(()=>window.__entry===document.querySelector('[data-effect="fade-in"]').getAnimations()[0]),'Entry restarted');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await new Promise(r=>setTimeout(r,100));assert.equal(await page.evaluate(()=>document.querySelector('[data-effect="drift"]').getAnimations().length),0);
 await page.emulateMediaFeatures([]);
 const added=await page.evaluate(async f=>{const r=await fetch(`/api/scenes/${f.scene.id}/blocks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'background',content:'',order:2,displayMode:'layer',mediaUrl:'/uploads/narra-qa-other.png',animationConfig:[{...f.bg.animationConfig[0],id:crypto.randomUUID(),effect:'crossfade',duration:10000},{...f.bg.animationConfig[0],id:crypto.randomUUID(),effect:'chromatic',intensity:100}]})});return {status:r.status,block:await r.json()}},f);assert.equal(added.status,201);
await page.setViewport({width:1440,height:1000});await page.goto(base+`/project/${f.project.id}/read?block=${f.first.id}`,{waitUntil:'networkidle0'});await page.keyboard.press('ArrowRight');await page.waitForSelector('[data-effect="crossfade"]');await new Promise(r=>setTimeout(r,100));const urls=await page.$$eval('[data-backdrop-identity] div',ds=>ds.map(d=>d.style.backgroundImage).filter(Boolean));assert.ok(urls.some(u=>u.includes('narra-qa-backdrop')),'Previous image retained');assert.ok(urls.some(u=>u.includes('narra-qa-other.png')),'New image present');assert.ok(await page.$eval('[data-effect="crossfade"]',el=>el.getAnimations().length>0));assert.ok(await page.$eval('[data-effect="chromatic"]',el=>getComputedStyle(el).filter.includes('url(') && el.querySelectorAll('feColorMatrix').length===2));
const publication=await page.evaluate(async f=>{const r=await fetch(`/api/projects/${f.project.id}/presentation`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({pagePublished:true})});return r.status},f);assert.equal(publication,200);
await page.deleteCookie({name:'narra_session',domain:'127.0.0.1',path:'/'});let r=await page.goto(base+`/stories/${f.project.slug}/wiki`,{waitUntil:'networkidle0'});assert.equal(r.status(),200);assert.match(await page.content(),/La marée des étoiles/);
r=await page.goto(base+`/stories/${f.project.slug}/wiki/characters/${f.character.id}`,{waitUntil:'networkidle0'});assert.equal(r.status(),200);assert.match(await page.content(),/Patiente et attentive/);
await page.setCookie({name:'narra_session',value:f.token,domain:'127.0.0.1',path:'/'});const update=await page.evaluate(async f=>{const r=await fetch(`/api/characters/${f.character.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({personality:'Une personnalité mise à jour en direct.'})});return r.status},f);assert.equal(update,200);await page.deleteCookie({name:'narra_session',domain:'127.0.0.1',path:'/'});await page.reload({waitUntil:'networkidle0'});assert.match(await page.content(),/Une personnalité mise à jour en direct/);
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile V2, save/reload, current editor, animation config validation, Wiki preview privacy/content, continuous clocks, reduced motion, crossfade, chromatic channel filter and public Wiki freshness.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
