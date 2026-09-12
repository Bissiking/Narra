import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const STOP_WORDS = new Set(
  `alors au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou par pas pour qu que quelle quelles quel quels qui sa sans se ses si son sur ta te tes toi ton tu un une vos votre vous y à ça était étaient été être comme est sont plus très fait faire puis quand où aussi avait ont cette tout tous toute toutes`.split(" ")
);

const SYNONYMS: Record<string, string[]> = {
  alors: ["à cet instant", "ensuite", "dans ce cas"],
  beau: ["élégant", "saisissant", "harmonieux"],
  dire: ["affirmer", "souffler", "annoncer"],
  faire: ["accomplir", "façonner", "provoquer"],
  grand: ["vaste", "immense", "imposant"],
  marcher: ["avancer", "arpenter", "progresser"],
  parler: ["déclarer", "murmurer", "répondre"],
  petit: ["minuscule", "étroit", "modeste"],
  prendre: ["saisir", "emporter", "choisir"],
  regarder: ["observer", "dévisager", "contempler"],
  sentir: ["percevoir", "éprouver", "pressentir"],
  sourire: ["esquisser un sourire", "rayonner", "s’illuminer"],
  trouver: ["découvrir", "repérer", "atteindre"],
  voir: ["apercevoir", "distinguer", "remarquer"],
  vouloir: ["désirer", "souhaiter", "chercher à"],
};

function normalizeWord(word: string) {
  return word.toLocaleLowerCase("fr").replace(/[’']/g, "'");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const minimum = Math.max(
    2,
    Math.min(50, Number(new URL(request.url).searchParams.get("minimum")) || 3)
  );

  try {
    const [nodes, scenes] = await Promise.all([
      db.narrativeNode.findMany({
        where: { projectId: params.projectId, deletedAt: null },
        select: { id: true, parentId: true, type: true, title: true, order: true },
      }),
      db.scene.findMany({
        where: { projectId: params.projectId, deletedAt: null },
        select: {
          id: true,
          title: true,
          nodeId: true,
          blocks: { select: { content: true }, orderBy: { order: "asc" } },
        },
      }),
    ]);

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const groups = new Map<
      string,
      { episodeId: string | null; episodeTitle: string; order: number; scenes: typeof scenes }
    >();

    for (const scene of scenes) {
      let current = scene.nodeId ? nodeById.get(scene.nodeId) : undefined;
      let root = current;
      let episode = current?.type === "episode" ? current : undefined;
      const visited = new Set<string>();
      while (current?.parentId && !visited.has(current.id)) {
        visited.add(current.id);
        const parent = nodeById.get(current.parentId);
        if (!parent) break;
        current = parent;
        root = parent;
        if (parent.type === "episode") episode = parent;
      }
      const owner = episode || root;
      const key = owner?.id || "unassigned";
      const group = groups.get(key) || {
        episodeId: owner?.id || null,
        episodeTitle: owner?.title || "Sans épisode",
        order: owner?.order ?? Number.MAX_SAFE_INTEGER,
        scenes: [],
      };
      group.scenes.push(scene);
      groups.set(key, group);
    }

    const results = [...groups.values()]
      .sort((a, b) => a.order - b.order || a.episodeTitle.localeCompare(b.episodeTitle, "fr"))
      .map((group) => {
        const counts = new Map<string, { count: number; scenes: Set<string> }>();
        let wordCount = 0;
        for (const scene of group.scenes) {
          const words = scene.blocks
            .map((block) => block.content)
            .join(" ")
            .match(/[\p{L}][\p{L}’'-]*/gu) || [];
          wordCount += words.length;
          for (const rawWord of words) {
            const word = normalizeWord(rawWord);
            if (word.length < 4 || STOP_WORDS.has(word)) continue;
            const item = counts.get(word) || { count: 0, scenes: new Set<string>() };
            item.count += 1;
            item.scenes.add(scene.title);
            counts.set(word, item);
          }
        }

        const repeatedWords = [...counts.entries()]
          .filter(([, value]) => value.count >= minimum)
          .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], "fr"))
          .slice(0, 40)
          .map(([word, value]) => ({
            word,
            count: value.count,
            frequencyPerThousand: wordCount
              ? Math.round((value.count / wordCount) * 1000 * 10) / 10
              : 0,
            scenes: [...value.scenes],
            suggestions: SYNONYMS[word] || [],
          }));

        return {
          episodeId: group.episodeId,
          episodeTitle: group.episodeTitle,
          sceneCount: group.scenes.length,
          wordCount,
          repeatedWords,
        };
      });

    return NextResponse.json({ minimum, episodes: results });
  } catch (error) {
    console.error("Error analyzing repetitions:", error);
    return NextResponse.json({ error: "Impossible d’analyser les répétitions" }, { status: 500 });
  }
}
