import { SkeletonHeading, SkeletonTable, SkeletonToolbar } from "../skeleton";

/**
 * Skeleton for the moderation table specifically.
 *
 * There used to be one `loading.tsx` at this level, which Next uses as the
 * fallback for EVERY admin route - so it drew the overview's five tiles and two
 * panels while the projects table was loading, and again on users and database.
 * The file's own comment described the failure it was causing: the layout that
 * arrived after the load was a different shape, so the page jumped, and on a
 * moderation screen the approve button can move under the pointer between click
 * and render.
 *
 * One skeleton per route, each mirroring its own layout, is the fix.
 */
export default function AdminProjectsLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading projects</span>
      <SkeletonHeading />
      <SkeletonToolbar />
      <SkeletonTable rows={6} />
    </div>
  );
}
