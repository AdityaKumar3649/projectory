import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Clock, TriangleAlert } from "lucide-react";

import type { ProjectStatus } from "@/lib/contracts/types";
import { cn } from "@/lib/utils";

/**
 * Re-exported rather than redefined: the real Avatar is a Client Component
 * (it needs `useState` for the broken-image fallback), and this module is
 * imported by Server Components that must not pull in the hooks runtime.
 */
export { Avatar } from "./avatar";

/**
 * Status badge. The ONLY place colour is allowed to carry meaning, and it
 * always means the same thing: where the project is in the moderation queue.
 *
 * The dot is a solid fill rather than `bg-current opacity-70`: at 70% over a
 * dark tint in dark mode it lost contrast and the dot stopped reading as a
 * distinct state marker. Dedicated dot tokens keep it legible in both themes.
 */
const STATUS_STYLES: Record<ProjectStatus, { label: string; className: string; dot: string }> = {
  pending: { label: "Pending", className: "bg-pending text-pending-fg", dot: "bg-dot-pending" },
  approved: { label: "Approved", className: "bg-approved text-approved-fg", dot: "bg-dot-approved" },
  rejected: { label: "Rejected", className: "bg-rejected text-rejected-fg", dot: "bg-dot-rejected" },
};

export function StatusBadge({
  status,
  size = "md",
}: {
  status: ProjectStatus;
  size?: "sm" | "md";
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
        size === "sm" ? "h-[22px] px-2.5 text-[11px]" : "h-6 px-2.5 text-xs",
        style.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

/** Neutral pill, for tags and other non-semantic metadata. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-pill bg-sunken px-2.5 text-xs font-medium text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Inline notice.
 *
 * `warning` and `success` were added because the admin panel needs both and
 * there was no way to express them: `pending` already means "awaiting a
 * moderator", so borrowing it for "something needs your attention" would break
 * the rule in globals.css that a colour always means the same thing.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error" | "success" | "warning";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const icon = {
    info: <Clock aria-hidden className="mt-px size-[17px] shrink-0 text-accent" />,
    error: <CircleAlert aria-hidden className="mt-px size-[17px] shrink-0 text-rejected-fg" />,
    success: <CircleCheck aria-hidden className="mt-px size-[17px] shrink-0 text-approved-fg" />,
    warning: <TriangleAlert aria-hidden className="mt-px size-[17px] shrink-0 text-warning-fg" />,
  }[tone];

  return (
    <div
      // Errors interrupt; the rest wait their turn. Both were `alert` or
      // nothing, so a success message either shouted or said nothing.
      role={tone === "error" ? "alert" : tone === "info" ? undefined : "status"}
      className={cn(
        // rounded-card, not rounded-input: Alert and Panel are the same kind of
        // thing at the same size and were rendering with different radii.
        "flex items-start gap-2.5 rounded-card border border-transparent p-3.5",
        tone === "info" && "bg-accent-soft",
        tone === "error" && "border-rejected-fg bg-rejected",
        tone === "success" && "bg-approved",
        tone === "warning" && "bg-warning",
        className,
      )}
    >
      {icon}
      <div className="flex flex-col gap-1">
        {title ? <p className="text-[13px] font-semibold text-ink">{title}</p> : null}
        {children ? <p className="text-[13px] leading-relaxed text-ink-2">{children}</p> : null}
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-hairline bg-surface", className)}>
      {children}
    </div>
  );
}
