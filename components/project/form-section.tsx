import type { ReactNode } from "react";

/**
 * A titled band inside a long form.
 *
 * The form is one narrow column, so the only way to keep a wall of inputs
 * readable is a hairline rule plus a small caps label between groups. This is a
 * pure presentational wrapper — it owns no state and validates nothing.
 */
export function FormSection({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 border-t border-hairline pt-6">
        <h2 className="text-[11px] font-semibold tracking-[0.09em] text-ink-3 uppercase">
          {label}
        </h2>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </section>
  );
}
