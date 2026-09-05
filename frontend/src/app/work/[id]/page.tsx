"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";

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

const SEV_COLORS: Record<string, string> = {
  HIGH: "border-red-500 bg-red-950/40 text-red-300",
  MEDIUM: "border-amber-500 bg-amber-950/40 text-amber-300",
  LOW: "border-green-500 bg-green-950/40 text-green-300",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(ds: string | null) {
  if (!ds) return "Unknown";
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ds));
  } catch (e) {
    return ds;
  }
}

export default function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<WorkRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/api/v1/works/${encodeURIComponent(decodeURIComponent(id))}/risk`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-lg">
      Loading work investigation...
    </div>
  );
  if (error || !data || (data as any).detail) return (
    <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center text-lg">
      {error || (data as any)?.detail || "Work Not Found"}
    </div>
  );

  const riskColor = data.risk_level === "HIGH" ? "text-red-400 border-red-600 bg-red-950/30"
    : data.risk_level === "MEDIUM" ? "text-amber-400 border-amber-600 bg-amber-950/30"
    : "text-green-400 border-green-600 bg-green-950/30";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← Dashboard</Link>
            <span className="text-slate-700">/</span>
            <Link href={`/mp/${encodeURIComponent(data.mp_name)}`} className="text-slate-500 hover:text-indigo-400 text-sm transition-colors">
              {data.mp_name}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 text-sm font-mono">{data.work_id}</span>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-semibold border border-slate-700 transition-colors">
              Request Audit
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold transition-colors">
              Mark Resolved
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Hero */}
        <div className="flex items-start justify-between mb-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-mono rounded border border-indigo-500/30">
                {data.work_id}
              </span>
              <span className="text-slate-500 text-sm">FY {data.fiscal_year || "Unknown"}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-50 leading-snug">{data.work_type}</h1>
            <p className="text-slate-400 mt-2">
              {data.district}, {data.state} · Implemented by {data.ida}
            </p>
          </div>
          <div className={`border rounded-xl px-6 py-4 text-center shrink-0 ml-4 ${riskColor}`}>
            <div className="text-xs uppercase tracking-widest font-bold mb-1">Work Risk Score</div>
            <div className="text-5xl font-black">{data.risk_score.toFixed(0)}</div>
            <div className="text-sm font-semibold mt-1">{data.risk_level}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Explanations */}
            {data.explanations.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Active Risk Flags ({data.explanations.length})
                </h2>
                <div className="space-y-3">
                  {data.explanations.map((exp, idx) => (
                    <div key={idx} className={`border-l-4 rounded p-4 ${SEV_COLORS[exp.severity] || SEV_COLORS.LOW}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          {SIGNAL_LABELS[exp.type] || exp.type}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                          exp.severity === "HIGH" ? "border-red-600/50 text-red-400" : "border-amber-600/50 text-amber-400"
                        }`}>
                          {exp.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-100 mb-2 leading-relaxed">{exp.reason}</p>
                      <div className="text-xs text-slate-400 font-mono bg-black/20 p-2 rounded">
                        {exp.data}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Payment Timeline
                </h2>
                <span className="text-xs text-slate-500">{data.payment_count} transactions</span>
              </div>
              <div className="p-0">
                <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800/50 bg-slate-900/50">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-5">Vendor</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {data.payments.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-slate-800/30 text-sm hover:bg-slate-800/20">
                    <div className="col-span-3 text-slate-400">{formatDate(p.date)}</div>
                    <div className="col-span-5 text-slate-200 truncate" title={p.vendor}>{p.vendor}</div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {p.status}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-slate-300">
                      {fmt(p.amount)}
                    </div>
                  </div>
                ))}
                {data.payments.length === 0 && (
                  <div className="p-5 text-center text-slate-500 text-sm">No payment records found.</div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Financial Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Financials</h2>
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-1">Total Expenditure</div>
                <div className="text-2xl font-bold text-slate-100">{fmt(data.total_expenditure)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Vendors</div>
                  <div className="text-lg font-semibold text-slate-200">{data.unique_vendors}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Payments</div>
                  <div className="text-lg font-semibold text-slate-200">{data.payment_count}</div>
                </div>
              </div>
            </div>

            {/* Peer Comparison */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Peer Comparison</h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Compared against {data.peer_comparison.peer_count} similar works in {data.state}.
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">This Work</span>
                    <span className="font-mono">{fmt(data.total_expenditure)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full">
                    <div className={`h-full rounded-full ${data.peer_comparison.ratio && data.peer_comparison.ratio > 1.5 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Peer Median</span>
                    <span className="font-mono text-slate-400">{fmt(data.peer_comparison.peer_avg_expenditure)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full">
                    <div className="h-full bg-slate-600 rounded-full" style={{ width: `${Math.min(100, (data.peer_comparison.peer_avg_expenditure / Math.max(data.total_expenditure, 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signal Fingerprint */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Signal Fingerprint</h2>
              <div className="space-y-3">
                {Object.entries(data.signals).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-400 shrink-0 truncate" title={SIGNAL_LABELS[key] || key}>
                      {SIGNAL_LABELS[key] || key}
                    </div>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val > 20 ? "bg-red-500" : val > 10 ? "bg-amber-500" : val > 0 ? "bg-indigo-500" : "bg-slate-700"}`}
                        style={{ width: `${Math.min(val * 3.33, 100)}%` }} // max theoretical component score ~30
                      />
                    </div>
                    <div className="w-6 text-right text-xs font-mono text-slate-500">{val.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}