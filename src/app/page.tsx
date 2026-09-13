import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const readingTime = (words: number) => words > 0 ? `${Math.max(1, Math.ceil(words / 220))} min` : null;

export default async function HomePage() {
  const session=verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  const stories=await db.project.findMany({where:{deletedAt:null,pagePublished:true},include:{genres:true,owner:{select:{name:true,email:true}},scenes:{where:{deletedAt:null},select:{wordCount:true}},narrativeNodes:{where:{type:"season",deletedAt:null},select:{id:true}}},orderBy:{updatedAt:"desc"},take:12});
  const progress=session?await db.readingProgress.findMany({where:{userId:session.userId},select:{projectId:true,percentage:true}}):[];
  const progressMap=new Map(progress.map((item)=>[item.projectId,item.percentage]));
  const recent=session?await db.project.findMany({where:{deletedAt:null,ownerId:session.userId},include:{_count:{select:{scenes:true,characters:true}}},orderBy:{updatedAt:"desc"},take:4}):[];
  const featured=stories[0];
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.logo}><span>N</span>arra</Link><nav><Link href="/" className={styles.active}>Histoires</Link><Link href="/library">Studio</Link></nav><div className={styles.account}>{session?<><span>{session.name||session.email}</span><Link href="/api/auth/logout" prefetch={false}>Déconnexion</Link></>:<Link href="/login">Connexion</Link>}</div></header>
    <main>
      {featured ? <section className={styles.featured}>
        <Link href={`/stories/${featured.slug}`} className={styles.featuredArt} style={featured.coverUrl?{backgroundImage:`url("${featured.coverUrl.replace(/["\\]/g,"")}")`}:undefined} data-letter={featured.name.charAt(0)} aria-label={`Découvrir ${featured.name}`}/>
        <div className={styles.featuredCopy}><h1>{featured.pageTitle||featured.name}</h1><p>{featured.pageSubtitle||featured.description}</p><div className={styles.storyMeta}><span>{featured.owner.name||featured.owner.email}</span>{featured.genres.slice(0,2).map((genre)=><span key={genre.id}>{genre.genre}</span>)}</div><Link href={`/stories/${featured.slug}`} className={styles.discover}>Découvrir l’histoire <span>→</span></Link></div>
      </section> : <section className={styles.emptyHero}><div><h1>Des histoires<br/>qui prennent place.</h1><p>Narra rassemble les récits, leurs personnages et tout ce qui existe entre les lignes.</p>{session?<Link href="/library" className={styles.discover}>Publier depuis le Studio <span>→</span></Link>:<Link href="/login" className={styles.discover}>Entrer dans Narra <span>→</span></Link>}</div><div className={styles.emptyMark} aria-hidden="true">N</div></section>}
      {stories.length>0&&<section className={styles.catalog}><header><h2>Toutes les histoires</h2><p>{stories.length} œuvre{stories.length>1?"s":""} à lire</p></header><div className={styles.storyGrid}>{stories.map((story,index)=>{const words=story.scenes.reduce((sum,scene)=>sum+scene.wordCount,0);const pct=Math.round(progressMap.get(story.id)||0);return <Link key={story.id} href={`/stories/${story.slug}`} className={styles.storyCard}><div className={styles.cover} style={story.coverUrl?{backgroundImage:`url("${story.coverUrl.replace(/["\\]/g,"")}")`}:undefined} data-letter={story.name.charAt(0)}><span>{String(index+1).padStart(2,"0")}</span></div><div className={styles.cardCopy}><h3>{story.pageTitle||story.name}</h3><p>{story.description}</p><div className={styles.storyMeta}>{story.narrativeNodes.length>0&&<span>{story.narrativeNodes.length} saison{story.narrativeNodes.length>1?"s":""}</span>}<span>{story.scenes.length} scène{story.scenes.length>1?"s":""}</span>{readingTime(words)&&<span>{readingTime(words)}</span>}</div>{pct>0&&<div className={styles.progress}><span style={{width:`${pct}%`}}/></div>}</div></Link>})}</div></section>}
      {recent.length>0&&<section className={styles.studio}><header><div><h2>Sur votre table</h2><p>Reprendre un projet dans le Studio</p></div><Link href="/library">Tout voir →</Link></header><div className={styles.recent}>{recent.map((project)=><Link key={project.id} href={`/project/${project.id}`}><span className={styles.thumb} style={project.coverUrl?{backgroundImage:`url("${project.coverUrl.replace(/["\\]/g,"")}")`}:undefined}>{!project.coverUrl&&project.name.charAt(0)}</span><span><strong>{project.name}</strong><small>{project._count.scenes} scènes · {project._count.characters} personnages</small></span></Link>)}</div></section>}
    </main>
  </div>;
}
