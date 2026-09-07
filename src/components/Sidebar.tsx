"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; icon?: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/clients", label: "Clients" },
  { href: "/keywords", label: "Keywords" },
  { href: "/competitors", label: "Competitors" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/reports", label: "Reports" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export function Sidebar({ user }: { user: { name: string | null; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Shelby Web Co. logo */}
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
            <Image
              src="/assets/SWeblogo1.jpg"
              alt="Shelby Web Co."
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0 leading-none">
            <p className="text-[11px] font-extrabold tracking-[0.08em] text-[#0B1D3A]">
              SHELBY WEB CO.
            </p>
            <p className="mt-0.5 text-[13px] font-black tracking-tight text-[#0B1D3A]">
              SIS CONSOLE
            </p>
            <p className="mt-0.5 text-[9px] font-medium tracking-[0.14em] text-slate-500">
              SEO INTELLIGENCE SUITE
            </p>
          </div>
        </Link>
        <p className="mt-3 truncate text-xs text-slate-500">{user.name || user.email}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#0B1D3A] text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 hover:text-[#0B1D3A]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-3 py-4">
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
