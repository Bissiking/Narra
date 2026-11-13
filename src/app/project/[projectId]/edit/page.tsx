import EditorWorkspace from "@/components/editors/editor-workspace";

export default function EditPage({ searchParams }: { searchParams?: { scene?: string | string[] } }) {
  const scene = searchParams?.scene;
  return <EditorWorkspace initialSceneId={Array.isArray(scene) ? scene[0] : scene} />;
}
