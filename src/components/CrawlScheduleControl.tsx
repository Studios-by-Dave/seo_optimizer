"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  initialFrequency: string | null;
  initialNextCrawlAt: string | null;
};

const OPTIONS = [
  { value: "", label: "No schedule (manual only)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function CrawlScheduleControl({ projectId, initialFrequency, initialNextCrawlAt }: Props) {
  const [frequency, setFrequency] = useState(initialFrequency || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crawlFrequency: frequency || null }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "Failed to save schedule");
      return;
    }
    setMsg(`Schedule saved: ${frequency || "manual"}` + (data.project?.nextCrawlAt ? ` — next ${new Date(data.project.nextCrawlAt).toLocaleString()}` : ""));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Crawl Schedule</p>
          <p className="text-xs text-slate-500">
            {initialNextCrawlAt ? `Next: ${new Date(initialNextCrawlAt).toLocaleString()}` : "No auto-crawl scheduled"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0B1D3A] focus:outline-none"
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#0B1D3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#132a52] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
