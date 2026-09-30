import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { createContext, useContext } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form primitives. All three share the same box so a form reads as one column:
 * height 40, 10px radius, 1px `--color-line` border, 12px horizontal padding.
 */

const box =
  "w-full rounded-input border bg-surface px-3 text-sm text-ink transition-colors " +
  "placeholder:text-ink-3 focus:outline-none focus-visible:outline-none " +
  "focus:ring-2 focus:ring-accent focus:border-accent disabled:bg-sunken disabled:text-ink-3";

/**
 * Lets `Field` hand its message id to whichever control is nested inside it.
 *
 * Without this, `Field` had two bad options: leave the message unassociated, or
 * `cloneElement` the child to inject `aria-describedby`. The second silently
 * does nothing when the child is a react-hook-form `<Controller>` rather than
 * the input itself — the prop lands on `Controller`, which ignores it, and the
 * association is lost while the code reads as though it worked.
 *
 * Context travels through `Controller` fine, because the control it renders is
 * still a descendant of `Field` in the React tree. One id, one source of truth,
 * and it keeps working when a field is later wrapped for some new reason.
 */
const FieldMessageContext = createContext<{ id?: string }>({});

function useDescribedBy(own: string | undefined) {
  const { id } = useContext(FieldMessageContext);
  // Merge rather than overwrite: a control may already point at its own hint
  // (TagInput does), and dropping that would be a regression.
  const merged = [own, id].filter(Boolean).join(" ");
  return merged || undefined;
}

export function Input({
  invalid = false,
  className,
  "aria-describedby": describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      aria-describedby={useDescribedBy(describedBy)}
      className={cn(box, "h-10", invalid ? "border-rejected-fg" : "border-line", className)}
      {...props}
    />
  );
}

export function Textarea({
  invalid = false,
  className,
  "aria-describedby": describedBy,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      aria-describedby={useDescribedBy(describedBy)}
      className={cn(
        box,
        "min-h-22 resize-y py-3 leading-relaxed",
        invalid ? "border-rejected-fg" : "border-line",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  invalid = false,
  className,
  children,
  "aria-describedby": describedBy,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  const described = useDescribedBy(describedBy);
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        className={cn(
          box,
          "h-10 cursor-pointer appearance-none pr-9",
          invalid ? "border-rejected-fg" : "border-line",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

/**
 * Label + control + helper/error. Kept as one component so a form can never
 * render a label without its error slot.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  counter?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  /*
   * One message slot, so one id: a field shows an error or a hint, never both.
   * Deriving it from `htmlFor` keeps it stable across renders, which matters
   * because `aria-describedby` and the element's `id` have to agree.
   *
   * The id is published only when a message will actually render. Offering it
   * unconditionally pointed controls at an element that did not exist for any
   * field lacking both a hint and an error — Title and Display name, for
   * instance — which is a dangling reference that assistive technology discards,
   * and it makes the whole form look broken to an audit script.
   */
  const messageId =
    htmlFor && (error || hint) ? `${htmlFor}-field-message` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        {counter ? (
          <span className="font-mono text-[11px] text-ink-3 tabular-nums">{counter}</span>
        ) : null}
      </div>
      <FieldMessageContext.Provider value={{ id: messageId }}>
        {children}
      </FieldMessageContext.Provider>
      {/*
        `aria-live` is deliberately not added here: `role="alert"` already
        announces an appearing error, and doubling them up makes a screen reader
        read the message twice. The id is what ties it to the control, so that
        focusing the field after an error says why it is invalid.
      */}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-rejected-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
