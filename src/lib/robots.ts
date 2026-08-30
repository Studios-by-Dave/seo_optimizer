export type RobotsRule = {
  agent: string;
  disallow: string[];
  allow: string[];
};

export type RobotsData = {
  rules: RobotsRule[];
  sitemaps: string[];
};

export function parseRobotsTxt(text: string): RobotsData {
  const lines = text.split("\n").map((l) => l.trim());
  const rules: RobotsRule[] = [];
  const sitemaps: string[] = [];
  let current: RobotsRule | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === "user-agent") {
      if (current) rules.push(current);
      current = { agent: value, disallow: [], allow: [] };
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
    } else if (key === "allow" && current) {
      if (value) current.allow.push(value);
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  if (current) rules.push(current);
  return { rules, sitemaps };
}

export function isAllowed(url: string, data: RobotsData): boolean {
  const path = new URL(url).pathname;
  const specific = data.rules.find((r) => r.agent === "*") ?? data.rules[0];
  if (!specific) return true;

  for (const rule of specific.allow) {
    if (path.startsWith(rule)) return true;
  }
  for (const rule of specific.disallow) {
    if (rule && path.startsWith(rule)) return false;
  }
  return true;
}
