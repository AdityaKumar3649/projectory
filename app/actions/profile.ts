"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { getProfile, updateProfile } from "@/lib/data/profile";
import type { UserProfile } from "@/lib/contracts/types";
import { parseOrFieldErrors, profileInputSchema } from "@/lib/validators/project";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

/**
 * `getMyProfile(userId)` — the name the plan lists under Member 1's Server
 * Actions. Reads do not technically need a Server Action, and the settings page
 * calls the data function directly, but the plan names this as part of the
 * contract shared with Member 3, so it is exported under that name rather than
 * left implicit.
 *
 * The session decides who you are, never the argument. `userId` is only
 * accepted so a mismatch can be reported loudly rather than silently ignored:
 * trusting the argument would let a caller read any member's profile, which is
 * the read-side twin of the write-side ownership bug.
 */
export async function getMyProfile(userId: string): Promise<UserProfile> {
  const user = await requireUser("/settings");
  if (userId !== user.id) {
    throw new Error("getMyProfile: userId does not match the signed-in user");
  }
  return getProfile(user.id, user.email);
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser("/settings");

  const parsed = parseOrFieldErrors(profileInputSchema, {
    displayName: formData.get("displayName") ?? "",
    headline: formData.get("headline") ?? "",
    bio: formData.get("bio") ?? "",
    githubUrl: formData.get("githubUrl") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    twitterUrl: formData.get("twitterUrl") ?? "",
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const result = await updateProfile(user.id, parsed.data);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profile updated." };
}
