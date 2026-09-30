import { z } from "zod";

/**
 * Credentials validation, defined ONCE and used on both sides.
 *
 * The plan is explicit that "Zod validation schemas should be defined once per
 * entity and reused consistently between frontend forms and Server Actions, to
 * avoid duplicated or diverging rules" (section 3). The project and profile
 * schemas already do that; these two used to be hand-copied into each form, so
 * editing one silently left the other behind.
 *
 * This module deliberately imports nothing from the server side. `lib/auth/service.ts`
 * pulls in the data store and is server-only, so a Client Component could not
 * import the schemas from there — that is the whole reason the copies existed.
 *
 * Zod 4: messages are passed as `{ error: "..." }`.
 */

/**
 * Email, normalised BEFORE it is validated.
 *
 * The obvious spelling - `z.email().trim().toLowerCase()` - silently does not
 * work. In Zod 4 `z.email()` is a format check that runs first, so it inspects
 * the raw string and the trim/lowercase steps only ever see input that already
 * passed. A pasted address with a trailing space or stray capital therefore
 * failed with "Enter a valid email address", which is a confusing way to be told
 * your own address is invalid.
 *
 * Normalising first also makes the stored value canonical, so account lookup
 * by email cannot miss on a case difference. That matters even though the
 * browser strips surrounding whitespace from an email input: the Server Action
 * must not depend on client-side sanitising having happened first.
 */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(50, { error: "Name must be 50 characters or fewer" }),
  email: emailField,
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(200, { error: "That password is too long" }),
});

export const signInSchema = z.object({
  /**
   * `min(1)` rather than the signup rule of 8. Re-imposing the sign-up policy
   * here would lock out any account created before the rule existed, and the
   * stored hash is the real authority anyway - a short password passes here and
   * is rejected by the credential check with a message about the credentials,
   * not about a length rule the user never agreed to.
   */
  email: emailField,
  password: z.string().min(1, { error: "Enter your password" }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;

/** Flattens a ZodError to `{ field: firstMessage }`, matching AuthFormState. */
export function authFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
