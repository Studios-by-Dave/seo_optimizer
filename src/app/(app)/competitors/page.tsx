import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalCompetitorsPage() {
  const user = await getSessionUser();
  if (!user?.organizationId) return <div className="p-8 text-sm text-slate-500">Unauthorized</div>;

  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: { competitors: true },
    orderBy: { createdAt: "desc" },
  });

  const allCompetitors = await prisma.competitor.findMany({
    where: { project: { organizationId: user.organizationId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white p-1 ring-1 ring-black/5"><img src="/assets/SWeblogo1.jpg" alt="SIS" className="h-full w-full object-contain" /></div>
        <div><h1 className="text-2xl font-semibold">Competitors</h1><p className="text-sm text-slate-500">Competitor intelligence across all projects — SIS Console</p></div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects yet.</p></div>
      ) : allCompetitors.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">No competitors tracked yet. Add them per project.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/competitors`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{p.name} → Competitors</Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 border-b bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-5">Competitor</div><div className="col-span-3">Domain</div><div className="col-span-2">Status</div><div className="col-span-2">Project</div>
          </div>
          {allCompetitors.map((c) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 border-b px-4 py-3 text-sm last:border-0">
              <div className="col-span-5 font-medium text-slate-900">{c.name}<div className="text-xs text-slate-400">{c.url}</div></div>
              <div className="col-span-3 text-slate-600">{c.domain}</div>
              <div className="col-span-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status==="completed"?"bg-green-50 text-green-700":c.status==="failed"?"bg-red-50 text-red-700":"bg-slate-100 text-slate-600"}`}>{c.status}</span></div>
              <div className="col-span-2"><Link href={`/projects/${c.project.id}/competitors`} className="text-xs text-[#0B1D3A] underline">{c.project.name}</Link></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/competitors`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">{p.name}: {p.competitors.length} competitors →</Link>
        ))}
      </div>
    </div>
  );
}
