"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Entry = { crawlId: string; date: string; pagesCrawled: number; score: number | null; findingsCount: number; diff: { scoreChange: number | null; newIssues: number; resolvedIssues: number } | null };

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);
  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/history`);
    const data = await res.json();
    setHistory(data.history || []);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Audit History</h1><p className="mt-1 text-sm text-slate-500">Track SEO improvements over time</p></div>
        <Link href={`/projects/${projectId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back</Link>
      </div>
      {loading ? <div className="mt-12 text-center text-sm text-slate-500">Loading...</div> : history.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No completed audits yet. Run a crawl and audit to build history.</p></div>
      ) : (
        <div className="mt-6 space-y-4">
          {history.map((h) => (
            <div key={h.crawlId} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}</p>
                  <p className="text-xs text-slate-400">{h.pagesCrawled} pages · {h.findingsCount} findings</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${h.score !== null && h.score >= 75 ? "text-emerald-600" : h.score !== null && h.score >= 50 ? "text-amber-600" : "text-red-600"}`}>{h.score ?? "—"}</p>
                  <p className="text-xs text-slate-400">SEO Score</p>
                </div>
              </div>
              {h.diff && (
                <div className="mt-3 flex gap-4 text-xs">
                  <span className={h.diff.scoreChange !== null && h.diff.scoreChange > 0 ? "text-green-600" : h.diff.scoreChange !== null && h.diff.scoreChange < 0 ? "text-red-600" : "text-slate-400"}>
                    Score {h.diff.scoreChange !== null && h.diff.scoreChange > 0 ? `+${h.diff.scoreChange}` : h.diff.scoreChange ?? "—"}
                  </span>
                  <span className="text-amber-600">{h.diff.newIssues} new issue{h.diff.newIssues !== 1 ? "s" : ""}</span>
                  <span className="text-green-600">{h.diff.resolvedIssues} resolved</span>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Link href={`/projects/${projectId}/audit`} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">View Audit</Link>
                <Link href={`/projects/${projectId}/urls?crawlId=${h.crawlId}`} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">URLs</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
