"use client";

import { useId, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Chip } from "@/components/ui/primitives";
import { MAX_TAGS, tagSchema } from "@/lib/validators/project";
import { cn } from "@/lib/utils";

/**
 * Chip-style tag entry.
 *
 * The tricky part of a tag input is that a tag is finished by three different
 * gestures — Enter, a comma, and a paste — and any of them can carry several
 * tags at once. All three funnel into `addTags`, which normalises and validates
 * the whole batch, so "a, b ,c" can never produce a crash or a half-added chip.
 *
 * Validation reuses `tagSchema` from the shared validators rather than
 * re-checking length and characters here: the browser and the Server Action
 * must agree, and the schema is the one place that rule is written down.
 */
export function TagInput({
  value,
  onChange,
  error,
  max = MAX_TAGS,
  id,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  max?: number;
  /** Wired to the enclosing `Field`'s `htmlFor`. */
  id?: string;
}) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  const isFull = value.length >= max;

  const addTags = (raw: string) => {
    const candidates = raw
      .split(/[,\n\t]+/)
      .map((part) => part.trim().toLowerCase().replace(/\s+/g, ""))
      .filter(Boolean);

    if (candidates.length === 0) {
      setText("");
      return;
    }

    const next = [...value];
    for (const candidate of candidates) {
      if (next.length >= max) break;
      if (next.includes(candidate)) continue;
      // Rejects anything the server would reject: under 2 chars, over 24, or
      // containing a character outside [a-zA-Z0-9+#.-].
      if (!tagSchema.safeParse(candidate).success) continue;
      next.push(candidate);
    }

    onChange(next);
    setText("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((existing) => existing !== tag));
    // The chip that held focus is about to unmount, so move focus somewhere
    // predictable instead of dropping it on <body>. The input is disabled while
    // the list is full, and this runs before React re-renders, so guard on it.
    if (inputRef.current && !inputRef.current.disabled) inputRef.current.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTags(text);
      return;
    }
    if (event.key === "Backspace" && text === "" && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // Safety net for keyboards and IMEs that insert a comma without a keydown.
    if (raw.includes(",")) {
      addTags(raw);
      return;
    }
    setText(raw);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    addTags(event.clipboardData.getData("text"));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-2 rounded-input border bg-surface px-2 py-1.5 transition-colors",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent",
          error ? "border-rejected-fg" : "border-line",
        )}
      >
        {value.map((tag) => (
          <Chip key={tag} className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="-mr-1 inline-flex size-4 items-center justify-center rounded-pill text-ink-3 transition-colors hover:text-ink"
            >
              <X size={12} aria-hidden />
            </button>
          </Chip>
        ))}

        <input
          ref={inputRef}
          id={id ?? generatedId}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isFull}
          placeholder={isFull ? "" : "Add tag"}
          aria-label="Add a tag"
          aria-invalid={error ? true : undefined}
          className="min-w-24 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-rejected-fg">
          {error}
        </p>
      ) : isFull ? (
        <p aria-live="polite" className="text-xs text-ink-3">
          Maximum {max} tags
        </p>
      ) : null}
    </div>
  );
}
