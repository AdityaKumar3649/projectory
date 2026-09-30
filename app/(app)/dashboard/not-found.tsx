import Link from "next/link";
import { SearchX } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/primitives";

export default function DashboardProjectNotFound() {
  return (
    <Panel className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-pill bg-sunken text-ink-2">
        <SearchX aria-hidden size={20} />
      </span>

      <h2 className="text-[17px] font-semibold">Project not found</h2>

      <p className="max-w-[400px] text-[13px] leading-relaxed text-ink-3">
        It may have been deleted, or it belongs to another member.
      </p>

      <Link href="/dashboard" className={buttonClass()}>
        Back to your projects
      </Link>
    </Panel>
  );
}
