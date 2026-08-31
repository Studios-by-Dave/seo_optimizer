import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getSessionUser();
  let projects: any[] = [];
  if (user?.organizationId) {
    projects = await prisma.project.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { crawls: { select: { status: true } }, _count: { select: { crawls: true } }, client: { select: { id: true, name: true } } },
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your client websites and audits</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No projects yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const latest = p.crawls[0];
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-slate-600">
                  {p.name}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500">{p.websiteUrl}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                  <span>{p._count.crawls} crawl{p._count.crawls !== 1 ? "s" : ""}</span>
                  {latest && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        latest.status === "completed"
                          ? "bg-green-50 text-green-700"
                          : latest.status === "running"
                          ? "bg-blue-50 text-blue-700"
                          : latest.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {latest.status}
                    </span>
                  )}
                  {p.client && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{p.client.name}</span>}
                  {p.industry && <span>{p.industry}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
