const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "msclkid", "mc_cid", "mc_eid",
  "ref", "source", "spm", "spm_token",
]);

export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw, base);
    if (!url.protocol.startsWith("http")) return null;

    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.searchParams.delete("#");

    const keep: [string, string][] = [];
    url.searchParams.forEach((v, k) => {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) keep.push([k, v]);
    });
    url.search = "";
    keep.forEach(([k, v]) => url.searchParams.append(k, v));

    return url.toString();
  } catch {
    return null;
  }
}

export function getDomain(urlString: string): string {
  try {
    return new URL(urlString).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isSameDomain(url: string, domain: string): boolean {
  const urlDomain = getDomain(url);
  return urlDomain === domain;
}
