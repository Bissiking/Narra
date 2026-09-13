import { notFound } from "next/navigation";
import { getPublishedStory } from "@/lib/public-story";
import ProjectReader from "@/components/readers/project-reader";

export const dynamic = "force-dynamic";

export default async function PublicReadPage({ params }: { params: { slug: string } }) {
  const story = await getPublishedStory(params.slug); if (!story) notFound();
  return <ProjectReader project={story} scenes={story.scenes} exitHref={`/stories/${story.slug}`} />;
}
