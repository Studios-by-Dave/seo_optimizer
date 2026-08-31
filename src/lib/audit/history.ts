import { prisma } from "@/lib/db";
import { calculateAuditScore } from "./score";

export async function getAuditHistory(projectId: string) {
  const crawls = await prisma.crawl.findMany({
    where: { projectId, status: "completed" },
    orderBy: { finishedAt: "desc" },
    select: { id: true, startedAt: true, finishedAt: true, pagesCrawled: true, totalDiscovered: true },
  });

  const history: {
    crawlId: string;
    date: string;
    pagesCrawled: number;
    score: number | null;
    findingsCount: number;
    diff: { scoreChange: number | null; newIssues: number; resolvedIssues: number } | null;
  }[] = [];

  let prevFindingsTitles: Set<string> | null = null;
  let prevScore: number | null = null;

  for (let i = crawls.length - 1; i >= 0; i--) {
    const c = crawls[i];
    const scoreData = await calculateAuditScore(c.id).catch(() => null);
    const score = scoreData?.overall ?? null;
    const findings = await prisma.auditFinding.findMany({ where: { crawlId: c.id }, select: { title: true } });
    const titles = new Set(findings.map((f) => f.title));

    let diff: { scoreChange: number | null; newIssues: number; resolvedIssues: number } | null = null;
    if (prevFindingsTitles !== null) {
      const newIssues = [...titles].filter((t) => !prevFindingsTitles!.has(t)).length;
      const resolvedIssues = [...prevFindingsTitles].filter((t) => !titles.has(t)).length;
      diff = {
        scoreChange: score !== null && prevScore !== null ? score - prevScore : null,
        newIssues,
        resolvedIssues,
      };
    }

    history.push({
      crawlId: c.id,
      date: (c.finishedAt || c.startedAt).toISOString(),
      pagesCrawled: c.pagesCrawled,
      score,
      findingsCount: findings.length,
      diff,
    });

    prevFindingsTitles = titles;
    prevScore = score;
  }

  return history.reverse();
}
