import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ organization: org });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null> = {};
  if (body.name !== undefined) {
    const v = String(body.name).trim();
    if (!v) return Response.json({ error: "Organization name required" }, { status: 400 });
    data.name = v;
  }
  if (body.website !== undefined) data.website = body.website ? String(body.website).trim() : null;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
  if (body.primaryColor !== undefined) {
    const c = String(body.primaryColor).trim();
    if (c && !/^#[0-9a-fA-F]{6}$/.test(c)) return Response.json({ error: "primaryColor must be hex like #0B1D3A" }, { status: 400 });
    data.primaryColor = c || null;
  }
  const org = await prisma.organization.update({ where: { id: user.organizationId }, data });
  return Response.json({ organization: org });
}
