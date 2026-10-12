import Link from "next/link";
import styles from "@/app/home.module.css";

type CatalogStory = {
  id: string; slug: string | null; name: string; pageTitle: string | null;
  description: string | null; coverUrl: string | null;
  scenes: { wordCount: number }[]; narrativeNodes: { id: string }[];
};

export default function StoryCatalog({ stories, progress = new Map<string, number>() }: { stories: CatalogStory[]; progress?: Map<string, number> }) {
  if (!stories.length) return null;
  return <section className={styles.catalog} aria-labelledby="story-catalog-title">
    <header><h2 id="story-catalog-title">Toutes les histoires</h2><p>{stories.length} œuvre{stories.length > 1 ? "s" : ""} à lire</p></header>
    <ul className={styles.storyGrid}>
      {stories.map(story => {
        const title = story.pageTitle || story.name;
        const words = story.scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
        const percentage = Math.max(0, Math.min(100, Math.round(progress.get(story.id) || 0)));
        const cover = story.coverUrl ? { backgroundImage: "url(" + JSON.stringify(story.coverUrl) + ")" } : undefined;
        return <li key={story.id}>
          <Link href={"/stories/" + story.slug} className={styles.storyCard} aria-label={"Découvrir " + title}>
            <div className={styles.cover} style={cover} data-letter={title.charAt(0)} aria-hidden="true" />
            <div className={styles.cardCopy}>
              <h3 title={title}>{title}</h3>
              <p className={styles.storyDescription}>{story.description}</p>
              <div className={styles.storyMeta}>
                {story.narrativeNodes.length > 0 && <span>{story.narrativeNodes.length} saison{story.narrativeNodes.length > 1 ? "s" : ""}</span>}
                <span>{story.scenes.length} scène{story.scenes.length > 1 ? "s" : ""}</span>
                {words > 0 && <span>{Math.max(1, Math.ceil(words / 220))} min</span>}
              </div>
              {percentage > 0 && <div className={styles.readingProgress}>
                <span>Lecture : {percentage}%</span>
                <div className={styles.progress} role="progressbar" aria-label={"Lecture de " + title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width: percentage + "%"}} /></div>
              </div>}
            </div>
          </Link>
        </li>;
      })}
    </ul>
  </section>;
}
