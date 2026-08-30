import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { projects: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ client });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return Response.json({ error: "Client name is required" }, { status: 400 });
  const client = await prisma.client.update({ where: { id }, data: { name: body.name.trim() } });
  return Response.json({ client });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.client.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  await prisma.project.updateMany({ where: { clientId: id }, data: { clientId: null } });
  await prisma.client.delete({ where: { id } });
  return Response.json({ ok: true });
}
