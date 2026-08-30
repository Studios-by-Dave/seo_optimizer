import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import RunAuditButton from "@/components/RunAuditButton";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;

  if (!user?.organizationId) notFound();

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      crawls: { orderBy: { startedAt: "desc" }, take: 5 },
      _count: { select: { crawls: true } },
    },
  });

  if (!project) notFound();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{project.websiteUrl}</p>
        </div>
        <Link
          href="/projects"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to Projects
        </Link>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Domain" value={project.domain} />
        <InfoCard label="Industry" value={project.industry || "—"} />
        <InfoCard label="Location" value={project.businessLocation || "—"} />
        <InfoCard label="Crawls" value={String(project._count.crawls)} />
      </div>

      {project.targetServiceArea && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Target Service Area</p>
          <p className="mt-1 text-sm text-slate-900">{project.targetServiceArea}</p>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Audit</h2>
          <RunAuditButton projectId={project.id} />
        </div>
        {project.crawls.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">No audits yet. Run your first website audit in the next section.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {project.crawls.map((crawl) => (
              <div
                key={crawl.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-3"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      crawl.status === "completed"
                        ? "bg-green-500"
                        : crawl.status === "running"
                        ? "bg-blue-500"
                        : crawl.status === "failed"
                        ? "bg-red-500"
                        : "bg-slate-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{crawl.status}</p>
                    <p className="text-xs text-slate-400">
                      {crawl.startedAt.toLocaleDateString()} {crawl.startedAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{crawl.pagesCrawled} crawled</span>
                  <span className="mx-2">·</span>
                  <span>{crawl.totalDiscovered} discovered</span>
                  {crawl.status === "completed" && (
                    <>
                      <Link
                        href={`/projects/${project.id}/audit`}
                        className="ml-2 rounded-md bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Audit Report →
                      </Link>
                      <Link
                        href={`/projects/${project.id}/urls?crawlId=${crawl.id}`}
                        className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        View URLs →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
