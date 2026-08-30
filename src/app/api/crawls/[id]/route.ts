import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const crawl = await prisma.crawl.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      currentStep: true,
      pagesCrawled: true,
      totalDiscovered: true,
      startedAt: true,
      finishedAt: true,
      error: true,
      stats: true,
    },
  });
  if (!crawl) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ crawl });
}
