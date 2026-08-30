import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const crawlId = searchParams.get("crawlId");
  const status = searchParams.get("status");
  const indexability = searchParams.get("indexability");
  const hasIssue = searchParams.get("hasIssue");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "url";
  const order = searchParams.get("order") || "asc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 50;

  const where: any = { projectId: id };
  if (crawlId) where.crawlId = crawlId;
  if (status) where.httpStatus = parseInt(status, 10);
  if (indexability) where.indexability = indexability;
  if (hasIssue === "true") {
    where.OR = [
      { metaTitle: null },
      { metaDescription: null },
      { h1: null },
      { httpStatus: { gte: 400 } },
      { indexability: "non-indexable" },
      { imagesMissingAlt: { gt: 0 } },
    ];
  }
  if (search) {
    where.url = { contains: search };
  }

  const orderBy: any = { [sort]: order };

  const [urls, total] = await Promise.all([
    prisma.url.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        url: true,
        httpStatus: true,
        finalUrl: true,
        indexability: true,
        canonicalUrl: true,
        metaTitle: true,
        metaTitleLength: true,
        metaDescription: true,
        metaDescriptionLength: true,
        h1: true,
        h1Count: true,
        h2Count: true,
        wordCount: true,
        internalLinks: true,
        externalLinks: true,
        images: true,
        imagesMissingAlt: true,
        robotsMeta: true,
        inSitemap: true,
        crawlDepth: true,
      },
    }),
    prisma.url.count({ where }),
  ]);

  return Response.json({
    urls,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
