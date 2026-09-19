"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";

interface Explanation {
  type: string;
  severity: string;
  reason: string;
  data: string;
}

interface WorkBrief {
  work_id: string;
  work_type: string;
  district: string;
  fiscal_year: string | null;
  total_expenditure: number;
  risk_score: number;
  risk_level: string;
}

interface MPRisk {
  mp_name: string;
  constituency: string;
  state: string;
  house?: string;
  allocated_amount: number;
  total_disbursed: number;
  utilization_pct: number;
  transaction_count: number;
  unique_vendor_count: number;
  risk_score: number;
  risk_level: string;
  signals: Record<string, number>;
  explanations: Explanation[];
  works: WorkBrief[];
  recommendation: string;
}

const MP_SIGNAL_LABELS: Record<string, string> = {
  underspend: "Underspending",
};

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function MPPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [data, setData] = useState<MPRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!name) return;
    fetch(`${API_BASE}/api/v1/mps/${encodeURIComponent(decodeURIComponent(name))}/risk`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [name]);

  if (loading) return (
    <div className="min-h-screen bg-background text-foreground-secondary flex items-center justify-center text-lg">
      <div className="flex flex-col items-center gap-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent align-[-0.125em]" role="status" />
        <p>Loading portfolio data...</p>
      </div>
    </div>
  );
  
  if (error || !data || (data && 'detail' in data)) return (
    <div className="min-h-screen bg-background text-risk-high flex items-center justify-center text-lg font-medium">
      {error || (data && 'detail' in data ? (data as { detail: string }).detail : "") || "MP Not Found"}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full">
      <nav className="mb-6 flex items-center gap-2 text-sm text-foreground-secondary" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand focus:outline-none focus:underline transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/mp" className="hover:text-brand focus:outline-none focus:underline transition-colors">MP Portfolios</Link>
        <span>/</span>
        <span className="text-foreground font-medium" aria-current="page">{data.mp_name}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-foreground">{data.mp_name}</h1>
            {data.house === 'RAJYA_SABHA' ? (
              <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                <span>📜</span> Rajya Sabha (Upper House)
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                <span>🗳️</span> Lok Sabha (Lower House)
              </span>
            )}
          </div>
          <p className="text-foreground-secondary mt-1 text-lg">{data.constituency} · {data.state}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl px-6 py-4 text-center shrink-0 shadow-sm min-w-[200px]">
          <div className="text-xs uppercase tracking-widest font-bold text-foreground-secondary mb-1">Priority Verification Score</div>
          <div className={`text-5xl font-black mb-2 ${
            data.risk_level === "HIGH" ? "text-risk-high" :
            data.risk_level === "MEDIUM" ? "text-risk-medium" : "text-risk-low"
          }`}>
            {data.risk_score.toFixed(0)}
          </div>
          <StatusBadge level={data.risk_level} showLabel={true} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Allocated Limit" value={fmt(data.allocated_amount)} subtext="Total sanctioned limit" />
        <MetricCard label="Total Disbursed" value={fmt(data.total_disbursed)} subtext="Amount released" valueClassName="text-brand" />
        <div className={`bg-surface border rounded-xl p-4 transition-colors ${data.utilization_pct < 30 ? "border-risk-high-border bg-risk-high-bg/30" : "border-border"}`}>
          <ProgressBar 
            percentage={data.utilization_pct} 
            label="Utilization" 
            subtext={`${data.utilization_pct.toFixed(1)}%`} 
          />
          <div className={`text-xs mt-3 ${data.utilization_pct < 30 ? "text-risk-high font-medium" : "text-foreground-secondary"}`}>
            {data.utilization_pct < 30 ? "⚠ Very Low Utilization" : "Utilization rate"}
          </div>
        </div>
        <MetricCard label="Total Payments" value={data.transaction_count} subtext={`${data.unique_vendor_count} unique vendors`} />
      </div>

      {data.explanations.length > 0 && (
        <div className="mb-8 bg-surface border border-border shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Review Signals ({data.explanations.length})
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {data.explanations.map((exp, idx) => (
              <div key={idx} className={`border-l-4 rounded-r-lg p-4 bg-surface-secondary ${
                exp.severity === "HIGH" ? "border-l-risk-high" :
                exp.severity === "MEDIUM" ? "border-l-risk-medium" : "border-l-risk-low"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {MP_SIGNAL_LABELS[exp.type] || exp.type}
                  </span>
                  <StatusBadge level={exp.severity} />
                </div>
                <p className="text-sm text-foreground mb-2 leading-relaxed">{exp.reason}</p>
                <div className="text-xs text-foreground-secondary font-mono bg-surface border border-border p-2 rounded">
                  {exp.data}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface border border-border shadow-sm rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface-secondary">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Funded Works ({data.works.length})
          </h2>
          <p className="text-xs text-foreground-secondary">
            Top 50 works, sorted by priority score
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface border-b border-border text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Work ID / Type</th>
                <th className="px-4 py-3 font-semibold">District / FY</th>
                <th className="px-4 py-3 font-semibold text-right">Expenditure</th>
                <th className="px-4 py-3 font-semibold text-right">Review Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.works.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-foreground-secondary text-sm">
                    No expenditure works found for this portfolio.
                  </td>
                </tr>
              ) : (
                data.works.map((work) => (
                  <tr key={work.work_id} className="hover:bg-surface-secondary/50 transition-colors group">
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/work/${encodeURIComponent(work.work_id)}`} className="block focus:outline-none focus:underline group-hover:text-brand">
                        <div className="font-medium text-foreground text-sm font-mono transition-colors truncate max-w-[250px]">
                          {work.work_id}
                        </div>
                        <div className="text-foreground-secondary text-xs truncate max-w-[250px]" title={work.work_type}>{work.work_type}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-foreground text-sm truncate max-w-[150px]">{work.district}</div>
                      <div className="text-foreground-secondary text-xs truncate max-w-[150px]">FY {work.fiscal_year || "Unknown"}</div>
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-foreground text-sm font-mono">
                      {fmt(work.total_expenditure)}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <StatusBadge level={work.risk_level} score={work.risk_score} showLabel={true} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}