import { prisma } from "@/lib/db";

export async function computeGaps(projectId: string) {
  const [project, clientUrls, competitorRows] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { domain: true } }),
    prisma.url.findMany({ where: { projectId, httpStatus: 200 }, select: { normalizedUrl: true, metaTitle: true } }),
    prisma.competitor.findMany({ where: { projectId }, select: { id: true, name: true } }),
  ]);

  const clientUrlSet = new Set(clientUrls.map((u) => u.normalizedUrl));
  const clientTitles = new Set(clientUrls.map((u) => u.metaTitle).filter((t): t is string => Boolean(t)));

  const gaps: Record<string, { missingPages: string[]; missingKeywords: string[]; titleOverlap: number }> = {};

  for (const comp of competitorRows) {
    const crawl = await prisma.crawl.findFirst({ where: { competitorId: comp.id, status: "completed" }, orderBy: { startedAt: "desc" } });
    if (!crawl) {
      gaps[comp.id] = { missingPages: [], missingKeywords: [], titleOverlap: 0 };
      continue;
    }

    const compUrls = await prisma.url.findMany({
      where: { crawlId: crawl.id, httpStatus: 200 },
      select: { normalizedUrl: true, metaTitle: true },
    });

    const compUrlSet = new Set(compUrls.map((u) => u.normalizedUrl));
    const compTitles = compUrls.map((u) => u.metaTitle).filter((t): t is string => Boolean(t));

    const missingPages = [...compUrlSet].filter((u) => !clientUrlSet.has(u)).slice(0, 20);
    const missingKeywords = compTitles.filter((t) => !clientTitles.has(t)).slice(0, 20);

    const overlap = compTitles.filter((t) => clientTitles.has(t)).length;

    gaps[comp.id] = {
      missingPages,
      missingKeywords: [...new Set(missingKeywords)],
      titleOverlap: overlap,
    };
  }

  return gaps;
}
