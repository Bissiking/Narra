"use client";
import { useEffect, useRef, useState, useMemo, type CSSProperties } from "react";
import { DndContext, DragOverlay, closestCenter, pointerWithin, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SceneBlock } from "./editor-workspace";
import type { CompositePlan } from "@/lib/scene-composition";
import StudioIcon, { type StudioIconName } from "./studio-v2-icons";
import FloatingMenu from "@/components/ui/floating-menu";
import { canConvertTimelineBlock, timelineTypeForTrack, timelineLayout, timelineClip, type TimelineZoom } from "@/lib/studio-timeline";
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
 onSelect:(id:string)=>void;onScrub:(time:number)=>void;time:number;duration:number;zoom:TimelineZoom;backdrop:string|null|undefined;
 onAdd:(type:string)=>void;hidden:string[];locked:string[];onToggleTrack:(key:string,kind:"hidden"|"locked")=>void;canEdit:boolean;
 onConvert:(id:string,type:string)=>void;
 onReorderPlans:(event:DragEndEvent)=>void;onReorderMusic:(event:DragEndEvent)=>void;
}
const trackKeyboardCoordinates:KeyboardCoordinateGetter = (event, {context, currentCoordinates}) => {
 if(!["ArrowLeft","ArrowRight"].includes(event.code)||!context.active||!context.collisionRect)return;
 event.preventDefault();
 const track=context.active.data.current?.track;
 const candidates=context.droppableContainers.getEnabled().filter(item=>item.data.current?.track===track&&item.data.current?.blockId).sort((a,b)=>(context.droppableRects.get(a.id)?.left||0)-(context.droppableRects.get(b.id)?.left||0));
 const index=candidates.findIndex(item=>item.id===(context.over?.id||context.active?.id));
 const target=candidates[index+(event.code==="ArrowRight"?1:-1)];
 const rect=target&&context.droppableRects.get(target.id);
 if(rect)return {x:currentCoordinates.x+rect.left-context.collisionRect.left,y:currentCoordinates.y+rect.top-context.collisionRect.top};
};
const names:Record<string,string>={heading:"Plan",action:"Action",dialogue:"Dialogue",narration:"Narration",background:"Décor",music:"Musique",sfx:"Effet sonore",note:"Note interne",transition:"Transition"};
export default function StudioTimeline(p:Props) {
 const [adding,setAdding]=useState(false);
 const [dragged,setDragged]=useState<string|null>(null);
 const addAnchor=useRef<HTMLButtonElement>(null);
 const viewport=useRef<HTMLDivElement>(null);
 const labelRef=useRef<HTMLDivElement>(null);
 const [{available,labelWidth},setViewportMetrics]=useState({available:1100,labelWidth:216});
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:trackKeyboardCoordinates}));
 useEffect(()=>{
  const element=viewport.current;if(!element)return;
  const measure=()=>{const labelWidth=labelRef.current?.offsetWidth||216;const available=Math.max(1,element.clientWidth-labelWidth);setViewportMetrics(current=>current.available===available&&current.labelWidth===labelWidth?current:{available,labelWidth});};
  const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect();
 },[]);
 const {extent,scale,width,tick}=timelineLayout(p.duration,available,p.zoom);
 const ticks=Array.from({length:Math.floor(extent/tick)+1},(_,i)=>i*tick);
 useEffect(()=>{
  const element=viewport.current;if(!element||dragged)return;
  if(p.zoom==="fit"){element.scrollLeft=0;return;}
  const x=p.time*scale,margin=Math.min(48,available*.1);
  if(x<element.scrollLeft+margin||x>element.scrollLeft+available-margin)element.scrollLeft=Math.max(0,x-available*.35);
 },[p.time,p.selectedId,p.zoom,scale,available,dragged]);
 const tracks=p.detailed?[
  {key:"video",label:"Vidéo",icon:"video"},{key:"dialogue",label:"Dialogue",icon:"dialogue"},{key:"action",label:"Action",icon:"action"},
  {key:"background",label:"Arrière-plan",icon:"image"},{key:"music",label:"Musique",icon:"music"},{key:"sfx",label:"Effets sonores",icon:"sfx"},{key:"note",label:"Note interne",icon:"note"}
 ]:[{key:"video",label:"Plans visuels",icon:"video"},{key:"dialogue",label:"Dialogues",icon:"dialogue"},{key:"music",label:"Musique",icon:"music"},{key:"sfx",label:"Effets sonores",icon:"sfx"},{key:"note",label:"Notes internes",icon:"note"}];
 const blockTimes=useMemo(()=>new Map(p.plans.flatMap((plan,index)=>plan.blocks.map(block=>[block.id,p.timing[index]] as const))),[p.plans,p.timing]);
 const blockTime=(block:SceneBlock)=>blockTimes.get(block.id)||{start:0,end:3,duration:3};
 const thumbnails=useMemo(()=>{let image=p.backdrop;return p.plans.map(plan=>{for(const block of plan.blocks)if(block.type==="background"&&block.mediaUrl)image=block.mediaUrl;return image;});},[p.plans,p.backdrop]);
 const positioned=(slot:Timing):CSSProperties=>timelineClip(slot.start,slot.duration,scale);
 function rowClips(key:string) {
  if(key==="video")return <SortableContext items={p.plans.map(plan=>plan.id)} strategy={horizontalListSortingStrategy}>{p.plans.map((plan,i)=><PlanSegment key={plan.id} plan={plan} index={i} slot={p.timing[i]} selected={plan.blocks.some(b=>b.id===p.selectedId)} onSelect={p.onSelect} style={positioned(p.timing[i])} thumbnail={thumbnails[i]} disabled={!p.canEdit||p.locked.includes("video")||p.locked.includes(plan.lead.type)}/>)}</SortableContext>;
  if(key==="music") {
   const music=p.blocks.filter(b=>b.type==="music");
   return <SortableContext items={music.map(b=>b.id)} strategy={horizontalListSortingStrategy}>{music.map((b,i)=>{const length=(p.duration||3)/music.length;return <MusicSegment key={b.id} block={b} style={positioned({start:i*length,end:(i+1)*length,duration:length})} selected={b.id===p.selectedId} onSelect={p.onSelect} disabled={!p.canEdit||p.locked.includes("music")}/>;})}</SortableContext>;
  }
  const clips=p.blocks.filter(b=>key==="dialogue"?["dialogue","narration"].includes(b.type):key==="action"?["action","heading","transition"].includes(b.type):b.type===key);
  return <SortableContext items={clips.map(b=>b.id)} strategy={horizontalListSortingStrategy}>{clips.map(block=>{
   const slot=blockTime(block);
   let length=slot.duration;
   if(key==="background"){const next=p.blocks.filter(b=>b.type==="background"&&blockTime(b).start>slot.start).sort((a,b)=>blockTime(a).start-blockTime(b).start)[0];length=(next?blockTime(next).start:p.duration||slot.end)-slot.start;}
   return <ElementSegment key={block.id} block={block} track={key} selected={p.selectedId===block.id} onSelect={p.onSelect} style={positioned({...slot,duration:length})} disabled={!p.canEdit||p.locked.includes(key)||p.locked.includes(block.type)||p.locked.includes("video")} />;
  })}</SortableContext>;

 }
 function drop(event:DragEndEvent) {
  setDragged(null);
  if(!p.canEdit||!event.over)return;
  const data=event.active.data.current, target=event.over.data.current;
  const block=p.blocks.find(b=>b.id===data?.blockId);
  if(!block||!target?.track||p.locked.includes(data?.track)||p.locked.includes(block.type)||p.locked.includes(target.track))return;
  if(data?.track!==target.track) {
   const type=timelineTypeForTrack(target.track);
   if(type&&canConvertTimelineBlock(block.type,type)&&!p.locked.includes(type)&&!p.locked.includes("video"))p.onConvert(block.id,type);
   return;
  }
  if(event.active.id===event.over.id||!target.blockId)return;
  if(data?.track==="music")p.onReorderMusic(event);
  else if(!p.locked.includes("video")&&data?.track!=="sfx")p.onReorderPlans({...event,active:{...event.active,id:"plan-"+block.id},over:{...event.over,id:"plan-"+target.blockId}});
 }
 return <DndContext sensors={sensors} collisionDetection={args=>{if(!args.pointerCoordinates)return closestCenter({...args,droppableContainers:args.droppableContainers.filter(item=>item.data.current?.track===args.active.data.current?.track&&item.data.current?.blockId)});const hits=pointerWithin(args);return hits.length?(hits.some(hit=>!String(hit.id).startsWith("track-"))?hits.filter(hit=>!String(hit.id).startsWith("track-")):hits):[];}} onDragStart={event=>setDragged(String(event.active.data.current?.blockId||""))} onDragCancel={()=>setDragged(null)} onDragEnd={drop}><div ref={viewport} className={styles.timelineViewport} role="region" aria-label="Pistes de la timeline" tabIndex={0} data-timeline-scale={p.zoom==="fit"?"overview":"readable"}>
  <div className={styles.trackCanvas} style={{"--track-width":width+"px","--playhead":p.time*scale+"px"} as CSSProperties}>
   <div className={styles.rulerRow}><div ref={labelRef} className={styles.rulerLabel}/><div className={styles.ruler} style={{width}}><div className={styles.rulerTicks}>{ticks.map(t=><span key={t} style={{left:t*scale,transform:t*scale>width-72?"translateX(calc(-100% - 3px))":undefined}}>{timeLabel(t)}</span>)}</div><input aria-label="Curseur de la timeline" type="range" min={0} max={extent} step={.01} value={p.time} onChange={e=>p.onScrub(Math.min(p.duration,Number(e.target.value)))} disabled={!p.duration}/><span className={styles.playheadHandle} style={{left:Math.max(5,Math.min(width-5,p.time*scale))}}/></div></div>
   {p.detailed&&p.canEdit&&<div className={styles.inlineAdd} style={{left:labelWidth+Math.min(width-36,(p.timing[p.plans.findIndex(plan=>plan.blocks.some(b=>b.id===p.selectedId))]?.end||p.duration)*scale)}}><button ref={addAnchor} type="button" aria-label="Insérer un élément après le plan" aria-expanded={adding} onClick={()=>setAdding(v=>!v)}><StudioIcon name="plus"/></button>{adding&&<FloatingMenu open={adding} onClose={()=>setAdding(false)} anchor={addAnchor} className={styles.inlineAddMenu}>{[{type:"dialogue",icon:"dialogue",hint:"Ajouter une réplique"},{type:"action",icon:"action",hint:"Ajouter une action"},{type:"background",icon:"image",hint:"Ajouter un décor"},{type:"music",icon:"music",hint:"Ajouter une musique"},{type:"sfx",icon:"sfx",hint:"Ajouter un effet sonore"},{type:"note",icon:"note",hint:"Ajouter une note"}].map(item=><button type="button" key={item.type} onClick={()=>{p.onAdd(item.type);setAdding(false);}}><StudioIcon name={item.icon as StudioIconName}/><span>{names[item.type]}<small>{item.hint}</small></span></button>)}</FloatingMenu>}</div>}
   {tracks.map(track=><TrackRow key={track.key} track={track.key} hidden={p.hidden.includes(track.key)} disabled={!p.canEdit||p.locked.includes(track.key)}>
    <div className={styles.trackLabel}><StudioIcon name={track.icon as StudioIconName}/><span>{track.label}</span><div>{p.detailed&&<button type="button" title={p.hidden.includes(track.key)?"Afficher la piste":"Masquer la piste"} aria-label={(p.hidden.includes(track.key)?"Afficher ":"Masquer ")+track.label} aria-pressed={p.hidden.includes(track.key)} onClick={()=>p.onToggleTrack(track.key,"hidden")}><StudioIcon name={p.hidden.includes(track.key)?"hidden":"eye"}/></button>}<button type="button" title={p.locked.includes(track.key)?"Déverrouiller la piste":"Verrouiller la piste"} aria-label={(p.locked.includes(track.key)?"Déverrouiller ":"Verrouiller ")+track.label} aria-pressed={p.locked.includes(track.key)} onClick={()=>p.onToggleTrack(track.key,"locked")}><StudioIcon name={p.locked.includes(track.key)?"lock":"unlock"}/></button></div></div>
    <div className={styles.trackLane} style={{width}}>{rowClips(track.key)}<span className={styles.playheadLine}/>{!p.blocks.length&&track.key==="video"&&<span className={styles.emptyLane}>Ajoutez un plan avec le bouton +.</span>}</div>
   </TrackRow>)}
  </div>
 </div><DragOverlay>{dragged&&<div className={styles.dragPreview}>{names[p.blocks.find(b=>b.id===dragged)?.type||""]} · {p.blocks.find(b=>b.id===dragged)?.content || "Élément"}</div>}</DragOverlay></DndContext>;
}
function clipDensity(style:CSSProperties){const width=Number(style.width);return width<60?"overview":width<160?"compact":"full";}
function PlanSegment({plan,index,slot,selected,onSelect,style,thumbnail,disabled}:{plan:CompositePlan<SceneBlock>;index:number;slot:Timing;selected:boolean;onSelect:(id:string)=>void;style:CSSProperties;thumbnail:string|null|undefined;disabled:boolean}) {
 const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:plan.id,disabled,data:{track:"video",blockId:plan.lead.id}});
 return <button ref={setNodeRef} type="button" style={{...style,transform:CSS.Transform.toString(transform),transition,zIndex:isDragging?5:undefined,opacity:isDragging?.3:1}} className={styles.segment+" "+styles.videoSegment} data-density={clipDensity(style)} title={"Plan "+(index+1)+" · "+(plan.lead.content||names[plan.lead.type]||"Sans contenu")} onClick={()=>onSelect(plan.lead.id)} {...attributes} {...listeners} aria-pressed={selected}  aria-label={"Plan "+(index+1)+" · "+(plan.lead.content||names[plan.lead.type]||"Sans contenu")} data-block-id={plan.lead.id}>
  {thumbnail?<img src={thumbnail} alt=""/>:<StudioIcon name={plan.lead.type==="transition"?"layout":"video"}/>}<span><strong>{String(index+1).padStart(2,"0")} · {plan.lead.content||names[plan.lead.type]||"Plan sans contenu"}</strong><small>{timeLabel(slot.start)} – {timeLabel(slot.end)}</small></span><em>{slot.duration.toFixed(1)}s</em>
 </button>;
}
function MusicSegment({block,style,selected,onSelect,disabled}:{block:SceneBlock;style:CSSProperties;selected:boolean;onSelect:(id:string)=>void;disabled:boolean}) {
 const {attributes,listeners,setNodeRef,transform,transition}=useSortable({id:block.id,disabled,data:{track:"music",blockId:block.id}});
 return <button ref={setNodeRef} type="button" style={{...style,transform:CSS.Transform.toString(transform),transition}} className={styles.segment+" "+styles.musicSegment} data-density={clipDensity(style)} title={block.content||block.mediaUrl?.split("/").at(-1)||"Musique"} onClick={()=>onSelect(block.id)} {...attributes} {...listeners} aria-pressed={selected}  data-block-id={block.id}><StudioIcon name="music"/><span>{block.content||block.mediaUrl?.split("/").at(-1)||"Choisir une musique"}</span>{block.mediaUrl&&<AudioWaveform url={block.mediaUrl}/>}</button>;
}
function TrackRow({track,hidden,disabled,children}:{track:string;hidden:boolean;disabled:boolean;children:React.ReactNode}) {
 const {setNodeRef,isOver}=useDroppable({id:"track-"+track,data:{track},disabled});
 return <div ref={setNodeRef} className={styles.trackRow} data-track={track} data-hidden={hidden} data-drop-over={isOver}>{children}</div>;
}
function ElementSegment({block,track,selected,onSelect,style,disabled}:{block:SceneBlock;track:string;selected:boolean;onSelect:(id:string)=>void;style:CSSProperties;disabled:boolean}) {
 const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:block.id,disabled,data:{track,blockId:block.id}});
 return <button ref={setNodeRef} type="button" {...attributes} {...listeners} className={styles.segment+" "+styles[track+"Segment"]} data-density={clipDensity(style)} style={{...style,transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.3:1}} aria-pressed={selected} onClick={()=>onSelect(block.id)} title={(names[block.type]||block.type)+" · "+(block.content||"Sans contenu")} data-block-id={block.id}><StudioIcon name={track==="dialogue"?"dialogue":track==="background"?"image":track==="note"?"note":track==="sfx"?"sfx":"action"}/><span>{block.content||block.mediaUrl?.split("/").at(-1)||names[block.type]}</span>{track==="sfx"&&block.mediaUrl&&<AudioWaveform url={block.mediaUrl}/>}</button>;
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
