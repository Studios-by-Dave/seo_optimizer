import * as cheerio from "cheerio";
import { prisma } from "./db";
import { assertNotPrivate } from "./ssrf";
import { normalizeUrl, isSameDomain } from "./url";
import { parseRobotsTxt, isAllowed, type RobotsData } from "./robots";

const DEFAULT_CONFIG = {
  maxPages: 500,
  crawlDepth: 5,
  respectRobots: true,
  crawlSubdomains: false,
  followRedirects: true,
  includePatterns: [] as string[],
  excludePatterns: [] as string[],
};

type CrawlConfig = typeof DEFAULT_CONFIG;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SEO-Optimizer-Bot/1.0 (+https://github.com/Studios-by-Dave/seo_optimizer)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRobots(domain: string): Promise<RobotsData> {
  try {
    const res = await fetchWithTimeout(`https://${domain}/robots.txt`, 8000);
    if (!res.ok) return { rules: [], sitemaps: [] };
    const text = await res.text();
    return parseRobotsTxt(text);
  } catch {
    return { rules: [], sitemaps: [] };
  }
}

async function discoverSitemapUrls(domain: string, robotsData: RobotsData): Promise<string[]> {
  const urls: string[] = [];
  const sitemapUrls = robotsData.sitemaps.length > 0 ? robotsData.sitemaps : [`https://${domain}/sitemap.xml`];
  const visited = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    try {
      const res = await fetchWithTimeout(sitemapUrl, 10000);
      if (!res.ok) continue;
      const text = await res.text();
      const $ = cheerio.load(text, { xmlMode: true });
      const locs = $("loc").map((_, el) => $(el).text()).get();
      if (locs.length > 0) {
        urls.push(...locs);
      } else {
        const textUrls = text.match(/<loc>(.*?)<\/loc>/gi) || [];
        textUrls.forEach((m) => {
          const match = m.replace(/<\/?loc>/gi, "").trim();
          if (match) urls.push(match);
        });
      }
    } catch {
      // ignore sitemap errors
    }
  }
  return urls;
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const normalized = normalizeUrl(href, baseUrl);
    if (normalized) links.push(normalized);
  });
  return links;
}

function extractPageData($: cheerio.CheerioAPI, html: string, baseUrl: string) {
  const title = $("title").first().text().trim() || null;
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || null;
  const h1 = $("h1").first().text().trim() || null;
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;
  const xRobots = ""; // would need response headers for this
  const images = $("img").length;
  const imagesMissingAlt = $("img").filter((_, el) => !$(el).attr("alt")).length;
  const wordCount = $("body").text().replace(/\s+/g, " ").trim().split(/\s+/).length;
  const internalLinks = $("a[href]").filter((_, el) => {
    const href = $(el).attr("href") || "";
    const norm = normalizeUrl(href, $("base").attr("href") || undefined);
    return norm ? isSameDomain(norm, new URL(baseUrl).hostname.replace(/^www\./, "")) : false;
  }).length;
  const externalLinks = $("a[href]").length - internalLinks;

  return {
    metaTitle: title,
    metaTitleLength: title?.length ?? 0,
    metaDescription: metaDesc,
    metaDescriptionLength: metaDesc?.length ?? 0,
    h1,
    h1Count,
    h2Count,
    canonicalUrl: canonical,
    robotsMeta,
    images,
    imagesMissingAlt,
    wordCount,
    internalLinks,
    externalLinks,
    contentHash: hashString($("body").text().replace(/\s+/g, " ").trim()),
  };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

export async function runCrawl(
  crawlId: string,
  projectId: string,
  seedUrl: string,
  configOverrides: Partial<CrawlConfig> = {},
) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  const domain = new URL(seedUrl).hostname.replace(/^www\./, "");
  const origin = new URL(seedUrl).origin;

  await prisma.crawl.update({
    where: { id: crawlId },
    data: { status: "running", currentStep: "Fetching robots.txt" },
  });

  const robotsData = config.respectRobots ? await fetchRobots(domain) : { rules: [], sitemaps: [] };

  await prisma.crawl.update({ where: { id: crawlId }, data: { currentStep: "Discovering sitemap URLs" } });
  const sitemapUrls = await discoverSitemapUrls(domain, robotsData);

  const seed = normalizeUrl(seedUrl) || seedUrl;
  const queue: Array<{ url: string; depth: number }> = [{ url: seed, depth: 0 }];
  const visited = new Set<string>();
  const urlRecords = new Map<string, { status: number | null; finalUrl: string; redirects: Array<{ url: string; status: number }> }>();

  for (const u of sitemapUrls) {
    const n = normalizeUrl(u);
    if (n && !visited.has(n) && isSameDomain(n, domain)) {
      queue.push({ url: n, depth: 0 });
    }
  }

  let pagesCrawled = 0;
  let pagesFailed = 0;
  let totalDiscovered = queue.length;
  const BATCH_UPDATE_INTERVAL = 10;

  while (queue.length > 0 && pagesCrawled < config.maxPages) {
    const batch = queue.splice(0, Math.min(5, config.maxPages - pagesCrawled));

    await Promise.all(
      batch.map(async ({ url, depth }) => {
        if (visited.has(url)) return;
        visited.add(url);

        if (config.crawlDepth > 0 && depth > config.crawlDepth) return;
        if (config.excludePatterns.some((p) => url.includes(p))) return;
        if (config.includePatterns.length > 0 && !config.includePatterns.some((p) => url.includes(p))) return;

        if (config.respectRobots && !isAllowed(url, robotsData)) {
          await prisma.url.create({
            data: {
              projectId,
              crawlId,
              url,
              normalizedUrl: url,
              httpStatus: null,
              indexability: "blocked",
              crawlDepth: depth,
              inSitemap: sitemapUrls.includes(url),
            },
          }).catch(() => {});
          pagesFailed++;
          return;
        }

        let res: Response;
        try {
          await assertNotPrivate(url);
          res = await fetchWithTimeout(url);
        } catch (e) {
          await prisma.url.create({
            data: {
              projectId,
              crawlId,
              url,
              normalizedUrl: url,
              httpStatus: null,
              indexability: "non-indexable",
              crawlDepth: depth,
              inSitemap: sitemapUrls.includes(url),
            },
          }).catch(() => {});
          pagesFailed++;
          return;
        }

        pagesCrawled++;
        const finalUrl = res.url !== url ? res.url : undefined;
        const status = res.status;
        const contentType = res.headers.get("content-type") || "";
        const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml");
        const redirectChain: Array<{ url: string; status: number }> = [];

        let linkUrls: string[] = [];
        let pageData: Record<string, any> = {};

        if (isHtml) {
          try {
            const html = await res.text();
            const $ = cheerio.load(html);
            linkUrls = extractLinks($, url);
            pageData = extractPageData($, html, url);
          } catch {}
        }

        for (const link of linkUrls) {
          totalDiscovered++;
          if (!visited.has(link) && isSameDomain(link, domain)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }

        const robotsMeta = pageData.robotsMeta || "";
        let indexability = "indexable";
        if (status >= 400) indexability = "non-indexable";
        else if (finalUrl) indexability = "redirected";
        else if (robotsMeta.includes("noindex")) indexability = "non-indexable";
        else if (pageData.canonicalUrl && pageData.canonicalUrl !== url) indexability = "canonicalized";

        await prisma.url.create({
          data: {
            projectId,
            crawlId,
            url,
            normalizedUrl: url,
            httpStatus: status,
            finalUrl: finalUrl || null,
            redirectChain: redirectChain.length > 0 ? JSON.stringify(redirectChain) : null,
            indexability,
            canonicalUrl: pageData.canonicalUrl || null,
            metaTitle: pageData.metaTitle || null,
            metaTitleLength: pageData.metaTitleLength || 0,
            metaDescription: pageData.metaDescription || null,
            metaDescriptionLength: pageData.metaDescriptionLength || 0,
            h1: pageData.h1 || null,
            h1Count: pageData.h1Count || 0,
            h2Count: pageData.h2Count || 0,
            wordCount: pageData.wordCount || 0,
            internalLinks: pageData.internalLinks || 0,
            externalLinks: pageData.externalLinks || 0,
            images: pageData.images || 0,
            imagesMissingAlt: pageData.imagesMissingAlt || 0,
            robotsMeta: robotsMeta || null,
            inSitemap: sitemapUrls.includes(url),
            crawlDepth: depth,
            contentHash: pageData.contentHash || null,
          },
        }).catch(() => {});
      }),
    );

    if (pagesCrawled % BATCH_UPDATE_INTERVAL === 0) {
      await prisma.crawl.update({
        where: { id: crawlId },
        data: {
          pagesCrawled,
          totalDiscovered,
          currentStep: `Crawling ${pagesCrawled} / ${Math.min(totalDiscovered, config.maxPages)}`,
        },
      });
    }

    await sleep(200);
  }

  const stats = JSON.stringify({ pagesCrawled, pagesFailed, totalDiscovered, domain });
  await prisma.crawl.update({
    where: { id: crawlId },
    data: {
      status: "completed",
      pagesCrawled,
      totalDiscovered,
      stats,
      currentStep: "Crawl complete",
      finishedAt: new Date(),
    },
  });

  return { pagesCrawled, totalDiscovered };
}
