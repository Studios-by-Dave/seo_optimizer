"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunAuditButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCrawl() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxPages: 500, crawlDepth: 5 }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to start crawl");
      return;
    }
    router.push(`/projects/${projectId}/urls?crawlId=${data.crawlId}`);
  }

  return (
    <div>
      <button
        onClick={startCrawl}
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Starting..." : "Run Full Website Audit"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
