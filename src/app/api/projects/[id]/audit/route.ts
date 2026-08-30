import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { runTechnicalAudit } from "@/lib/audit/technical";
import { calculateAuditScore } from "@/lib/audit/score";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) {
    return Response.json({ error: "No completed crawl found. Run a website audit first." }, { status: 400 });
  }

  await runTechnicalAudit(latestCrawl.id, id);
  const score = await calculateAuditScore(latestCrawl.id);

  return Response.json({ crawlId: latestCrawl.id, score });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) {
    return Response.json({ score: null, findings: [], crawlId: null });
  }

  const [score, findings] = await Promise.all([
    calculateAuditScore(latestCrawl.id),
    prisma.auditFinding.findMany({
      where: { crawlId: latestCrawl.id },
      orderBy: [{ severity: "asc" }, { count: "desc" }],
    }),
  ]);

  return Response.json({
    crawlId: latestCrawl.id,
    score,
    findings: findings.map((f) => ({
      ...f,
      affectedUrls: JSON.parse(f.affectedUrls || "[]"),
      evidence: JSON.parse(f.evidence || "[]"),
    })),
  });
}
