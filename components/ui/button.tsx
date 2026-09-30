import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * The one button. Every pill in the product is a variant of this.
 * Variants map 1:1 to the "Buttons" section of the Pencil design system.
 */

export const buttonVariants = {
  variant: {
    primary: "bg-ink text-white hover:bg-[#2a2a31]",
    secondary: "bg-surface text-ink border border-line hover:bg-sunken",
    ghost: "text-ink-2 hover:bg-sunken",
    destructive: "bg-surface text-rejected-fg border border-rejected-fg hover:bg-rejected",
  },
  size: {
    sm: "h-8 px-3.5 text-[13px]",
    md: "h-10 px-[18px] text-sm",
    lg: "h-12 px-6 text-[15px]",
  },
} as const;

type Variant = keyof typeof buttonVariants.variant;
type Size = keyof typeof buttonVariants.size;

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap",
    "transition-colors select-none",
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-hairline disabled:text-[#b5b5bc]",
    buttonVariants.variant[variant],
    buttonVariants.size[size],
    block && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      {...props}
    />
  );
}

/** Square icon-only button, used for row overflow menus. */
export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-pill border border-hairline",
        "text-ink-2 transition-colors hover:bg-sunken",
        className,
      )}
      {...props}
    />
  );
}
