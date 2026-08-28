import { getSessionUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getSessionUser();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Welcome back, {user?.name || user?.email}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your SEO command center. Projects and audits will appear here.
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Phase 1 foundation in progress — Projects and audit modules coming next.
      </div>
    </div>
  );
}
