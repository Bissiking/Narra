import { cookies } from "next/headers";
import Link from "next/link";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./home.module.css";
import StoryCatalog from "@/components/story/story-catalog";

export const dynamic = "force-dynamic";


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
        <Link href={`/stories/${featured.slug}`} className={styles.featuredArt} style={featured.coverUrl?{backgroundImage:`url("${featured.coverUrl.replace(/["\\]/g,"")}")`}:undefined} aria-label={`Découvrir ${featured.name}`}/>
        <div className={styles.featuredCopy}><h1>{featured.pageTitle||featured.name}</h1><p>{featured.pageSubtitle||featured.description}</p><div className={styles.storyMeta}><span>{featured.owner.name||featured.owner.email}</span>{featured.genres.slice(0,2).map((genre)=><span key={genre.id}>{genre.genre}</span>)}</div><Link href={`/stories/${featured.slug}`} className={styles.discover}>Découvrir l’histoire <span>→</span></Link></div>
      </section> : <section className={styles.emptyHero}><div><h1>Des histoires<br/>qui prennent place.</h1><p>Narra rassemble les récits, leurs personnages et tout ce qui existe entre les lignes.</p>{session?<Link href="/library" className={styles.discover}>Publier depuis le Studio <span>→</span></Link>:<Link href="/login" className={styles.discover}>Entrer dans Narra <span>→</span></Link>}</div><div className={styles.emptyMark} aria-hidden="true">N</div></section>}
      <StoryCatalog stories={stories} progress={progressMap} />
      {recent.length>0&&<section className={styles.studio}><header><div><h2>Sur votre table</h2><p>Reprendre un projet dans le Studio</p></div><Link href="/library">Tout voir →</Link></header><div className={styles.recent}>{recent.map((project)=><Link key={project.id} href={`/project/${project.id}`}><span className={styles.thumb} style={project.coverUrl?{backgroundImage:`url("${project.coverUrl.replace(/["\\]/g,"")}")`}:undefined}>{!project.coverUrl&&project.name.charAt(0)}</span><span><strong>{project.name}</strong><small>{project._count.scenes} scènes · {project._count.characters} personnages</small></span></Link>)}</div></section>}
    </main>
  </div>;
}
