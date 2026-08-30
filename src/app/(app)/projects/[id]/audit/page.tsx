"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type AuditData = {
  crawlId: string | null;
  score: {
    overall: number;
    categories: { name: string; score: number; maxScore: number; issues: { severity: string; count: number }[] }[];
    summary: { critical: number; high: number; medium: number; low: number; totalUrls: number; indexableUrls: number };
  } | null;
  findings: {
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    evidence: string[];
    affectedUrls: string[];
    count: number;
  }[];
};

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

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#16a34a" : score >= 75 ? "#059669" : score >= 60 ? "#d97706" : score >= 40 ? "#ea580c" : "#dc2626";

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none" strokeWidth="8" strokeLinecap="round"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, stroke: color, transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function AuditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  useEffect(() => { params.then((p) => setProjectId(p.id)); }, [params]);

  const fetchAudit = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/audit`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  async function runAudit() {
    setRunning(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/audit`, { method: "POST" });
    const d = await res.json();
    setRunning(false);
    if (!res.ok) { setError(d.error); return; }
    fetchAudit();
  }

  const score = data?.score;
  const findings = data?.findings || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SEO Audit Report</h1>
          <p className="mt-1 text-sm text-slate-500">Technical analysis of your crawled pages</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={runAudit}
            disabled={running}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {running ? "Analyzing..." : "Run Audit Analysis"}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-12 text-center text-sm text-slate-500">Loading audit data...</div>
      ) : !score ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No audit data yet. Click &quot;Run Audit Analysis&quot; to analyze your crawled pages.</p>
        </div>
      ) : (
        <>
          {/* Score overview */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-center justify-center">
              <ScoreRing score={score.overall} />
              <p className="mt-3 text-sm font-medium text-slate-500">SEO Health Score</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Total URLs" value={score.summary.totalUrls} />
                <SummaryRow label="Indexable" value={score.summary.indexableUrls} accent="green" />
                <SummaryRow label="Critical" value={score.summary.critical} accent="red" />
                <SummaryRow label="High" value={score.summary.high} accent="orange" />
                <SummaryRow label="Medium" value={score.summary.medium} accent="amber" />
                <SummaryRow label="Low" value={score.summary.low} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Category Scores</h3>
              <div className="mt-4 space-y-3">
                {score.categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{CATEGORY_LABELS[cat.name] || cat.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${cat.score}%`,
                            backgroundColor: cat.score >= 90 ? "#16a34a" : cat.score >= 75 ? "#059669" : cat.score >= 60 ? "#d97706" : cat.score >= 40 ? "#ea580c" : "#dc2626",
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{cat.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
            <div className="mt-4 space-y-3">
              {findings.map((f) => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setExpandedFinding(expandedFinding === f.id ? null : f.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_BADGE[f.severity]}`}>
                        {f.severity}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{f.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">{f.count} affected</span>
                      <svg className={`h-4 w-4 text-slate-400 transition ${expandedFinding === f.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedFinding === f.id && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      <p className="text-sm text-slate-600">{f.description}</p>
                      <div className="mt-3 rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-800">Recommendation</p>
                        <p className="mt-1 text-sm text-blue-700">{f.recommendation}</p>
                      </div>
                      {f.evidence.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-slate-500">Evidence</p>
                          <ul className="mt-1 space-y-1">
                            {f.evidence.map((e, i) => (
                              <li key={i} className="truncate text-xs text-slate-600 font-mono">{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colors: Record<string, string> = { red: "text-red-600", orange: "text-orange-600", amber: "text-amber-600", green: "text-green-600" };
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${colors[accent || ""] || "text-slate-900"}`}>{value}</span>
    </div>
  );
}
