"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus } from "lucide-react";

import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from "@/app/actions/projects";
import { FormSection } from "@/components/project/form-section";
import { TagInput } from "@/components/project/tag-input";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert, StatusBadge } from "@/components/ui/primitives";
import type { Project } from "@/lib/contracts/types";
import { relativeTime } from "@/lib/utils";
import {
  LIMITS,
  MAX_TAGS,
  projectInputSchema,
  type ProjectFormValues,
} from "@/lib/validators/project";

/**
 * Fields the shared schema owns. Anything else a Server Action reports in
 * `fieldErrors` (`_form`, an unknown key from a future validator) is a
 * form-level problem, not a message to pin under a particular input.
 */
const KNOWN_FIELDS = [
  "title",
  "description",
  "longDescription",
  "repoUrl",
  "liveUrl",
  "tags",
  "organizationId",
] as const;

/**
 * Create and edit share this form because they share a schema and a Server
 * Action pair — splitting them would mean two copies of the same validation
 * copy to keep in step. `mode` only changes the wording, the submit label and
 * the status strip.
 */
export function ProjectForm({
  project,
  mode,
}: {
  project?: Project;
  mode: "create" | "edit";
}) {
  const [state, setState] = useState<ProjectFormState>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectInputSchema),
    mode: "onBlur",
    defaultValues: {
      title: project?.title ?? "",
      description: project?.description ?? "",
      longDescription: project?.longDescription ?? "",
      repoUrl: project?.repoUrl ?? "",
      liveUrl: project?.liveUrl ?? "",
      tags: project?.tags ?? [],
      organizationId: project?.organizationId ?? "",
    },
  });

  const { errors } = form.formState;
  // Counters are driven by useWatch so they track typing without re-rendering
  // the whole form on every unrelated keystroke.
  const titleValue = useWatch({ control: form.control, name: "title" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", values.title);
      fd.set("description", values.description);
      fd.set("longDescription", values.longDescription);
      fd.set("repoUrl", values.repoUrl);
      fd.set("liveUrl", values.liveUrl);
      // Tags are a real array, but the action reads FormData, so they travel
      // as JSON and are parsed back on the server.
      fd.set("tags", JSON.stringify(values.tags));
      fd.set("organizationId", values.organizationId);
      fd.set("projectId", project?.id ?? "");

      const action = project ? updateProjectAction : createProjectAction;
      const result = await action(null, fd);

      // On success the action redirects, which throws on purpose — never
      // wrapped in try/catch, so this is simply the end of the handler.
      if (result?.error) {
        setState(result);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field in values) {
            form.setError(field as keyof ProjectFormValues, { message });
          }
        }
      }
    });
  });

  const hasFieldErrors = Object.keys(state?.fieldErrors ?? {}).some((key) =>
    (KNOWN_FIELDS as readonly string[]).includes(key),
  );
  const formError = state?.error && !hasFieldErrors ? state.error : null;

  const isRejected = mode === "edit" && project?.status === "rejected";

  let submitLabel = "Save changes";
  if (mode === "create") submitLabel = "Create project";
  if (pending) submitLabel = "Saving…";

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      {/*
        `py-1.5 -my-1.5` rather than padding alone. The link's text is 13px, so
        without vertical padding the tap target is 20px tall - under the 24px
        minimum, and awkward to hit on a phone. The negative margin keeps the
        optical spacing identical to before, so the fix costs no vertical
        rhythm, and `inline-flex` lets the padding take effect on an anchor.
      */}
      <Link
        href="/dashboard"
        className="-my-1.5 inline-flex items-center gap-1.5 self-start rounded-sm py-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={14} className="text-ink-3" aria-hidden />
        Projects
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          {mode === "create" ? "New project" : "Edit project"}
        </h1>
        <p className="text-sm text-ink-3">
          {mode === "create" ? "Fields marked with an asterisk are required." : project?.title}
        </p>
      </div>

      {project ? (
        <div className="flex items-center gap-3 rounded-input border border-hairline bg-surface px-4 py-3.5">
          <StatusBadge status={project.status} />
          <span className="flex-1" />
          {/* "2 days ago" is computed against Date.now(), so the server and the
              browser can disagree by a unit on a long-lived tab. */}
          <span suppressHydrationWarning className="text-[13px] text-ink-3">
            Last updated {relativeTime(project.updatedAt)}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Alert
          tone="info"
          title="Submitted projects are reviewed before they appear publicly"
        >
          You&rsquo;ll see the decision on your dashboard — usually within a day.
        </Alert>

        {isRejected ? (
          <Alert tone="error" title="This project was rejected">
            You can revise it and save — it will go back into the review queue.
          </Alert>
        ) : null}
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormSection label="Details">
          <Field
            label={
              <span>
                Title<span className="text-rejected-fg"> *</span>
              </span>
            }
            htmlFor="title"
            counter={`${titleValue.length} / ${LIMITS.titleMax}`}
            error={errors.title?.message}
          >
            <Input
              id="title"
              autoComplete="off"
              placeholder="Terminal Focus — a terminal that stays out of the way"
              invalid={!!errors.title}
              // Mirrors the react-hook-form default so the value is present in
              // the server-rendered HTML. Without it the edit form paints empty
              // and only fills in on hydration, which reads as a flash.
              defaultValue={project?.title ?? ""}
              {...form.register("title")}
            />
          </Field>

          <Field
            label={
              <span>
                Description<span className="text-rejected-fg"> *</span>
              </span>
            }
            htmlFor="description"
            counter={`${descriptionValue.length} / ${LIMITS.descriptionMax}`}
            error={errors.description?.message}
            hint="The one-liner shown on cards and in search results."
          >
            <Textarea
              id="description"
              rows={2}
              className="min-h-18"
              placeholder="A focused terminal that stays out of the way."
              invalid={!!errors.description}
              defaultValue={project?.description ?? ""}
              {...form.register("description")}
            />
          </Field>

          <Field
            label="Long description"
            htmlFor="longDescription"
            hint="Optional. Markdown is not rendered yet — plain text only."
            error={errors.longDescription?.message}
          >
            <Textarea
              id="longDescription"
              rows={6}
              className="min-h-40"
              placeholder="What it does, how it works, and what you learned building it."
              invalid={!!errors.longDescription}
              defaultValue={project?.longDescription ?? ""}
              {...form.register("longDescription")}
            />
          </Field>
        </FormSection>

        <FormSection label="Links">
          <Field
            label={
              <span>
                Repository URL<span className="text-rejected-fg"> *</span>
              </span>
            }
            htmlFor="repoUrl"
            hint="Where the code lives"
            error={errors.repoUrl?.message}
          >
            <Controller
              control={form.control}
              name="repoUrl"
              render={({ field }) => (
                <Input
                  id="repoUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  placeholder="https://github.com/you/project"
                  invalid={!!errors.repoUrl}
                  {...field}
                />
              )}
            />
          </Field>

          <Field
            label="Live URL"
            htmlFor="liveUrl"
            hint="Optional — omit if the project isn't deployed"
            error={errors.liveUrl?.message}
          >
            <Controller
              control={form.control}
              name="liveUrl"
              render={({ field }) => (
                <Input
                  id="liveUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  placeholder="https://your-project.app"
                  invalid={!!errors.liveUrl}
                  {...field}
                />
              )}
            />
          </Field>
        </FormSection>

        <FormSection label="Organisation (optional)">
          {/*
            Free text rather than a <select>. There is no Organisations table yet —
            Member 3 owns that entity — and a dropdown of invented company names
            would present fake data as if it were real. When the table lands,
            swap this Input for a Select populated from a real query, and change
            `organizationId` to hold an id rather than a display name.
          */}
          <Field
            label="Organisation"
            htmlFor="organizationId"
            hint="Leave blank if this is a solo project."
            error={errors.organizationId?.message}
          >
            <Input
              id="organizationId"
              placeholder="e.g. Acme Labs"
              autoComplete="organization"
              defaultValue={project?.organizationId ?? ""}
              {...form.register("organizationId")}
            />
          </Field>
        </FormSection>

        <FormSection label="Tags">
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              // The hint lives inside TagInput because the "Maximum 5 tags" state
              // has to replace it, and it is the same live region.
              <TagInput
                id="tags"
                value={field.value ?? []}
                onChange={field.onChange}
                error={errors.tags?.message}
                max={MAX_TAGS}
                hint={`Up to ${LIMITS.maxTags} tags. Used to filter projects in Explore.`}
              />
            )}
          />
        </FormSection>

        {/* No negative margins here: the form column is clamped to 720px, so
            breaking out to the full main width would overhang the section
            rules above by 24px on each side. Keeping the bar inside the
            column also aligns the buttons with the field edges. */}
        <div className="sticky bottom-0 mt-2 border-t border-hairline bg-surface/95 py-4 backdrop-blur">
          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard" className={buttonClass({ variant: "secondary" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={pending}>
              {mode === "create" && !pending ? <Plus size={15} aria-hidden /> : null}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
