"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Scene, SceneBlock, Character, NarrativeNodeOption, PreviewSettings } from "./editor-workspace";
import type { StudioEpisode } from "@/lib/studio-navigation";
import { buildCompositePlans, type CompositePlan } from "@/lib/scene-composition";
import EpisodeOverview from "./episode-overview";
import SceneBlockItem from "@/components/scene-block-item";
import SceneScriptImporter from "@/components/scene-script-importer";
import MediaPicker from "@/components/media-picker";
import AnimatedBackdrop from "@/components/animated-backdrop";
import AnimationTrackEditor from "@/components/animation-track-editor";
import type { ParsedSceneScriptBlock } from "@/lib/scene-script-parser";
import StudioIcon, { type StudioIconName } from "./studio-v2-icons";
import StudioTimeline, { buildTiming, timeLabel } from "./studio-v2-timeline";
import styles from "./studio-v2.module.css";

export const BLOCK_NAMES: Record<string, string> = {heading:"Plan",action:"Action",dialogue:"Dialogue",narration:"Narration",background:"Décor",music:"Musique",sfx:"Effet sonore",note:"Note interne",transition:"Transition"};
const ADD_TYPES: {type:string; label:string; hint:string; icon:StudioIconName}[] = [
 {type:"heading",label:"Plan",hint:"Ajouter un titre de plan",icon:"video"},
 {type:"dialogue",label:"Dialogue",hint:"Ajouter une réplique",icon:"dialogue"},
 {type:"action",label:"Action",hint:"Ajouter une action",icon:"action"},
 {type:"background",label:"Arrière-plan",hint:"Ajouter un décor",icon:"image"},
 {type:"music",label:"Musique",hint:"Ajouter une musique",icon:"music"},
 {type:"sfx",label:"Effet sonore",hint:"Ajouter un effet sonore",icon:"sfx"},
 {type:"note",label:"Note interne",hint:"Ajouter une note",icon:"note"},
 {type:"narration",label:"Narration",hint:"Ajouter un texte narratif",icon:"note"},
 {type:"transition",label:"Transition",hint:"Ajouter une transition",icon:"video"}
];

interface Props {
 projectId:string; projectType:string; settings:PreviewSettings;
 scenes:Scene[]; groups:{id:string;title:string;scenes:Scene[]}[]; nodeOptions:NarrativeNodeOption[]; characters:Character[];
 episodes:StudioEpisode<Scene>[]; activeEpisode:StudioEpisode<Scene>|undefined; episodeMode:boolean;
 selectedScene:Scene|null; blocks:SceneBlock[]; selectedBlockId:string|null;
 onSelectBlock:(id:string|null)=>void; onOpenScene:(id:string)=>Promise<void>; onSelectScene:(id:string)=>Promise<boolean>;
 onModeChange:(mode:"episode"|"subblock")=>void; onSelectEpisode:(id:string)=>Promise<void>; onMoveScene:(id:string,direction:-1|1)=>Promise<void>; movingScene:boolean;
 onAddBlock:(type:string,afterId?:string|null)=>void; onUpdateBlock:(id:string,updates:Partial<SceneBlock>)=>void; onRemoveBlock:(id:string)=>void;
 onImport:(blocks:ParsedSceneScriptBlock[],mode:"append"|"replace")=>void; onRestoreBlocks:(blocks:SceneBlock[])=>void;
 onReorderPlans:(event:DragEndEvent)=>void; onReorderMusic:(event:DragEndEvent)=>void;
 canEdit:boolean; loading:boolean; loadError:string|null; onRetry:()=>void;
 dirty:boolean;saving:boolean;saveError:string|null;lastSaved:Date|null;onSave:()=>Promise<boolean>;
 navigationError:string|null;onlineCount:number;onCreateScene:()=>void;createSceneForm:ReactNode;
 metadata:{status:string;nodeId:string;readerTitle:string;showReaderTitle:boolean;onStatus:(s:string)=>void;onNode:(s:string)=>void;onReaderTitle:(s:string)=>void;onShowTitle:(s:boolean)=>void;onSave:()=>Promise<void>};
 title:{value:string;onChange:(s:string)=>void;onSave:()=>Promise<void>};onDeleteScene:()=>Promise<void>;
}

export default function StudioV2View(props:Props) {
 const p=props;
 const [layout,setLayout]=useState<"compact"|"detailed">("compact");
 const [preferences,setPreferences]=useState(false);
 const [libraryTab,setLibraryTab]=useState("scenes");
 const [inspector,setInspector]=useState("scene");
 const [inspectorSection,setInspectorSection]=useState("inspector");
 const [addMenu,setAddMenu]=useState(false);
 const [time,setTime]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [speed,setSpeed]=useState(1);
 const [muted,setMuted]=useState(false);
 const [hiddenTracks,setHiddenTracks]=useState<string[]>([]);
 const [lockedTracks,setLockedTracks]=useState<string[]>([]);
 const [zoom,setZoom]=useState(1);
 const [history,setHistory]=useState<SceneBlock[][]>([]);
 const [future,setFuture]=useState<SceneBlock[][]>([]);
 const [fullscreenError,setFullscreenError]=useState<string|null>(null);
 const [audioError,setAudioError]=useState<string|null>(null);
 const [metadataSaving,setMetadataSaving]=useState(false);
 const [metadataError,setMetadataError]=useState<string|null>(null);
 const frameRef=useRef<HTMLDivElement>(null);
 const previewRef=useRef<HTMLDivElement>(null);
 const timelineRef=useRef<HTMLElement>(null);
 const saveAction=useRef<(()=>Promise<boolean>)|null>(null);
 const lastEdit=useRef({key:"",at:0});
 const musicRef=useRef<HTMLAudioElement|null>(null);
 const musicIndex=useRef(0);
 const plans=buildCompositePlans(p.blocks);
 const timing=buildTiming(plans);
 const duration=timing.at(-1)?.end || (p.blocks.some(b=>b.type==="music") ? 3 : 0);
 const selectedPlanIndex=plans.findIndex(plan=>plan.blocks.some(b=>b.id===p.selectedBlockId));
 const index=selectedPlanIndex<0?0:selectedPlanIndex;
 const plan=plans[index];
 const selected=p.blocks.find(b=>b.id===p.selectedBlockId) || null;
 const background=plans.slice(0,index+1).flatMap(item=>[item.lead,...item.layers]).reverse().find(b=>b.type==="background"&&b.mediaUrl);
 const backdrop=background?.mediaUrl || p.selectedScene?.location?.imageUrl || p.settings.pageBackgroundUrl;
 const detailed=layout==="detailed";
 const editable=p.canEdit&&!p.loading&&!p.loadError&&!!p.selectedScene;
 const onSelectBlock=p.onSelectBlock;
 const effectSources=JSON.stringify(plan?.blocks.filter(b=>b.type==="sfx"&&b.mediaUrl).map(b=>({url:b.mediaUrl!,volume:b.volume??100}))||[]);
 const musicSources=JSON.stringify(p.blocks.filter(b=>b.type==="music"&&b.audioAction!=="stop"&&b.mediaUrl).map(b=>({url:b.mediaUrl!,volume:b.volume??100,loop:b.loop!==false})));
 const mediaLocked=selected ? lockedTracks.includes(selected.type) || (selected.type!=="music"&&lockedTracks.includes("video")) : false;

 useEffect(()=>{try{const saved=localStorage.getItem("narra-studio-v2-layout");if(saved==="compact"||saved==="detailed")setLayout(saved);}catch{}},[]);
 useEffect(()=>{setTime(0);setPlaying(false);setHistory([]);setFuture([]);setInspector("scene");setAudioError(null);musicIndex.current=0;},[p.selectedScene?.id]);
 useEffect(()=>{setHistory([]);setFuture([]);},[p.lastSaved]);
 useEffect(()=>{if(p.episodeMode)setPlaying(false);},[p.episodeMode]);
 useEffect(()=>{setTime(t=>Math.min(t,duration));},[duration]);
 useEffect(()=>{
  if(!playing||!duration||p.episodeMode)return;
  let raf=0,last=performance.now();
  const tick=(now:number)=>{const delta=(now-last)/1000*speed;last=now;setTime(current=>{const next=current+delta;if(next>=duration){setPlaying(false);return duration;}return next;});raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[playing,duration,speed,p.episodeMode]);
 useEffect(()=>{
  if(!playing)return;
  const next=timing.findIndex(slot=>time>=slot.start&&time<slot.end);
  if(next>=0&&next!==index)onSelectBlock(plans[next].lead.id);
 },[time,playing,index,plans,timing,onSelectBlock]);
 useEffect(()=>{
  if(!playing||muted||hiddenTracks.includes("sfx"))return;
  const sources=JSON.parse(effectSources) as {url:string;volume:number}[];
  const effects=sources.map(b=>{
   const audio=new Audio(b.url);audio.volume=Math.min(1,Math.max(0,b.volume/100));audio.playbackRate=speed;
   void audio.play().catch(()=>setAudioError("Un effet sonore n’a pas pu être lu."));return audio;
  });
  return()=>effects.forEach(audio=>audio.pause());
 },[playing,muted,effectSources,speed,hiddenTracks]);
 useEffect(()=>{
  const tracks=JSON.parse(musicSources) as {url:string;volume:number;loop:boolean}[];
  if(!playing||muted||hiddenTracks.includes("music")||!tracks.length)return;
  let active=true;
  const playTrack=()=>{
   const block=tracks[musicIndex.current%tracks.length];const audio=new Audio(block.url);
   audio.volume=Math.min(1,Math.max(0,block.volume/100));audio.playbackRate=speed;
   audio.loop=tracks.length===1&&block.loop!==false;musicRef.current=audio;
   audio.onended=()=>{if(!active)return;musicIndex.current++;if(musicIndex.current<tracks.length||block.loop!==false)playTrack();};
   void audio.play().catch(()=>setAudioError("La musique n’a pas pu être lue."));
  };
  playTrack();return()=>{active=false;musicRef.current?.pause();musicRef.current=null;};
 },[playing,muted,speed,musicSources,hiddenTracks]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){setPreferences(false);setAddMenu(false);}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();void saveAction.current?.();}};
  window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
 },[]);

 function remember(key:string) {
  if(!editable)return;
  const now=Date.now();
  if(key!==lastEdit.current.key||now-lastEdit.current.at>600)setHistory(h=>[...h.slice(-49),structuredClone(p.blocks)]);
  lastEdit.current={key,at:now};setFuture([]);
 }
 function update(id:string,changes:Partial<SceneBlock>){remember("update-"+id);p.onUpdateBlock(id,changes);}
 function select(id:string){p.onSelectBlock(id);setInspector("content");setInspectorSection("inspector");const i=plans.findIndex(item=>item.blocks.some(b=>b.id===id));if(i>=0)setTime(timing[i].start);}
 function add(type:string){remember("add-"+Date.now());p.onAddBlock(type,plan?.blocks.at(-1)?.id || p.selectedBlockId);setInspector("content");setInspectorSection("inspector");setAddMenu(false);}
 function undo(){const previous=history.at(-1);if(!previous)return;setFuture(f=>[...f,structuredClone(p.blocks)]);setHistory(h=>h.slice(0,-1));p.onRestoreBlocks(previous);lastEdit.current={key:"",at:0};}
 function redo(){const next=future.at(-1);if(!next)return;setHistory(h=>[...h,structuredClone(p.blocks)]);setFuture(f=>f.slice(0,-1));p.onRestoreBlocks(next);lastEdit.current={key:"",at:0};}
 function scrub(value:number){setTime(value);const i=timing.findIndex(s=>value>=s.start&&value<s.end);if(i>=0)p.onSelectBlock(plans[i].lead.id);}
 function step(direction:-1|1){const i=Math.min(plans.length-1,Math.max(0,index+direction));if(plans[i]){p.onSelectBlock(plans[i].lead.id);setTime(timing[i].start);}}
 function togglePlay(){if(time>=duration)scrub(0);setAudioError(null);setPlaying(v=>!v);}
 function chooseLayout(value:"compact"|"detailed"){setLayout(value);try{localStorage.setItem("narra-studio-v2-layout",value);}catch{}setPreferences(false);}
 async function fullscreen(element:HTMLElement|null){
  if(!element)return;
  try{if(document.fullscreenElement)await document.exitFullscreen();else await element.requestFullscreen();setFullscreenError(null);}catch{setFullscreenError("Le plein écran est indisponible dans ce navigateur.");}
 }
 async function saveMetadata(){
  setMetadataSaving(true);setMetadataError(null);
  try{await p.metadata.onSave();return true;}catch{setMetadataError("Impossible de sauvegarder les réglages. Réessayez.");return false;}finally{setMetadataSaving(false);}
 }
 async function saveAll(){if(metadataDirty&&!(await saveMetadata()))return false;return p.onSave();}
 async function openScene(id:string){if(id!==p.selectedScene?.id&&metadataDirty&&!(await saveMetadata()))return;await p.onOpenScene(id);}
 async function selectScene(id:string){if(id!==p.selectedScene?.id&&metadataDirty&&!(await saveMetadata()))return false;return p.onSelectScene(id);}
 async function selectEpisode(id:string){if(metadataDirty&&!(await saveMetadata()))return;await p.onSelectEpisode(id);}
 function exportScene(){
  const blob=new Blob([JSON.stringify({format:"narra-scene-v2",project:p.settings.name,scene:p.selectedScene,blocks:p.blocks},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(p.selectedScene?.title || "sous-bloc").replace(/[<>:"/\\|?*]/g,"-")+".narra.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function toggleTrack(key:string,kind:"hidden"|"locked"){const setter=kind==="hidden"?setHiddenTracks:setLockedTracks;setter(items=>items.includes(key)?items.filter(item=>item!==key):[...items,key]);}
 const metadataDirty=!!p.selectedScene&&(p.metadata.status!==p.selectedScene.status||p.metadata.nodeId!==(p.selectedScene.node?.id||"")||p.metadata.readerTitle!==(p.selectedScene.readerTitle||"")||p.metadata.showReaderTitle!==p.selectedScene.showReaderTitle);
 saveAction.current=editable?saveAll:null;
 const state=p.saving?"Sauvegarde…":p.saveError?"Non sauvegardé":p.dirty?"Modifications à sauvegarder":p.lastSaved?"Projet sauvegardé à "+p.lastSaved.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"Projet chargé";
 const sceneBg=p.blocks.find(b=>b.type==="background") || null;
 const previewBlock=plan?.lead;
 const character=p.characters.find(c=>c.id===previewBlock?.characterId);
 const expression=character?.images.find(i=>previewBlock?.emotion&&i.emotion.toLocaleLowerCase("fr")===previewBlock.emotion.toLocaleLowerCase("fr"));
 const portrait=previewBlock?.showPortrait===false?null:previewBlock?.portraitImageUrl||expression?.url||character?.portraitUrl;
 const speaker=character?.alias || [character?.firstName,character?.lastName].filter(Boolean).join(" ") || previewBlock?.speakerNote || "Personnage";

 const scopeControls=<div className={styles.scopeControls}><div role="group" aria-label="Mode de navigation"><button type="button" aria-pressed={p.episodeMode} onClick={()=>p.onModeChange("episode")}>Épisode</button><button type="button" aria-pressed={!p.episodeMode} disabled={!p.selectedScene} onClick={()=>p.onModeChange("subblock")}>Sous-bloc</button></div>{p.episodeMode&&<select id="studio-episode" aria-label="Épisode actif" value={p.activeEpisode?.id || ""} onChange={e=>void selectEpisode(e.target.value)}>{!p.episodes.length&&<option value="">Aucun épisode</option>}{p.episodes.map(e=><option key={e.id} value={e.id}>{e.path.join(" / ")||e.title}</option>)}</select>}</div>;

 return <div ref={frameRef} className={styles.workspace+" "+(detailed?styles.detailed:styles.compact)} data-studio-layout={layout}>
  <header className={styles.topbar}>
   <Link href={"/project/"+p.projectId} className={styles.brand} aria-label="Retour au projet"><span className={styles.logo}>N</span><strong>{detailed?"Narra V2":"Narra"}</strong>{!detailed&&<><StudioIcon name="chevron"/><b>Studio V2</b><span className={styles.formatBadge}>{p.projectType==="vn"?"VN":p.projectType==="screenplay"?"SCRIPT":"ARC"}</span></>}</Link>
   <div className={styles.breadcrumb}>
    {!detailed&&<><Link href={"/project/"+p.projectId}>{p.settings.name}</Link><StudioIcon name="chevron"/></>}
    <div><button type="button" onClick={()=>{setInspector("scene");setInspectorSection("inspector");}}>{p.episodeMode?p.activeEpisode?.title || "Épisode":p.selectedScene?.title || "Aucun sous-bloc"}{detailed&&<StudioIcon name="edit"/>}</button>{detailed&&<small role="status">{state}</small>}</div>
    {!detailed&&p.selectedScene?.readerTitle&&<><StudioIcon name="chevron"/><span>{p.selectedScene.readerTitle}</span></>}
   </div>
   {detailed&&scopeControls}
   <div className={styles.topActions}>
    <div className={styles.historyButtons}><IconButton icon="undo" label="Annuler la dernière modification" onClick={undo} disabled={!editable||!history.length}/><IconButton icon="redo" label="Rétablir la modification" onClick={redo} disabled={!editable||!future.length}/></div>
    {!detailed&&<button className={styles.activeButton} type="button" onClick={()=>setLibraryTab("scenes")}><StudioIcon name="video"/><span>Éditeur</span></button>}
    <div className={styles.layoutControl}><button type="button" aria-label="Disposition" aria-expanded={preferences} onClick={()=>setPreferences(v=>!v)}><StudioIcon name="layout"/>{!detailed&&<span>Disposition</span>}</button>
    {preferences&&<div className={styles.layoutMenu} aria-label="Choisir la disposition"><strong>Disposition du studio</strong><button type="button" aria-pressed={!detailed} onClick={()=>chooseLayout("compact")}><StudioIcon name="grid"/><span>Compacte<small>Image 1 · cinq pistes</small></span></button><button type="button" aria-pressed={detailed} onClick={()=>chooseLayout("detailed")}><StudioIcon name="list"/><span>Détaillée<small>Image 2 · sept pistes</small></span></button>{detailed&&<button type="button" onClick={()=>void saveAll()} disabled={!editable||p.saving}><StudioIcon name="save"/>Sauver</button>}<Link href={"/project/"+p.projectId+"/edit"}>Ouvrir l’éditeur actuel</Link></div>}</div>
    {detailed?<button type="button" onClick={()=>void fullscreen(previewRef.current)}><StudioIcon name="expand"/><span>Aperçu plein écran</span><StudioIcon name="chevron"/></button>:<button type="button" onClick={()=>{setInspector("scene");setInspectorSection("inspector");}} disabled={!p.selectedScene}><StudioIcon name="settings"/><span>Réglages</span></button>}
    {!detailed&&<button type="button" className={styles.primary} onClick={()=>void saveAll()} disabled={!editable||p.saving}><StudioIcon name="save"/><span>{p.saving?"Sauvegarde…":"Sauver"}</span></button>}
    {detailed&&<button type="button" className={styles.exportButton} onClick={exportScene} disabled={!p.selectedScene||p.loading||!!p.loadError}><StudioIcon name="export"/><span>Exporter</span></button>}
   </div>
  </header>

  <aside className={styles.library} aria-label="Scènes du projet">
   {detailed?<div className={styles.libraryTabs}>{[{key:"scenes",label:"Scènes",icon:"video"},{key:"resources",label:"Ressources",icon:"layout"},{key:"media",label:"Médiathèque",icon:"image"}].map(tab=><button type="button" key={tab.key} aria-pressed={libraryTab===tab.key} onClick={()=>setLibraryTab(tab.key)}><StudioIcon name={tab.icon as StudioIconName}/>{tab.label}</button>)}</div>:<div className={styles.libraryHeader}><div><strong>Scènes</strong><small>{p.scenes.length} scènes · {p.scenes.reduce((n,s)=>n+s.wordCount,0).toLocaleString("fr-FR")} mots</small></div>{p.canEdit&&<button type="button" onClick={p.onCreateScene} aria-label="Créer une scène" aria-expanded={!!p.createSceneForm}><StudioIcon name="plus"/>Ajouter</button>}</div>}
   {!detailed&&scopeControls}
   {detailed&&libraryTab==="scenes"&&p.canEdit&&<button type="button" className={styles.addScene} onClick={p.onCreateScene} aria-label="Créer une scène" aria-expanded={!!p.createSceneForm}><StudioIcon name="plus"/>Ajouter une scène</button>}
   {p.createSceneForm&&<div className={styles.createForm}>{p.createSceneForm}</div>}
   {libraryTab==="scenes"||!detailed?<div className={styles.sceneList}>
    {p.groups.map((group,gi)=><details key={group.id} open={gi===0 || group.scenes.some(s=>s.id===p.selectedScene?.id)} className={styles.season}><summary><StudioIcon name="chevron"/><span>{group.title}</span><small>{group.scenes.length} scènes</small></summary>{group.scenes.map((scene,si)=>{
     const thumbnail=(scene.id===p.selectedScene?.id?p.blocks.find(b=>b.type==="background"&&b.mediaUrl)?.mediaUrl:null)||scene.blocks?.[0]?.mediaUrl||scene.location?.imageUrl;
     return <div key={scene.id} className={styles.sceneRow} data-selected={scene.id===p.selectedScene?.id}>
      <button type="button" className={styles.sceneButton} onClick={()=>void (p.episodeMode?selectScene(scene.id):openScene(scene.id))} aria-current={scene.id===p.selectedScene?.id?"true":undefined}>
       {!detailed&&<StudioIcon name="grip"/>}<span className={styles.sceneThumb}>{thumbnail?<img src={thumbnail} alt=""/>:<StudioIcon name="image"/>}{detailed&&<small>{scene._count.blocks} él.</small>}</span><span className={styles.sceneNumber}>{String(si+1).padStart(2,"0")}</span><span className={styles.sceneName}><strong>{scene.title}</strong><small>{scene.readerTitle||scene.node?.title||"Sans séquence"}</small></span>{!detailed&&<small className={styles.sceneElements}>{scene._count.blocks} él.</small>}
      </button><button type="button" className={styles.sceneMore} onClick={()=>{void openScene(scene.id).then(()=>setInspector("scene"));}} aria-label={"Réglages de "+scene.title}><StudioIcon name={detailed?"grip":"more"}/></button>
     </div>;
    })}</details>)}
    {!p.scenes.length&&<p className={styles.empty}>Créez une scène pour commencer votre scénario.</p>}
    {detailed&&p.canEdit&&<button type="button" className={styles.sceneDrop} onClick={p.onCreateScene}><StudioIcon name="plus"/>Ajouter un sous-bloc</button>}
   </div>:<div className={styles.resources}><h2>{libraryTab==="media"?"Médiathèque":"Ressources du projet"}</h2><p>{libraryTab==="media"?"Retrouvez les images, musiques et effets sonores de votre histoire.":"Retrouvez les personnages, lieux et éléments de votre univers."}</p>{libraryTab==="media"?<Link href={"/project/"+p.projectId+"/media"}><StudioIcon name="image"/>Ouvrir la médiathèque<StudioIcon name="chevron"/></Link>:<>{[["characters","Personnages"],["locations","Lieux"],["structure","Structure"],["lore","Univers"]].map(([path,label])=><Link href={"/project/"+p.projectId+"/"+path} key={path}>{label}<StudioIcon name="chevron"/></Link>)}</>}</div>}
  </aside>

  <main className={styles.monitorArea}>
   {p.episodeMode?<div className={styles.episodeArea}>{p.activeEpisode?<EpisodeOverview episode={p.activeEpisode} selectedId={p.selectedScene?.id||null} onSelect={id=>void selectScene(id)} onOpen={id=>void openScene(id)} onMove={(id,d)=>void p.onMoveScene(id,d)} canEdit={p.canEdit} moving={p.movingScene}/>:<p className={styles.empty}>Aucun épisode. Créez un sous-bloc pour commencer.</p>}</div>:<div ref={previewRef} className={styles.monitor}>
    {!detailed&&<div className={styles.monitorHeader}><span>Aperçu — {p.selectedScene?.title||"Sous-bloc"}{p.selectedScene?.readerTitle&&" · "+p.selectedScene.readerTitle}</span><button type="button" onClick={()=>void fullscreen(previewRef.current)}><StudioIcon name="expand"/>Plein écran</button></div>}
    <div className={styles.previewStage} style={{"--preview-bg":p.settings.pageBackgroundColor,"--preview-ink":p.settings.pageTextColor,"--preview-accent":p.settings.pageAccentColor} as CSSProperties}>
     {p.loading?<p className={styles.empty}>Chargement de l’aperçu…</p>:p.loadError?<div className={styles.empty} role="alert"><p>{p.loadError}</p><button onClick={p.onRetry}>Réessayer</button></div>:!p.selectedScene?<p className={styles.empty}>Sélectionnez un sous-bloc.</p>:<>
      {backdrop&&!hiddenTracks.includes("background")&&!hiddenTracks.includes("video")&&<AnimatedBackdrop url={backdrop} config={background?.animationConfig} legacy={background?.animationPreset||"none"} identity={background?.id||p.selectedScene.id}/>}
      {!previewBlock&&!backdrop&&<div className={styles.empty}>Ajoutez un premier plan à la timeline.</div>}
      {previewBlock&&!hiddenTracks.includes(previewBlock.type)&&!hiddenTracks.includes("video")&&previewBlock.type!=="note"&&previewBlock.type!=="transition"&&previewBlock.content.trim()&&<div className={styles.previewText+" "+(previewBlock.type==="heading"?styles.headingText:"")}>
       {portrait&&previewBlock.type==="dialogue"&&<img src={portrait} alt={"Portrait de "+speaker}/>}
       {previewBlock.type==="dialogue"&&<strong style={{color:character?.nameColor||p.settings.pageAccentColor}}>{speaker}</strong>}
       {previewBlock.type==="heading"?<h1>{previewBlock.content}</h1>:<p>{previewBlock.content}</p>}
      </div>}
     </>}
    </div>
    <div className={styles.transport}>
     {detailed&&<><span className={styles.timeBadge}>{timeLabel(time,true)}</span><select aria-label="Vitesse de lecture" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option><option value={2}>2×</option></select></>}
     <div className={styles.playControls}>{!detailed&&<IconButton icon={playing?"pause":"play"} label={playing?"Mettre en pause":"Lire le sous-bloc"} onClick={togglePlay} disabled={!duration||p.loading} className={styles.roundPlay}/>}<IconButton icon="previous" label="Plan précédent" onClick={()=>step(-1)} disabled={!plans.length||index===0}/>{detailed&&<IconButton icon={playing?"pause":"play"} label={playing?"Mettre en pause":"Lire le sous-bloc"} onClick={togglePlay} disabled={!duration||p.loading}/>}<IconButton icon="next" label="Plan suivant" onClick={()=>step(1)} disabled={!plans.length||index>=plans.length-1}/></div>
     {!detailed&&<div className={styles.progressTransport}><input type="range" aria-label="Position de lecture" min={0} max={duration||1} step={.01} value={time} onChange={e=>scrub(Number(e.target.value))} disabled={!duration} style={{"--progress":(duration?time/duration*100:0)+"%"} as CSSProperties}/><span>{timeLabel(time)} <small>/ {timeLabel(duration)}</small></span></div>}
     <div className={styles.transportEnd}>{!detailed&&<select aria-label="Vitesse de lecture" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>0,5×</option><option value={1}>1×</option><option value={1.5}>1,5×</option><option value={2}>2×</option></select>}<IconButton icon={muted?"muted":"volume"} label={muted?"Activer le son":"Couper le son"} onClick={()=>setMuted(v=>!v)}/>{detailed&&<span>16:9</span>}<IconButton icon="expand" label="Aperçu en plein écran" onClick={()=>void fullscreen(previewRef.current)}/></div>
    </div>
   </div>}
  </main>

  <aside className={styles.inspector} aria-label="Inspecteur">
   {detailed?<div className={styles.outerTabs}>{[{key:"inspector",label:"Inspecteur"},{key:"effects",label:"Effets"},{key:"colors",label:"Couleurs"},{key:"audio",label:"Audio"}].map(tab=><button type="button" key={tab.key} aria-pressed={inspectorSection===tab.key} onClick={()=>setInspectorSection(tab.key)}>{tab.label}</button>)}</div>:<div className={styles.inspectorHeader}><div><strong>Inspecteur</strong><small>{plan?"Plan "+String(index+1).padStart(2,"0")+" · "+(BLOCK_NAMES[plan.lead.type]||plan.lead.type):p.episodeMode?"Organisation de l’épisode":"Aucun plan"}</small></div><IconButton icon="expand" label="Inspecteur en plein écran" onClick={e=>void fullscreen((e.currentTarget as HTMLElement).closest("aside"))}/></div>}
   <div className={styles.inspectorTabs} role="tablist" aria-label="Périmètre de l’inspecteur">{[{key:"content",label:detailed?"Plan":"Bloc"},{key:"scene",label:"Scène"},{key:"world",label:"Univers"}].map(tab=><button type="button" role="tab" aria-selected={inspector===tab.key} id={"studio-tab-"+tab.key} aria-controls="studio-inspector-panel" key={tab.key} onClick={()=>{setInspector(tab.key);setInspectorSection("inspector");}}>{tab.label}</button>)}</div>
   <div className={styles.inspectorBody} id="studio-inspector-panel" role="tabpanel" aria-labelledby={"studio-tab-"+inspector}>
    {inspectorSection==="colors"?<div className={styles.resources}><h2>Couleurs de lecture</h2><div className={styles.colorSwatches}>{[[p.settings.pageBackgroundColor,"Fond"],[p.settings.pageTextColor,"Texte"],[p.settings.pageAccentColor,"Accent"]].map(([color,label])=><div key={label}><i style={{backgroundColor:color}}/><span>{label}</span><code>{color}</code></div>)}</div><Link href={"/project/"+p.projectId+"/presentation"}>Modifier les couleurs du projet<StudioIcon name="chevron"/></Link></div>:inspectorSection==="effects"?background?<><h2>Animations du décor</h2><AnimationTrackEditor config={background.animationConfig} legacy={background.animationPreset} onChange={config=>update(background.id,{animationConfig:config})} disabled={!editable}/></>:<p className={styles.empty}>Sélectionnez un décor pour régler ses animations.</p>:inspectorSection==="audio"?<div className={styles.audioList}><h2>Audio du sous-bloc</h2>{p.blocks.filter(b=>["music","sfx"].includes(b.type)).map(b=><button type="button" key={b.id} onClick={()=>select(b.id)}><StudioIcon name={b.type==="music"?"music":"sfx"}/><span>{b.content||b.mediaUrl?.split("/").at(-1)||BLOCK_NAMES[b.type]}<small>{b.volume??100}% · {b.loop?"En boucle":"Lecture simple"}</small></span></button>)}{!p.blocks.some(b=>["music","sfx"].includes(b.type))&&<p className={styles.empty}>Aucun son dans ce sous-bloc.</p>}{editable&&<button onClick={()=>add("music")}><StudioIcon name="plus"/>Ajouter une musique</button>}</div>:inspector==="world"?<div className={styles.resources}><h2>Univers de l’histoire</h2><p>Personnages, lieux et continuité de votre projet.</p>{[["characters","Personnages"],["locations","Lieux"],["organizations","Organisations"],["lore","Univers"]].map(([path,label])=><Link href={"/project/"+p.projectId+"/"+path} key={path}>{label}<StudioIcon name="chevron"/></Link>)}</div>:inspector==="scene"?p.selectedScene?<>
     {detailed&&<h2>{plan?"Plan "+String(index+1).padStart(2,"0")+" · "+(BLOCK_NAMES[plan.lead.type]||"Plan"):p.selectedScene.title}</h2>}
     <div className={styles.metadataForm}>
      
      <label>Statut<span className={styles.statusControl}><i data-status={p.metadata.status}/><select aria-label="Statut" value={p.metadata.status} onChange={e=>p.metadata.onStatus(e.target.value)} disabled={!p.canEdit}><option value="draft">Brouillon</option><option value="writing">En cours</option><option value="revision">En révision</option><option value="final">Finalisé</option></select></span></label>
      <label>Séquence<select aria-label="Séquence" value={p.metadata.nodeId} onChange={e=>p.metadata.onNode(e.target.value)} disabled={!p.canEdit}><option value="">Sans rattachement</option>{p.nodeOptions.map(n=><option key={n.id} value={n.id}>{n.path.join(" / ")}</option>)}</select></label>
      <label>{detailed?"Titre (lecture)":"Titre affiché en lecture"}<input aria-label="Titre affiché en lecture" value={p.metadata.readerTitle} onChange={e=>p.metadata.onReaderTitle(e.target.value)} placeholder={p.selectedScene.title} readOnly={!p.canEdit}/></label>
      <label className={styles.switchLabel}><input type="checkbox" checked={p.metadata.showReaderTitle} onChange={e=>p.metadata.onShowTitle(e.target.checked)} disabled={!p.canEdit}/><span>Afficher ce titre au lecteur</span></label>
      {p.canEdit&&metadataDirty&&<button type="button" onClick={()=>void saveMetadata()} disabled={metadataSaving}>{metadataSaving?"Enregistrement…":"Enregistrer les réglages"}</button>}
      {metadataError&&<p role="alert">{metadataError}</p>}
     </div>
     <div className={styles.backgroundField}><h3>Arrière-plan</h3>{sceneBg?<>{sceneBg.mediaUrl&&<div className={styles.backgroundPreview}><img src={sceneBg.mediaUrl} alt="Décor du sous-bloc"/><span>{sceneBg.mediaUrl.split("/").at(-1)}</span>{editable&&<IconButton icon="close" label="Retirer l’image de fond" onClick={()=>update(sceneBg.id,{mediaUrl:null})}/>}</div>}{editable&&<div className={styles.mediaPicker}><MediaPicker projectId={p.projectId} value={sceneBg.mediaUrl||""} onChange={url=>update(sceneBg.id,{mediaUrl:url})} label="Choisir une image"/></div>}</>:editable?<button type="button" className={styles.amberOutline} onClick={()=>add("background")}><StudioIcon name="image"/>Choisir une image</button>:<p>Aucun décor</p>}</div>
     {sceneBg&&<details className={styles.animationDetails}><summary>Animations combinées<StudioIcon name="chevron"/></summary><AnimationTrackEditor config={sceneBg.animationConfig} legacy={sceneBg.animationPreset} onChange={config=>update(sceneBg.id,{animationConfig:config})} disabled={!editable}/></details>}
     {p.episodeMode&&p.activeEpisode&&<div className={styles.episodeInfo}><h3>{p.activeEpisode.title}</h3><p>{p.activeEpisode.scenes.length} sous-blocs · {p.activeEpisode.groups.length} blocs</p><button className={styles.amberOutline} onClick={()=>void openScene(p.selectedScene!.id)}>Ouvrir ce sous-bloc<StudioIcon name="chevron"/></button></div>}
     <details className={styles.animationDetails}><summary>Titre du sous-bloc<StudioIcon name="chevron"/></summary><input aria-label="Titre du sous-bloc" className="input" value={p.title.value} onChange={e=>p.title.onChange(e.target.value)} onBlur={()=>void p.title.onSave()} readOnly={!p.canEdit}/></details>{p.canEdit&&<button type="button" className={styles.deleteScene} onClick={()=>void p.onDeleteScene()}><StudioIcon name="trash"/>Supprimer le sous-bloc</button>}
    </>:<p className={styles.empty}>Sélectionnez un sous-bloc pour afficher ses réglages.</p>:selected?<>
     <div className={styles.elementHeading}><h2>{BLOCK_NAMES[selected.type]||selected.type} {String(selected.order+1).padStart(2,"0")}</h2><small>{p.selectedScene?.title}</small></div>
     <SceneBlockItem key={selected.id} block={selected} characters={p.characters} onUpdate={update} onRemove={id=>{remember("remove-"+id);p.onRemoveBlock(id);}} projectId={p.projectId} projectType={p.projectType} inspector playlistMode={selected.type==="music"} canEdit={editable&&!mediaLocked}/>
     {editable&&!mediaLocked&&<div className={styles.elementActions}><button type="button" onClick={()=>add(selected.type)}><StudioIcon name="plus"/>Ajouter après</button><button type="button" onClick={()=>{remember("remove-"+selected.id);p.onRemoveBlock(selected.id);}}><StudioIcon name="trash"/>Supprimer l’élément</button></div>}
     {mediaLocked&&<p className={styles.inlineNote}>Cette piste est verrouillée. Déverrouillez-la dans la timeline pour modifier son contenu.</p>}
     {selected.type!=="music"&&<Link className={styles.controlRead} href={"/project/"+p.projectId+"/read?block="+encodeURIComponent(plan?.lead.id||selected.id)} target="_blank" rel="noreferrer"><StudioIcon name="play"/>Lecture de contrôle</Link>}
    </>:<p className={styles.empty}>Sélectionnez un segment dans la timeline pour modifier son contenu.</p>}
   </div>
  </aside>

  <section ref={timelineRef} className={styles.timeline} aria-label={p.episodeMode?"Timeline de l’épisode":"Timeline du sous-bloc"}>
   <div className={styles.timelineToolbar}>
    <div className={styles.timelineTitle}>{!detailed&&<><StudioIcon name="clock"/><strong>Timeline</strong></>}<span className={detailed?styles.timeBadge:styles.timelineTime}>{p.episodeMode?"Épisode":timeLabel(time,true)}{!p.episodeMode&&!detailed&&<small> / {timeLabel(duration,true)}</small>}</span></div>
    {!p.episodeMode&&<><div className={styles.timelineTools}><IconButton icon="previous" label="Revenir au début" onClick={()=>scrub(0)} disabled={!duration}/><IconButton icon={playing?"pause":"play"} label={playing?"Pause de la timeline":"Lire la timeline"} onClick={togglePlay} disabled={!duration||p.loading}/><IconButton icon="next" label="Aller au dernier plan" onClick={()=>{const last=timing.at(-1);if(last)scrub(last.start);}} disabled={!duration}/><span className={styles.toolDivider}/><span className={styles.selectedTool} title="Sélection des segments"><StudioIcon name="cursor"/></span><IconButton icon="trash" label="Supprimer l’élément sélectionné" onClick={()=>{if(selected){remember("remove-"+selected.id);p.onRemoveBlock(selected.id);}}} disabled={!editable||!selected||mediaLocked}/></div>
    <div className={styles.addControl}>{editable&&<button type="button" className={styles.addElement} aria-expanded={addMenu} aria-label="Ajouter un élément" onClick={()=>setAddMenu(v=>!v)}><StudioIcon name="plus"/>{!detailed&&"Ajouter"}</button>}{addMenu&&<div className={styles.addMenu} aria-label="Types d’éléments">{ADD_TYPES.map(item=><button key={item.type} onClick={()=>add(item.type)}><StudioIcon name={item.icon}/><span>{item.label}<small>{item.hint}</small></span></button>)}<SceneScriptImporter characters={p.characters} existingBlockCount={p.blocks.length} onImport={(blocks,mode)=>{remember("import");p.onImport(blocks,mode);setAddMenu(false);}} compact disabled={!editable}/></div>}</div></>}
    <div className={styles.timelineEnd}>{!p.episodeMode&&<><span className={styles.timingHint} title="Durées indicatives calculées depuis le texte. L’ordre et les couches du scénario sont conservés.">Temps estimés</span><IconButton icon="minus" label="Réduire le zoom" onClick={()=>setZoom(v=>Math.max(.5,v-.25))} disabled={zoom<=.5}/><input type="range" min={.5} max={3} step={.25} aria-label="Zoom de la timeline" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><IconButton icon="plus" label="Augmenter le zoom" onClick={()=>setZoom(v=>Math.min(3,v+.25))} disabled={zoom>=3}/><button type="button" className={styles.fitButton} onClick={()=>setZoom(1)}>Adapter</button></>}<IconButton icon={detailed?"list":"grid"} label="Changer la disposition de la timeline" onClick={()=>chooseLayout(detailed?"compact":"detailed")}/><IconButton icon="expand" label="Timeline en plein écran" onClick={()=>void fullscreen(timelineRef.current)}/></div>
   </div>
   {p.episodeMode?<div className={styles.episodeTimeline}>{p.activeEpisode?.scenes.map((s,i)=><button type="button" key={s.id} aria-pressed={s.id===p.selectedScene?.id} onClick={()=>void openScene(s.id)}><span>{String(i+1).padStart(2,"0")} · {s.node?.title||"Sans bloc"}</span><strong>{s.title}</strong><small>{s._count.blocks} éléments</small></button>)}{!p.activeEpisode?.scenes.length&&<p className={styles.empty}>Cet épisode ne contient pas encore de sous-bloc.</p>}</div>:p.loading?<p className={styles.empty}>Chargement de la timeline…</p>:p.loadError?<div className={styles.empty} role="alert">{p.loadError}<button onClick={p.onRetry}>Réessayer</button></div>:<StudioTimeline blocks={p.blocks} plans={plans} timing={timing} detailed={detailed} selectedId={p.selectedBlockId} onSelect={select} onScrub={scrub} time={time} duration={duration} zoom={zoom} backdrop={backdrop} hidden={hiddenTracks} locked={lockedTracks} onToggleTrack={toggleTrack} canEdit={editable} onAdd={add} onReorderPlans={event=>{remember("reorder");p.onReorderPlans(event);}} onReorderMusic={event=>{remember("reorder-music");p.onReorderMusic(event);}}/>}
  </section>
  {(p.saveError||p.navigationError||fullscreenError||audioError)&&<div className={styles.errorNotice} role="alert">{p.saveError||p.navigationError||fullscreenError||audioError}{p.saveError&&<button type="button" onClick={()=>void saveAll()}>Réessayer</button>}</div>}
  {!detailed&&<span className={styles.saveStatus} role="status">{state}{p.onlineCount>0&&" · "+p.onlineCount+" en ligne"}</span>}
 </div>;
}

export function IconButton({icon,label,className="",...props}:{icon:StudioIconName;label:string;className?:string}&React.ButtonHTMLAttributes<HTMLButtonElement>){
 return <button type="button" className={styles.iconButton+" "+className} title={label} aria-label={label} {...props}><StudioIcon name={icon}/></button>;
}
