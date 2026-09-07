type Point = { label: string; score: number | null; date: string };

export default function ScoreTrendChart({ points }: { points: Point[] }) {
  const valid = points.filter((p) => p.score !== null) as { label: string; score: number; date: string }[];
  if (valid.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Need at least 2 completed audits to show trend. Run more crawls.
      </div>
    );
  }
  const w = 600, h = 160, pad = 24;
  const min = Math.min(...valid.map((p) => p.score));
  const max = Math.max(...valid.map((p) => p.score));
  const range = Math.max(max - min, 10);
  const y = (s: number) => h - pad - ((s - (min - 5)) / (range + 10)) * (h - pad * 2);
  const x = (i: number) => pad + (i / (valid.length - 1)) * (w - pad * 2);
  const path = valid.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`).join(" ");
  const area = `${path} L ${x(valid.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold">SEO Score Trend</h3>
      <p className="text-xs text-slate-500">Last {valid.length} audits across all projects</p>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full min-w-[400px]">
          {/* grid */}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={pad} x2={w - pad} y1={pad + i * ((h - pad * 2) / 3)} y2={pad + i * ((h - pad * 2) / 3)} stroke="#e2e8f0" strokeDasharray="4 4" />
          ))}
          <path d={area} fill="#0B1D3A" fillOpacity={0.06} />
          <path d={path} fill="none" stroke="#0B1D3A" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {valid.map((p, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.score)} r={5} fill={p.score >= 75 ? "#059669" : p.score >= 60 ? "#d97706" : "#dc2626"} stroke="white" strokeWidth={2} />
              <text x={x(i)} y={y(p.score) - 10} textAnchor="middle" fontSize={10} fill="#0f172a" fontWeight={700}>{p.score}</text>
              <text x={x(i)} y={h - 4} textAnchor="middle" fontSize={9} fill="#64748b">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
