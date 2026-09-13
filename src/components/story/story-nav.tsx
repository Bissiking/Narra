import Link from "next/link";
import styles from "./story-shell.module.css";

export default function StoryNav({ slug, name, accent = "#f59e0b", canResume = false }: { slug: string; name: string; accent?: string; canResume?: boolean }) {
  return <header className={styles.nav} style={{ "--story-accent": accent } as React.CSSProperties}>
    <Link href="/" className={styles.brand}><span>N</span>arra</Link>
    <Link href={`/stories/${slug}`} className={styles.storyName}>{name}</Link>
    <nav className={styles.links} aria-label={`Menu de ${name}`}>
      <Link href={`/stories/${slug}/read`}><span className={styles.fullLabel}>{canResume ? "Reprendre" : "Lire l’histoire"}</span><span className={styles.shortLabel}>{canResume ? "Reprendre" : "Lire"}</span></Link>
      <Link href={`/stories/${slug}/wiki`}>Wiki</Link>
    </nav>
  </header>;
}
