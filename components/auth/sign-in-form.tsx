"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signInAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import { signInSchema, type SignInValues as Values } from "@/lib/auth/schemas";

/*
 * Wraps the Server Action into the `(formData) => void` shape a `<form action>`
 * expects. The action itself takes `(prevState, formData)` because it is written
 * for `useActionState`; a form action is handed the form data as its only
 * argument, so the two shapes have to be bridged rather than passed straight
 * through.
 */
async function submitSignIn(formData: FormData): Promise<void> {
  await signInAction(null, formData);
}

export function SignInForm({ next }: { next?: string }) {
  const [state, setState] = useState<AuthFormState>(null);
  const [pending, startTransition] = useTransition();
  const [remember, setRemember] = useState(true);
  const form = useForm<Values>({
    // The shared schema, not a local copy: lib/auth/service.ts imports the data
    // store and so is server-only, which is why these used to be duplicated.
    resolver: zodResolver(signInSchema),
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
      fd.set("remember", remember ? "1" : "0");
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
    //
    // The `action` is what stops a pre-hydration submit from becoming a GET.
    // This was a real leak, caught over the public tunnel: with no `action`,
    // the browser's default is GET on the current URL, so submitting before
    // hydration navigated to
    //
    //   /sign-in?email=...&password=...
    //
    // which put the password in the address bar, the browser history and every
    // proxy and access log in between. Here React substitutes a throwing
    // placeholder instead, because a Server Action is a closure and cannot be
    // posted to directly - so the no-JS path fails visibly and harmlessly
    // rather than publishing the credential. Genuine no-JS support would need a
    // Route Handler that the form posts to as a plain endpoint.
    <form
      action={submitSignIn}
      onSubmit={onSubmit}
      onInput={() => setState(null)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* The action reads `next` from the form data; `remember` is a named checkbox. */}
      <input type="hidden" name="next" value={next ?? ""} />
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

      {/*
        This used to be decorative: it posted nothing and the cookie TTL was a
        hardcoded 30 days. It now sets a real `remember` flag, which the action
        uses to pick between a persistent cookie and a session cookie that
        expires when the browser closes.
      */}
      <label
        htmlFor="sign-in-remember"
        className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2"
      >
        <input
          id="sign-in-remember"
          name="remember"
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-4 shrink-0 cursor-pointer rounded border border-line accent-accent"
        />
        Keep me signed in
      </label>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Signing in\u2026" : "Sign in"}
      </Button>

      {/* Seeded account so the app can be tried without signing up first. */}
      <p className="text-xs text-ink-3">
        Demo account: <span className="font-mono">demo@projectory.app / projectory</span>
      </p>

      {/*
        The "Continue with GitHub" button was removed rather than left as a dead
        control. OAuth is not part of the plan, Clerk is the named provider, and
        a button that silently does nothing is worse than no button. When social
        login is added it belongs here, alongside the Clerk wiring.
      */}
    </form>
  );
}
