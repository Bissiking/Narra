import { notFound } from "next/navigation";
import { getPublishedStory } from "@/lib/public-story";
import ProjectReader from "@/components/readers/project-reader";

export const dynamic = "force-dynamic";

export default async function PublicReadPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { block?: string | string[] };
}) {
  const story = await getPublishedStory(params.slug);
  if (!story) notFound();
  const block = searchParams?.block;
  const initialBlockId = Array.isArray(block) ? block[0] : block;
  return (
    <ProjectReader
      project={story}
      scenes={story.scenes}
      exitHref={`/stories/${story.slug}`}
      initialBlockId={initialBlockId || null}
    />
  );
}
