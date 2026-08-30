import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const orgId = user?.organizationId;

  let projectCount = 0;
  let crawlCount = 0;
  let latestProjects: any[] = [];

  if (orgId) {
    projectCount = await prisma.project.count({ where: { organizationId: orgId } });
    crawlCount = await prisma.crawl.count({ where: { project: { organizationId: orgId } } });
    latestProjects = await prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        crawls: { orderBy: { startedAt: "desc" }, take: 1 },
        _count: { select: { crawls: true } },
      },
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Welcome back, {user?.name || user?.email}</h1>
      <p className="mt-1 text-sm text-slate-500">Your SEO command center</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={String(projectCount)} accent="blue" />
        <StatCard label="Total Crawls" value={String(crawlCount)} accent="green" />
        <StatCard label="Issues Found" value="—" accent="amber" />
        <StatCard label="Keywords Tracked" value="—" accent="purple" />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link href="/projects" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            View all →
          </Link>
        </div>

        {latestProjects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">No projects yet.</p>
            <Link
              href="/projects/new"
              className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestProjects.map((p) => {
              const latest = p.crawls[0];
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-600">
                    {p.name}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-500">{p.websiteUrl}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span>{p._count.crawls} crawl{p._count.crawls !== 1 ? "s" : ""}</span>
                    {latest && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          latest.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : latest.status === "running"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {latest.status}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
        Crawls, SEO scoring, and competitor intelligence will appear here as you run audits.
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colors[accent]?.split(" ")[1] || "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
