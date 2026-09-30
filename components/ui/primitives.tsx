import type { ReactNode } from "react";
import { CircleAlert, Clock } from "lucide-react";

import type { ProjectStatus } from "@/lib/contracts/types";
import { cn, initials } from "@/lib/utils";

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

export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const label = initials(name);
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill",
        "border border-hairline bg-sunken font-semibold text-ink-2",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        label
      )}
    </span>
  );
}

/** Inline notice. `tone="info"` is the review notice; `tone="error"` is a form failure. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-input border border-transparent p-3.5",
        tone === "info" ? "bg-accent-soft" : "border-rejected-fg bg-rejected",
        className,
      )}
    >
      {tone === "info" ? (
        <Clock aria-hidden className="mt-px size-[17px] shrink-0 text-accent" />
      ) : (
        <CircleAlert aria-hidden className="mt-px size-[17px] shrink-0 text-rejected-fg" />
      )}
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
