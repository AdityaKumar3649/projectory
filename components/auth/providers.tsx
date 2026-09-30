"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

/**
 * Renders Clerk's provider only when Clerk is actually configured.
 *
 * The team plan puts Clerk in the stack, but it needs an external account and
 * two API keys before it can run. Until those keys exist in `.env.local`, the
 * app uses the local credentials provider instead (see `lib/auth/index.ts`).
 * Keeping the branch in one place means the rest of the codebase never asks
 * which provider is live.
 */
export function AuthProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <ClerkProvider>{children}</ClerkProvider>;
}
