"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Comp = { id: string; name: string; url: string; domain: string; status: string; pagesCrawled: number; totalDiscovered: number; };

export default function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [list, setList] = useState<Comp[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);

  const fetchList = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/competitors`);
    const data = await res.json();
    setList(data.competitors || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setError(null);
    const res = await fetch(`/api/projects/${projectId}/competitors`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setError(data.error); return; }
    setName(""); setUrl("");
    fetchList();
  }

  async function crawl(id: string) {
    await fetch(`/api/projects/${projectId}/competitors/${id}/crawl`, { method: "POST" });
    fetchList();
  }

  async function remove(id: string) {
    if (!confirm("Delete competitor?")) return;
    await fetch(`/api/projects/${projectId}/competitors/${id}`, { method: "DELETE" });
    fetchList();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Competitors</h1>
          <p className="mt-1 text-sm text-slate-500">{list.length} competitors tracked</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/projects/${projectId}/competitors/compare`} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Compare</Link>
          <Link href={`/projects/${projectId}/competitors/gaps`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Gaps</Link>
          <Link href={`/projects/${projectId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back</Link>
        </div>
      </div>

      <form onSubmit={addCompetitor} className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor name" required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitor.com" required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
        <button type="submit" disabled={adding} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">{adding ? "..." : "Add"}</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {loading ? <div className="mt-8 text-center text-sm text-slate-500">Loading...</div> : list.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No competitors yet. Add one above.</p></div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.url} · {c.domain}</p>
                <p className="mt-1 text-xs"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "completed" ? "bg-green-100 text-green-700" : c.status === "running" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{c.status}</span> <span className="ml-2 text-slate-400">{c.pagesCrawled} pages</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => crawl(c.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Crawl</button>
                <Link href={`/projects/${projectId}/competitors/${c.id}/urls`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">URLs</Link>
                <button onClick={() => remove(c.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
