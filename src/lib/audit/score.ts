import { prisma } from "@/lib/db";

type ScoreCategory = {
  name: string;
  score: number;
  maxScore: number;
  issues: { severity: string; count: number }[];
};

type AuditScore = {
  overall: number;
  categories: ScoreCategory[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    totalUrls: number;
    indexableUrls: number;
  };
};

const WEIGHTS: Record<string, number> = {
  technical: 0.25,
  title: 0.2,
  description: 0.15,
  headings: 0.15,
  indexability: 0.15,
  images: 0.05,
  links: 0.05,
};

const SEVERITY_PENALTY: Record<string, number> = {
  critical: 30,
  high: 15,
  medium: 5,
  low: 2,
};

function calculateCategoryScore(
  findings: { severity: string; count: number }[],
  totalUrls: number,
): number {
  if (totalUrls === 0) return 100;
  let penalty = 0;
  for (const f of findings) {
    const base = SEVERITY_PENALTY[f.severity] || 0;
    const scale = Math.min(f.count / totalUrls, 1);
    penalty += base * (0.3 + 0.7 * scale);
  }
  return Math.max(0, Math.round(100 - penalty));
}

export async function calculateAuditScore(crawlId: string): Promise<AuditScore> {
  const [findings, totalUrls, indexableUrls] = await Promise.all([
    prisma.auditFinding.findMany({ where: { crawlId } }),
    prisma.url.count({ where: { crawlId } }),
    prisma.url.count({ where: { crawlId, indexability: "indexable" } }),
  ]);

  const categoryMap = new Map<string, { severity: string; count: number }[]>();
  for (const f of findings) {
    if (!categoryMap.has(f.category)) categoryMap.set(f.category, []);
    categoryMap.get(f.category)!.push({ severity: f.severity, count: f.count });
  }

  const categories: ScoreCategory[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [cat, weight] of Object.entries(WEIGHTS)) {
    const catFindings = categoryMap.get(cat) || [];
    const score = calculateCategoryScore(catFindings, totalUrls);
    categories.push({
      name: cat,
      score,
      maxScore: 100,
      issues: catFindings.map((f) => ({ severity: f.severity, count: f.count })),
    });
    weightedSum += score * weight;
    totalWeight += weight;
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  const summary = {
    critical: findings.filter((f) => f.severity === "critical").reduce((s, f) => s + f.count, 0),
    high: findings.filter((f) => f.severity === "high").reduce((s, f) => s + f.count, 0),
    medium: findings.filter((f) => f.severity === "medium").reduce((s, f) => s + f.count, 0),
    low: findings.filter((f) => f.severity === "low").reduce((s, f) => s + f.count, 0),
    totalUrls,
    indexableUrls,
  };

  return { overall, categories, summary };
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function getScoreBg(score: number): string {
  if (score >= 90) return "bg-green-50 border-green-200";
  if (score >= 75) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  if (score >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

export function getScoreRing(score: number): string {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#16a34a" : score >= 75 ? "#059669" : score >= 60 ? "#d97706" : score >= 40 ? "#ea580c" : "#dc2626";
  return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${color};`;
}
