import type { Metadata } from "next";

import { ProjectForm } from "@/components/project/project-form";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New project",
};

/**
 * The form's footer is sticky to the bottom of the viewport, so the page needs
 * trailing room or it would sit on top of the last field on a short screen.
 */
export default async function NewProjectPage() {
  await requireUser("/dashboard/new");

  return (
    <div className="flex flex-col gap-8 pb-24">
      <ProjectForm mode="create" />
    </div>
  );
}
