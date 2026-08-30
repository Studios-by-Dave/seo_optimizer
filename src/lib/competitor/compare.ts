import { prisma } from "@/lib/db";

function scoreCategory(urls: { httpStatus: number | null; metaTitle: string | null; h1: string | null; internalLinks: number | null; imagesMissingAlt: number | null }[]) {
  if (urls.length === 0) return { score: 0, total: 0 };
  const total = urls.length;
  let points = 0;
  for (const u of urls) {
    if (u.httpStatus === 200) points += 2;
    if (u.metaTitle) points += 1;
    if (u.h1) points += 1;
    if ((u.internalLinks || 0) > 0) points += 1;
    if ((u.imagesMissingAlt || 0) === 0) points += 1;
  }
  return { score: Math.round((points / (total * 6)) * 100), total };
}

export async function compareProject(projectId: string) {
  const [clientUrls, competitorRows] = await Promise.all([
    prisma.url.findMany({ where: { projectId, httpStatus: 200 } }),
    prisma.competitor.findMany({ where: { projectId }, select: { id: true, name: true, url: true } }),
  ]);

  const client = scoreCategory(clientUrls);
  const competitors: Record<string, { name: string; url: string; score: number; total: number }> = {};

  for (const comp of competitorRows) {
    const crawl = await prisma.crawl.findFirst({ where: { competitorId: comp.id, status: "completed" }, orderBy: { startedAt: "desc" } });
    if (!crawl) {
      competitors[comp.id] = { name: comp.name, url: comp.url, score: 0, total: 0 };
      continue;
    }
    const compUrls = await prisma.url.findMany({ where: { crawlId: crawl.id, httpStatus: 200 } });
    const s = scoreCategory(compUrls);
    competitors[comp.id] = { name: comp.name, url: comp.url, score: s.score, total: s.total };
  }

  const allNames = [client, ...Object.values(competitors)].map((c) => c.total);
  const bestTotal = Math.max(...allNames, 1);

  return {
    client: { ...client, label: "Your Site" },
    competitors,
    scale: bestTotal,
  };
}
