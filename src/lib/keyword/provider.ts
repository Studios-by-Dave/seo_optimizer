export type KeywordData = {
  keyword: string;
  searchVolume?: number;
  keywordDifficulty?: number;
  searchIntent?: string;
  cpc?: number;
  currentRanking?: number;
  rankingUrl?: string;
  source: string;
  category?: string;
};

export type KeywordProvider = {
  name: string;
  search(query: string): Promise<KeywordData[]>;
  getVolume(keyword: string): Promise<{ volume: number; difficulty: number } | null>;
};

// Stub provider — returns empty results. Implement with DataForSEO, Semrush, etc.
export const stubProvider: KeywordProvider = {
  name: "stub",
  async search() { return []; },
  async getVolume() { return null; },
};

// To add a real provider later:
// export const dataForSeoProvider: KeywordProvider = { ... }
// export const semrushProvider: KeywordProvider = { ... }

export function getProvider(name: string): KeywordProvider {
  const providers: Record<string, KeywordProvider> = { stub: stubProvider };
  return providers[name] || stubProvider;
}
