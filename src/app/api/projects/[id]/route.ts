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
  const data: Record<string, string | null> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.websiteUrl !== undefined) {
    data.websiteUrl = body.websiteUrl;
    try { data.domain = new URL(body.websiteUrl).hostname.replace(/^www\./, ""); } catch {}
  }
  if (body.businessLocation !== undefined) data.businessLocation = body.businessLocation || null;
  if (body.industry !== undefined) data.industry = body.industry || null;
  if (body.primaryCategory !== undefined) data.primaryCategory = body.primaryCategory || null;
  if (body.targetServiceArea !== undefined) data.targetServiceArea = body.targetServiceArea || null;
  if (body.gbpUrl !== undefined) data.gbpUrl = body.gbpUrl || null;

  const project = await prisma.project.update({ where: { id }, data });
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
