import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const competitors = await prisma.competitor.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ competitors });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.url) {
    return Response.json({ error: "Name and URL are required" }, { status: 400 });
  }

  try {
    new URL(body.url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const domain = new URL(body.url).hostname.replace(/^www\./, "");

  const competitor = await prisma.competitor.create({
    data: {
      name: body.name,
      url: body.url,
      domain,
      projectId: id,
      manuallyAdded: true,
    },
  });

  return Response.json({ competitor }, { status: 201 });
}
