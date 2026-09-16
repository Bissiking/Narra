"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MediaPicker from "@/components/media-picker";
import { fallbackBlockLabels, getEditorProfile, type EditorBlockType } from "@/lib/editor-profiles";
import editorStyles from "./scene-block-item.module.css";

interface Character {
  id: string;
  firstName: string | null;
  lastName: string | null;
  alias: string | null;
  portraitUrl: string | null;
  nameColor?: string;
  images?: { id: string; label: string; emotion: string; url: string }[];
}

interface SceneBlock {
  id: string;
  type: string;
  content: string;
  order: number;
  characterId: string | null;
  emotion: string | null;
  position: string | null;
  speakerNote?: string | null;
  mediaUrl?: string | null;
  displayMode?: "solo" | "caption" | "layer" | null;
  showPortrait?: boolean | null;
  portraitImageUrl?: string | null;
  audioAction?: string | null;
  volume?: number | null;
  fadeDuration?: number | null;
  loop?: boolean | null;
}

interface SceneBlockItemProps {
  block: SceneBlock;
  characters: Character[];
  onUpdate: (id: string, updates: Partial<SceneBlock>) => void;
  onRemove: (id: string) => void;
  onInsertAfter?: (type: string, afterId: string) => void;
  onSelect?: (id: string) => void;
  selected?: boolean;
  projectId?: string;
  projectType?: string;
  inspector?: boolean;
  playlistMode?: boolean;
}

function SceneBlockItem({
  block,
  characters,
  onUpdate,
  onRemove,
  onInsertAfter,
  onSelect,
  selected = false,
  projectId,
  projectType = "story",
  inspector = false,
  playlistMode = false,
}: SceneBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: inspector });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const speakingCharacter = characters.find((character) => character.id === block.characterId);
  const expressionImage = speakingCharacter?.images?.find(
    (image) => image.emotion === block.emotion
  );
  const showPortrait = block.showPortrait !== false;
  const selectedPortraitUrl = block.portraitImageUrl || expressionImage?.url || speakingCharacter?.portraitUrl || "";
  const isAudioBlock = block.type === "music" || block.type === "sfx";
  const isBackgroundBlock = block.type === "background";
  const backgroundDisplayMode = block.displayMode || (block.content.trim() ? "caption" : "solo");
  const audioAction = block.type === "music" ? block.audioAction || "play" : "play";
  const profile = getEditorProfile(projectType);
  const knownCurrentType = profile.blocks.some((type) => type.value === block.type);
  const blockTypes = knownCurrentType
    ? profile.blocks
    : [
        ...profile.blocks,
        {
          value: block.type as EditorBlockType,
          label: fallbackBlockLabels[block.type as EditorBlockType] || block.type,
          shortLabel: fallbackBlockLabels[block.type as EditorBlockType] || block.type,
        },
      ];

  return (
    <div
      ref={setNodeRef}
      id={`scene-block-${block.id}`}
      data-scene-block-id={block.id}
      data-block-type={block.type}
      style={style}
      onFocusCapture={() => onSelect?.(block.id)}
      className={`${editorStyles.root} ${editorStyles[profile.key]} ${inspector ? editorStyles.inspector : "card p-4"} group transition-colors ${
        selected ? "border-narra-accent bg-narra-accent/5" : ""
      } ${isDragging ? "opacity-50 border-narra-accent" : ""}`}
    >
      <div className="flex items-start gap-4">
        {!inspector && <div className="flex flex-col gap-1 pt-1">
          <button
            className="min-h-8 min-w-8 cursor-grab touch-none text-xs text-narra-muted opacity-60 transition-opacity hover:text-narra-text hover:opacity-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Déplacer le bloc ${block.order + 1}`}
          >
            ⋮⋮
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="min-h-8 min-w-8 text-xs text-narra-danger opacity-60 transition-opacity hover:opacity-100"
            aria-label={`Supprimer le bloc ${block.order + 1}`}
          >
            ✕
          </button>
        </div>}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-narra-muted" aria-hidden="true">
              #{String(block.order + 1).padStart(3, "0")}
            </span>
            <select
              value={block.type}
              onChange={(event) => onUpdate(block.id, { type: event.target.value })}
              className="border border-narra-border bg-narra-bg px-2 py-1 text-xs text-narra-muted focus:border-narra-accent focus:outline-none"
              aria-label="Type du bloc"
              title="Changer le type du bloc"
            >
              {blockTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <div className="flex-1" />
            {onInsertAfter && (
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) onInsertAfter(event.target.value, block.id);
                  event.target.value = "";
                }}
                className="border border-transparent bg-transparent px-2 py-1 text-xs text-narra-muted hover:border-narra-border hover:text-narra-text focus:border-narra-accent focus:outline-none"
                aria-label={`Insérer un bloc après le bloc ${block.order + 1}`}
              >
                <option value="" disabled>+ Insérer après</option>
                {profile.blocks.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            )}

            {block.type === "dialogue" && (
              <>
                {showPortrait && selectedPortraitUrl && (
                  <img
                    src={selectedPortraitUrl}
                    alt="Aperçu du portrait"
                    className="h-9 w-9 shrink-0 object-cover"
                  />
                )}
                <select
                  value={block.characterId || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__unknown__") {
                      onUpdate(block.id, { characterId: null, speakerNote: "Inconnu", portraitImageUrl: null });
                    } else {
                      onUpdate(block.id, { characterId: val || null, portraitImageUrl: null });
                    }
                  }}
                  className="select text-xs py-1 px-2"
                  style={{ color: speakingCharacter?.nameColor }}
                >
                  <option value="">Personnage...</option>
                  <option value="__unknown__">Inconnu</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.alias || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Personnage sans nom"}
                    </option>
                  ))}
                </select>

                <select
                  value={block.emotion || ""}
                  onChange={(e) =>
                    onUpdate(block.id, { emotion: e.target.value || null, portraitImageUrl: null })
                  }
                  className="select text-xs py-1 px-2"
                >
                  <option value="">Émotion...</option>
                  <option value="neutral">Neutre</option>
                  <option value="happy">Joyeux</option>
                  <option value="sad">Triste</option>
                  <option value="angry">En colère</option>
                  <option value="surprised">Surpris</option>
                  <option value="worried">Inquiet</option>
                </select>
              </>
            )}
          </div>

          {block.type === "dialogue" && (
            <div className="mb-3 border-y border-narra-border bg-narra-bg/50 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="label block">Portrait du dialogue</span>
                  <span className="text-xs text-narra-muted">Choisissez si le personnage apparaît pendant cette réplique.</span>
                </div>
                <label className="flex min-h-8 items-center gap-2 text-sm text-narra-text">
                  <input
                    type="checkbox"
                    checked={showPortrait}
                    onChange={(event) => onUpdate(block.id, { showPortrait: event.target.checked })}
                    className="accent-amber-500"
                  />
                  Afficher le portrait
                </label>
              </div>

              {showPortrait && speakingCharacter && (
                <p className="mt-2 text-xs text-narra-muted">
                  Le portrait suit automatiquement l’émotion sélectionnée, puis utilise le portrait principal par défaut.
                </p>
              )}
            </div>
          )}

          {isAudioBlock && (
            <div className="mb-3 grid gap-3 border-y border-narra-border bg-narra-bg/50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                {block.type === "music" && (
                  <div className="mb-3">
                    <label className="label">Commande</label>
                    <select
                      value={audioAction}
                      onChange={(event) => onUpdate(block.id, { audioAction: event.target.value })}
                      className="select py-1.5 text-xs"
                    >
                      <option value="play">Lire ou remplacer la musique</option>
                      <option value="stop">Arrêter la musique</option>
                    </select>
                  </div>
                )}

                {(block.type === "sfx" || audioAction === "play") && projectId && (
                  <div>
                    <label className="label">Fichier audio</label>
                    <MediaPicker
                      projectId={projectId}
                      value={block.mediaUrl || ""}
                      onChange={(mediaUrl) => onUpdate(block.id, { mediaUrl: mediaUrl || null })}
                      label="Choisir"
                      accept="audio/*"
                    />
                  </div>
                )}
              </div>

              <div className="grid min-w-40 content-start gap-3">
                {(block.type === "sfx" || audioAction === "play") && (
                  <label className="text-xs text-narra-muted">
                    <span className="mb-1 flex justify-between gap-4"><span>Volume</span><strong className="font-mono text-narra-text">{block.volume ?? 100}%</strong></span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={block.volume ?? 100}
                      onChange={(event) => onUpdate(block.id, { volume: Number(event.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </label>
                )}

                {block.type === "music" && (
                  <>
                    <label className="text-xs text-narra-muted">
                      <span className="mb-1 block">Fondu (secondes)</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={block.fadeDuration ?? 1}
                        onChange={(event) => onUpdate(block.id, { fadeDuration: Math.max(0, Math.min(30, Number(event.target.value))) })}
                        className="input py-1.5 text-xs"
                      />
                    </label>
                    {audioAction === "play" && !playlistMode && (
                      <label className="flex min-h-8 items-center gap-2 text-xs text-narra-muted">
                        <input
                          type="checkbox"
                          checked={block.loop ?? true}
                          onChange={(event) => onUpdate(block.id, { loop: event.target.checked })}
                          className="accent-amber-500"
                        />
                        Lire en boucle
                      </label>
                    )}
                    {audioAction === "play" && playlistMode && <p className="text-xs text-narra-muted">La boucle se règle pour toute la playlist depuis la piste Musique.</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {isBackgroundBlock && projectId && (
            <div className="mb-3 border-y border-narra-border bg-narra-bg/50 px-3 py-3">
              <label className="label">Affichage dans le Visual Novel</label>
              <select
                className="select mb-3"
                value={backgroundDisplayMode}
                onChange={(event) => onUpdate(block.id, { displayMode: event.target.value as "solo" | "caption" | "layer" })}
              >
                <option value="solo">Image seule</option>
                <option value="caption">Image + texte</option>
                <option value="layer">Décor du plan (sans écran séparé)</option>
              </select>
              <label className="label">Nouvel arrière-plan</label>
              <MediaPicker
                projectId={projectId}
                value={block.mediaUrl || ""}
                onChange={(mediaUrl) => onUpdate(block.id, { mediaUrl: mediaUrl || null })}
                label="Choisir"
                accept="image/*"
              />
              <p className="mt-2 text-xs text-narra-muted">
                L’image reste affichée jusqu’au prochain changement d’arrière-plan ou à la scène suivante.
              </p>
            </div>
          )}

          {(!isBackgroundBlock || backgroundDisplayMode === "caption") && <textarea
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onInsertAfter) {
                event.preventDefault();
                onInsertAfter(block.type, block.id);
              }
            }}
            className={`w-full bg-transparent border-none focus:outline-none resize-none ${
              block.type === "heading"
                ? "text-xl font-bold"
                : block.type === "dialogue"
                ? "font-serif"
                : ""
            }`}
            rows={block.content.split("\n").length + 1}
            placeholder={
              isAudioBlock
                ? "Note facultative pour ce son..."
                : isBackgroundBlock
                ? "Texte affiché sur l’image..."
                : block.type === "dialogue"
                ? profile.key === "comic" ? "Texte de la bulle..." : "Le dialogue..."
                : block.type === "heading"
                ? profile.key === "screenplay" ? "INT. / EXT. — LIEU — JOUR / NUIT" : "Titre..."
                : block.type === "action" && profile.key === "comic"
                ? "Décrivez la composition et l’action de la case..."
                : profile.key === "manuscript"
                ? "Continuez le récit..."
                : "Écrivez ici..."
            }
            title={onInsertAfter ? "Ctrl + Entrée : insérer un bloc du même type après celui-ci" : undefined}
          />}
        </div>
      </div>
    </div>
  );
}

export default memo(SceneBlockItem);
