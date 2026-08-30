import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; compId: string }> }) {
  const { compId } = await params;
  const crawl = await prisma.crawl.findFirst({
    where: { competitorId: compId, status: "completed" },
    orderBy: { startedAt: "desc" },
  });

  if (!crawl) return Response.json({ urls: [], total: 0, totalPages: 0 });

  const { searchParams } = new URL(_req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 50;

  const [urls, total] = await Promise.all([
    prisma.url.findMany({
      where: { crawlId: crawl.id },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, url: true, httpStatus: true, indexability: true,
        metaTitle: true, metaTitleLength: true, metaDescription: true,
        h1: true, h1Count: true, wordCount: true,
        internalLinks: true, externalLinks: true, images: true, imagesMissingAlt: true,
        inSitemap: true, canonicalUrl: true,
      },
    }),
    prisma.url.count({ where: { crawlId: crawl.id } }),
  ]);

  return Response.json({ urls, total, page, totalPages: Math.ceil(total / pageSize), crawlId: crawl.id });
}
