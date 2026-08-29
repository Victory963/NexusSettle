import { ProjectWorkspace } from "@/components/ProjectWorkspace";

export default async function ProjectPage({ params }: PageProps<"/project/[id]">) {
  const { id } = await params;
  return <ProjectWorkspace id={id} />;
}
