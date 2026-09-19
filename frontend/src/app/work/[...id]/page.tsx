"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";
import StatusBadge from "@/components/StatusBadge";
import RiskMeter from "@/components/RiskMeter";

interface Explanation {
  type: string;
  severity: string;
  reason: string;
  data: string;
}

interface Payment {
  vendor: string;
  amount: number;
  date: string | null;
  status: string;
}

interface WorkRisk {
  work_id: string;
  work_type: string;
  state: string;
  district: string;
  mp_name: string;
  constituency: string;
  ida: string;
  fiscal_year: string | null;
  total_expenditure: number;
  payment_count: number;
  unique_vendors: number;
  latest_payment_status: string;
  first_payment_date: string | null;
  last_payment_date: string | null;
  risk_score: number;
  risk_level: string;
  signals: Record<string, number>;
  explanations: Explanation[];
  payments: Payment[];
  peer_comparison: {
    peer_avg_expenditure: number;
    peer_count: number;
    ratio: number | null;
  };
  recommendation: string;
}

const SIGNAL_LABELS: Record<string, string> = {
  cost_peer: "Cost Anomaly",
  vendor: "Vendor Concentration",
  payment_timing: "Timing / Delay",
  amount_anomaly: "Amount Outlier",
  duplicate: "Duplicate Work",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(ds: string | null) {
  if (!ds) return "Unknown";
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ds));
  } catch {
    return ds;
  }
}

export default function WorkPage({ params }: { params: Promise<{ id: string | string[] }> }) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.id;
  const id = Array.isArray(rawId) ? rawId.join('/') : rawId;
  const [data, setData] = useState<WorkRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const cleanId = decodeURIComponent(id);
    fetch(`${API_BASE}/api/v1/works/${encodeURIComponent(cleanId)}/risk`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background text-foreground-secondary flex items-center justify-center text-lg">
      <div className="flex flex-col items-center gap-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent align-[-0.125em]" role="status" />
        <p>Loading work investigation...</p>
      </div>
    </div>
  );
  if (error || !data || (data && 'detail' in data)) return (
    <div className="min-h-screen bg-background text-risk-high flex items-center justify-center text-lg font-medium">
      {error || (data && 'detail' in data ? (data as { detail: string }).detail : "") || "Work Not Found"}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <nav className="flex items-center gap-2 text-sm text-foreground-secondary" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand focus:outline-none focus:underline transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/mp/${encodeURIComponent(data.mp_name)}`} className="hover:text-brand focus:outline-none focus:underline transition-colors truncate max-w-[150px] sm:max-w-none">
            {data.mp_name}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono truncate max-w-[150px] sm:max-w-none" aria-current="page">{data.work_id}</span>
        </nav>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface hover:bg-surface-secondary text-foreground rounded-lg text-sm font-semibold border border-border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand">
            Request Audit
          </button>
          <button className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2">
            Mark Resolved
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs font-mono rounded border border-brand/20 font-medium">
              {data.work_id}
            </span>
            <span className="text-foreground-secondary text-sm bg-surface-secondary px-2 py-0.5 rounded border border-border">FY {data.fiscal_year || "Unknown"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-snug">{data.work_type}</h1>
          <p className="text-foreground-secondary mt-2 text-lg">
            {data.district}, {data.state} · Implemented by <span className="font-medium text-foreground">{data.ida}</span>
          </p>
        </div>
        <div className="shrink-0 w-full md:w-[290px]">
          <RiskMeter
            score={data.risk_score}
            riskLevel={data.risk_level}
            title="Forensic Priority Meter"
            signals={data.signals}
            explanations={data.explanations}
            peerComparison={data.peer_comparison}
            uniqueVendors={data.unique_vendors}
            showFactors={false}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {data.explanations.length > 0 && (
            <div className="bg-surface border border-border shadow-sm rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-surface-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Active Review Flags ({data.explanations.length})
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
                        {SIGNAL_LABELS[exp.type] || exp.type}
                      </span>
                      <StatusBadge level={exp.severity} />
                    </div>
                    <p className="text-sm text-foreground mb-3 leading-relaxed">{exp.reason}</p>
                    <div className="text-xs text-foreground-secondary font-mono bg-surface border border-border p-3 rounded">
                      {exp.data}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface border border-border shadow-sm rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface-secondary flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Payment Timeline
              </h2>
              <span className="text-xs text-foreground-secondary font-medium bg-surface px-2 py-1 rounded border border-border">{data.payment_count} transactions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-surface border-b border-border text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Vendor</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-foreground-secondary text-sm">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p, i) => (
                      <tr key={i} className="hover:bg-surface-secondary/50 transition-colors">
                        <td className="px-5 py-3 text-foreground-secondary text-sm whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="px-5 py-3 text-foreground font-medium text-sm truncate max-w-[200px]" title={p.vendor}>{p.vendor}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] uppercase px-2 py-1 bg-surface-secondary border border-border text-foreground-secondary rounded font-bold">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-foreground font-medium">
                          {fmt(p.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-border shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-5">Financials</h2>
            <div className="mb-6">
              <div className="text-xs text-foreground-secondary mb-1 font-medium">Total Expenditure</div>
              <div className="text-3xl font-bold text-foreground font-mono tracking-tight">{fmt(data.total_expenditure)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <div className="text-xs text-foreground-secondary mb-1 font-medium">Vendors</div>
                <div className="text-xl font-semibold text-foreground">{data.unique_vendors}</div>
              </div>
              <div>
                <div className="text-xs text-foreground-secondary mb-1 font-medium">Payments</div>
                <div className="text-xl font-semibold text-foreground">{data.payment_count}</div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Peer Comparison</h2>
            <p className="text-sm text-foreground-secondary mb-6 leading-relaxed">
              Compared against <strong className="text-foreground font-semibold">{data.peer_comparison.peer_count}</strong> similar works in {data.state}.
            </p>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground font-medium">This Work</span>
                  <span className="font-mono font-medium">{fmt(data.total_expenditure)}</span>
                </div>
                <div className="w-full h-2.5 bg-surface-secondary border border-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${data.peer_comparison.ratio && data.peer_comparison.ratio > 1.5 ? 'bg-risk-high' : 'bg-brand'}`} style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground-secondary font-medium">Peer Median</span>
                  <span className="font-mono text-foreground-secondary">{fmt(data.peer_comparison.peer_avg_expenditure)}</span>
                </div>
                <div className="w-full h-2.5 bg-surface-secondary border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-border rounded-full" style={{ width: `${Math.min(100, (data.peer_comparison.peer_avg_expenditure / Math.max(data.total_expenditure, 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-5">Signal Fingerprint</h2>
            <div className="space-y-4">
              {Object.entries(data.signals).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-medium text-foreground-secondary shrink-0 truncate" title={SIGNAL_LABELS[key] || key}>
                    {SIGNAL_LABELS[key] || key}
                  </div>
                  <div className="flex-1 h-2 bg-surface-secondary border border-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${val > 20 ? "bg-risk-high" : val > 10 ? "bg-risk-medium" : val > 0 ? "bg-risk-low" : "bg-border"}`}
                      style={{ width: `${Math.min(val * 3.33, 100)}%` }} 
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-mono font-semibold text-foreground">{val.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}