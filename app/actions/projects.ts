"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/data/projects";
import { projectInputSchema } from "@/lib/validators/project";
import { parseOrFieldErrors } from "@/lib/validators/project";

/**
 * Project mutations. Each action resolves the owner from the SERVER-SIDE session
 * via `requireUser()` and never from the submitted form data — otherwise a
 * crafted request could claim ownership of somebody else's project.
 */

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

/**
 * react-hook-form submits JSON, but a plain `<form>` posts FormData. Tags arrive
 * either as a JSON array or as a comma-separated string, so normalise both.
 */
function readInput(formData: FormData) {
  const rawTags = formData.get("tags");
  let tags: string[] = [];
  if (typeof rawTags === "string" && rawTags.trim()) {
    const trimmed = rawTags.trim();
    let parsed: unknown = trimmed;
    if (trimmed.startsWith("[")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // A malformed payload should fail validation with a readable message,
        // not blow up the request with a JSON syntax error.
        parsed = [];
      }
    }
    if (Array.isArray(parsed)) {
      tags = parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  }

  return {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    longDescription: formData.get("longDescription") ?? "",
    repoUrl: formData.get("repoUrl") ?? "",
    liveUrl: formData.get("liveUrl") ?? "",
    tags,
    organizationId: formData.get("organizationId") ?? "",
  };
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();

  const parsed = parseOrFieldErrors(projectInputSchema, readInput(formData));
  if (!parsed.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const result = await createProject(user.id, parsed.data);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const id = formData.get("projectId");
  if (typeof id !== "string" || !id) {
    return { error: "That project could not be found." };
  }

  const parsed = parseOrFieldErrors(projectInputSchema, readInput(formData));
  if (!parsed.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const result = await updateProject(user.id, id, parsed.data);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}/edit`);
  redirect("/dashboard");
}

/**
 * Called directly from the delete confirmation dialog rather than a form, so it
 * takes the id as an argument and returns a result the dialog can render.
 */
export async function deleteProjectAction(projectId: string): Promise<ProjectFormState> {
  const user = await requireUser();
  const result = await deleteProject(user.id, projectId);
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath("/dashboard");
  return { success: "Project deleted." };
}
