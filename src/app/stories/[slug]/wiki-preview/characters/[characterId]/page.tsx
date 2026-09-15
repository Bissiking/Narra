import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryForPreview, storyCharacterName } from "@/lib/public-story";
import StoryNav from "@/components/story/story-nav";
import styles from "@/components/story/story-shell.module.css";

type WikiSection = { id: string; title: string; content: string };
export const dynamic = "force-dynamic";
export default async function CharacterWikiPreviewPage({ params }: { params: { slug: string; characterId: string } }) {
  const story=await getStoryForPreview(params.slug); if(!story) notFound(); const character=story.characters.find((item)=>item.id===params.characterId); if(!character) notFound();
  const name=storyCharacterName(character); const sections=Array.isArray(character.wikiSections) ? character.wikiSections as unknown as WikiSection[] : [];
  const relations=[...character.relationsFrom.map((r)=>({id:r.toCharacter.id,name:storyCharacterName(r.toCharacter),label:r.label||r.type})),...character.relationsTo.map((r)=>({id:r.fromCharacter.id,name:storyCharacterName(r.fromCharacter),label:r.reverseLabel||r.type}))];
  return <div className={styles.shell} style={{"--story-accent":character.nameColor||story.pageAccentColor} as React.CSSProperties}><StoryNav slug={story.slug} name={story.name} accent={story.pageAccentColor}/><main className={`${styles.wiki} ${styles.article}`}>
    <article className={styles.articleMain}><p className={styles.breadcrumbs}><Link href={`/stories/${story.slug}/wiki-preview`}>Wiki</Link> / Personnages / {name}</p><h1>{name}</h1>{character.role&&<p className={styles.role}>{character.role}</p>}{character.description&&<p className={styles.lead}>{character.description}</p>}
      {character.biography&&<section className={styles.section}><h2>Biographie</h2><p>{character.biography}</p></section>}
      {sections.map((section)=><section className={styles.section} key={section.id}><h2>{section.title}</h2><p>{section.content}</p></section>)}
      {relations.length>0&&<section className={styles.section}><h2>Relations</h2><p>{relations.map((relation,index)=><span key={`${relation.id}-${index}`}><Link href={`/stories/${story.slug}/wiki-preview/characters/${relation.id}`}>{relation.name}</Link> — {relation.label}{index<relations.length-1?<br/>:null}</span>)}</p></section>}
      {character.quotes&&<section className={styles.section}><h2>Citations</h2><p>{character.quotes}</p></section>}
    </article><aside className={styles.infobox}>{character.portraitUrl&&<img src={character.portraitUrl} alt={`Portrait de ${name}`}/>}<div className={styles.infoboxBody}><dl><div className={styles.fact}><dt>Nom</dt><dd>{name}</dd></div>{character.age&&<div className={styles.fact}><dt>Âge</dt><dd>{character.age}</dd></div>}<div className={styles.fact}><dt>Statut</dt><dd>{character.status||"Inconnu"}</dd></div>{character.organizationMemberships.map((m)=><div className={styles.fact} key={m.id}><dt>Organisation</dt><dd>{m.organization.name}</dd></div>)}<div className={styles.fact}><dt>Apparitions</dt><dd>{character.sceneAppearances.length} scène{character.sceneAppearances.length>1?"s":""}</dd></div></dl></div></aside>
  </main></div>;
}
