import { auth } from "./auth";

/** Returns the logged-in staff session, or null if not authenticated */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user?.restaurantId) return null;
  return session;
}
