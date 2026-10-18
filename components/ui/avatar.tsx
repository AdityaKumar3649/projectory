"use client";

import { useState } from "react";

import { cn, initials } from "@/lib/utils";

/**
 * Member avatar, falling back to initials.
 *
 * Split out of `primitives.tsx` rather than adding "use client" there. The other
 * primitives - Panel, Alert, Chip, StatusBadge - are pure and are rendered by
 * Server Components; turning the whole module into a client component would ship
 * React and the hooks runtime to pages that only need a bordered box.
 *
 * `broken` exists because a failed image used to render an empty bordered
 * circle, which reads as "this person has no photo" rather than "the image
 * would not load". Falling back to initials keeps the row legible either way.
 */
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
  const [broken, setBroken] = useState(false);

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill",
        "border border-hairline bg-sunken font-semibold text-ink-2",
        className,
      )}
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        label
      )}
    </span>
  );
}
