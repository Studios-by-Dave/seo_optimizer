import dns from "node:dns";

const PRIVATE_RANGES: Array<{ start: number[]; end: number[] }> = [
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
  { start: [0, 0, 0, 0], end: [0, 255, 255, 255] },
];

function ipToBytes(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map(Number);
  if (bytes.some((b) => isNaN(b) || b < 0 || b > 255)) return null;
  return bytes;
}

function isPrivateIPv4(ip: string): boolean {
  const bytes = ipToBytes(ip);
  if (!bytes) return false;
  return PRIVATE_RANGES.some(
    (r) =>
      bytes[0] >= r.start[0] &&
      bytes[0] <= r.end[0] &&
      bytes[1] >= r.start[1] &&
      bytes[1] <= r.end[1] &&
      bytes[2] >= r.start[2] &&
      bytes[2] <= r.end[2] &&
      bytes[3] >= r.start[3] &&
      bytes[3] <= r.end[3],
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc00:") || normalized.startsWith("fd00:") || normalized.startsWith("fe80:")) return true;
  return false;
}

export async function isPrivateHost(hostname: string): Promise<boolean> {
  try {
    const { address } = await dns.promises.lookup(hostname, { all: true }).then((results) => results[0]);
    if (address.includes(":")) return isPrivateIPv6(address);
    return isPrivateIPv4(address);
  } catch {
    return true;
  }
}

export async function assertNotPrivate(urlString: string): Promise<void> {
  const url = new URL(urlString);
  if (await isPrivateHost(url.hostname)) {
    throw new Error(`SSRF blocked: ${url.hostname} resolves to a private/internal address`);
  }
}
