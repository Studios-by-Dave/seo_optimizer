import { prisma } from "@/lib/db";
import { runCrawl } from "@/lib/crawler";

export async function crawlCompetitor(competitorId: string, projectId: string, competitorUrl: string) {
  // Update competitor status
  await prisma.competitor.update({
    where: { id: competitorId },
    data: { status: "running", error: null },
  });

  const crawl = await prisma.crawl.create({
    data: {
      projectId,
      competitorId,
      status: "queued",
      config: JSON.stringify({ maxPages: 500, crawlDepth: 5 }),
      currentStep: "Queued",
    },
  });

  await runCrawl(crawl.id, projectId, competitorUrl, { maxPages: 500, crawlDepth: 5 })
    .then(async () => {
      const updatedCrawl = await prisma.crawl.findUnique({ where: { id: crawl.id } });
      await prisma.competitor.update({
        where: { id: competitorId },
        data: {
          status: updatedCrawl?.status || "completed",
          pagesCrawled: updatedCrawl?.pagesCrawled || 0,
          totalDiscovered: updatedCrawl?.totalDiscovered || 0,
          crawledAt: new Date(),
          error: updatedCrawl?.error || null,
        },
      });
    })
    .catch(async (err) => {
      await prisma.competitor.update({
        where: { id: competitorId },
        data: { status: "failed", error: String(err), crawledAt: new Date() },
      });
    });

  return crawl.id;
}