import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; oppId: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, oppId } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { status } = body;
  const validStatuses = ["new", "reviewed", "planned", "in_progress", "completed", "ignored"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.update({
    where: { id: oppId },
    data: { status },
  });

  return Response.json({ opportunity });
}
