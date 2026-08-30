"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Opportunity = {
  id: string;
  category: string;
  issue: string;
  severity: string;
  impact: number;
  confidence: number;
  effort: number;
  priorityScore: number;
  affectedUrls: string[];
  recommendation: string;
  evidence: string[];
  status: string;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "reviewed", label: "Reviewed", color: "bg-slate-100 text-slate-700" },
  { value: "planned", label: "Planned", color: "bg-purple-100 text-purple-800" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "ignored", label: "Ignored", color: "bg-slate-100 text-slate-500" },
];

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  title: "Meta Titles",
  description: "Meta Descriptions",
  headings: "Headings & Content",
  indexability: "Indexability",
  technical: "Technical SEO",
  images: "Images",
  links: "Internal Links",
};

function PriorityBar({ score }: { score: number }) {
  const max = 10;
  const width = Math.min(100, (score / max) * 100);
  const color = score >= 7 ? "#dc2626" : score >= 5 ? "#ea580c" : score >= 3 ? "#d97706" : "#16a34a";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

export default function OpportunitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);

  const fetchOpps = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/opportunities`);
    const data = await res.json();
    setOpportunities(data.opportunities || []);
    setStats(data.stats || {});
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

  async function generateOpps() {
    setRunning(true);
    await fetch(`/api/projects/${projectId}/opportunities`, { method: "POST" });
    setRunning(false);
    fetchOpps();
  }

  async function updateStatus(oppId: string, status: string) {
    await fetch(`/api/projects/${projectId}/opportunities/${oppId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOpps();
  }

  const filtered = filter === "all" ? opportunities : opportunities.filter((o) => o.status === filter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SEO Opportunities</h1>
          <p className="mt-1 text-sm text-slate-500">Prioritized action items ranked by impact</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateOpps}
            disabled={running}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {running ? "Generating..." : "Generate Opportunities"}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Status summary */}
      {opportunities.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            All ({opportunities.length})
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === s.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {s.label} ({stats[s.value] || 0})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-12 text-center text-sm text-slate-500">Loading...</div>
      ) : opportunities.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No opportunities yet. Click &quot;Generate Opportunities&quot; to analyze your audit findings.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((opp) => (
            <div key={opp.id} className="rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_BADGE[opp.severity]}`}>
                    {opp.severity}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-900">{opp.issue}</span>
                  <span className="shrink-0 text-xs text-slate-400">{CATEGORY_LABELS[opp.category] || opp.category}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <PriorityBar score={opp.priorityScore} />
                  <span className="text-xs text-slate-400 w-16 text-right">{opp.affectedUrls.length} pages</span>
                  <svg className={`h-4 w-4 text-slate-400 transition ${expandedId === opp.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedId === opp.id && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Impact</p>
                      <p className="text-lg font-bold text-slate-900">{opp.impact}/10</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Confidence</p>
                      <p className="text-lg font-bold text-slate-900">{opp.confidence}/10</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Effort</p>
                      <p className="text-lg font-bold text-slate-900">{opp.effort}/10</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600">{opp.recommendation}</p>

                  {opp.evidence.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-500">Affected URLs</p>
                      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                        {opp.evidence.map((e, i) => (
                          <li key={i} className="truncate text-xs text-slate-600 font-mono">{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Status:</span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={(e) => { e.stopPropagation(); updateStatus(opp.id, s.value); }}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                          opp.status === s.value ? s.color + " ring-2 ring-offset-1 ring-slate-300" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
