import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryForPreview, storyCharacterName } from "@/lib/public-story";
import StoryNav from "@/components/story/story-nav";
import styles from "@/components/story/story-shell.module.css";

export const dynamic = "force-dynamic";
export default async function WikiPreviewPage({ params }: { params: { slug: string } }) {
  const story = await getStoryForPreview(params.slug); if (!story) notFound();
  return <div className={styles.shell} style={{ "--story-accent": story.pageAccentColor } as React.CSSProperties}><StoryNav slug={story.slug} name={story.name} accent={story.pageAccentColor} preview projectId={story.id}/><main className={styles.wiki}>
    <header className={styles.wikiHead}><h1>Wiki de<br/>{story.name}</h1><p>Aperçu — non publié. Les fiches sont visibles uniquement par les contributeurs.</p></header>
    {story.characters.length ? <div className={styles.wikiGrid}>{story.characters.map((character) => { const name=storyCharacterName(character); return <Link key={character.id} href={`/stories/${story.slug}/wiki-preview/characters/${character.id}`} className={styles.wikiCard}>{character.portraitUrl ? <img src={character.portraitUrl} alt=""/> : <span className={styles.letter}>{name.charAt(0)}</span>}<div className={styles.wikiCardContent}><h2>{name}</h2><p>{character.role || character.description || "Fiche personnage"}</p></div></Link>;})}</div> : <section className={styles.section}><h2>Le wiki se construit</h2><p>Les premières fiches de personnages seront bientôt disponibles.</p></section>}
    {story.locations.length > 0 && <section className={styles.section}><h2>Lieux</h2>{story.locations.map((location) => <article key={location.id}><h3>{location.name}</h3>{location.description && <p>{location.description}</p>}</article>)}</section>}
    {story.organizations.length > 0 && <section className={styles.section}><h2>Organisations</h2>{story.organizations.map((organization) => <article key={organization.id}><h3>{organization.name}</h3>{organization.description && <p>{organization.description}</p>}</article>)}</section>}
    {story.loreEntries.length > 0 && <section className={styles.section}><h2>Univers</h2>{story.loreEntries.map((entry) => <article key={entry.id}><h3>{entry.title}</h3>{entry.content && <p>{entry.content}</p>}</article>)}</section>}
  </main></div>;
}
