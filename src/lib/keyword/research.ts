import { prisma } from "@/lib/db";

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by","is","it","as","be","was","are","been",
  "has","had","have","do","does","did","will","would","can","could","should","may","might","shall","this","that",
  "these","those","from","not","no","nor","so","if","then","than","too","very","just","about","above","after",
  "again","all","also","any","because","before","between","both","each","few","more","most","other","some","such",
  "into","over","own","same","up","down","out","off","only","now","here","there","when","where","why","how","what",
  "which","who","whom","whose","while","during","through","until","within","without","being","having","doing",
  "under","once","until","above","below","throughout","although","though","since","until",
]);

function extractPhrases(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const phrases: string[] = [];
  // Unigrams
  for (const w of words) phrases.push(w);
  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }
  // Trigrams
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return phrases;
}

function classifyIntent(keyword: string): string {
  const commercial = ["buy", "price", "cost", "cheap", "deal", "discount", "coupon", "affordable", "pricing", "plans"];
  const transactional = ["hire", "book", "order", "sign up", "get", "download", "register", "subscribe", "contact", "schedule"];
  const navigational = ["login", "sign in", "account", "official", "website", "near me"];
  const informational = ["how", "what", "why", "guide", "tutorial", "tips", "examples", "learn", "understand", "explain"];

  for (const w of commercial) if (keyword.includes(w)) return "commercial";
  for (const w of transactional) if (keyword.includes(w)) return "transactional";
  for (const w of navigational) if (keyword.includes(w)) return "navigational";
  for (const w of informational) if (keyword.includes(w)) return "informational";
  return "informational";
}

function categorizeKeyword(keyword: string, projectIndustry: string | null, projectLocation: string | null): string {
  const k = keyword.toLowerCase();
  const loc = projectLocation?.toLowerCase() || "";
  const ind = projectIndustry?.toLowerCase() || "";

  if (loc && k.includes(loc.split(",")[0].toLowerCase())) return "local";
  if (k.length > 30) return "longtail";
  if (ind && ind.split(/\s*\/\s*/).some((i) => k.includes(i.toLowerCase()))) return "primary";
  return "secondary";
}

function scorePriority(
  frequency: number,
  totalPhrases: number,
  category: string,
  hasExistingPage: boolean,
): number {
  const freqScore = Math.min(10, Math.round((frequency / Math.max(totalPhrases, 1)) * 50));
  const catBonus: Record<string, number> = { primary: 3, local: 4, longtail: 2, commercial: 3, secondary: 1, informational: 0 };
  const existingPenalty = hasExistingPage ? -2 : 2;
  return Math.max(1, Math.min(10, freqScore + (catBonus[category] || 0) + existingPenalty));
}

export async function runKeywordResearch(projectId: string) {
  const [project, urls] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.url.findMany({
      where: { projectId, httpStatus: 200 },
      select: {
        url: true,
        metaTitle: true,
        metaDescription: true,
        h1: true,
        wordCount: true,
      },
    }),
  ]);

  if (!project || urls.length === 0) return 0;

  // Aggregate all text from crawled pages
  const allText: string[] = [];
  for (const u of urls) {
    if (u.metaTitle) allText.push(u.metaTitle);
    if (u.metaDescription) allText.push(u.metaDescription);
    if (u.h1) allText.push(u.h1);
  }

  // Count phrase frequencies
  const phraseCount = new Map<string, number>();
  for (const text of allText) {
    const phrases = extractPhrases(text);
    for (const p of phrases) {
      phraseCount.set(p, (phraseCount.get(p) || 0) + 1);
    }
  }

  // Filter to meaningful phrases (appearing 2+ times or high frequency)
  const totalPhrases = allText.length;
  const keywords = [...phraseCount.entries()]
    .filter(([phrase, count]) => {
      const words = phrase.split(" ");
      if (words.length === 1 && words[0].length <= 3) return false;
      if (count >= 2 || (count >= 1 && words.length >= 2)) return true;
      return false;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  // Delete existing on-page keywords for this project
  await prisma.keyword.deleteMany({ where: { projectId, source: "onpage" } });

  // Store keywords
  for (const [phrase, count] of keywords) {
    const category = categorizeKeyword(phrase, project.industry, project.businessLocation);
    const intent = classifyIntent(phrase);
    const priorityScore = scorePriority(count, totalPhrases, category, false);

    await prisma.keyword.create({
      data: {
        projectId,
        keyword: phrase,
        searchIntent: intent,
        priorityScore,
        source: "onpage",
        category,
      },
    }).catch(() => {});
  }

  return keywords.length;
}
