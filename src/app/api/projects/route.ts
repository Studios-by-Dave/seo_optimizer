import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ projects: [] });
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { crawls: true } }, client: { select: { id: true, name: true } } },
  });
  return Response.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.websiteUrl) {
    return Response.json({ error: "Name and website URL are required" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = new URL(body.websiteUrl).hostname.replace(/^www\./, "");
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  let crawlFrequency: string | null = null;
  let nextCrawlAt: Date | null = null;
  if (body.crawlFrequency) {
    const v = String(body.crawlFrequency);
    if (["daily", "weekly", "monthly"].includes(v)) {
      crawlFrequency = v;
      if (v === "daily") nextCrawlAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      else if (v === "weekly") nextCrawlAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      else if (v === "monthly") nextCrawlAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  const project = await prisma.project.create({
    data: {
      name: body.name,
      websiteUrl: body.websiteUrl,
      domain,
      businessLocation: body.businessLocation || null,
      industry: body.industry || null,
      primaryCategory: body.primaryCategory || null,
      targetServiceArea: body.targetServiceArea || null,
      gbpUrl: body.gbpUrl || null,
      organizationId: user.organizationId,
      ownerId: user.id,
      clientId: body.clientId || null,
      crawlFrequency,
      nextCrawlAt,
    },
  });

  return Response.json({ project }, { status: 201 });
}
