"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signUpAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";

/**
 * Mirrors `signUpSchema` in `lib/auth/service.ts` so the browser and the
 * server reject exactly the same input. Zod 4 note: messages use `{ error }`.
 */
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(50, { error: "Name must be 50 characters or fewer" }),
  email: z.email({ error: "Enter a valid email address" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(200, { error: "That password is too long" }),
});

type Values = z.infer<typeof schema>;

export function SignUpForm({ next }: { next?: string }) {
  const [state, setState] = useState<AuthFormState>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "" },
  });

  const nameError = form.formState.errors.name?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  // A field-level message is more precise than the banner, so the banner only
  // appears when the failure was not pinned to a specific input.
  const showAlert = Boolean(state?.error) && !nameError && !emailError && !passwordError;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", values.name);
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("next", next ?? "");
      const result = await signUpAction(null, fd);
      if (result?.error) {
        setState(result);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field in values) form.setError(field as keyof Values, { message });
        }
      }
      // On success the action calls redirect(), which throws to travel to the
      // destination — so nothing below this line ever runs. No try/catch here.
    });
  });

  return (
    // `onInput` drops the server banner as soon as the user starts fixing
    // things, instead of leaving a stale failure above live input.
    <form onSubmit={onSubmit} onInput={() => setState(null)} noValidate className="flex flex-col gap-5">
      {showAlert ? <Alert tone="error">{state?.error}</Alert> : null}

      <Field label="Full name" htmlFor="sign-up-name" error={nameError}>
        <Input
          id="sign-up-name"
          autoComplete="name"
          placeholder="Aditya Sharma"
          invalid={Boolean(nameError)}
          {...form.register("name")}
        />
      </Field>

      <Field label="Email address" htmlFor="sign-up-email" error={emailError}>
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(emailError)}
          {...form.register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="sign-up-password"
        hint="At least 8 characters"
        error={passwordError}
      >
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          invalid={Boolean(passwordError)}
          {...form.register("password")}
        />
      </Field>

      {/* The label wraps the whole sentence so the checkbox is named and
          clickable from the text; clicking a link inside a label does not
          toggle the control, so Terms and Privacy stay independently clickable.
          The action does not read a `terms` field yet, so nothing is enforced. */}
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-ink-2">
        <input
          type="checkbox"
          name="terms"
          className="mt-px size-4 shrink-0 cursor-pointer rounded border border-line accent-accent"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/terms"
            className="text-accent underline-offset-2 hover:text-accent-hover hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-accent underline-offset-2 hover:text-accent-hover hover:underline"
          >
            Privacy Policy
          </Link>
        </span>
      </label>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Creating account\u2026" : "Create account"}
      </Button>

      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-hairline" />
        <span className="text-xs text-ink-3">or</span>
        <span aria-hidden className="h-px flex-1 bg-hairline" />
      </div>

      {/* OAuth is not wired up yet. `type="button"` keeps it out of the submit
          path so it can never post credentials to the credentials action. */}
      <Button type="button" variant="secondary" size="lg" block>
        Continue with GitHub
      </Button>
    </form>
  );
}
