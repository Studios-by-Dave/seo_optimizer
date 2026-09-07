import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { runTechnicalAudit } from "@/lib/audit/technical";
import { calculateAuditScore } from "@/lib/audit/score";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) {
    return Response.json({ error: "No completed crawl found. Run a website audit first." }, { status: 400 });
  }

  await runTechnicalAudit(latestCrawl.id, id);
  const score = await calculateAuditScore(latestCrawl.id);

  return Response.json({ crawlId: latestCrawl.id, score });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user?.organizationId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

  const latestCrawl = await prisma.crawl.findFirst({
    where: { projectId: id, status: "completed" },
    orderBy: { finishedAt: "desc" },
  });
  if (!latestCrawl) {
    return Response.json({ score: null, findings: [], crawlId: null });
  }

  const [score, findings] = await Promise.all([
    calculateAuditScore(latestCrawl.id),
    prisma.auditFinding.findMany({
      where: { crawlId: latestCrawl.id },
      orderBy: [{ severity: "asc" }, { count: "desc" }],
    }),
  ]);

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "pdf" || format === "html") {
    const branded = url.searchParams.get("branded") !== "0" && url.searchParams.get("branded") !== "false";
    const showHeaderLogo = branded && url.searchParams.get("headerLogo") !== "0" && url.searchParams.get("headerLogo") !== "false";
    const showFooter = branded && url.searchParams.get("footer") !== "0" && url.searchParams.get("footer") !== "false";
    const useColor = branded && url.searchParams.get("colorize") !== "0" && url.searchParams.get("colorize") !== "false";
    const brandName = branded ? (org?.name || "SIS Console") : "Audit Report";
    const brandColor = useColor ? (org?.primaryColor || "#0B1D3A") : "#0f172a";
    const logo = showHeaderLogo ? (org?.logoUrl || "/assets/SWeblogo1.jpg") : null;
    const accent = useColor ? brandColor : "#0f172a";
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${project.name} — Audit Report</title>
<style>
  @page{margin:24px}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:32px}
  .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid ${accent};padding-bottom:16px}
  .logo{width:48px;height:48px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff}
  .brand{font-weight:800;letter-spacing:.04em;font-size:12px;color:${accent}}
  .sub{font-size:11px;letter-spacing:.14em;color:#64748b}
  h1{font-size:22px;margin:16px 0 4px}
  .meta{font-size:12px;color:#64748b}
  .score{display:flex;gap:16px;margin:20px 0}
  .scoreBox{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}
  .scoreNum{font-size:36px;font-weight:800}
  .finding{border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:10px 0}
  .severity{font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px}
  .critical{background:#fee2e2;color:#b91c1c}.high{background:#ffedd5;color:#9a3412}.medium{background:#fef3c7;color:#92400e}.low{background:#f1f5f9;color:#475569}
  a{color:${accent}}
  @media print{body{padding:0} .no-print{display:none}}
</style></head><body>
<div class="header">
  ${logo ? `<img src="${logo}" class="logo" alt="logo"/>` : ``}
  <div>
    ${branded ? `<div class="brand">${brandName.toUpperCase()}</div>
    <div style="font-weight:800;color:${accent}">SIS CONSOLE</div>
    <div class="sub">SEO INTELLIGENCE SUITE</div>` : `<div style="font-weight:700;font-size:14px">Audit Report</div>`}
  </div>
  <div style="margin-left:auto;text-align:right">
    <div style="font-size:12px;color:#64748b">Audit Report</div>
    <div style="font-size:13px;font-weight:600">${new Date((latestCrawl.finishedAt||latestCrawl.startedAt) as unknown as string).toLocaleDateString()}</div>
  </div>
</div>
<h1>${project.name}</h1>
<div class="meta">${project.websiteUrl} · ${project.domain} · ${latestCrawl.pagesCrawled} pages crawled</div>
<div class="score">
  <div class="scoreBox"><div style="font-size:12px;color:#64748b">OVERALL SCORE</div><div class="scoreNum" style="color:${score.overall>=75?'#059669':score.overall>=50?'#d97706':'#dc2626'}">${score.overall}</div><div style="font-size:12px;color:#64748b">/ 100</div></div>
  <div class="scoreBox"><div style="font-size:12px;color:#64748b">ISSUES</div><div style="font-size:14px;margin-top:8px">Critical ${score.summary.critical} · High ${score.summary.high} · Medium ${score.summary.medium} · Low ${score.summary.low}</div><div style="font-size:12px;color:#64748b;margin-top:4px">${score.summary.indexableUrls}/${score.summary.totalUrls} indexable</div></div>
</div>
<h3>Findings (${findings.length})</h3>
${findings.map((f)=>`<div class="finding"><div style="display:flex;justify-content:space-between;gap:12px"><div><strong>${f.title}</strong><div style="font-size:12px;color:#64748b">${f.category} · ${f.count} URLs</div><div style="font-size:12px;margin-top:6px">${f.description}</div><div style="font-size:12px;margin-top:6px;background:#f8fafc;padding:8px;border-radius:8px"><strong>Recommendation:</strong> ${f.recommendation}</div></div><span class="severity ${f.severity}">${f.severity}</span></div></div>`).join("")}
${showFooter ? `<div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center">Generated by SIS Console — SEO Intelligence Suite · ${brandName} · ${new Date().toLocaleString()}${branded && useColor ? ` · <span style="color:${accent}">●</span> ${accent}` : ``}</div>` : `<div style="margin-top:24px;text-align:center;font-size:11px;color:#94a3b8">${new Date().toLocaleString()}</div>`}
<script>if(new URLSearchParams(location.search).get('print')==='1') setTimeout(()=>window.print(),300)</script>
</body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="${project.domain}-audit.html"` } });
  }

  return Response.json({
    crawlId: latestCrawl.id,
    score,
    findings: findings.map((f) => ({
      ...f,
      affectedUrls: JSON.parse(f.affectedUrls || "[]"),
      evidence: JSON.parse(f.evidence || "[]"),
    })),
  });
}
