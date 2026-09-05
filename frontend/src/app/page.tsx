"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";

interface MPRecord {
  mp_name: string;
  constituency: string;
  state: string;
  risk_score: number;
  risk_level: string;
  utilization_pct: number;
  allocated_amount: number;
  total_disbursed: number;
  transaction_count: number;
  unique_vendor_count: number;
  signals: {
    underspend: number;
  };
}

interface WorkRecord {
  work_id: string;
  work_type: string;
  state: string;
  district: string;
  mp_name: string;
  total_expenditure: number;
  payment_count: number;
  unique_vendors: number;
  risk_score: number;
  risk_level: string;
  signals: {
    cost_peer: number;
    vendor: number;
    payment_timing: number;
    amount_anomaly: number;
    duplicate: number;
  };
}

interface Stats {
  total_works: number;
  total_mps: number;
  high_risk_works: number;
  high_risk_mps: number;
  medium_risk_works: number;
  low_risk_works: number;
  total_disbursed: number;
  total_allocated: number;
}

const MP_SIGNAL_LABELS: Record<string, string> = {
  underspend: "Underspend",
};

const WORK_SIGNAL_LABELS: Record<string, string> = {
  cost_peer: "Cost Anomaly",
  vendor: "Vendor Lock",
  payment_timing: "Delay",
  amount_anomaly: "Amount Anomaly",
  duplicate: "Duplicate",
};

function fmt(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"MPs" | "Works">("MPs");
  const [stats, setStats] = useState<Stats | null>(null);
  const [mps, setMps] = useState<MPRecord[]>([]);
  const [works, setWorks] = useState<WorkRecord[]>([]);
  const [filter, setFilter] = useState("HIGH");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => console.error("Stats fetch error:", e));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (activeTab === "MPs") {
      fetch(`${API_BASE}/api/v1/mps?risk_level=${filter}&limit=200`)
        .then((r) => r.json())
        .then((d) => { setMps(d.mps || []); setLoading(false); })
        .catch(() => { setMps([]); setLoading(false); });
    } else {
      fetch(`${API_BASE}/api/v1/works?risk_level=${filter}&limit=200`)
        .then((r) => r.json())
        .then((d) => { setWorks(d.works || []); setLoading(false); })
        .catch(() => { setWorks([]); setLoading(false); });
    }
  }, [filter, activeTab]);

  const filteredMps = mps.filter(
    (m) =>
      m.mp_name.toLowerCase().includes(search.toLowerCase()) ||
      m.constituency.toLowerCase().includes(search.toLowerCase()) ||
      m.state.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWorks = works.filter(
    (w) =>
      w.work_id.toLowerCase().includes(search.toLowerCase()) ||
      w.mp_name.toLowerCase().includes(search.toLowerCase()) ||
      w.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Portfolio Overview</h2>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Total Monitored Works" value={stats.total_works.toLocaleString()} />
            <MetricCard label="Total Monitored MPs" value={stats.total_mps.toLocaleString()} />
            <MetricCard 
              label="Works Needing Review" 
              value={stats.high_risk_works + stats.medium_risk_works} 
              subtext={`${stats.high_risk_works} High Priority`}
              highlight={stats.high_risk_works > 0} 
            />
            <MetricCard 
              label="MPs Needing Review" 
              value={stats.high_risk_mps + (stats?.total_mps > 0 ? 0 : 0)} // Using a placeholder since medium_risk_mps isn't in stats
              subtext={`${stats.high_risk_mps} High Priority`}
              highlight={stats.high_risk_mps > 0}
            />
            <MetricCard label="Total Disbursed" value={fmt(stats.total_disbursed)} valueClassName="text-brand" />
          </div>
        ) : (
          <div className="h-24 bg-surface-secondary animate-pulse rounded-xl border border-border"></div>
        )}
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-surface-secondary border border-border rounded-lg p-1">
            {(["MPs", "Works"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
                  activeTab === tab
                    ? "bg-surface shadow-sm text-foreground border border-border"
                    : "text-foreground-secondary hover:text-foreground border border-transparent"
                }`}
              >
                {tab} Review Queue
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border hidden md:block"></div>

          <div className="flex gap-2">
            {[
              { level: "HIGH", label: "High Priority" },
              { level: "MEDIUM", label: "Needs Review" },
              { level: "LOW", label: "Standard" }
            ].map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setFilter(lvl.level)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
                  filter === lvl.level
                    ? lvl.level === "HIGH"
                      ? "bg-risk-high-bg border-risk-high-border text-risk-high"
                      : lvl.level === "MEDIUM"
                      ? "bg-risk-medium-bg border-risk-medium-border text-risk-medium"
                      : "bg-risk-low-bg border-risk-low-border text-risk-low"
                    : "bg-surface border-border text-foreground-secondary hover:bg-surface-secondary"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">Search</label>
          <input
            id="search-input"
            className="w-full md:w-64 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "MPs" ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-secondary border-b border-border text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">MP / Constituency</th>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold text-right">Review Score</th>
                  <th className="px-4 py-3 font-semibold text-right">Util %</th>
                  <th className="px-4 py-3 font-semibold text-right">Allocated</th>
                  <th className="px-4 py-3 font-semibold">Review Signals</th>
                  <th className="px-4 py-3 font-semibold text-right">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-foreground-secondary">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMps.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-foreground-secondary">No results found for the selected criteria.</td></tr>
                ) : (
                  filteredMps.map((mp) => (
                    <tr key={mp.mp_name} className="hover:bg-surface-secondary/50 transition-colors group">
                      <td className="px-4 py-3 align-middle">
                        <Link href={`/mp/${encodeURIComponent(mp.mp_name)}`} className="block focus:outline-none focus:underline group-hover:text-brand">
                          <div className="font-medium text-foreground transition-colors truncate max-w-[200px]">
                            {mp.mp_name}
                          </div>
                          <div className="text-foreground-secondary text-xs truncate max-w-[200px]">{mp.constituency}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary text-sm align-middle truncate max-w-[120px]">{mp.state}</td>
                      <td className="px-4 py-3 align-middle text-right">
                        <StatusBadge level={mp.risk_level} score={mp.risk_score} showLabel={false} />
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <span className={`text-sm font-semibold ${mp.utilization_pct < 30 ? "text-risk-high" : mp.utilization_pct < 60 ? "text-risk-medium" : "text-risk-low"}`}>
                          {mp.utilization_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-right text-foreground text-sm font-mono">{fmt(mp.allocated_amount)}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(mp.signals).map(([key, val]) =>
                            val > 0 ? (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 bg-surface-secondary text-foreground-secondary border border-border rounded" title={`${MP_SIGNAL_LABELS[key]}: ${val}`}>
                                {MP_SIGNAL_LABELS[key] || key}
                              </span>
                            ) : null
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-right text-foreground-secondary text-sm">{mp.transaction_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-secondary border-b border-border text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Work ID / Type</th>
                  <th className="px-4 py-3 font-semibold">MP / District</th>
                  <th className="px-4 py-3 font-semibold text-right">Review Score</th>
                  <th className="px-4 py-3 font-semibold text-right">Expenditure</th>
                  <th className="px-4 py-3 font-semibold">Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-foreground-secondary">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredWorks.length === 0 ? (
                  <tr><td colSpan={5} className="py-16 text-center text-foreground-secondary">No results found for the selected criteria.</td></tr>
                ) : (
                  filteredWorks.map((work) => (
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
                        <div className="text-foreground text-sm truncate max-w-[150px]">{work.mp_name}</div>
                        <div className="text-foreground-secondary text-xs truncate max-w-[150px]">{work.district}</div>
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <StatusBadge level={work.risk_level} score={work.risk_score} showLabel={false} />
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <div className="text-foreground text-sm font-mono">{fmt(work.total_expenditure)}</div>
                        <div className="text-foreground-secondary text-[10px] mt-0.5">{work.payment_count} txns, {work.unique_vendors} vendors</div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(work.signals).map(([key, val]) =>
                            val > 0 ? (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 bg-surface-secondary text-foreground-secondary border border-border rounded" title={`${WORK_SIGNAL_LABELS[key]}: ${val}`}>
                                {WORK_SIGNAL_LABELS[key] || key}
                              </span>
                            ) : null
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <div className="mt-4 text-foreground-secondary text-sm font-medium px-1">
        Showing {activeTab === "MPs" ? filteredMps.length : filteredWorks.length} {activeTab.toLowerCase()}
      </div>
    </div>
  );
}