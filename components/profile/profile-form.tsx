"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, AtSign, Camera, Code, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { updateProfileAction, type ProfileFormState } from "@/app/actions/profile";
import type { UserProfile } from "@/lib/contracts/types";
import { LIMITS, profileInputSchema, type ProfileFormValues } from "@/lib/validators/project";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { cn, initials } from "@/lib/utils";

/**
 * `profileInputSchema` owns every rule. `LIMITS` covers headline and bio, but
 * the display-name ceiling is not exported, so mirror the schema's 50 here for
 * the counter only - never to validate.
 */
const NAME_MAX = 50;

/** Section label + hairline rule. Local to this file on purpose. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-hairline pt-6">
      <h2 className="text-[11px] font-semibold tracking-[0.09em] text-ink-3 uppercase">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

type LinkFieldSpec = {
  name: "githubUrl" | "websiteUrl" | "twitterUrl";
  label: string;
  placeholder: string;
  icon: LucideIcon;
};

const LINK_FIELDS: LinkFieldSpec[] = [
  {
    name: "githubUrl",
    label: "GitHub",
    placeholder: "https://github.com/you",
    icon: Code,
  },
  {
    name: "websiteUrl",
    label: "Website",
    placeholder: "https://you.dev",
    icon: Globe,
  },
  {
    name: "twitterUrl",
    label: "Twitter / X",
    placeholder: "https://x.com/you",
    icon: AtSign,
  },
];

const defaultsOf = (profile: UserProfile): ProfileFormValues => ({
  displayName: profile.displayName,
  headline: profile.headline,
  bio: profile.bio,
  githubUrl: profile.githubUrl,
  websiteUrl: profile.websiteUrl,
  twitterUrl: profile.twitterUrl,
  avatarUrl: profile.avatarUrl,
});

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileInputSchema),
    mode: "onBlur",
    defaultValues: defaultsOf(profile),
  });

  const [state, setState] = useState<ProfileFormState>(null);
  const [pending, startTransition] = useTransition();
  const [photoOpen, setPhotoOpen] = useState(false);
  /** Bumped on each success so the reset effect can key off a change, not the state object. */
  const [savedCount, setSavedCount] = useState(0);
  // State rather than a ref: the reset below has to run in an effect anyway,
  // and writing a ref from inside the submit callback trips react-hooks/refs.
  const [lastSaved, setLastSaved] = useState<ProfileFormValues | null>(null);

  // One subscription per field. Subscribing to the whole form object would
  // re-render the entire screen on every keystroke and can loop.
  const displayName = useWatch({ control: form.control, name: "displayName" });
  const headline = useWatch({ control: form.control, name: "headline" });
  const bio = useWatch({ control: form.control, name: "bio" });
  const avatarUrl = useWatch({ control: form.control, name: "avatarUrl" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setState(null);
    // Zod trims, so `values` is exactly what the server will persist.
    setLastSaved(values);
    startTransition(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(values)) fd.set(key, String(value ?? ""));
      const result = await updateProfileAction(null, fd);
      if (result?.error) {
        setState(result);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field in values) form.setError(field as keyof ProfileFormValues, { message });
        }
      } else if (result?.success) {
        setState(result);
        setSavedCount((count) => count + 1);
      }
    });
  });

  // Re-seed the form with the saved values so the inputs stop looking dirty
  // and the counters agree with what is now in the database.
  useEffect(() => {
    if (savedCount === 0 || !lastSaved) return;
    form.reset(lastSaved);
  }, [savedCount, lastSaved, form]);

  const counter = (value: string, max: number) => `${value.length} / ${max}`;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft size={14} className="text-ink-3" aria-hidden />
        Projects
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Profile</h1>
        <p className="text-sm text-ink-3">
          This is how you appear alongside every project you submit.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-pill border border-hairline bg-accent-soft">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-[22px] font-semibold text-accent">
                {initials(displayName || "Member")}
              </span>
            )}
          </span>

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPhotoOpen((open) => !open)}
              aria-expanded={photoOpen}
              aria-controls="avatarUrl"
            >
              <Camera size={14} aria-hidden />
              Change photo
            </Button>
            <p className="text-xs text-ink-3">JPG or PNG. 1 MB max.</p>

            {photoOpen ? (
              <div className="flex w-full max-w-sm flex-col gap-1.5">
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/you.jpg"
                  aria-label="Image URL"
                  invalid={Boolean(errors.avatarUrl)}
                  className="font-mono text-[13px]"
                  {...form.register("avatarUrl")}
                />
                <p className="text-xs text-ink-3">
                  Paste an image URL. Direct uploads arrive with Member 3&apos;s storage layer.
                </p>
                {errors.avatarUrl ? (
                  <p role="alert" className="text-xs text-rejected-fg">
                    {errors.avatarUrl.message}
                  </p>
                ) : null}
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("avatarUrl", "", { shouldValidate: false });
                      form.clearErrors("avatarUrl");
                    }}
                    className="self-start text-xs text-ink-2 underline underline-offset-2 transition-colors hover:text-ink"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <Section title="Public details">
          <Field
            label="Display name"
            htmlFor="displayName"
            error={errors.displayName?.message}
            counter={counter(displayName ?? "", NAME_MAX)}
          >
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Ada Lovelace"
              invalid={Boolean(errors.displayName)}
              {...form.register("displayName")}
            />
          </Field>

          <Field
            label="Headline"
            htmlFor="headline"
            hint="One line. Appears under your name."
            error={errors.headline?.message}
            counter={counter(headline ?? "", LIMITS.headlineMax)}
          >
            <Input
              id="headline"
              placeholder="Building small tools for large problems"
              invalid={Boolean(errors.headline)}
              {...form.register("headline")}
            />
          </Field>

          <Field
            label="Bio"
            htmlFor="bio"
            hint="Shown on your public profile."
            error={errors.bio?.message}
            counter={counter(bio ?? "", LIMITS.bioMax)}
          >
            <Textarea
              id="bio"
              className="min-h-28"
              placeholder="A sentence or two about what you make."
              invalid={Boolean(errors.bio)}
              {...form.register("bio")}
            />
          </Field>
        </Section>

        <Section title="Links">
          {LINK_FIELDS.map(({ name, label, placeholder, icon: Icon }) => (
            <div key={name} className="flex flex-col gap-1.5">
              {/* Hand-rolled label: `Field` aligns its label row on the text
                  baseline, which leaves an inline icon sitting too low. */}
              <label
                htmlFor={name}
                className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2"
              >
                <Icon size={14} className="text-ink-3" aria-hidden />
                {label}
              </label>
              <Input
                id={name}
                type="url"
                inputMode="url"
                placeholder={placeholder}
                invalid={Boolean(errors[name])}
                className="font-mono text-[13px]"
                {...form.register(name)}
              />
              {errors[name] ? (
                <p role="alert" className="text-xs text-rejected-fg">
                  {errors[name]?.message}
                </p>
              ) : (
                <p className="text-xs text-ink-3">Optional</p>
              )}
            </div>
          ))}
        </Section>

        {state?.error ? (
          <Alert tone="error">{state.error}</Alert>
        ) : state?.success ? (
          <Alert tone="info">{state.success}</Alert>
        ) : null}

        {/* Inside the 720px column on purpose — see the note in project-form.tsx. */}
        <div className="sticky bottom-0 mt-2 border-t border-hairline bg-surface/95 py-4 backdrop-blur">
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className={cn(buttonClass({ variant: "secondary" }), "no-underline")}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
