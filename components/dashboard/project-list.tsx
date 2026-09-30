import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Chip, StatusBadge } from "@/components/ui/primitives";
import type { Project } from "@/lib/contracts/types";
import { prettyUrl, relativeTime } from "@/lib/utils";

/**
 * The dashboard list.
 *
 * ONE white container, hairline dividers between rows, no gap, no per-row
 * border, no shadow. Rows are separated by `divide-y` so the whole list reads as
 * a single surface rather than a stack of cards.
 *
 * Every text line truncates, so the row survives a 320px viewport: the left
 * column is `min-w-0` (so `truncate` has something to measure against) and the
 * right cluster is `shrink-0`.
 */

const MAX_VISIBLE_TAGS = 3;

function editHref(id: string) {
  return `/dashboard/${id}/edit`;
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hidden = tags.length - visible.length;

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {visible.map((tag) => (
        <Chip key={tag} className="h-5 max-w-[132px] shrink-0 overflow-hidden px-2 text-[11px]">
          {tag}
        </Chip>
      ))}
      {hidden > 0 ? (
        <span className="shrink-0 text-[11px] font-medium text-ink-3">+{hidden}</span>
      ) : null}
    </div>
  );
}

function Row({ project }: { project: Project }) {
  const href = editHref(project.id);
  const repo = prettyUrl(project.repoUrl);

  return (
    <li className="relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunken focus-within:bg-sunken">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/*
          Stretched link: the anchor's ::after covers the whole row, so the row is
          one click target and one tab stop. The previous version wrapped a <button>
          in this <Link>, which is invalid HTML and breaks keyboard and screen-reader
          behaviour — so the trailing "..." is now a decorative affordance inside the
          same link rather than a second, unreachable control.
        */}
        <Link
          href={href}
          className="block truncate text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] hover:underline hover:decoration-hairline hover:underline-offset-4"
        >
          {project.title}
        </Link>

        {project.description ? (
          <p className="truncate text-[13px] text-ink-2">{project.description}</p>
        ) : null}

        <Tags tags={project.tags} />

        <div className="flex min-w-0 items-center gap-2">
          {repo ? <span className="truncate font-mono text-xs text-ink-3">{repo}</span> : null}
          {repo ? <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-ink-3" /> : null}
          <span className="shrink-0 text-xs text-ink-3">updated {relativeTime(project.updatedAt)}</span>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-2">
        <StatusBadge status={project.status} />
        <span
          aria-hidden
          className="inline-flex size-8 items-center justify-center rounded-pill border border-hairline text-ink-2"
        >
          <MoreHorizontal size={16} />
        </span>
      </div>
    </li>
  );
}

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ul className="overflow-hidden rounded-card border border-hairline bg-surface divide-y divide-hairline">
      {projects.map((project) => (
        <Row key={project.id} project={project} />
      ))}
    </ul>
  );
}
