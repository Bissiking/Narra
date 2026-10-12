"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SceneBlock } from "./editor-workspace";
import type { CompositePlan } from "@/lib/scene-composition";
import StudioIcon, { type StudioIconName } from "./studio-v2-icons";
import styles from "./studio-v2.module.css";

export interface Timing {start:number;end:number;duration:number}
export function buildTiming(plans:CompositePlan<SceneBlock>[]):Timing[] {
 let start=0;
 return plans.map(plan=>{
  const words=plan.lead.content.trim().split(/\s+/).filter(Boolean).length;
  const duration=Math.max(3,Math.min(20,Math.ceil(words/2.6)));
  const slot={start,end:start+duration,duration};start=slot.end;return slot;
 });
}
export function timeLabel(value:number,frames=false) {
 const seconds=Math.max(0,value), minutes=Math.floor(seconds/60);
 const label=String(minutes).padStart(2,"0")+":"+String(Math.floor(seconds%60)).padStart(2,"0");
 return frames?label+":"+String(Math.floor((seconds%1)*25)).padStart(2,"0"):label;
}
interface Props {
 blocks:SceneBlock[];plans:CompositePlan<SceneBlock>[];timing:Timing[];detailed:boolean;selectedId:string|null;
 onSelect:(id:string)=>void;onScrub:(time:number)=>void;time:number;duration:number;zoom:number;backdrop:string|null|undefined;
 onAdd:(type:string)=>void;hidden:string[];locked:string[];onToggleTrack:(key:string,kind:"hidden"|"locked")=>void;canEdit:boolean;
 onReorderPlans:(event:DragEndEvent)=>void;onReorderMusic:(event:DragEndEvent)=>void;
}
const names:Record<string,string>={heading:"Plan",action:"Action",dialogue:"Dialogue",narration:"Narration",background:"Décor",music:"Musique",sfx:"Effet sonore",note:"Note interne",transition:"Transition"};
export default function StudioTimeline(p:Props) {
 const [adding,setAdding]=useState(false);
 const viewport=useRef<HTMLDivElement>(null);
 const [available,setAvailable]=useState(1100);
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 useEffect(()=>{const element=viewport.current;if(!element)return;const observer=new ResizeObserver(()=>setAvailable(Math.max(400,element.clientWidth-(innerWidth<640?148:216))));observer.observe(element);return()=>observer.disconnect();},[]);
 const extent=Math.max(20,p.duration);
 const scale=available/extent*p.zoom;
 const width=extent*scale;
 const tick=extent>60?10:extent>30?5:2;
 const ticks=Array.from({length:Math.floor(extent/tick)+1},(_,i)=>i*tick);
 const tracks=p.detailed?[
  {key:"video",label:"Vidéo",icon:"video"},{key:"dialogue",label:"Dialogue",icon:"dialogue"},{key:"action",label:"Action",icon:"action"},
  {key:"background",label:"Arrière-plan",icon:"image"},{key:"music",label:"Musique",icon:"music"},{key:"sfx",label:"Effets sonores",icon:"sfx"},{key:"note",label:"Note interne",icon:"note"}
 ]:[{key:"video",label:"Plans visuels",icon:"video"},{key:"dialogue",label:"Dialogues",icon:"dialogue"},{key:"music",label:"Musique",icon:"music"},{key:"sfx",label:"Effets sonores",icon:"sfx"},{key:"note",label:"Notes internes",icon:"note"}];
 const blockTime=(block:SceneBlock)=>{const i=p.plans.findIndex(plan=>plan.blocks.some(b=>b.id===block.id));return p.timing[Math.max(0,i)] || {start:0,end:3,duration:3};};
 const thumbnail=(index:number)=>p.plans.slice(0,index+1).flatMap(plan=>plan.blocks).reverse().find(b=>b.type==="background"&&b.mediaUrl)?.mediaUrl||p.backdrop;
 const positioned=(slot:Timing):CSSProperties=>({left:slot.start*scale,width:Math.max(22,slot.duration*scale-4)});
 function rowClips(key:string) {
  if(key==="video")return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={p.onReorderPlans}><SortableContext items={p.plans.map(plan=>plan.id)} strategy={horizontalListSortingStrategy}>{p.plans.map((plan,i)=><PlanSegment key={plan.id} plan={plan} index={i} slot={p.timing[i]} selected={plan.blocks.some(b=>b.id===p.selectedId)} onSelect={p.onSelect} style={positioned(p.timing[i])} thumbnail={thumbnail(i)} disabled={!p.canEdit||p.locked.includes("video")||p.locked.includes(plan.lead.type)}/>)}</SortableContext></DndContext>;
  if(key==="music") {
   const music=p.blocks.filter(b=>b.type==="music");
   return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={p.onReorderMusic}><SortableContext items={music.map(b=>b.id)} strategy={horizontalListSortingStrategy}>{music.map((b,i)=>{const length=(p.duration||3)/music.length;return <MusicSegment key={b.id} block={b} style={positioned({start:i*length,end:(i+1)*length,duration:length})} selected={b.id===p.selectedId} onSelect={p.onSelect} disabled={!p.canEdit||p.locked.includes("music")}/>;})}</SortableContext></DndContext>;
  }
  return p.blocks.filter(b=>key==="dialogue"?["dialogue","narration"].includes(b.type):key==="action"?["action","heading","transition"].includes(b.type):b.type===key).map(block=>{
   const slot=blockTime(block);
   let length=slot.duration;
   if(key==="background"){const next=p.blocks.filter(b=>b.type==="background"&&blockTime(b).start>slot.start).sort((a,b)=>blockTime(a).start-blockTime(b).start)[0];length=(next?blockTime(next).start:p.duration||slot.end)-slot.start;}
   return <button key={block.id} type="button" className={styles.segment+" "+styles[key+"Segment"]} style={positioned({...slot,duration:length})} aria-pressed={p.selectedId===block.id} onClick={()=>p.onSelect(block.id)} title={(names[block.type]||block.type)+" · "+(block.content||block.mediaUrl?.split("/").at(-1)||"Sans contenu")} data-block-id={block.id}>{["music","sfx"].includes(key)?<><StudioIcon name="sfx"/><span>{block.content||block.mediaUrl?.split("/").at(-1)||"Choisir un son"}</span>{block.mediaUrl&&<AudioWaveform url={block.mediaUrl}/>}</>:<><StudioIcon name={key==="dialogue"?"dialogue":key==="background"?"image":key==="note"?"note":"action"}/><span>{block.content||block.mediaUrl?.split("/").at(-1)||(names[block.type]||"Élément")+" sans contenu"}</span></>}</button>;
  });
 }
 return <div ref={viewport} className={styles.timelineViewport}>
  <div className={styles.trackCanvas} style={{"--track-width":width+"px","--playhead":p.time*scale+"px"} as CSSProperties}>
   <div className={styles.rulerRow}><div className={styles.rulerLabel}/><div className={styles.ruler} style={{width}} onPointerDown={e=>{const bounds=e.currentTarget.getBoundingClientRect();p.onScrub(Math.max(0,Math.min(p.duration,(e.clientX-bounds.left)/scale)));}}><div className={styles.rulerTicks}>{ticks.map(t=><span key={t} style={{left:t*scale}}>{timeLabel(t)}</span>)}</div><input aria-label="Curseur de la timeline" type="range" min={0} max={p.duration||1} step={.01} value={p.time} onChange={e=>p.onScrub(Number(e.target.value))} disabled={!p.duration}/><span className={styles.playheadHandle} style={{left:p.time*scale}}/></div></div>
   {p.detailed&&p.canEdit&&<div className={styles.inlineAdd} style={{left:216+Math.min(width-36,(p.timing[p.plans.findIndex(plan=>plan.blocks.some(b=>b.id===p.selectedId))]?.end||p.duration)*scale)}}><button type="button" aria-label="Insérer un élément après le plan" aria-expanded={adding} onClick={()=>setAdding(v=>!v)}><StudioIcon name="plus"/></button>{adding&&<div className={styles.inlineAddMenu}>{[{type:"dialogue",icon:"dialogue",hint:"Ajouter une réplique"},{type:"action",icon:"action",hint:"Ajouter une action"},{type:"background",icon:"image",hint:"Ajouter un décor"},{type:"music",icon:"music",hint:"Ajouter une musique"},{type:"sfx",icon:"sfx",hint:"Ajouter un effet sonore"},{type:"note",icon:"note",hint:"Ajouter une note"}].map(item=><button type="button" key={item.type} onClick={()=>{p.onAdd(item.type);setAdding(false);}}><StudioIcon name={item.icon as StudioIconName}/><span>{names[item.type]}<small>{item.hint}</small></span></button>)}</div>}</div>}
   {tracks.map(track=><div key={track.key} className={styles.trackRow} data-track={track.key} data-hidden={p.hidden.includes(track.key)}>
    <div className={styles.trackLabel}><StudioIcon name={track.icon as StudioIconName}/><span>{track.label}</span><div>{p.detailed&&<button type="button" title={p.hidden.includes(track.key)?"Afficher la piste":"Masquer la piste"} aria-label={(p.hidden.includes(track.key)?"Afficher ":"Masquer ")+track.label} aria-pressed={p.hidden.includes(track.key)} onClick={()=>p.onToggleTrack(track.key,"hidden")}><StudioIcon name={p.hidden.includes(track.key)?"hidden":"eye"}/></button>}<button type="button" title={p.locked.includes(track.key)?"Déverrouiller la piste":"Verrouiller la piste"} aria-label={(p.locked.includes(track.key)?"Déverrouiller ":"Verrouiller ")+track.label} aria-pressed={p.locked.includes(track.key)} onClick={()=>p.onToggleTrack(track.key,"locked")}><StudioIcon name={p.locked.includes(track.key)?"lock":"unlock"}/></button></div></div>
    <div className={styles.trackLane} style={{width}}>{rowClips(track.key)}<span className={styles.playheadLine}/>{!p.blocks.length&&track.key==="video"&&<span className={styles.emptyLane}>Ajoutez un plan avec le bouton +.</span>}</div>
   </div>)}
  </div>
 </div>;
}
function PlanSegment({plan,index,slot,selected,onSelect,style,thumbnail,disabled}:{plan:CompositePlan<SceneBlock>;index:number;slot:Timing;selected:boolean;onSelect:(id:string)=>void;style:CSSProperties;thumbnail:string|null|undefined;disabled:boolean}) {
 const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:plan.id,disabled});
 return <button ref={setNodeRef} type="button" style={{...style,transform:CSS.Transform.toString(transform),transition,zIndex:isDragging?5:undefined}} className={styles.segment+" "+styles.videoSegment} onClick={()=>onSelect(plan.lead.id)} {...attributes} {...listeners} aria-pressed={selected} aria-disabled={false} aria-label={"Plan "+(index+1)+" · "+(plan.lead.content||names[plan.lead.type]||"Sans contenu")} data-block-id={plan.lead.id}>
  {thumbnail?<img src={thumbnail} alt=""/>:<StudioIcon name={plan.lead.type==="transition"?"layout":"video"}/>}<span><strong>{String(index+1).padStart(2,"0")} · {plan.lead.content||names[plan.lead.type]||"Plan sans contenu"}</strong><small>{timeLabel(slot.start)} – {timeLabel(slot.end)}</small></span><em>{slot.duration.toFixed(1)}s</em>
 </button>;
}
function MusicSegment({block,style,selected,onSelect,disabled}:{block:SceneBlock;style:CSSProperties;selected:boolean;onSelect:(id:string)=>void;disabled:boolean}) {
 const {attributes,listeners,setNodeRef,transform,transition}=useSortable({id:block.id,disabled});
 return <button ref={setNodeRef} type="button" style={{...style,transform:CSS.Transform.toString(transform),transition}} className={styles.segment+" "+styles.musicSegment} onClick={()=>onSelect(block.id)} {...attributes} {...listeners} aria-pressed={selected} aria-disabled={false} data-block-id={block.id}><StudioIcon name="music"/><span>{block.content||block.mediaUrl?.split("/").at(-1)||"Choisir une musique"}</span>{block.mediaUrl&&<AudioWaveform url={block.mediaUrl}/>}</button>;
}
const waveformCache=new Map<string,number[]>();
function AudioWaveform({url}:{url:string}) {
 const [peaks,setPeaks]=useState<number[]|null>(waveformCache.get(url)||null);
 useEffect(()=>{
  let active=true;const abort=new AbortController();
  const cached=waveformCache.get(url);if(cached){setPeaks(cached);return;}
  setPeaks(null);
  void (async()=>{
   let context:AudioContext|undefined;
   try{
    const response=await fetch(url,{signal:abort.signal});if(!response.ok)return;
    const buffer=await response.arrayBuffer();if(buffer.byteLength>45_000_000||!active)return;
    context=new AudioContext();const decoded=await context.decodeAudioData(buffer);const channel=decoded.getChannelData(0);
    const samples=180,step=Math.max(1,Math.floor(channel.length/samples));const result=Array.from({length:samples},(_,i)=>{let max=0;for(let j=i*step;j<Math.min(channel.length,(i+1)*step);j+=Math.max(1,Math.floor(step/60)))max=Math.max(max,Math.abs(channel[j]));return max;});
    if(waveformCache.size>30)waveformCache.delete(waveformCache.keys().next().value!);
    waveformCache.set(url,result);if(active)setPeaks(result);
   }catch{}finally{await context?.close().catch(()=>undefined);}
  })();
  return()=>{active=false;abort.abort();};
 },[url]);
 if(!peaks)return null;
 const path=peaks.map((peak,i)=>"M"+i+" "+(20-peak*18)+"V"+(20+peak*18)).join(" ");
 return <svg className={styles.waveform} viewBox="0 0 180 40" preserveAspectRatio="none" aria-hidden="true"><path d={path}/></svg>;
}
