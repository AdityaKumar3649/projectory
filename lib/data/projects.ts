import type { ActionResult, Project, ProjectInput, ProjectStatus } from "@/lib/contracts/types";
import { parseOrFieldErrors, projectInputSchema } from "@/lib/validators/project";
import { newId, readDbQueued, withDb } from "@/lib/data/store";

/**
 * Member 1 <-> Member 3 CONTRACT (see the team plan, section 8).
 *
 * The team plan names these four functions explicitly:
 *   createProject(input) · updateProject(id, input)
 *   deleteProject(id) · getMyProjects(userId)
 *
 * Two deliberate choices:
 *
 * 1. `ownerId` is a parameter rather than being read from a global session.
 *    It is always supplied by the Server Action from the signed-in user, never
 *    from the browser. Ownership is re-checked inside every mutator, so a
 *    crafted request for someone else's project id fails here — not in the UI.
 *
 * 2. Nothing throws. Every function returns `ActionResult` so forms can render
 *    field-level errors without a try/catch, and so a failed validation is a
 *    normal outcome rather than a 500.
 *
 * TO SWAP IN MEMBER 3's REAL IMPLEMENTATION: replace the bodies below. No
 * component, form or page imports this file directly, so nothing else changes.
 */

function notOwner(): ActionResult<never> {
  return { ok: false, error: "You do not have access to that project." };
}

export async function createProject(
  ownerId: string,
  rawInput: ProjectInput,
): Promise<ActionResult<Project>> {
  const parsed = parseOrFieldErrors(projectInputSchema, rawInput);
  if (!parsed.ok) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const input = parsed.data;
  const now = new Date().toISOString();

  return withDb((db) => {
    const project: Project = {
      id: newId("prj"),
      ownerId,
      title: input.title,
      description: input.description,
      longDescription: input.longDescription,
      repoUrl: input.repoUrl,
      liveUrl: input.liveUrl,
      tags: input.tags,
      organizationId: input.organizationId === "" ? null : input.organizationId,
      // A new submission always enters the moderation queue. Member 3 owns the
      // transition out of "pending" via the admin review flow.
      status: "pending" satisfies ProjectStatus,
      createdAt: now,
      updatedAt: now,
      // New submissions have not been decided on yet, so the moderation
      // columns start empty rather than inheriting the creation time.
      moderatedAt: null,
      moderatedBy: null,
      moderationNote: null,
    };
    db.projects.push(project);
    return { ok: true, data: project } satisfies ActionResult<Project>;
  });
}

export async function updateProject(
  ownerId: string,
  id: string,
  rawInput: ProjectInput,
): Promise<ActionResult<Project>> {
  const parsed = parseOrFieldErrors(projectInputSchema, rawInput);
  if (!parsed.ok) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const input = parsed.data;

  return withDb((db) => {
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return { ok: false, error: "That project no longer exists." } satisfies ActionResult<Project>;
    }
    if (db.projects[index].ownerId !== ownerId) {
      return notOwner() as ActionResult<Project>;
    }

    const previous = db.projects[index];
    const next: Project = {
      ...previous,
      title: input.title,
      description: input.description,
      longDescription: input.longDescription,
      repoUrl: input.repoUrl,
      liveUrl: input.liveUrl,
      tags: input.tags,
      organizationId: input.organizationId === "" ? null : input.organizationId,
      // A member may not set status from the client - approving your own work
      // is the one thing this route must never allow. "pending" and "approved"
      // stay put for that reason.
      //
      // "rejected" is the exception, and only in one direction. The edit form
      // tells the member they can revise a rejected project and have it re-enter
      // review; without this the copy described a feature that did not exist
      // and their revision sat rejected forever. It can only move to "pending",
      // never past it, so it is not a privilege escalation.
      status: previous.status === "rejected" ? ("pending" satisfies ProjectStatus) : previous.status,
      updatedAt: new Date().toISOString(),
      // Re-submitting clears the previous decision, otherwise the owner would
      // keep reading a rejection note about a version they have already fixed.
      moderatedAt: previous.status === "rejected" ? null : previous.moderatedAt,
      moderatedBy: previous.status === "rejected" ? null : previous.moderatedBy,
      moderationNote: previous.status === "rejected" ? null : previous.moderationNote,
    };
    db.projects[index] = next;
    return { ok: true, data: next } satisfies ActionResult<Project>;
  });
}

export async function deleteProject(
  ownerId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return withDb((db) => {
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return { ok: false, error: "That project no longer exists." } satisfies ActionResult<{
        id: string;
      }>;
    }
    if (db.projects[index].ownerId !== ownerId) {
      return notOwner() as ActionResult<{ id: string }>;
    }
    db.projects.splice(index, 1);
    return { ok: true, data: { id } } satisfies ActionResult<{ id: string }>;
  });
}

export async function getMyProjects(ownerId: string): Promise<Project[]> {
  const db = await readDbQueued();
  return db.projects
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Owner-scoped read. Returns null for a project owned by someone else. */
export async function getProjectForOwner(
  ownerId: string,
  id: string,
): Promise<Project | null> {
  const db = await readDbQueued();
  const project = db.projects.find((p) => p.id === id);
  if (!project || project.ownerId !== ownerId) return null;
  return project;
}

export type ProjectSort = "updated" | "created" | "title";
export type StatusFilter = "all" | ProjectStatus;

export function filterAndSortProjects(
  projects: Project[],
  filter: StatusFilter,
  sort: ProjectSort,
): Project[] {
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const sorted = [...filtered];
  switch (sort) {
    case "created":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return sorted;
}

export function countByStatus(projects: Project[]) {
  return {
    all: projects.length,
    pending: projects.filter((p) => p.status === "pending").length,
    approved: projects.filter((p) => p.status === "approved").length,
    rejected: projects.filter((p) => p.status === "rejected").length,
  };
}
