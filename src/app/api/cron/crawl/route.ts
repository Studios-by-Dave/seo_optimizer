import { prisma } from "@/lib/db";
import { runCrawl } from "@/lib/crawler";

export const dynamic = "force-dynamic";

// GET /api/cron/crawl?secret=CRON_SECRET — triggers due scheduled crawls
// Can be called by Vercel Cron, GitHub Actions, or a local cron job.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const token = url.searchParams.get("secret") || req.headers.get("x-cron-secret");
    // also allow Authorization: Bearer <secret>
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token !== secret && bearer !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.project.findMany({
    where: {
      crawlFrequency: { in: ["daily", "weekly", "monthly"] },
      nextCrawlAt: { lte: now },
    },
    select: { id: true, websiteUrl: true, crawlFrequency: true, nextCrawlAt: true },
  });

  if (due.length === 0) return Response.json({ ok: true, triggered: 0, message: "No due projects" });

  let triggered = 0;
  const errors: string[] = [];

  for (const p of due) {
    // skip if already running
    const running = await prisma.crawl.findFirst({
      where: { projectId: p.id, status: { in: ["queued", "running"] } },
    });
    if (running) continue;

    try {
      const crawl = await prisma.crawl.create({
        data: {
          projectId: p.id,
          status: "queued",
          config: JSON.stringify({ maxPages: 500, crawlDepth: 5 }),
          currentStep: "Queued (scheduled)",
        },
      });

      // compute next
      let next: Date | null = null;
      if (p.crawlFrequency === "daily") next = new Date(Date.now() + 24 * 60 * 60 * 1000);
      else if (p.crawlFrequency === "weekly") next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      else if (p.crawlFrequency === "monthly") next = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.project.update({ where: { id: p.id }, data: { nextCrawlAt: next } });

      runCrawl(crawl.id, p.id, p.websiteUrl, { maxPages: 500, crawlDepth: 5 } as never).catch((err) => {
        console.error(`Scheduled crawl ${crawl.id} failed`, err);
      });

      triggered++;
    } catch (e) {
      errors.push(`${p.id}: ${String(e)}`);
    }
  }

  return Response.json({ ok: true, triggered, due: due.length, errors: errors.length ? errors : undefined });
}
