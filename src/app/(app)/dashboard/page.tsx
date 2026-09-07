import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import { calculateAuditScore } from "@/lib/audit/score";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const orgId = user?.organizationId;

  let projectCount = 0;
  let crawlCount = 0;
  let issuesCount = 0;
  let keywordsCount = 0;
  let latestProjects: any[] = [];
  let recentHistory: { id: string; projectName: string; projectId: string; date: Date; pagesCrawled: number }[] = [];
  let trendPoints: { label: string; score: number | null; date: string }[] = [];

  if (orgId) {
    [projectCount, crawlCount, issuesCount, keywordsCount] = await Promise.all([
      prisma.project.count({ where: { organizationId: orgId } }),
      prisma.crawl.count({ where: { project: { organizationId: orgId } } }),
      prisma.auditFinding.count({ where: { crawl: { project: { organizationId: orgId } } } }),
      prisma.keyword.count({ where: { project: { organizationId: orgId } } }),
    ]);
    latestProjects = await prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        crawls: { orderBy: { startedAt: "desc" }, take: 1 },
        _count: { select: { crawls: true } },
      },
    });
    const recentCrawls = await prisma.crawl.findMany({
      where: { project: { organizationId: orgId }, status: "completed" },
      orderBy: { finishedAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true } } },
    });
    recentHistory = recentCrawls.map((c) => ({
      id: c.id,
      projectName: c.project.name,
      projectId: c.project.id,
      date: (c.finishedAt || c.startedAt) as Date,
      pagesCrawled: c.pagesCrawled,
    }));
    // Build trend: score per recent crawl (oldest → newest)
    const crawlsAsc = [...recentCrawls].reverse();
    trendPoints = await Promise.all(
      crawlsAsc.map(async (c) => {
        const s = await calculateAuditScore(c.id).catch(() => null);
        const d = (c.finishedAt || c.startedAt) as Date;
        return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), score: s?.overall ?? null, date: d.toISOString() };
      })
    );
  }

  return (
    <div className="p-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <img
          src="/assets/SIS_landscape.jpg"
          alt="SIS Console — SEO Intelligence Suite"
          className="h-[240px] w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D3A]/80 via-[#0B1D3A]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/80">SHELBY WEB CO. — SEO INTELLIGENCE SUITE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight drop-shadow">SIS Console</h1>
          <p className="mt-1 text-sm text-white/80">Welcome back, {user?.name || user?.email} — your SEO command center</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={String(projectCount)} href="/projects" accent="blue" />
        <StatCard label="Total Crawls" value={String(crawlCount)} href="/history" accent="green" />
        <StatCard label="Issues Found" value={String(issuesCount)} href="/opportunities" accent="amber" />
        <StatCard label="Keywords Tracked" value={String(keywordsCount)} href="/keywords" accent="purple" />
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
              className="mt-3 inline-block rounded-lg bg-[#0B1D3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#132a52]"
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

      {trendPoints.filter((p) => p.score !== null).length >= 1 && (
        <div className="mt-8">
          <ScoreTrendChart points={trendPoints} />
        </div>
      )}

      {recentHistory.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent Audits</h3>
            <Link href="/history" className="text-xs font-medium text-[#0B1D3A] hover:underline">View all history →</Link>
          </div>
          <div className="mt-4 space-y-2">
            {recentHistory.map((h) => (
              <Link key={h.id} href={`/projects/${h.projectId}/history`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 hover:bg-white">
                <div>
                  <p className="text-sm font-medium text-slate-900">{h.projectName}</p>
                  <p className="text-xs text-slate-500">{h.date.toLocaleDateString()} · {h.pagesCrawled} pages</p>
                </div>
                <span className="text-xs text-slate-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
        Crawls, SEO scoring, and competitor intelligence will appear here as you run audits.
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, href }: { label: string; value: string; accent: string; href?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };
  const inner = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colors[accent]?.split(" ")[1] || "text-slate-900"}`}>{value}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm hover:border-slate-300 transition">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-xl border border-slate-200 bg-white p-5">{inner}</div>;
}
