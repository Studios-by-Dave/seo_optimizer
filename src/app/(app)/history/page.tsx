import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalHistoryPage() {
  const user = await getSessionUser();
  if (!user?.organizationId) return <div className="p-8 text-sm text-slate-500">Unauthorized</div>;
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: { crawls: { where: { status: "completed" }, orderBy: { finishedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Audit History</h1>
      <p className="mt-1 text-sm text-slate-500">Recent audits across all projects</p>
      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No projects yet.</p></div>
      ) : (
        <div className="mt-6 space-y-3">
          {projects.map((p) => {
            const latest = p.crawls[0];
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div>
                  <Link href={`/projects/${p.id}`} className="text-sm font-semibold text-slate-900 hover:text-slate-600">{p.name}</Link>
                  <p className="text-xs text-slate-400">{p.websiteUrl} · {p.domain}</p>
                </div>
                <div className="flex items-center gap-3">
                  {latest ? (
                    <>
                      <span className="text-xs text-slate-500">{new Date(latest.finishedAt || latest.startedAt).toLocaleDateString()} · {latest.pagesCrawled} pages</span>
                      <Link href={`/projects/${p.id}/history`} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">History →</Link>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">No audits yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
