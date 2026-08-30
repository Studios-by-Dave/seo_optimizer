import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { crawlCompetitor } from "@/lib/competitor/crawl";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string; compId: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { compId } = await params;
  const competitor = await prisma.competitor.findFirst({
    where: { id: compId, project: { organizationId: user.organizationId } },
  });
  if (!competitor) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.crawl.findFirst({
    where: { competitorId: compId, status: { in: ["queued", "running"] } },
  });
  if (existing) {
    return Response.json({ error: "A crawl is already in progress" }, { status: 409 });
  }

  const crawlId = await crawlCompetitor(compId, competitor.projectId, competitor.url);
  return Response.json({ crawlId });
}
