import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex">
      <Sidebar user={user} />
      <main className="h-screen flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
