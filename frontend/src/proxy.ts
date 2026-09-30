import NextAuth from "next-auth";
import { authConfig } from "@backend/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(function proxy(req) {
  const { pathname } = req.nextUrl;

  // Protect admin routes (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.auth || !req.auth.user?.restaurantId) {
      const loginUrl = new URL("/admin/login", req.nextUrl.origin);
      return Response.redirect(loginUrl);
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
