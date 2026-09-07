import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import ReportExportControl from "@/components/ReportExportControl";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user?.organizationId) return <div className="p-8 text-sm text-slate-500">Unauthorized</div>;

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { crawls: { where: { status: "completed" }, orderBy: { finishedAt: "desc" }, take: 1 } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white p-1 ring-1 ring-black/5"><img src={org?.logoUrl || "/assets/SWeblogo1.jpg"} alt="SIS" className="h-full w-full object-contain" /></div>
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-slate-500">White-label audit reports — {org?.name || "SIS Console"}</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects yet. Create one to generate reports.</p></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const latest = p.crawls[0];
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.websiteUrl}</p>
                <div className="mt-3 text-xs text-slate-400">
                  {latest ? `${latest.pagesCrawled} pages · ${new Date(latest.finishedAt || latest.startedAt).toLocaleDateString()}` : "No completed crawls yet"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/projects/${p.id}/audit`} className="rounded-md bg-[#0B1D3A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#132a52]">View Audit</Link>
                  <Link href={`/projects/${p.id}/history`} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">History</Link>
                </div>
                {latest && <div className="mt-4"><ReportExportControl projectId={p.id} /></div>}
                <p className="mt-3 text-[10px] text-slate-400">Branding: {org?.name || "SIS Console"} · {org?.primaryColor || "#0B1D3A"} · <Link href="/settings" className="underline">edit</Link></p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold">How reports work</h3>
        <p className="mt-1 text-xs text-slate-500">Each project audit can be exported as a white-label PDF using your org logo and primary color from Settings. Use Reports to share with clients.</p>
        <Link href="/settings" className="mt-3 inline-block text-xs font-medium text-[#0B1D3A] underline">Edit branding in Settings →</Link>
      </div>
    </div>
  );
}
