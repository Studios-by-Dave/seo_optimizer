"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Client = { id: string; name: string; createdAt: string; _count: { projects: number } };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError(null);
    const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) { setError(data.error || "Failed to create client"); return; }
    setName(""); fetchClients();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this client? Projects will become unassigned.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    fetchClients();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Clients</h1><p className="mt-1 text-sm text-slate-500">Organize projects by client</p></div>
      </div>
      <form onSubmit={onCreate} className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name (e.g. Shelby Web Co)" required className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" />
        <button type="submit" disabled={creating} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">{creating ? "..." : "+ Add Client"}</button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {loading ? <div className="mt-8 text-center text-sm text-slate-500">Loading...</div> : clients.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-sm text-slate-500">No clients yet. Add your first client above.</p></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <Link href={`/clients/${c.id}`} className="text-base font-semibold text-slate-900 hover:text-slate-600">{c.name}</Link>
              <p className="mt-1 text-xs text-slate-400">{c._count.projects} project{c._count.projects !== 1 ? "s" : ""} · {new Date(c.createdAt).toLocaleDateString()}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/clients/${c.id}`} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">View</Link>
                <button onClick={() => onDelete(c.id)} className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
