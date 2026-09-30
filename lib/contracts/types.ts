/**
 * Shared domain types for Projectory.
 *
 * IMPORTANT — read before editing:
 * These types mirror the contract agreed with Member 3 (who owns the Drizzle
 * schema and the real Server Actions). They are deliberately the ONLY place
 * where the shape of a Project is written down on the Member 1 side.
 *
 * When Member 3's `db/schema.ts` lands, re-export his inferred types from here
 * instead of editing call sites:
 *
 *   export type { Project, ProjectStatus } from "@/db/schema";
 *
 * Nothing outside this file should ever hand-roll a project object.
 */

export const PROJECT_STATUSES = ["pending", "approved", "rejected"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** A project as owned and displayed by Member 1's surfaces. */
export interface Project {
  id: string;
  /** Clerk user id of the owner. */
  ownerId: string;
  title: string;
  /** Short one-liner shown on cards and list rows. */
  description: string;
  /** Long form markdown-ish body shown on the detail page (Member 2). */
  longDescription: string;
  repoUrl: string;
  liveUrl: string;
  tags: string[];
  /** Optional link to the Organizations entity (Member 3 owns that table). */
  organizationId: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/** The shape accepted by create/update. Server-derived fields are excluded. */
export type ProjectInput = Omit<
  Project,
  "id" | "ownerId" | "status" | "createdAt" | "updatedAt"
>;

/** The public profile of the signed-in user. */
export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  headline: string;
  bio: string;
  githubUrl: string;
  websiteUrl: string;
  twitterUrl: string;
  avatarUrl: string;
  createdAt: string;
}

export type UserProfileInput = Omit<UserProfile, "userId" | "email" | "createdAt">;

/** Normalised identity handed to Member 1's UI by whichever auth provider is live. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  /**
   * True only for the seeded `user_demo` account, whose projects and password
   * are published in the README. It drives the "Demo" chip in the nav and the
   * extra explainer on the account panel. It is NOT a provider flag: a Clerk
   * user is `false`, and so is any real local sign-up.
   */
  isDemo: boolean;
}

/**
 * Every mutation returns this instead of throwing, so forms can render
 * field-level errors without a try/catch at the call site.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      /** Keyed by Zod path, e.g. `{ title: "Title is required" }`. */
      fieldErrors?: Record<string, string>;
    };

export type ProjectCounts = Record<ProjectStatus | "all", number>;
