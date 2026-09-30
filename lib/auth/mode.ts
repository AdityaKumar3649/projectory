/**
 * Which auth provider is live.
 *
 * Kept in its own module with no `next/headers` or React imports so that Client
 * Components can import it safely. `lib/auth/index.ts` re-exports these, so
 * `@/lib/auth` still works for Server Components.
 *
 * Evaluated once at module load. Changing the keys in `.env.local` requires a
 * dev-server restart, which is expected.
 */

export const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export type AuthMode = "clerk" | "local";

export const authMode: AuthMode = clerkEnabled ? "clerk" : "local";
