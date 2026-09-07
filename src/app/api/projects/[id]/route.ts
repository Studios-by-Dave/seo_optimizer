import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      crawls: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { crawls: true } },
    },
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ project });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.websiteUrl !== undefined) {
    (data as Record<string, string>).websiteUrl = body.websiteUrl;
    try { (data as Record<string, string>).domain = new URL(body.websiteUrl).hostname.replace(/^www\./, ""); } catch {}
  }
  if (body.businessLocation !== undefined) data.businessLocation = body.businessLocation || null;
  if (body.industry !== undefined) data.industry = body.industry || null;
  if (body.primaryCategory !== undefined) data.primaryCategory = body.primaryCategory || null;
  if (body.targetServiceArea !== undefined) data.targetServiceArea = body.targetServiceArea || null;
  if (body.gbpUrl !== undefined) data.gbpUrl = body.gbpUrl || null;
  if (body.crawlFrequency !== undefined) {
    const allowed = ["daily", "weekly", "monthly", null, ""];
    const v = body.crawlFrequency ? String(body.crawlFrequency) : null;
    if (v && !allowed.includes(v)) return Response.json({ error: "Invalid crawlFrequency" }, { status: 400 });
    data.crawlFrequency = v;
    // auto-set nextCrawlAt
    if (v === "daily") data.nextCrawlAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    else if (v === "weekly") data.nextCrawlAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (v === "monthly") data.nextCrawlAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else data.nextCrawlAt = null;
  }

  const project = await prisma.project.update({ where: { id }, data: data as never });
  return Response.json({ project });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id } });
  return Response.json({ ok: true });
}
