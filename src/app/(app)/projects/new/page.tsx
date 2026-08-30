"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    businessLocation: "",
    industry: "",
    primaryCategory: "",
    targetServiceArea: "",
    gbpUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = form.websiteUrl.trim();
    const body = {
      ...form,
      websiteUrl: url.startsWith("http") ? url : `https://${url}`,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create project");
      return;
    }
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Create Project</h1>
      <p className="mt-1 text-sm text-slate-500">Add a client website to analyze</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Project Details</h2>
          <div className="mt-4 space-y-4">
            <Field label="Project Name" required placeholder="Shelby Web Company" value={form.name} onChange={(v) => set("name", v)} />
            <Field label="Website URL" required placeholder="https://www.shelbywebco.com" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} />
            <Field label="Industry" placeholder="Web Design / SEO" value={form.industry} onChange={(v) => set("industry", v)} />
            <Field label="Primary Business Category" placeholder="Web Development Agency" value={form.primaryCategory} onChange={(v) => set("primaryCategory", v)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Location &amp; Service Area</h2>
          <div className="mt-4 space-y-4">
            <Field label="Business Location" placeholder="Shelby, NC" value={form.businessLocation} onChange={(v) => set("businessLocation", v)} />
            <Field label="Target Service Area" placeholder="Shelby, NC and surrounding areas" value={form.targetServiceArea} onChange={(v) => set("targetServiceArea", v)} />
            <Field label="Google Business Profile URL (optional)" placeholder="https://business.google.com/..." value={form.gbpUrl} onChange={(v) => set("gbpUrl", v)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
    </div>
  );
}
