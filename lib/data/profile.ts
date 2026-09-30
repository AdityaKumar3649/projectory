import type { ActionResult, UserProfile, UserProfileInput } from "@/lib/contracts/types";
import { parseOrFieldErrors, profileInputSchema } from "@/lib/validators/project";
import { readDb, withDb } from "@/lib/data/store";

/**
 * Profile half of the Member 1 <-> Member 3 contract.
 * Same swap-in-place rules as lib/data/projects.ts.
 *
 * A profile row is created lazily the first time a Clerk user lands, so a
 * brand-new sign-up sees a populated settings screen instead of an error.
 */

const emptyProfile = (userId: string, email: string): UserProfile => ({
  userId,
  email,
  displayName: email.split("@")[0] || "New member",
  headline: "",
  bio: "",
  githubUrl: "",
  websiteUrl: "",
  twitterUrl: "",
  avatarUrl: "",
  createdAt: new Date().toISOString(),
});

export async function getProfile(userId: string, email = ""): Promise<UserProfile> {
  const db = await readDb();
  return db.profiles.find((p) => p.userId === userId) ?? emptyProfile(userId, email);
}

export async function updateProfile(
  userId: string,
  rawInput: UserProfileInput,
): Promise<ActionResult<UserProfile>> {
  const parsed = parseOrFieldErrors(profileInputSchema, rawInput);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const input = parsed.data;

  return withDb((db) => {
    const index = db.profiles.findIndex((p) => p.userId === userId);
    const existing = index === -1 ? emptyProfile(userId, "") : db.profiles[index];
    const next: UserProfile = {
      ...existing,
      displayName: input.displayName,
      headline: input.headline,
      bio: input.bio,
      githubUrl: input.githubUrl,
      websiteUrl: input.websiteUrl,
      twitterUrl: input.twitterUrl,
      avatarUrl: input.avatarUrl,
    };
    if (index === -1) db.profiles.push(next);
    else db.profiles[index] = next;
    return { ok: true, data: next } satisfies ActionResult<UserProfile>;
  });
}
