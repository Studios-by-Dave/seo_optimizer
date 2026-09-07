"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const ok = confirm(`Delete "${projectName}"? This permanently removes all crawls, audits, keywords and competitors. This cannot be undone.`);
    if (!ok) return;
    const typed = prompt(`Type DELETE to confirm deletion of "${projectName}"`);
    if (typed !== "DELETE") return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to delete");
      setDeleting(false);
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete Project"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
