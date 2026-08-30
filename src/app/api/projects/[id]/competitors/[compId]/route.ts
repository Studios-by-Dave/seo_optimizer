import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; compId: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { compId } = await params;
  const competitor = await prisma.competitor.findFirst({
    where: { id: compId, project: { organizationId: user.organizationId } },
  });
  if (!competitor) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ competitor });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; compId: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { compId } = await params;
  const competitor = await prisma.competitor.findFirst({
    where: { id: compId, project: { organizationId: user.organizationId } },
  });
  if (!competitor) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.competitor.delete({ where: { id: compId } });
  return Response.json({ ok: true });
}
