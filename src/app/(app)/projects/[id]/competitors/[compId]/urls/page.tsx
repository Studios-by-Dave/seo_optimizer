"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export default function CompetitorUrlsPage({ params }: { params: Promise<{ id: string; compId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [compId, setCompId] = useState("");
  const [urls, setUrls] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => { params.then((p) => { setProjectId(p.id); setCompId(p.compId); }); }, [params]);
  const fetchData = useCallback(async () => {
    if (!projectId || !compId) return;
    const res = await fetch(`/api/projects/${projectId}/competitors/${compId}/urls?page=${page}`);
    const data = await res.json();
    setUrls(data.urls || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 0); setLoading(false);
  }, [projectId, compId, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Competitor URLs</h1><p className="mt-1 text-sm text-slate-500">{total} URLs</p></div>
        <Link href={`/projects/${projectId}/competitors`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back</Link>
      </div>
      {loading ? <div className="mt-8 text-center text-sm text-slate-500">Loading...</div> : urls.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No URLs. Run a competitor crawl first.</p></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr><th className="px-4 py-3">URL</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3">Title</th><th className="px-4 py-3 text-center">H1</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {urls.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="max-w-xs truncate px-4 py-2.5 font-medium text-slate-900" title={u.url}>{u.url.replace(/^https?:\/\//, "").slice(0, 60)}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-sm">{u.httpStatus || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-600">{u.metaTitle || <span className="italic text-slate-300">missing</span>}</td>
                  <td className="px-4 py-2.5 text-center">{u.h1Count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
