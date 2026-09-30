import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@backend/lib/session";
import { signOut } from "@backend/lib/auth";
import { LayoutList, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  if (!session) {
    redirect("/admin/login");
  }

  const restaurantName = session.user.restaurantName;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)]">
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BonPainer"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--gold-bright)]">{restaurantName}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <Link
            href="/admin/menu"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--gold-bright)]"
          >
            <LayoutList className="h-4 w-4" />
            Menu Management
          </Link>
        </nav>

        <div className="border-t border-[var(--border)] px-3 py-3">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-dim)] transition hover:bg-[var(--bg-card)] hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
