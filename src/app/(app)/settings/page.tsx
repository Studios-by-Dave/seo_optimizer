"use client";

import { useEffect, useState } from "react";

type Org = { id: string; name: string; website: string | null; logoUrl: string | null; primaryColor: string | null };

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [form, setForm] = useState({ name: "", website: "", logoUrl: "", primaryColor: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((d) => {
        if (d.organization) {
          setOrg(d.organization);
          setForm({
            name: d.organization.name || "",
            website: d.organization.website || "",
            logoUrl: d.organization.logoUrl || "/assets/SWeblogo1.jpg",
            primaryColor: d.organization.primaryColor || "#0B1D3A",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/organization", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to save");
      return;
    }
    setOrg(data.organization);
    setMsg("Settings saved — white-label branding updated.");
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading settings...</div>;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
          <img src={form.logoUrl || "/assets/SWeblogo1.jpg"} alt="Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-slate-500">White-label & organization — SIS Console</p>
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Organization</h2>
          <p className="text-xs text-slate-500">Used on reports and dashboard branding.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Agency / Organization Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B1D3A] focus:outline-none" placeholder="Shelby Web Co." required />
            </div>
            <div>
              <label className="block text-sm font-medium">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B1D3A] focus:outline-none" placeholder="https://www.shelbywebco.com" />
            </div>
            <div>
              <label className="block text-sm font-medium">Logo URL</label>
              <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B1D3A] focus:outline-none" placeholder="/assets/SWeblogo1.jpg or https://..." />
              <p className="mt-1 text-xs text-slate-400">Default is your SIS S-logo. Use a full URL for client white-label.</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Primary Color</label>
              <div className="mt-1 flex items-center gap-3">
                <input type="color" value={form.primaryColor || "#0B1D3A"} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-12 rounded border border-slate-300 p-1" />
                <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B1D3A] focus:outline-none" placeholder="#0B1D3A" pattern="^#[0-9a-fA-F]{6}$" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold">Preview</h3>
          <div className="mt-3 flex items-center gap-3 rounded-lg border bg-slate-50 p-4" style={{ borderColor: form.primaryColor || "#0B1D3A" }}>
            <img src={form.logoUrl || "/assets/SWeblogo1.jpg"} alt="preview" className="h-8 w-8 rounded object-contain bg-white ring-1 ring-black/5" />
            <div>
              <p className="text-sm font-bold" style={{ color: form.primaryColor || "#0B1D3A" }}>{form.name || "Shelby Web Co."}</p>
              <p className="text-xs text-slate-500">SIS CONSOLE · SEO Intelligence Suite</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        <button type="submit" disabled={saving} className="rounded-lg bg-[#0B1D3A] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#132a52] disabled:opacity-60">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
