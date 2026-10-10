/**
 * Who is allowed into the admin area.
 *
 * There was one copy of this rule in the route layout and another in
 * `app/actions/admin.ts`. Two copies of an authorisation rule is one copy too
 * many: the layout could drift from the action and the route would look locked
 * while the action underneath stayed open, or the reverse. Both now call this.
 *
 * The check is deliberately a single named constant rather than the string
 * `"user_demo"` written inline, so that when Member 3's `accounts.role` column
 * lands there is exactly one line to change and one place to grep.
 *
 * The layout check is for the user's benefit - it stops a non-admin reaching a
 * page they cannot use. It is NOT the security boundary. Every mutation is
 * re-checked inside the Server Action, because a layout is only a UI concern:
 * anyone can POST to an action endpoint directly, skipping every layout in the
 * app.
 */

/** The account granted admin on the seeded demo database. */
export const ADMIN_USER_ID = "user_demo";

export function isAdmin(userId: string | undefined | null): boolean {
  return userId === ADMIN_USER_ID;
}

/**
 * Explains the current policy, for the admin UI to show rather than leaving the
 * rule as folklore. Surfacing it in the product is also what stops this looking
 * like an oversight when someone reviews the code.
 */
export const ADMIN_POLICY_NOTE =
  "Access is currently granted to the seeded demo account. When Member 3's " +
  "accounts table lands this becomes a role column, and this note changes with it.";