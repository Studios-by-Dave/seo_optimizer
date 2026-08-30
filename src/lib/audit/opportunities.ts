import { prisma } from "@/lib/db";

type OpportunityInput = {
  category: string;
  issue: string;
  severity: string;
  impact: number;
  confidence: number;
  effort: number;
  affectedUrls: string[];
  recommendation: string;
  evidence: string[];
};

function priorityScore(impact: number, confidence: number, effort: number): number {
  return Math.round((impact * confidence) / Math.max(effort, 1) * 10) / 10;
}

function severityToImpact(severity: string, count: number, totalUrls: number): number {
  const base: Record<string, number> = { critical: 9, high: 7, medium: 5, low: 3 };
  const scale = Math.min(count / Math.max(totalUrls, 1), 1);
  return Math.round((base[severity] || 5) * (0.5 + 0.5 * scale));
}

function categoryToEffort(category: string): number {
  const effort: Record<string, number> = {
    title: 2,
    description: 3,
    headings: 4,
    images: 3,
    technical: 6,
    indexability: 5,
    links: 7,
    performance: 8,
  };
  return effort[category] || 5;
}

function categoryConfidence(category: string): number {
  const conf: Record<string, number> = {
    title: 10,
    description: 10,
    headings: 9,
    images: 8,
    technical: 9,
    indexability: 8,
    links: 7,
    performance: 6,
  };
  return conf[category] || 7;
}

export async function generateOpportunities(crawlId: string, projectId: string) {
  const [findings, totalUrls] = await Promise.all([
    prisma.auditFinding.findMany({ where: { crawlId } }),
    prisma.url.count({ where: { crawlId } }),
  ]);

  await prisma.opportunity.deleteMany({ where: { crawlId } });

  const opportunities: OpportunityInput[] = [];

  for (const f of findings) {
    const affectedUrls: string[] = JSON.parse(f.affectedUrls || "[]");
    const evidence: string[] = JSON.parse(f.evidence || "[]");
    const impact = severityToImpact(f.severity, f.count, totalUrls);
    const confidence = categoryConfidence(f.category);
    const effort = categoryToEffort(f.category);

    opportunities.push({
      category: f.category,
      issue: f.title,
      severity: f.severity,
      impact,
      confidence,
      effort,
      affectedUrls,
      recommendation: f.recommendation,
      evidence,
    });
  }

  // Additional opportunity: internal linking gaps
  const urls = await prisma.url.findMany({
    where: { crawlId, httpStatus: 200 },
    select: { url: true, internalLinks: true, wordCount: true, metaTitle: true },
  });

  const highValueLowLinks = urls.filter(
    (u) => u.wordCount !== null && u.wordCount! > 300 && (u.internalLinks || 0) < 3,
  );

  if (highValueLowLinks.length > 0) {
    opportunities.push({
      category: "links",
      issue: "High-value pages with few internal links",
      severity: "medium",
      impact: 6,
      confidence: 8,
      effort: 5,
      affectedUrls: highValueLowLinks.map((u) => u.url),
      recommendation: "Pages with substantial content but few internal links are underutilized. Add contextual internal links from related pages to boost topical authority.",
      evidence: highValueLowLinks.slice(0, 5).map((u) => `${u.url} → ${u.internalLinks} internal links, ${u.wordCount} words`),
    });
  }

  // Store opportunities
  for (const opp of opportunities) {
    await prisma.opportunity.create({
      data: {
        projectId,
        crawlId,
        category: opp.category,
        issue: opp.issue,
        severity: opp.severity,
        impact: opp.impact,
        confidence: opp.confidence,
        effort: opp.effort,
        priorityScore: priorityScore(opp.impact, opp.confidence, opp.effort),
        affectedUrls: JSON.stringify(opp.affectedUrls),
        recommendation: opp.recommendation,
        evidence: JSON.stringify(opp.evidence),
        status: "new",
      },
    });
  }

  return opportunities.length;
}
