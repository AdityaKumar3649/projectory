"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, Chip } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { AuthUser } from "@/lib/contracts/types";
import { isAdmin } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/**
 * The authenticated top bar.
 *
 * WHY THIS IS A CLIENT COMPONENT: the nav is rendered once by the `(app)`
 * layout, which is shared by every protected route, gets no params and is not
 * re-rendered on navigation - so a Server Component simply cannot know which
 * link is current. The optional `active` prop is still honoured and takes
 * precedence, so any caller that *does* know the route can just say so.
 *
 * The sign-out control is a plain server-action form, so it still works before
 * this component has hydrated.
 */

export type NavKey = "projects" | "explore" | "profile";

const LINKS: { key: NavKey; label: string; href: string; enabled: boolean }[] = [
  { key: "projects", label: "Projects", href: "/dashboard", enabled: true },
  // Member 2 owns /explore and it does not exist yet, so it renders as a
  // disabled affordance rather than a link that would 404.
  { key: "explore", label: "Explore", href: "/explore", enabled: false },
  { key: "profile", label: "Profile", href: "/settings", enabled: true },
];

// px-2/gap-0 below `sm` is what keeps the bar inside a 320px viewport: the
// avatar only appears from 360px up, and the wordmark collapses to its badge.
const linkBase =
  "inline-flex h-8 items-center rounded-pill px-2 text-sm whitespace-nowrap transition-colors sm:px-3";

function resolveActive(pathname: string): NavKey | undefined {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "projects";
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return "explore";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "profile";
  return undefined;
}

export function AppNav({ user, active: forced }: { user: AuthUser; active?: NavKey }) {
  const pathname = usePathname();
  const active = forced ?? resolveActive(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:gap-7 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex size-7 items-center justify-center rounded-pill bg-ink text-sm font-semibold text-on-ink">
            P
          </span>
          <span className="hidden text-[17px] font-semibold tracking-[-0.01em] sm:inline">
            Projectory
          </span>
        </Link>

        <nav aria-label="Primary" className="flex min-w-0 items-center gap-0 sm:gap-1">
          {LINKS.map(({ key, label, href, enabled }) => {
            const current = key === active;
            const className = cn(
              linkBase,
              current ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:text-ink",
            );

            if (!enabled) {
              return (
                <span key={key} aria-disabled className={cn(className, "cursor-not-allowed opacity-45")} title="Coming soon">
                  {label}
                </span>
              );
            }

            return (
              <Link key={key} href={href} aria-current={current ? "page" : undefined} className={className}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {user.isDemo ? (
            <Chip className="hidden h-5 px-2 text-[11px] sm:inline-flex">Demo</Chip>
          ) : null}
          {/*
            Gated by `isAdmin`, the same rule the admin layout and every admin
            action use. Showing this link is only a convenience - the rule is
            re-checked on the route and again inside each Server Action, so hiding
            it here is not what keeps anyone out.
          */}
          {isAdmin(user.id) ? (
            <Link
              href="/admin"
              className="hidden h-7 items-center gap-1 rounded-pill bg-pending px-2.5 text-[11px] font-semibold text-pending-fg transition-opacity hover:opacity-80 sm:inline-flex"
            >
              <ShieldCheck size={12} aria-hidden />
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
          <Avatar
            name={user.name}
            src={user.avatarUrl || undefined}
            size={32}
            className="hidden min-[360px]:inline-flex"
          />
          <form action={signOutAction}>
            {/* type="submit" is required here: Button defaults to type="button",
                which silently makes this button a no-op inside a form. */}
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              title="Sign out"
              className="px-2.5 sm:px-3.5"
            >
              <LogOut aria-hidden size={15} className="sm:hidden" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
