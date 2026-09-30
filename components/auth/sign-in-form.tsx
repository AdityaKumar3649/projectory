"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signInAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";

/**
 * Mirrors `signInSchema` in `lib/auth/service.ts` so the browser and the
 * server reject exactly the same input. Zod 4 note: messages use `{ error }`.
 */
const schema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, { error: "Enter your password" }),
});

type Values = z.infer<typeof schema>;

export function SignInForm({ next }: { next?: string }) {
  const [state, setState] = useState<AuthFormState>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  // A field-level message is more precise than the banner, so the banner only
  // appears when the failure was not pinned to a specific input.
  const showAlert = Boolean(state?.error) && !emailError && !passwordError;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("next", next ?? "");
      const result = await signInAction(null, fd);
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

      <Field label="Email address" htmlFor="sign-in-email" error={emailError}>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(emailError)}
          {...form.register("email")}
        />
      </Field>

      <Field label="Password" htmlFor="sign-in-password" error={passwordError}>
        <Input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(passwordError)}
          {...form.register("password")}
        />
      </Field>

      <label
        htmlFor="sign-in-remember"
        className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2"
      >
        <input
          id="sign-in-remember"
          name="remember"
          type="checkbox"
          defaultChecked
          className="size-4 shrink-0 cursor-pointer rounded border border-line accent-accent"
        />
        Remember me
      </label>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Signing in\u2026" : "Sign in"}
      </Button>

      {/* Seeded account so the app can be tried without signing up first. */}
      <p className="text-xs text-ink-3">
        Demo account: <span className="font-mono">demo@projectory.app / projectory</span>
      </p>

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
