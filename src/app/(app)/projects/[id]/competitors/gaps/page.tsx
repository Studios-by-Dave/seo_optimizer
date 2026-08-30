"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export default function GapsPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [gaps, setGaps] = useState<Record<string, { missingPages: string[]; missingKeywords: string[] }>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);
  const fetchGaps = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/competitors/gaps`);
    const data = await res.json();
    setGaps(data.gaps || {});
    setLoading(false);
  }, [projectId]);
  useEffect(() => { fetchGaps(); }, [fetchGaps]);
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading gaps...</div>;
  const entries = Object.entries(gaps);
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Content Gaps</h1>
        <Link href={`/projects/${projectId}/competitors`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back</Link>
      </div>
      {entries.length === 0 || entries.every(([, g]) => g.missingPages.length === 0) ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No gaps detected. Crawl competitors first.</p></div>
      ) : (
        <div className="mt-6 space-y-6">
          {entries.map(([id, g]) => (
            <div key={id} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Competitor {id.slice(0, 6)}</h3>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">Pages you are missing ({g.missingPages.length})</p>
                <ul className="mt-1 space-y-1">
                  {g.missingPages.slice(0, 10).map((u) => <li key={u} className="truncate text-xs font-mono text-slate-600">{u}</li>)}
                </ul>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">Keywords you are missing ({g.missingKeywords.length})</p>
                <ul className="mt-1 space-y-1">
                  {g.missingKeywords.slice(0, 10).map((k) => <li key={k} className="text-xs text-slate-600">{k}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
