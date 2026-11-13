"use client";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Scene } from "./editor-workspace";
import StudioIcon from "./studio-v2-icons";
import styles from "./studio-v2.module.css";

interface Props {
  groups: {id:string;title:string;scenes:Scene[]}[]; selectedId:string|null; detailed:boolean;
  canEdit:boolean; moving:boolean; selectedBackdrop?:string|null;
  onOpen:(id:string)=>void; onSettings:(id:string)=>void; onReorder:(id:string,target:string)=>void;
}
export default function StudioSceneLibrary(p:Props) {
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  return <DndContext sensors={sensors} collisionDetection={args=>closestCenter({...args,droppableContainers:args.droppableContainers.filter(item=>item.data.current?.scope===args.active.data.current?.scope)})} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)p.onReorder(String(active.id),String(over.id));}}>
    {p.groups.map((group,index)=><details key={group.id} open={index===0||group.scenes.some(scene=>scene.id===p.selectedId)} className={styles.season}>
      <summary><StudioIcon name="chevron"/><span>{group.title}</span><small>{group.scenes.length} sous-bloc{group.scenes.length!==1?"s":""}</small></summary>
      <SortableContext items={group.scenes.map(scene=>scene.id)} strategy={verticalListSortingStrategy}>{group.scenes.map((scene,i)=><SceneRow key={scene.id} scene={scene} index={i} props={p}/>)}</SortableContext>
    </details>)}
  </DndContext>;
}
function SceneRow({scene,index,props:p}:{scene:Scene;index:number;props:Props}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:scene.id,disabled:!p.canEdit||p.moving,data:{scope:scene.node?.id||"unassigned"}});
  const thumbnail=(scene.id===p.selectedId?p.selectedBackdrop:null)||scene.blocks?.[0]?.mediaUrl||scene.location?.imageUrl;
  return <div ref={setNodeRef} className={styles.sceneRow} data-library-scene={scene.id} data-selected={scene.id===p.selectedId} style={{transform:CSS.Transform.toString(transform),transition,position:"relative",zIndex:isDragging?2:undefined,opacity:isDragging?.6:1}}>
    {p.canEdit&&<button type="button" {...attributes} {...listeners} disabled={p.moving} className={styles.sceneGrip} aria-label={"Ordonner "+scene.title}><StudioIcon name="grip"/></button>}
    <button type="button" className={styles.sceneButton} onClick={()=>p.onOpen(scene.id)} aria-current={scene.id===p.selectedId?"true":undefined}>
      <span className={styles.sceneThumb}>{thumbnail?<img src={thumbnail} alt=""/>:<StudioIcon name="image"/>}{p.detailed&&<small>{scene._count.blocks} él.</small>}</span><span className={styles.sceneNumber}>{String(index+1).padStart(2,"0")}</span><span className={styles.sceneName}><strong>{scene.title}</strong><small>{scene.readerTitle||scene.node?.title||"Sans séquence"}</small></span>{!p.detailed&&<small className={styles.sceneElements}>{scene._count.blocks} él.</small>}
    </button>
    <button type="button" className={styles.sceneMore} onClick={()=>p.onSettings(scene.id)} aria-label={"Réglages de "+scene.title}><StudioIcon name="more"/></button>
  </div>;
}
