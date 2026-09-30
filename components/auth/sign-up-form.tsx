"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signUpAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/primitives";
import {
  signUpSchema,
  type SignUpValues as Values,
} from "@/lib/auth/schemas";

/** See the note on `submitSignIn` in sign-in-form.tsx for why this wrapper exists. */
async function submitSignUp(formData: FormData): Promise<void> {
  await signUpAction(null, formData);
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, setState] = useState<AuthFormState>(null);
  const [pending, startTransition] = useTransition();
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>(undefined);
  const form = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "" },
  });

  const nameError = form.formState.errors.name?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  // A field-level message is more precise than the banner, so the banner only
  // appears when the failure was not pinned to a specific input.
  const showAlert =
    Boolean(state?.error) && !nameError && !emailError && !passwordError && !termsError;

  const onSubmit = form.handleSubmit((values) => {
    if (!terms) {
      setTermsError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    setTermsError(undefined);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", values.name);
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("terms", "on");
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
    <form
      action={submitSignUp}
      onSubmit={onSubmit}
      onInput={() => setState(null)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/*
        Same reason as the sign-in form, and the same fix: without an `action` a
        pre-hydration submit defaults to GET and publishes the password in the
        URL. React's throwing placeholder makes that path fail harmlessly
        instead. See the longer note in sign-in-form.tsx.

        `terms` needs no hidden field - it is a named checkbox, and the action
        rejects anything that is neither "on" nor "true", so consent still
        cannot be skipped.
      */}
      <input type="hidden" name="next" value={next ?? ""} />
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
          The server action reads `terms` and refuses the signup without it, so
          the box is enforced rather than decorative. */}
      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-ink-2">
        <input
          type="checkbox"
          name="terms"
          checked={terms}
          onChange={(event) => {
            setTerms(event.target.checked);
            if (termsError) setTermsError(undefined);
          }}
          aria-invalid={termsError ? true : undefined}
          aria-describedby={termsError ? "terms-error" : undefined}
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
      {termsError ? (
        <p id="terms-error" role="alert" className="text-xs text-rejected-fg">
          {termsError}
        </p>
      ) : null}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Creating account\u2026" : "Create account"}
      </Button>

      {/*
        The "Continue with GitHub" button was removed rather than left as a dead
        control. OAuth is not part of the plan, Clerk is the named provider, and
        a button that silently does nothing is worse than no button.
      */}
    </form>
  );
}
