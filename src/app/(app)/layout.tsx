import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>
      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <img src="/assets/SWeblogo1.jpg" alt="SIS" className="h-8 w-8 rounded-lg object-contain ring-1 ring-black/5" />
          <div className="leading-none">
            <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#0B1D3A]">SHELBY WEB CO.</p>
            <p className="text-[11px] font-black text-[#0B1D3A]">SIS CONSOLE</p>
          </div>
        </div>
        {/* Mobile nav scroll */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {["/dashboard","/projects","/clients","/keywords","/reports","/settings"].map((h) => (
            <a key={h} href={h} className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{h.replace("/","")}</a>
          ))}
        </div>
        <main className="h-[calc(100vh-0px)] flex-1 overflow-y-auto md:h-screen">{children}</main>
      </div>
    </div>
  );
}
