import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data/profile";
import { AccountSection } from "@/components/profile/account-section";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = {
  title: "Profile",
};

/**
 * `requireUser` may call `redirect()`, which THROWS - so it is never wrapped in
 * a try/catch here. `(app)/layout.tsx` already renders the nav and centres this
 * in the page column, so this route only adds its own content wrapper.
 */
export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const profile = await getProfile(user.id, user.email);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <ProfileForm profile={profile} />
      <AccountSection user={user} createdAt={profile.createdAt} isDemo={user.isDemo} />
    </div>
  );
}
