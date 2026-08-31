import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getAuditHistory } from "@/lib/audit/history";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  const history = await getAuditHistory(id);
  return Response.json({ history });
}
