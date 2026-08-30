import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { runCrawl } from "@/lib/crawler";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const existingRunning = await prisma.crawl.findFirst({
    where: { projectId: id, status: { in: ["queued", "running"] } },
  });
  if (existingRunning) {
    return Response.json({ error: "A crawl is already in progress" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const config = {
    maxPages: body.maxPages ?? 500,
    crawlDepth: body.crawlDepth ?? 5,
    respectRobots: body.respectRobots ?? true,
    crawlSubdomains: body.crawlSubdomains ?? false,
    followRedirects: body.followRedirects ?? true,
    includePatterns: body.includePatterns ?? [],
    excludePatterns: body.excludePatterns ?? [],
  };

  const crawl = await prisma.crawl.create({
    data: {
      projectId: id,
      status: "queued",
      config: JSON.stringify(config),
      currentStep: "Queued",
    },
  });

  // Fire and forget — the crawl runs in the background
  runCrawl(crawl.id, project.id, project.websiteUrl, config).catch((err) => {
    console.error(`Crawl ${crawl.id} failed:`, err);
    prisma.crawl.update({
      where: { id: crawl.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
  });

  return Response.json({ crawlId: crawl.id }, { status: 202 });
}
