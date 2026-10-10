"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Database,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Admin sidebar.
 *
 * This file did not exist - the layout imported it, so the project did not
 * compile at all. It is the `Projectory - Admin Nav` frame from the Pencil
 * design, built from the same tokens as the rest of the app so it does not read
 * as a separate product.
 *
 * It is a Client Component because the active item depends on the URL. The
 * parent layout stays a Server Component and does the authorisation.
 */

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/database", label: "Database", icon: Database },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="flex shrink-0 flex-col gap-2 border-b border-hairline bg-surface p-2 lg:w-[236px] lg:gap-0 lg:border-b-0 lg:border-r lg:p-2.5"
    >
      <div className="flex items-center gap-2 px-1 lg:pb-1 lg:pt-1">
        <span
          aria-hidden
          className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-accent text-[12px] font-bold text-on-ink"
        >
          P
        </span>
        <span className="truncate text-sm font-semibold text-ink">Projectory</span>
      </div>

      {/*
        The workspace badge and the item list share one horizontally scrollable
        row on a phone, so the sidebar becomes a bar instead of a column. Scrolling
        that row beats a hamburger: four short labels fit, and every destination
        stays one tap away with no second interaction.
      */}
      <div className="-mx-2 flex items-center gap-2 overflow-x-auto px-2 pb-1 lg:mx-0 lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
        <p className="hidden shrink-0 items-center gap-1.5 rounded-input bg-pending px-2 py-1.5 text-[11px] font-semibold text-pending-fg lg:flex">
          <ShieldCheck size={12} aria-hidden />
          Admin workspace
        </p>

        <ul className="flex shrink-0 items-center gap-1 lg:mt-3 lg:flex-col lg:items-stretch lg:gap-0.5">
          {ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="shrink-0 lg:shrink">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-[34px] items-center gap-2 rounded-input px-2.5 text-[13px] whitespace-nowrap transition-colors lg:gap-2.5",
                    active
                      ? "bg-accent-soft font-semibold text-accent"
                      : "font-medium text-ink-2 hover:bg-sunken hover:text-ink",
                  )}
                >
                  <Icon size={15} aria-hidden className={active ? "text-accent" : "text-ink-3"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden border-t border-hairline pt-2 lg:block">
        <Link
          href="/dashboard"
          className="flex h-[34px] items-center gap-2.5 rounded-input px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden className="text-ink-3" />
          Back to my projects
        </Link>
      </div>
    </nav>
  );
}