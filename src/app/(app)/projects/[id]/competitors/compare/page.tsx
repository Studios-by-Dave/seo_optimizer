"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<{ client: { score: number; total: number }; competitors: Record<string, { name: string; score: number; total: number }> } | null>(null);
  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/competitors/compare`);
    setData(await res.json());
  }, [projectId]);
  useEffect(() => { fetchData(); }, [fetchData]);
  if (!data) return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  const all = [{ name: "Your Site", score: data.client.score, total: data.client.total, isClient: true }, ...Object.values(data.competitors).map((c) => ({ ...c, isClient: false }))];
  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Competitor Comparison</h1>
        <Link href={`/projects/${projectId}/competitors`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← Back</Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
            <tr><th className="px-4 py-3">Site</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">Pages</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {all.map((r) => (
              <tr key={r.name} className={r.isClient ? "bg-blue-50" : ""}>
                <td className="px-4 py-3 font-medium">{r.name} {r.isClient && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">You</span>}</td>
                <td className="px-4 py-3 text-center"><div className="mx-auto h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.score}%` }} /></div><span className="ml-2 text-xs font-semibold">{r.score}</span></td>
                <td className="px-4 py-3 text-center text-slate-500">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
