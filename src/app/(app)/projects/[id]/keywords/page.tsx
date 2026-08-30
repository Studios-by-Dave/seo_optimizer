"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Keyword = {
  id: string;
  keyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  searchIntent: string | null;
  cpc: number | null;
  currentRanking: number | null;
  rankingUrl: string | null;
  priorityScore: number | null;
  source: string;
  category: string | null;
};

const CATEGORY_BADGE: Record<string, string> = {
  primary: "bg-blue-100 text-blue-800",
  secondary: "bg-slate-100 text-slate-700",
  local: "bg-emerald-100 text-emerald-800",
  longtail: "bg-purple-100 text-purple-800",
  commercial: "bg-orange-100 text-orange-800",
  informational: "bg-cyan-100 text-cyan-800",
  opportunity: "bg-amber-100 text-amber-800",
};

const INTENT_BADGE: Record<string, string> = {
  informational: "bg-cyan-50 text-cyan-700",
  navigational: "bg-slate-100 text-slate-600",
  commercial: "bg-orange-50 text-orange-700",
  transactional: "bg-green-50 text-green-700",
};

function PriorityDots({ score }: { score: number | null }) {
  if (!score) return <span className="text-slate-300">—</span>;
  const dots = Math.round(score / 2);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${i < dots ? "bg-emerald-500" : "bg-slate-200"}`}
        />
      ))}
    </div>
  );
}

export default function KeywordsPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);

  const fetchKeywords = useCallback(async () => {
    if (!projectId) return;
    const sp = new URLSearchParams();
    if (filter !== "all") sp.set("category", filter);
    if (intentFilter !== "all") sp.set("intent", intentFilter);
    if (search) sp.set("search", search);
    sp.set("page", String(page));

    const res = await fetch(`/api/projects/${projectId}/keywords?${sp}`);
    const data = await res.json();
    setKeywords(data.keywords || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 0);
    setStats(data.stats || {});
    setLoading(false);
  }, [projectId, filter, intentFilter, search, page]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  async function runResearch() {
    setRunning(true);
    await fetch(`/api/projects/${projectId}/keywords`, { method: "POST" });
    setRunning(false);
    fetchKeywords();
  }

  const totalKw = Object.values(stats).reduce((s, v) => s + v, 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Keyword Research</h1>
          <p className="mt-1 text-sm text-slate-500">{totalKw} keywords discovered from on-page analysis</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={runResearch}
            disabled={running}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {running ? "Researching..." : "Run Keyword Research"}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Category filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => { setFilter("all"); setPage(1); }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          All ({totalKw})
        </button>
        {Object.entries(stats).map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => { setFilter(cat); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {cat} ({count})
          </button>
        ))}
      </div>

      {/* Intent filter + search */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-medium text-slate-500">Intent:</span>
        {["all", "informational", "commercial", "transactional", "navigational"].map((i) => (
          <button
            key={i}
            onClick={() => { setIntentFilter(i); setPage(1); }}
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${intentFilter === i ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {i === "all" ? "All" : i}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search keywords..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="ml-2 w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="mt-12 text-center text-sm text-slate-500">Loading...</div>
      ) : keywords.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No keywords found. Click &quot;Run Keyword Research&quot; to analyze your crawled pages.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-center">Volume</th>
                <th className="px-4 py-3 text-center">Difficulty</th>
                <th className="px-4 py-3 text-center">Ranking</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{kw.keyword}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[kw.category || "secondary"]}`}>
                      {kw.category || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_BADGE[kw.searchIntent || "informational"]}`}>
                      {kw.searchIntent || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <PriorityDots score={kw.priorityScore} />
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500">
                    {kw.searchVolume ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500">
                    {kw.keywordDifficulty ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500">
                    {kw.currentRanking ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{kw.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
