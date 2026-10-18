import { SkeletonHeading, SkeletonTable } from "../skeleton";

/** Mirrors the members table: heading, a count line, then rows with avatars. */
export default function AdminUsersLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading members</span>
      <SkeletonHeading />
      <div className="h-3.5 w-24 animate-pulse rounded-pill bg-skeleton" />
      <SkeletonTable rows={5} avatar />
    </div>
  );
}
