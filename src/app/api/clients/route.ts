import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clients = await prisma.client.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });
  return Response.json({ clients });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return Response.json({ error: "Client name is required" }, { status: 400 });
  const client = await prisma.client.create({
    data: { name: body.name.trim(), organizationId: user.organizationId },
  });
  return Response.json({ client }, { status: 201 });
}
