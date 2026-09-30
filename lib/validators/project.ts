import { z } from "zod";

/**
 * Project validation — SHARED FILE.
 *
 * Per the team plan, Member 1 drafts these schemas collaboratively with Member 3
 * rather than Member 3 owning them alone, specifically so that the browser and
 * the server enforce byte-identical rules. Member 3 should import these in his
 * Server Actions rather than redeclaring them.
 *
 * Zod 4 note: error messages are passed as `{ error: "..." }`.
 */

export const MAX_TAGS = 5;

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 200;
const LONG_DESCRIPTION_MAX = 5000;
const BIO_MAX = 280;
const HEADLINE_MAX = 80;

const urlMessage = (label: string) =>
  `Enter a valid ${label} URL, including https://`;

/**
 * A URL field that tolerates being left blank unless `required`.
 * Deliberately forgiving about a missing scheme so "github.com/x" is rejected
 * with a helpful message rather than a raw Zod type error.
 *
 * Takes the field LABEL and builds the message here, so every call site reads
 * as `httpUrl("repository", true)` and can never accidentally pass a bare label
 * through as the user-facing error.
 */
function httpUrl(label: string, required: boolean) {
  const message = urlMessage(label);
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") {
        if (required) ctx.addIssue({ code: "custom", message });
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        ctx.addIssue({ code: "custom", message });
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message });
      }
    });
}

export const tagSchema = z
  .string()
  .trim()
  .min(2, { error: "Tags need at least 2 characters" })
  .max(24, { error: "Tags can be at most 24 characters" })
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9+#.-]*$/, {
    error: "Use letters, numbers and - . + # only",
  });

/**
 * The shape a project form produces. `tags` is a real array because the tag
 * input manages chips, not a comma-joined string.
 */
export const projectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Title must be at least 3 characters" })
    .max(TITLE_MAX, { error: `Title must be ${TITLE_MAX} characters or fewer` }),
  description: z
    .string()
    .trim()
    .min(10, { error: "Description must be at least 10 characters" })
    .max(DESCRIPTION_MAX, {
      error: `Description must be ${DESCRIPTION_MAX} characters or fewer`,
    }),
  longDescription: z
    .string()
    .trim()
    .max(LONG_DESCRIPTION_MAX, {
      error: `Long description must be ${LONG_DESCRIPTION_MAX} characters or fewer`,
    }),
  repoUrl: httpUrl("repository", true),
  liveUrl: httpUrl("live", false),
  tags: z
    .array(tagSchema)
    .max(MAX_TAGS, { error: `Use at most ${MAX_TAGS} tags` }),
  /** Empty string means "no organisation". */
  organizationId: z
    .string()
    .trim()
    .max(64, { error: "That organisation name is too long" }),
});

export type ProjectFormValues = z.infer<typeof projectInputSchema>;

export const profileInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(50, { error: "Name must be 50 characters or fewer" }),
  headline: z
    .string()
    .trim()
    .max(HEADLINE_MAX, { error: `Headline must be ${HEADLINE_MAX} characters or fewer` }),
  bio: z.string().trim().max(BIO_MAX, { error: `Bio must be ${BIO_MAX} characters or fewer` }),
  githubUrl: httpUrl("GitHub", false),
  websiteUrl: httpUrl("website", false),
  twitterUrl: httpUrl("Twitter", false),
  avatarUrl: httpUrl("avatar", false),
});

export type ProfileFormValues = z.infer<typeof profileInputSchema>;

/**
 * Flattens a ZodError into `{ fieldName: firstMessage }`, which is the shape
 * `ActionResult.fieldErrors` promises. Keeping this in one place means forms and
 * server actions can never disagree about how errors are keyed.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    // Collapse array indices: `tags.3` reads as "tag 4 is wrong", which is not
    // something a chip-based tag input can point at. Reporting on `tags` is
    // actionable, so the first message for a field wins.
    const path = issue.path.filter((segment) => typeof segment === "string");
    const key = path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Convenience wrapper: returns the parsed value or a field-error map. */
export function parseOrFieldErrors<T extends z.ZodType>(
  schema: T,
  value: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: Record<string, string> } {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: toFieldErrors(result.error) };
}

export const LIMITS = {
  titleMax: TITLE_MAX,
  descriptionMax: DESCRIPTION_MAX,
  bioMax: BIO_MAX,
  headlineMax: HEADLINE_MAX,
  maxTags: MAX_TAGS,
} as const;
