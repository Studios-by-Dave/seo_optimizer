import { prisma } from "@/lib/db";

export type FindingInput = {
  category: string;
  severity: string;
  title: string;
  description: string;
  affectedUrls: string[];
  recommendation: string;
  evidence: string[];
  count: number;
};

function addFinding(findings: FindingInput[], f: FindingInput) {
  if (f.affectedUrls.length > 0) findings.push(f);
}

export async function runTechnicalAudit(crawlId: string, projectId: string) {
  const urls = await prisma.url.findMany({ where: { crawlId } });
  if (urls.length === 0) return [];

  const findings: FindingInput[] = [];

  // ── Title checks ──
  const missingTitle = urls.filter((u) => !u.metaTitle);
  addFinding(findings, {
    category: "title",
    severity: "critical",
    title: "Missing meta title",
    description: `${missingTitle.length} page${missingTitle.length !== 1 ? "s" : ""} have no meta title tag.`,
    affectedUrls: missingTitle.map((u) => u.url),
    recommendation: "Add a unique, descriptive title tag to every page. Include the primary service and geographic modifier where appropriate.",
    evidence: missingTitle.slice(0, 5).map((u) => u.url),
    count: missingTitle.length,
  });

  const tooShort = urls.filter((u) => u.metaTitle && u.metaTitleLength !== null && u.metaTitleLength > 0 && u.metaTitleLength < 20);
  addFinding(findings, {
    category: "title",
    severity: "medium",
    title: "Meta titles too short",
    description: `${tooShort.length} page${tooShort.length !== 1 ? "s" : ""} have titles under 20 characters.`,
    affectedUrls: tooShort.map((u) => u.url),
    recommendation: "Short titles miss ranking opportunities. Aim for 30-60 characters with service + location.",
    evidence: tooShort.slice(0, 5).map((u) => `${u.url} → "${u.metaTitle}" (${u.metaTitleLength} chars)`),
    count: tooShort.length,
  });

  const tooLong = urls.filter((u) => u.metaTitle && u.metaTitleLength !== null && u.metaTitleLength > 60);
  addFinding(findings, {
    category: "title",
    severity: "medium",
    title: "Meta titles too long",
    description: `${tooLong.length} page${tooLong.length !== 1 ? "s" : ""} exceed 60 characters and may be truncated in search results.`,
    affectedUrls: tooLong.map((u) => u.url),
    recommendation: "Keep titles under 60 characters. Place primary keywords near the beginning.",
    evidence: tooLong.slice(0, 5).map((u) => `${u.url} → "${u.metaTitle}" (${u.metaTitleLength} chars)`),
    count: tooLong.length,
  });

  const titleMap = new Map<string, string[]>();
  urls.forEach((u) => { if (u.metaTitle) titleMap.set(u.metaTitle, [...(titleMap.get(u.metaTitle) || []), u.url]); });
  const dupTitles = [...titleMap.entries()].filter(([, v]) => v.length > 1);
  if (dupTitles.length > 0) {
    const totalAffected = dupTitles.reduce((s, [, v]) => s + v.length, 0);
    addFinding(findings, {
      category: "title",
      severity: "high",
      title: "Duplicate meta titles",
      description: `${dupTitles.length} title${dupTitles.length !== 1 ? "s" : ""} are shared across ${totalAffected} pages.`,
      affectedUrls: dupTitles.flatMap(([, v]) => v),
      recommendation: "Each page should have a unique title that describes its specific content and purpose.",
      evidence: dupTitles.slice(0, 5).map(([t, v]) => `"${t}" → ${v.length} pages`),
      count: totalAffected,
    });
  }

  // ── Description checks ──
  const missingDesc = urls.filter((u) => !u.metaDescription);
  addFinding(findings, {
    category: "description",
    severity: "critical",
    title: "Missing meta description",
    description: `${missingDesc.length} page${missingDesc.length !== 1 ? "s" : ""} have no meta description.`,
    affectedUrls: missingDesc.map((u) => u.url),
    recommendation: "Write unique, compelling descriptions (120-160 chars) for every indexable page. Include services, location, and a call to action.",
    evidence: missingDesc.slice(0, 5).map((u) => u.url),
    count: missingDesc.length,
  });

  const descMap = new Map<string, string[]>();
  urls.forEach((u) => { if (u.metaDescription) descMap.set(u.metaDescription, [...(descMap.get(u.metaDescription) || []), u.url]); });
  const dupDescs = [...descMap.entries()].filter(([, v]) => v.length > 1);
  if (dupDescs.length > 0) {
    const totalAffected = dupDescs.reduce((s, [, v]) => s + v.length, 0);
    addFinding(findings, {
      category: "description",
      severity: "high",
      title: "Duplicate meta descriptions",
      description: `${dupDescs.length} description${dupDescs.length !== 1 ? "s" : ""} are shared across ${totalAffected} pages.`,
      affectedUrls: dupDescs.flatMap(([, v]) => v),
      recommendation: "Write a unique meta description for every page that reflects its specific content.",
      evidence: dupDescs.slice(0, 5).map(([d, v]) => `"${d.slice(0, 80)}..." → ${v.length} pages`),
      count: totalAffected,
    });
  }

  // ── Heading checks ──
  const missingH1 = urls.filter((u) => !u.h1 || u.h1Count === 0);
  addFinding(findings, {
    category: "headings",
    severity: "critical",
    title: "Missing H1 tag",
    description: `${missingH1.length} page${missingH1.length !== 1 ? "s" : ""} have no H1 tag.`,
    affectedUrls: missingH1.map((u) => u.url),
    recommendation: "Every page needs exactly one H1 that clearly describes the page's topic.",
    evidence: missingH1.slice(0, 5).map((u) => u.url),
    count: missingH1.length,
  });

  const multipleH1 = urls.filter((u) => u.h1Count !== null && u.h1Count! > 1);
  addFinding(findings, {
    category: "headings",
    severity: "medium",
    title: "Multiple H1 tags",
    description: `${multipleH1.length} page${multipleH1.length !== 1 ? "s" : ""} have more than one H1 tag.`,
    affectedUrls: multipleH1.map((u) => u.url),
    recommendation: "Use only one H1 per page. Use H2-H6 for subsections.",
    evidence: multipleH1.slice(0, 5).map((u) => `${u.url} → ${u.h1Count} H1 tags`),
    count: multipleH1.length,
  });

  // ── Indexability ──
  const nonIndexable = urls.filter((u) => u.indexability === "non-indexable");
  addFinding(findings, {
    category: "indexability",
    severity: "high",
    title: "Non-indexable pages",
    description: `${nonIndexable.length} page${nonIndexable.length !== 1 ? "s" : ""} are marked as non-indexable (noindex, 4xx, 5xx).`,
    affectedUrls: nonIndexable.map((u) => u.url),
    recommendation: "Review non-indexable pages. Ensure important pages are indexable; only non-index pages intentionally (thank-you pages, admin, etc.).",
    evidence: nonIndexable.slice(0, 5).map((u) => `${u.url} → ${u.httpStatus || "noindex"}`),
    count: nonIndexable.length,
  });

  const blocked = urls.filter((u) => u.indexability === "blocked");
  addFinding(findings, {
    category: "indexability",
    severity: "medium",
    title: "Blocked by robots.txt",
    description: `${blocked.length} page${blocked.length !== 1 ? "s" : ""} are blocked by robots.txt.`,
    affectedUrls: blocked.map((u) => u.url),
    recommendation: "Verify that blocked pages should indeed be excluded. Important pages should be crawlable.",
    evidence: blocked.slice(0, 5).map((u) => u.url),
    count: blocked.length,
  });

  // ── Technical ──
  const brokenLinks = urls.filter((u) => u.httpStatus !== null && u.httpStatus! >= 400);
  const severity4xx = brokenLinks.filter((u) => u.httpStatus! < 500);
  const severity5xx = brokenLinks.filter((u) => u.httpStatus! >= 500);

  addFinding(findings, {
    category: "technical",
    severity: "critical",
    title: "4xx broken pages",
    description: `${severity4xx.length} page${severity4xx.length !== 1 ? "s" : ""} return 4xx errors (not found, forbidden, etc.).`,
    affectedUrls: severity4xx.map((u) => u.url),
    recommendation: "Fix or redirect broken pages. Broken links hurt crawlability and user experience.",
    evidence: severity4xx.slice(0, 5).map((u) => `${u.url} → ${u.httpStatus}`),
    count: severity4xx.length,
  });

  addFinding(findings, {
    category: "technical",
    severity: "critical",
    title: "5xx server errors",
    description: `${severity5xx.length} page${severity5xx.length !== 1 ? "s" : ""} return 5xx server errors.`,
    affectedUrls: severity5xx.map((u) => u.url),
    recommendation: "Server errors prevent crawling. Check server health, resource limits, and hosting configuration.",
    evidence: severity5xx.slice(0, 5).map((u) => `${u.url} → ${u.httpStatus}`),
    count: severity5xx.length,
  });

  const redirects = urls.filter((u) => u.indexability === "redirected" || (u.finalUrl && u.finalUrl !== u.url));
  addFinding(findings, {
    category: "technical",
    severity: "low",
    title: "Redirect chains",
    description: `${redirects.length} page${redirects.length !== 1 ? "s" : ""} redirect to another URL.`,
    affectedUrls: redirects.map((u) => u.url),
    recommendation: "Reduce redirect chains where possible. Each hop adds latency and can lose link equity.",
    evidence: redirects.slice(0, 5).map((u) => `${u.url} → ${u.finalUrl || "redirect"}`),
    count: redirects.length,
  });

  const canonicalized = urls.filter((u) => u.indexability === "canonicalized");
  addFinding(findings, {
    category: "technical",
    severity: "medium",
    title: "Canonicalized pages",
    description: `${canonicalized.length} page${canonicalized.length !== 1 ? "s" : ""} point their canonical tag to a different URL.`,
    affectedUrls: canonicalized.map((u) => u.url),
    recommendation: "Verify canonical tags point to the intended URL. Mismatched canonicals can cause indexing confusion.",
    evidence: canonicalized.slice(0, 5).map((u) => `${u.url} → canonical: ${u.canonicalUrl}`),
    count: canonicalized.length,
  });

  // ── Images ──
  const imgIssues = urls.filter((u) => u.imagesMissingAlt !== null && u.imagesMissingAlt! > 0);
  const totalMissingAlt = imgIssues.reduce((s, u) => s + (u.imagesMissingAlt || 0), 0);
  addFinding(findings, {
    category: "images",
    severity: "high",
    title: "Images missing alt text",
    description: `${totalMissingAlt} image${totalMissingAlt !== 1 ? "s" : ""} across ${imgIssues.length} page${imgIssues.length !== 1 ? "s" : ""} are missing alt attributes.`,
    affectedUrls: imgIssues.map((u) => u.url),
    recommendation: "Add descriptive alt text to meaningful images. This improves accessibility and can provide image SEO value.",
    evidence: imgIssues.slice(0, 5).map((u) => `${u.url} → ${u.imagesMissingAlt} image(s) missing alt`),
    count: totalMissingAlt,
  });

  // ── Links ──
  const noInternalLinks = urls.filter((u) => u.internalLinks === 0 && u.httpStatus === 200);
  addFinding(findings, {
    category: "links",
    severity: "high",
    title: "Orphan pages (no internal links)",
    description: `${noInternalLinks.length} page${noInternalLinks.length !== 1 ? "s" : ""} have zero internal links pointing to them.`,
    affectedUrls: noInternalLinks.map((u) => u.url),
    recommendation: "Orphan pages are hard for search engines to discover. Add internal links from relevant pages.",
    evidence: noInternalLinks.slice(0, 5).map((u) => u.url),
    count: noInternalLinks.length,
  });

  // ── Sitemap ──
  const notInSitemap = urls.filter((u) => u.inSitemap === false && u.indexability !== "non-indexable");
  addFinding(findings, {
    category: "technical",
    severity: "medium",
    title: "Missing from sitemap",
    description: `${notInSitemap.length} page${notInSitemap.length !== 1 ? "s" : ""} are not found in the XML sitemap.`,
    affectedUrls: notInSitemap.map((u) => u.url),
    recommendation: "Include all indexable pages in your XML sitemap to help search engines discover them.",
    evidence: notInSitemap.slice(0, 5).map((u) => u.url),
    count: notInSitemap.length,
  });

  // ── Thin content ──
  const thinContent = urls.filter((u) => u.wordCount !== null && u.wordCount! > 0 && u.wordCount! < 100);
  addFinding(findings, {
    category: "headings",
    severity: "medium",
    title: "Thin content pages",
    description: `${thinContent.length} page${thinContent.length !== 1 ? "s" : ""} have fewer than 100 words.`,
    affectedUrls: thinContent.map((u) => u.url),
    recommendation: "Thin pages provide little value to users or search engines. Expand content or consolidate/remove the page.",
    evidence: thinContent.slice(0, 5).map((u) => `${u.url} → ${u.wordCount} words`),
    count: thinContent.length,
  });

  // ── Store findings ──
  await prisma.auditFinding.deleteMany({ where: { crawlId } });
  for (const f of findings) {
    await prisma.auditFinding.create({
      data: {
        crawlId,
        projectId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        affectedUrls: JSON.stringify(f.affectedUrls),
        recommendation: f.recommendation,
        evidence: JSON.stringify(f.evidence),
        count: f.count,
      },
    });
  }

  return findings;
}
