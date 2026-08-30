import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { runKeywordResearch } from "@/lib/keyword/research";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const intent = searchParams.get("intent");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "priorityScore";
  const order = searchParams.get("order") || "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 50;

  const where: any = { projectId: id };
  if (category) where.category = category;
  if (intent) where.searchIntent = intent;
  if (search) where.keyword = { contains: search };

  const [keywords, total] = await Promise.all([
    prisma.keyword.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.keyword.count({ where }),
  ]);

  const stats = await prisma.keyword.groupBy({
    by: ["category"],
    where: { projectId: id },
    _count: true,
  });

  return Response.json({
    keywords,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
    stats: Object.fromEntries(stats.map((s) => [s.category, s._count])),
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const count = await runKeywordResearch(id);
  return Response.json({ count });
}
