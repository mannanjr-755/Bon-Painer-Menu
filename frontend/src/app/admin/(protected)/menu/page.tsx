import type { Metadata } from "next";
import { AdminMenuManager } from "@/components/AdminMenuManager";

export const metadata: Metadata = {
  title: "Menu Management",
};

export default function AdminMenuPage() {
  return (
    <div className="p-6">
      <AdminMenuManager />
    </div>
  );
}
