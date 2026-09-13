import { redirect } from "next/navigation";

export default function OrganizationDetailPage({
  params,
}: {
  params: { projectId: string; organizationId: string };
}) {
  redirect(
    `/project/${params.projectId}/organizations?selected=${params.organizationId}`,
  );
}
