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

const SEV_COLORS: Record<string, string> = {
  HIGH: "border-red-500 bg-red-950 text-red-300",
  MEDIUM: "border-amber-500 bg-amber-950 text-amber-300",
  LOW: "border-green-500 bg-green-950 text-green-300",
};

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
    <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-lg">
      Loading MP roll-up data...
    </div>
  );
  if (error || !data || (data as any).detail) return (
    <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center text-lg">
      {error || (data as any)?.detail || "MP Not Found"}
    </div>
  );

  const riskColor = data.risk_level === "HIGH" ? "text-red-400 border-red-600 bg-red-950/30"
    : data.risk_level === "MEDIUM" ? "text-amber-400 border-amber-600 bg-amber-950/30"
    : "text-green-400 border-green-600 bg-green-950/30";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm">MP Overview</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">{data.mp_name}</h1>
            <p className="text-slate-400 mt-1">{data.constituency} · {data.state}</p>
          </div>
          <div className={`border rounded-xl px-6 py-4 text-center ${riskColor}`}>
            <div className="text-xs uppercase tracking-widest font-bold mb-1">Aggregated Risk Score</div>
            <div className="text-5xl font-black">{data.risk_score.toFixed(0)}</div>
            <div className="text-sm font-semibold mt-1">{data.risk_level}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Allocated Limit", value: fmt(data.allocated_amount), sub: "Total sanctioned limit" },
            { label: "Total Disbursed", value: fmt(data.total_disbursed), sub: "Amount released" },
            { label: "Utilization", value: `${data.utilization_pct.toFixed(1)}%`,
              sub: data.utilization_pct < 30 ? "⚠ Very Low" : "Utilization rate",
              highlight: data.utilization_pct < 30 },
            { label: "Total Payments", value: data.transaction_count.toString(), sub: `${data.unique_vendor_count} unique vendors` },
          ].map((card) => (
            <div key={card.label} className={`bg-slate-900 border rounded-xl p-4 ${card.highlight ? "border-red-700" : "border-slate-800"}`}>
              <div className="text-slate-500 text-xs mb-1">{card.label}</div>
              <div className={`text-2xl font-bold ${card.highlight ? "text-red-400" : "text-slate-100"}`}>{card.value}</div>
              <div className={`text-xs mt-1 ${card.highlight ? "text-red-500" : "text-slate-600"}`}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-300">Fund Utilization</span>
            <span className="text-sm text-slate-400">{fmt(data.total_disbursed)} of {fmt(data.allocated_amount)}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${data.utilization_pct < 30 ? "bg-red-500" : data.utilization_pct < 60 ? "bg-amber-500" : "bg-green-500"}`}
              style={{ width: `${Math.min(data.utilization_pct, 100)}%` }}
            />
          </div>
        </div>

        {data.explanations.length > 0 && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              MP-Level Flags
            </h2>
            <div className="space-y-3">
              {data.explanations.map((exp, idx) => (
                <div key={idx} className={`border-l-4 rounded-r-lg p-4 ${SEV_COLORS[exp.severity] || SEV_COLORS.LOW}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {MP_SIGNAL_LABELS[exp.type] || exp.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                      exp.severity === "HIGH" ? "border-red-600 text-red-400" : "border-amber-600 text-amber-400"
                    }`}>
                      {exp.severity}
                    </span>
                  </div>
                  <p className="text-sm mb-1">{exp.reason}</p>
                  <p className="text-xs opacity-60">{exp.data}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Scored Works ({data.works.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Top 50 works for this MP, sorted by individual risk score.
            </p>
          </div>
          
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 uppercase tracking-wider">
            <div className="col-span-5">Work ID / Type</div>
            <div className="col-span-2">District / FY</div>
            <div className="col-span-2 text-right">Expenditure</div>
            <div className="col-span-3 text-right">Risk Score</div>
          </div>
          
          {data.works.map((work) => (
            <Link
              key={work.work_id}
              href={`/work/${encodeURIComponent(work.work_id)}`}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer group"
            >
              <div className="col-span-5">
                <div className="font-medium text-slate-100 text-xs font-mono group-hover:text-indigo-400 transition-colors truncate">
                  {work.work_id}
                </div>
                <div className="text-slate-500 text-xs truncate" title={work.work_type}>{work.work_type}</div>
              </div>
              <div className="col-span-2">
                <div className="text-slate-300 text-xs truncate">{work.district}</div>
                <div className="text-slate-500 text-xs truncate">FY {work.fiscal_year || "Unknown"}</div>
              </div>
              <div className="col-span-2 self-center text-right text-slate-300 text-sm">
                {fmt(work.total_expenditure)}
              </div>
              <div className="col-span-3 self-center text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  work.risk_level === "HIGH" ? "bg-red-100 text-red-800 border-red-200" :
                  work.risk_level === "MEDIUM" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  "bg-green-100 text-green-800 border-green-200"
                }`}>
                  {work.risk_score.toFixed(0)} ({work.risk_level})
                </span>
              </div>
            </Link>
          ))}
          {data.works.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-sm">No expenditure works found for this MP.</div>
          )}
        </div>
      </main>
    </div>
  );
}