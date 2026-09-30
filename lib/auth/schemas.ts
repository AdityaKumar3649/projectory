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

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(50, { error: "Name must be 50 characters or fewer" }),
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(200, { error: "That password is too long" }),
});

export const signInSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }).trim().toLowerCase(),
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
