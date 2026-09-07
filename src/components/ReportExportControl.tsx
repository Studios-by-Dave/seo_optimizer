"use client";

import { useState } from "react";

export default function ReportExportControl({ projectId }: { projectId: string }) {
  const [branded, setBranded] = useState(true);
  const [headerLogo, setHeaderLogo] = useState(true);
  const [footer, setFooter] = useState(true);
  const [colorize, setColorize] = useState(true);

  const qs = new URLSearchParams({
    format: "pdf",
    print: "1",
    branded: branded ? "1" : "0",
    headerLogo: headerLogo ? "1" : "0",
    footer: footer ? "1" : "0",
    colorize: colorize ? "1" : "0",
  });

  const href = `/api/projects/${projectId}/audit?${qs.toString()}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={branded} onChange={(e) => setBranded(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#0B1D3A]" />
        Branded export
        <span className="text-xs font-normal text-slate-500">— logos, colors & footer</span>
      </label>
      {branded && (
        <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={headerLogo} onChange={(e) => setHeaderLogo(e.target.checked)} className="h-3.5 w-3.5" /> Header logo</label>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={footer} onChange={(e) => setFooter(e.target.checked)} className="h-3.5 w-3.5" /> Footer</label>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={colorize} onChange={(e) => setColorize(e.target.checked)} className="h-3.5 w-3.5" /> Brand colors</label>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <a href={href} target="_blank" rel="noopener" className="rounded-md bg-[#0B1D3A] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#132a52]">Download PDF</a>
        <a href={`/api/projects/${projectId}/audit?format=pdf`} target="_blank" rel="noopener" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open HTML</a>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Uses org logo & primaryColor from Settings when branded.</p>
    </div>
  );
}
