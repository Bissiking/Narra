"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
}

interface SceneBlockItemProps {
  block: SceneBlock;
  characters: Character[];
  onUpdate: (id: string, updates: Partial<SceneBlock>) => void;
  onRemove: (id: string) => void;
}

export default function SceneBlockItem({
  block,
  characters,
  onUpdate,
  onRemove,
}: SceneBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const speakingCharacter = characters.find((character) => character.id === block.characterId);
  const expressionImage = speakingCharacter?.images?.find(
    (image) => image.emotion === block.emotion
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-4 group ${isDragging ? "opacity-50 shadow-lg shadow-narra-accent/20 border-narra-accent" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-1 pt-1">
          <button
            className="cursor-grab active:cursor-grabbing text-narra-muted hover:text-narra-text text-xs opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="text-narra-danger hover:text-narra-danger text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge border-narra-border text-narra-muted text-xs">
              {block.type}
            </span>

            {block.type === "dialogue" && (
              <>
                {expressionImage && (
                  <img
                    src={expressionImage.url}
                    alt={expressionImage.label}
                    className="h-9 w-9 shrink-0 object-cover"
                  />
                )}
                <select
                  value={block.characterId || ""}
                  onChange={(e) =>
                    onUpdate(block.id, { characterId: e.target.value || null })
                  }
                  className="select text-xs py-1 px-2"
                  style={{ color: speakingCharacter?.nameColor }}
                >
                  <option value="">Personnage...</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.alias || `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>

                <select
                  value={block.emotion || ""}
                  onChange={(e) =>
                    onUpdate(block.id, { emotion: e.target.value || null })
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

          <textarea
            value={block.content}
            onChange={(e) => onUpdate(block.id, { content: e.target.value })}
            className={`w-full bg-transparent border-none focus:outline-none resize-none ${
              block.type === "heading"
                ? "text-xl font-bold"
                : block.type === "dialogue"
                ? "font-serif"
                : ""
            }`}
            rows={block.content.split("\n").length + 1}
            placeholder={
              block.type === "dialogue"
                ? "Le dialogue..."
                : block.type === "heading"
                ? "Titre..."
                : "Écrivez ici..."
            }
          />
        </div>
      </div>
    </div>
  );
}
