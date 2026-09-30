import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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

export function Input({
  invalid = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(box, "h-10", invalid ? "border-rejected-fg" : "border-line", className)}
      {...props}
    />
  );
}

export function Textarea({
  invalid = false,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
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
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
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
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rejected-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
