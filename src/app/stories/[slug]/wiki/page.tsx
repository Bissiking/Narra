import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedStory, storyCharacterName } from "@/lib/public-story";
import StoryNav from "@/components/story/story-nav";
import styles from "@/components/story/story-shell.module.css";

export const dynamic = "force-dynamic";
export default async function WikiPage({ params }: { params: { slug: string } }) {
  const story = await getPublishedStory(params.slug); if (!story) notFound();
  return <div className={styles.shell} style={{ "--story-accent": story.pageAccentColor } as React.CSSProperties}><StoryNav slug={story.slug} name={story.name} accent={story.pageAccentColor}/><main className={styles.wiki}>
    <header className={styles.wikiHead}><h1>Wiki de<br/>{story.name}</h1><p>Personnages, alliances et repères de l’univers. Les fiches évoluent au fil de l’histoire.</p></header>
    {story.characters.length ? <div className={styles.wikiGrid}>{story.characters.map((character) => { const name=storyCharacterName(character); return <Link key={character.id} href={`/stories/${story.slug}/wiki/characters/${character.id}`} className={styles.wikiCard}>{character.portraitUrl ? <img src={character.portraitUrl} alt=""/> : <span className={styles.letter}>{name.charAt(0)}</span>}<div className={styles.wikiCardContent}><h2>{name}</h2><p>{character.role || character.description || "Fiche personnage"}</p></div></Link>;})}</div> : <section className={styles.section}><h2>Le wiki se construit</h2><p>Les premières fiches de personnages seront bientôt publiées.</p></section>}
  </main></div>;
}
