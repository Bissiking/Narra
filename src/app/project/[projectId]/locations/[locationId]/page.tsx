import { redirect } from "next/navigation";

export default function LocationDetailPage({
  params,
}: {
  params: { projectId: string; locationId: string };
}) {
  redirect(
    `/project/${params.projectId}/locations?selected=${params.locationId}`,
  );
}
