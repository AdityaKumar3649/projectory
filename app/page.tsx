import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

/**
 * The root is only a router. `/` itself is not a Member 1 deliverable, so it
 * sends people wherever they actually belong: the dashboard if they have a
 * session, otherwise the sign-in screen.
 */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/sign-in");
}
