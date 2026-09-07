import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalOpportunitiesPage() {
  const user = await getSessionUser();
  if (!user?.organizationId) return <div className="p-8 text-sm text-slate-500">Unauthorized</div>;

  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { opportunities: true } } },
    orderBy: { createdAt: "desc" },
  });

  const opps = await prisma.opportunity.findMany({
    where: { project: { organizationId: user.organizationId } },
    orderBy: [{ priorityScore: "desc" }],
    take: 50,
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white p-1 ring-1 ring-black/5"><img src="/assets/SWeblogo1.jpg" alt="SIS" className="h-full w-full object-contain" /></div>
        <div><h1 className="text-2xl font-semibold">Opportunities</h1><p className="text-sm text-slate-500">Prioritized fixes across all projects — SIS Console</p></div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects yet.</p></div>
      ) : opps.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">No opportunities yet. Run audits to generate them.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/opportunities`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{p.name} → Opportunities</Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {opps.map((o) => (
            <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{o.issue}</p>
                  <p className="text-xs text-slate-500">{o.category} · {o.severity} · priority {o.priorityScore.toFixed(1)}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{o.recommendation}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${o.severity==="critical"?"bg-red-100 text-red-700":o.severity==="high"?"bg-orange-100 text-orange-700":o.severity==="medium"?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>{o.severity}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <Link href={`/projects/${o.project.id}/opportunities`} className="text-[#0B1D3A] underline">{o.project.name}</Link><span>·</span><span>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/opportunities`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">{p.name}: {p._count.opportunities} →</Link>
        ))}
      </div>
    </div>
  );
}
