import ProjectNav from "@/components/layout/project-nav";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  return (
    <div className="min-h-screen flex">
      <ProjectNav projectId={params.projectId} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
