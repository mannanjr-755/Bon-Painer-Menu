import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    restaurantId: string;
    restaurantSlug: string;
    restaurantName: string;
  }

  interface Session {
    user: {
      id: string;
      restaurantId: string;
      restaurantSlug: string;
      restaurantName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    restaurantId: string;
    restaurantSlug: string;
    restaurantName: string;
  }
}
