import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Staff login",
};

/** Staff dashboard lives in the CRM app — keep /login so home links still work. */
export default function LoginPage() {
  const crmLogin =
    process.env.NEXT_PUBLIC_CRM_URL?.replace(/\/$/, "") || "http://localhost:3001";
  redirect(`${crmLogin}/login`);
}
