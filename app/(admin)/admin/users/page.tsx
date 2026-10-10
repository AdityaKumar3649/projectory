import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { ADMIN_POLICY_NOTE } from "@/lib/auth/roles";
import { adminGetAllData } from "@/app/actions/admin";
import { relativeTime } from "@/lib/utils";
import { AdminUsersClient } from "./users-client";

export const metadata: Metadata = {
  title: "Members",
  description: "Every account registered on Projectory.",
};

export default async function AdminUsersPage() {
  const viewer = await requireUser();
  const { accounts, projects } = await adminGetAllData();

  const rows = accounts.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    isAdmin: a.isAdmin,
    projectCount: projects.filter((p) => p.ownerId === a.id).length,
    joined: relativeTime(a.createdAt),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">Members</h1>
          <p className="text-[13px] text-ink-3">
            Every account registered on Projectory.
          </p>
        </div>
      </div>

      {/*
        The access rule is stated in the product, not just in the source. A
        moderator seeing "why can only one account reach this?" should not have
        to go and read the code to find out.
      */}
      <p className="rounded-card bg-pending px-4 py-3 text-[12px] text-pending-fg">
        {ADMIN_POLICY_NOTE}
      </p>

      <AdminUsersClient accounts={rows} viewerId={viewer.id} />
    </div>
  );
}