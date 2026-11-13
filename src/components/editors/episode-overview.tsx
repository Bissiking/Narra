"use client";

import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import HelpPopup from "@/components/ui/help-popup";
import type { StudioEpisode, StudioGroup, StudioScene } from "@/lib/studio-navigation";
import styles from "./episode-overview.module.css";

export interface EpisodeScene extends StudioScene {
  status: string; wordCount: number; location: {imageUrl?: string | null; name: string} | null;
  _count: {blocks: number};
}
export const STATUS_LABELS: Record<string, string> = {draft: "Brouillon", writing: "En cours", review: "À vérifier", final: "Terminé"};
interface Props {
  episode: StudioEpisode<EpisodeScene>; selectedId: string | null;
  onSelect: (id: string) => void; onOpen: (id: string) => void;
  onReorder?: (sceneId: string, targetId: string) => void;
  onMove: (sceneId: string, direction: -1 | 1) => void; canEdit: boolean; moving: boolean;
}
function FolderIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5h6l2 2h10v13H3z" /></svg>; }

function ArrowRightIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>; }
function SceneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM14 3v5h4M9 12h6M9 16h6" /></svg>; }
function Arrow({up = false}: {up?: boolean}) { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={up ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} /></svg>; }

export default function EpisodeOverview(props: Props) {
  const {episode, selectedId, onSelect, onOpen, onMove, canEdit, moving} = props;
  function group(g: StudioGroup<EpisodeScene>, depth = 0): React.ReactNode {
    return <section key={g.id} className={styles.episodeGroup} style={{marginLeft: depth ? '1rem' : undefined}}>
      <h3><FolderIcon />{g.title}<span>{g.scenes.length} sous-blocs</span></h3>
      <SortableContext items={g.scenes.map(scene => scene.id)} strategy={verticalListSortingStrategy}>
        {g.scenes.map((scene, i) => <SortableScene key={scene.id} scene={scene} index={i} count={g.scenes.length} props={props} />)}
      </SortableContext>
      {!g.scenes.length && !g.children.length && <p className={styles.groupEmpty}>Ce bloc ne contient aucun sous-bloc.</p>}
      {g.children.map(child => group(child,depth+1))}
    </section>;
  }
  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}), useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}));
  function drop(event: DragEndEvent) { if (event.over && event.active.id !== event.over.id) props.onReorder?.(String(event.active.id), String(event.over.id)); }
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={drop}><section className={styles.episodeOverview} aria-label="Organisation de l’épisode">
    <header><div><h2>{episode.title}</h2><p>{episode.scenes.length} sous-blocs · {episode.scenes.reduce((n,s)=>n+s._count.blocks,0)} éléments narratifs</p></div></header>
    <HelpPopup title="Organisation des sous-blocs"><p>Glissez la poignée d’un sous-bloc pour changer son ordre dans le même bloc. Au clavier, appuyez sur Espace, utilisez les flèches puis Espace pour déposer. Les flèches de déplacement restent disponibles.</p><p>Ouvrez un sous-bloc pour monter ses dialogues, décors et sons.</p></HelpPopup>
    {episode.groups.map(g=>group(g))}
    {!episode.scenes.length && <p className={styles.groupEmpty}>Créez un sous-bloc ou rattachez une scène existante à cet épisode.</p>}
  </section></DndContext>;
}

function SortableScene({scene, index: i, count, props}: {scene: EpisodeScene; index: number; count: number; props: Props}) {
  const {selectedId, onSelect, onOpen, onMove, canEdit, moving} = props;
  const {setNodeRef, attributes, listeners, transform, transition, isDragging} = useSortable({id: scene.id, disabled: !canEdit || moving});
  return <article ref={setNodeRef} data-scene-id={scene.id} className={styles.episodeScene} data-selected={scene.id === selectedId} style={{transform:CSS.Transform.toString(transform), transition, position:"relative", zIndex:isDragging?2:undefined, opacity:isDragging?.65:1}}>
    {canEdit && <button type="button" {...attributes} {...listeners} disabled={moving} className={styles.dragScene} aria-label={"Réorganiser "+scene.title}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h1m4 0h1M9 12h1m4 0h1M9 19h1m4 0h1"/></svg></button>}
    <button type="button" className={styles.sceneSummary} onClick={() => onSelect(scene.id)} aria-pressed={scene.id === selectedId}>
      <span className={styles.sceneThumbnail}>{scene.location?.imageUrl ? <img src={scene.location.imageUrl} alt="" /> : <SceneIcon />}</span>
      <span className={styles.episodeSceneNumber}>{String(i+1).padStart(2,'0')}</span>
      <span><strong>{scene.title}</strong><small>{scene._count.blocks} éléments · {scene.wordCount.toLocaleString('fr-FR')} mots</small></span>
      <span className={styles.sceneStatus} data-status={scene.status}>{STATUS_LABELS[scene.status] || scene.status}</span>
    </button>
    <div className={styles.episodeSceneActions}>
      {canEdit && <><button type="button" disabled={moving || i === 0} aria-label={'Déplacer '+scene.title+' avant'} onClick={() => onMove(scene.id,-1)}><Arrow up /></button><button type="button" disabled={moving || i === count-1} aria-label={'Déplacer '+scene.title+' après'} onClick={() => onMove(scene.id,1)}><Arrow /></button></>}
      <button type="button" onClick={() => onOpen(scene.id)}>Ouvrir <ArrowRightIcon /></button>
    </div>
  </article>;
}
