"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type UrlRow = {
  id: string;
  url: string;
  httpStatus: number | null;
  indexability: string | null;
  metaTitle: string | null;
  metaTitleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1: string | null;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  inSitemap: boolean | null;
  crawlDepth: number | null;
};

type CrawlStatus = {
  id: string;
  status: string;
  currentStep: string | null;
  pagesCrawled: number;
  totalDiscovered: number;
};

export default function UrlInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");
  const [crawlId, setCrawlId] = useState<string>(searchParams.get("crawlId") || "");
  const [urls, setUrls] = useState<UrlRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [crawl, setCrawl] = useState<CrawlStatus | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    const c = searchParams.get("crawlId");
    if (c) setCrawlId(c);
  }, [searchParams]);

  const fetchUrls = useCallback(async () => {
    if (!projectId) return;
    const sp = new URLSearchParams();
    if (crawlId) sp.set("crawlId", crawlId);
    if (filter === "404") sp.set("status", "404");
    else if (filter === "500") sp.set("status", "500");
    else if (filter === "noindex") sp.set("indexability", "non-indexable");
    else if (filter === "issues") sp.set("hasIssue", "true");
    if (search) sp.set("search", search);
    sp.set("page", String(page));

    const res = await fetch(`/api/projects/${projectId}/urls?${sp}`);
    const data = await res.json();
    setUrls(data.urls || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 0);
    setLoading(false);
  }, [projectId, crawlId, filter, search, page]);

  const fetchCrawl = useCallback(async () => {
    if (!crawlId) return;
    const res = await fetch(`/api/crawls/${crawlId}`);
    const data = await res.json();
    setCrawl(data.crawl || null);
  }, [crawlId]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  useEffect(() => {
    if (!crawlId) return;
    fetchCrawl();
    const interval = setInterval(fetchCrawl, 3000);
    return () => clearInterval(interval);
  }, [crawlId, fetchCrawl]);

  useEffect(() => {
    if (crawl?.status === "completed" || crawl?.status === "failed") {
      fetchUrls();
    }
  }, [crawl?.status, fetchUrls]);

  const statusColor = (code: number | null) => {
    if (!code) return "text-slate-400";
    if (code < 300) return "text-green-600";
    if (code < 400) return "text-blue-600";
    if (code < 500) return "text-amber-600";
    return "text-red-600";
  };

  const indexColor = (val: string | null) => {
    if (val === "indexable") return "bg-green-50 text-green-700";
    if (val === "non-indexable") return "bg-red-50 text-red-700";
    if (val === "blocked") return "bg-orange-50 text-orange-700";
    if (val === "redirected") return "bg-blue-50 text-blue-700";
    if (val === "canonicalized") return "bg-purple-50 text-purple-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">URL Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">{total} URLs discovered</p>
        </div>
        <Link
          href={`/projects/${projectId}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Project
        </Link>
      </div>

      {crawl && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  crawl.status === "completed"
                    ? "bg-green-500"
                    : crawl.status === "running"
                    ? "bg-blue-500 animate-pulse"
                    : crawl.status === "failed"
                    ? "bg-red-500"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-sm font-medium capitalize">{crawl.status}</span>
              {crawl.currentStep && (
                <span className="text-sm text-slate-500">— {crawl.currentStep}</span>
              )}
            </div>
            <span className="text-sm text-slate-400">
              {crawl.pagesCrawled} / {crawl.totalDiscovered} pages
            </span>
          </div>
          {crawl.status === "running" && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (crawl.pagesCrawled / Math.max(crawl.totalDiscovered, 1)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {(["all", "404", "500", "noindex", "issues"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === "all" ? "All" : f === "404" ? "404 Errors" : f === "500" ? "5xx Errors" : f === "noindex" ? "Noindex" : "Has Issues"}
          </button>
        ))}
        <input
          type="text"
          placeholder="Filter URLs..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="ml-2 w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="mt-8 text-center text-sm text-slate-500">Loading...</div>
      ) : urls.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No URLs found for this filter.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Indexability</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 text-center">H1</th>
                <th className="px-4 py-3 text-center">Words</th>
                <th className="px-4 py-3 text-center">Links</th>
                <th className="px-4 py-3 text-center">Images</th>
                <th className="px-4 py-3 text-center">Sitemap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {urls.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="max-w-xs truncate px-4 py-2.5 font-medium text-slate-900" title={u.url}>
                    {u.url.replace(/^https?:\/\//, "").slice(0, 60)}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-sm font-semibold ${statusColor(u.httpStatus)}`}>
                    {u.httpStatus || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${indexColor(u.indexability)}`}>
                      {u.indexability || "—"}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-600" title={u.metaTitle || ""}>
                    {u.metaTitle || <span className="text-red-400 italic">missing</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-center ${!u.h1 ? "text-red-400" : ""}`}>
                    {u.h1Count || "0"}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-500">{u.wordCount}</td>
                  <td className="px-4 py-2.5 text-center text-slate-500">
                    {u.internalLinks} / {u.externalLinks}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {u.imagesMissingAlt > 0 ? (
                      <span className="text-amber-600">{u.images} ({u.imagesMissingAlt} missing alt)</span>
                    ) : (
                      <span className="text-slate-500">{u.images}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {u.inSitemap ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
