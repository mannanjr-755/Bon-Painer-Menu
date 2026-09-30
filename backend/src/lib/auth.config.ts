import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config (no Prisma / Node-only imports) */
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  session: { strategy: "jwt" as const },
  trustHost: true,
  callbacks: {
    // Proxy/middleware runs on this config only, so it must copy the custom
    // claims off the JWT itself — otherwise req.auth.user.restaurantId is
    // undefined and every /admin request is bounced to the login page.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.restaurantId = token.restaurantId as string;
        session.user.restaurantSlug = token.restaurantSlug as string;
        session.user.restaurantName = token.restaurantName as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
