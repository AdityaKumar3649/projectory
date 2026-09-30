import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteProjectDialog } from "@/components/project/delete-project-dialog";
import { FormSection } from "@/components/project/form-section";
import { ProjectForm } from "@/components/project/project-form";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getProjectForOwner } from "@/lib/data/projects";

/** Next 16 hands dynamic segments to pages as a promise. */
type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Uses the non-throwing `getCurrentUser` rather than `requireUser`: metadata
 * generation must never redirect, and a signed-out visitor should still get a
 * sensible title rather than a thrown error.
 */
export async function generateMetadata({ params }: EditProjectPageProps): Promise<Metadata> {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return { title: "Edit project" };

  const project = await getProjectForOwner(user.id, id);
  if (!project) return { title: "Edit project" };

  return { title: `Edit ${project.title}` };
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProjectForOwner(user.id, id);

  // Missing and "not yours" are deliberately indistinguishable to the browser:
  // a 404 leaks nothing about projects owned by other members.
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-8 pb-24">
      <ProjectForm mode="edit" project={project} />

      <div className="mx-auto w-full max-w-[720px]">
        <FormSection label="Danger zone">
          <div className="flex flex-col gap-2.5 rounded-card border border-rejected-fg bg-surface p-5">
            <h3 className="text-[15px] font-semibold">Delete this project</h3>
            <p className="text-[13px] leading-relaxed text-ink-2">
              This permanently removes the project and all of its votes. This cannot be undone.
            </p>
            <div className="flex justify-end pt-1.5">
              <DeleteProjectDialog projectId={project.id} projectTitle={project.title} />
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
