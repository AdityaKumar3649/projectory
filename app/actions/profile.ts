"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/lib/data/profile";
import { parseOrFieldErrors, profileInputSchema } from "@/lib/validators/project";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

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
