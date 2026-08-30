import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateOpportunities } from "@/lib/audit/opportunities";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) return Response.json({ opportunities: [], stats: null });

  const opportunities = await prisma.opportunity.findMany({
    where: { crawlId: latestCrawl.id },
    orderBy: { priorityScore: "desc" },
  });

  const stats = await prisma.opportunity.groupBy({
    by: ["status"],
    where: { crawlId: latestCrawl.id },
    _count: true,
  });

  return Response.json({
    opportunities: opportunities.map((o) => ({
      ...o,
      affectedUrls: JSON.parse(o.affectedUrls || "[]"),
      evidence: JSON.parse(o.evidence || "[]"),
    })),
    stats: Object.fromEntries(stats.map((s) => [s.status, s._count])),
    crawlId: latestCrawl.id,
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) return Response.json({ error: "No completed crawl" }, { status: 400 });

  const count = await generateOpportunities(latestCrawl.id, id);
  return Response.json({ count, crawlId: latestCrawl.id });
}
