import { redirect } from "next/navigation";

export default function CharacterDetailPage({
  params,
}: {
  params: { projectId: string; characterId: string };
}) {
  redirect(
    `/project/${params.projectId}/characters?selected=${params.characterId}`,
  );
}
