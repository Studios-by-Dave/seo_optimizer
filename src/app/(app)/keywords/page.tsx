import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalKeywordsPage() {
  const user = await getSessionUser();
  if (!user?.organizationId) return <div className="p-8 text-sm text-slate-500">Unauthorized</div>;

  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { keywords: true } } },
    orderBy: { createdAt: "desc" },
  });

  const keywords = await prisma.keyword.findMany({
    where: { project: { organizationId: user.organizationId } },
    orderBy: [{ priorityScore: "desc" }],
    take: 50,
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white p-1 ring-1 ring-black/5"><img src="/assets/SWeblogo1.jpg" alt="SIS" className="h-full w-full object-contain" /></div>
        <div>
          <h1 className="text-2xl font-semibold">Keywords</h1>
          <p className="text-sm text-slate-500">Global keyword intelligence — SIS Console</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects yet. Create one to track keywords.</p><Link href="/projects/new" className="mt-3 inline-block rounded-lg bg-[#0B1D3A] px-4 py-2 text-sm font-medium text-white">Create Project</Link></div>
      ) : keywords.length === 0 ? (
        <div className="mt-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">No keywords yet. Run a crawl and keyword research on a project.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}/keywords`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{p.name} → Keywords</Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 border-b bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-5">Keyword</div><div className="col-span-2">Volume</div><div className="col-span-2">Difficulty</div><div className="col-span-3">Project</div>
          </div>
          {keywords.map((k) => (
            <div key={k.id} className="grid grid-cols-12 gap-2 border-b px-4 py-3 text-sm last:border-0">
              <div className="col-span-5 font-medium text-slate-900">{k.keyword}<span className="ml-2 text-xs text-slate-400">{k.category || k.source}</span></div>
              <div className="col-span-2 text-slate-600">{k.searchVolume ?? "—"}</div>
              <div className="col-span-2 text-slate-600">{k.keywordDifficulty ?? "—"}</div>
              <div className="col-span-3"><Link href={`/projects/${k.project.id}/keywords`} className="text-xs text-[#0B1D3A] underline">{k.project.name}</Link></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/keywords`} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">{p.name}: {p._count.keywords} keywords →</Link>
        ))}
      </div>
    </div>
  );
}
