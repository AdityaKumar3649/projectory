"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { readDbQueued, withDb } from "@/lib/data/store";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/contracts/types";

/**
 * Admin-only server actions: the moderation surface Member 3's spec assigned to
 * Member 1.
 *
 * Every function here follows the same four steps, in this order:
 *
 *   1. requireUser()  - who are you?
 *   2. isAdmin()      - are you allowed to do this at all?
 *   3. validate input - is the argument itself legal?
 *   4. only then write
 *
 * Step 2 cannot be skipped by the caller. The route layout also checks it, but
 * a layout is only a UI concern: an action endpoint can be POSTed to directly,
 * so the check that matters has to be in here.
 *
 * `revalidatePath` is called AFTER `withDb` returns, never inside the mutator.
 * Calling it inside throws "revalidatePath called in a non-Server-Action
 * context", because inside the mutator there is no longer a request scope.
 */

export type AdminResult = { ok: true } | { ok: false; error: string };

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/users");
  revalidatePath("/admin/database");
  revalidatePath("/dashboard");
}

/**
 * Narrowing a value that arrived from the network to a real ProjectStatus.
 *
 * This is not defensive decoration. A Server Action is invoked by the browser
 * over HTTP, so `status` is attacker-controlled at runtime and the TypeScript
 * annotation on the parameter is erased before it runs. Trusting the type would
 * let a crafted request write an arbitrary string into `project.status`, which
 * then leaks into `STATUS_PILL[project.status]` on every page and silently
 * renders a project with no badge.
 */
function toStatus(value: unknown): ProjectStatus | null {
  return PROJECT_STATUSES.find((s) => s === value) ?? null;
}

function toId(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("prj_") ? value : null;
}

/** Everything the admin screens need, in one read so they cannot disagree. */
export async function adminGetAllData() {
  const user = await requireUser();
  if (!isAdmin(user.id)) redirect("/dashboard");

  const db = await readDbQueued();
  const accountsById = new Map(db.accounts.map((a) => [a.id, a]));

  return {
    accounts: db.accounts.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      createdAt: a.createdAt,
      isAdmin: isAdmin(a.id),
    })),
    projects: db.projects.map((p) => ({
      ...p,
      ownerName: accountsById.get(p.ownerId)?.name ?? "Unknown",
      ownerEmail: accountsById.get(p.ownerId)?.email ?? "",
    })),
    activeSessions: db.sessions.filter((s) => new Date(s.expiresAt) > new Date()).length,
  };
}

export async function adminUpdateProjectStatus(
  projectId: unknown,
  status: unknown,
): Promise<AdminResult> {
  const user = await requireUser();
  if (!isAdmin(user.id)) return { ok: false, error: "You do not have admin access." };

  const id = toId(projectId);
  if (!id) return { ok: false, error: "That project could not be found." };

  const next = toStatus(status);
  if (!next) return { ok: false, error: "That status is not valid." };

  const result = await withDb((db) => {
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) return { ok: false as const, error: "That project could not be found." };
    db.projects[index] = {
      ...db.projects[index],
      status: next,
      updatedAt: new Date().toISOString(),
    };
    return { ok: true as const };
  });

  if (result.ok) revalidateAdminPaths();
  return result;
}

export async function adminDeleteProject(projectId: unknown): Promise<AdminResult> {
  const user = await requireUser();
  if (!isAdmin(user.id)) return { ok: false, error: "You do not have admin access." };

  const id = toId(projectId);
  if (!id) return { ok: false, error: "That project could not be found." };

  const result = await withDb((db) => {
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) return { ok: false as const, error: "That project could not be found." };
    db.projects.splice(index, 1);
    return { ok: true as const };
  });

  if (result.ok) revalidateAdminPaths();
  return result;
}

/**
 * Removes an account and everything hanging off it.
 *
 * Cascading explicitly rather than leaving orphans is the point: a project row
 * whose `ownerId` matches nothing is invisible in the owner's dashboard but
 * still counted in the admin totals, which is exactly the kind of drift that
 * makes a moderation screen untrustworthy.
 */
export async function adminDeleteUser(userId: unknown): Promise<AdminResult> {
  const user = await requireUser();
  if (!isAdmin(user.id)) return { ok: false, error: "You do not have admin access." };
  if (userId === user.id) return { ok: false, error: "You cannot delete your own account." };

  const result = await withDb((db) => {
    const account = db.accounts.find((a) => a.id === userId);
    if (!account) return { ok: false as const, error: "That account could not be found." };

    db.accounts = db.accounts.filter((a) => a.id !== userId);
    db.profiles = db.profiles.filter((p) => p.userId !== userId);
    db.projects = db.projects.filter((p) => p.ownerId !== userId);
    db.sessions = db.sessions.filter((s) => s.userId !== userId);
    return { ok: true as const };
  });

  if (result.ok) revalidateAdminPaths();
  return result;
}

/** Shape a Project row needs on the client, without leaking password hashes. */
export type AdminProject = Project & { ownerName: string; ownerEmail: string };