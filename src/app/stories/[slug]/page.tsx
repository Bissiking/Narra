import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublishedStory } from "@/lib/public-story";
import StoryNav from "@/components/story/story-nav";
import styles from "@/components/story/story-shell.module.css";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const story = await getPublishedStory(params.slug); if (!story) notFound();
  const session = verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  const progress = session ? await db.readingProgress.findUnique({ where: { userId_projectId: { userId: session.userId, projectId: story.id } } }) : null;
  const words = story.scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
  const seasons = story.narrativeNodes.filter((node) => node.type === "season").length;
  const quote = story.characters.find((character) => character.quotes)?.quotes?.split("\n").find(Boolean);
  const heroStyle = story.coverUrl ? { backgroundImage: `url("${story.coverUrl.replace(/["\\]/g, "")}")` } : undefined;
  return <div className={styles.shell} style={{ "--story-accent": story.pageAccentColor } as React.CSSProperties}>
    <StoryNav slug={story.slug} name={story.name} accent={story.pageAccentColor} canResume={Boolean(progress && progress.percentage > 0)} />
    <main className={styles.hero}>
      <div className={`${styles.art} ${story.coverUrl ? "" : styles.missingArt}`} style={heroStyle} data-letter={story.name.charAt(0)} aria-hidden="true" />
      <section className={styles.heroCopy}>
        <h1>{story.pageTitle || story.name}</h1>
        <p>{story.pageSubtitle || story.description || "Une histoire à découvrir sur Narra."}</p>
        <div className={styles.meta}>
          {story.genres.slice(0,3).map((genre) => <span key={genre.id}>{genre.genre}</span>)}
          {seasons > 0 && <span>{seasons} saison{seasons > 1 ? "s" : ""}</span>}
          <span>{story.scenes.length} scène{story.scenes.length > 1 ? "s" : ""}</span>
          {words > 0 && <span>≈ {Math.max(1,Math.ceil(words/220))} min</span>}
        </div>
        <div className={styles.actions}>
          <a href={`/stories/${story.slug}/read${progress?.sceneId ? `#${progress.sceneId}` : ""}`} className={styles.primary}>{progress && progress.percentage > 0 ? `Reprendre à ${Math.round(progress.percentage)} %` : "Lire l’histoire"}</a>
          <a href={`/stories/${story.slug}/wiki`} className={styles.secondary}>Explorer le wiki</a>
        </div>
      </section>
      <aside className={styles.side}>{quote ? <blockquote>« {quote.replace(/^[-«»"\s]+|[-«»"\s]+$/g, "")} »</blockquote> : <blockquote>{story.description || "Chaque monde commence par une première page."}</blockquote>}<p>Une œuvre de {story.owner.name || story.owner.email}</p></aside>
    </main>
  </div>;
}
