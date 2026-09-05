"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";

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

const RISK_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

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
      .then(setStats);
  }, []);

  useEffect(() => {
    setLoading(true);
    if (activeTab === "MPs") {
      fetch(`${API_BASE}/api/v1/mps?risk_level=${filter}&limit=200`)
        .then((r) => r.json())
        .then((d) => { setMps(d.mps || []); setLoading(false); });
    } else {
      fetch(`${API_BASE}/api/v1/works?risk_level=${filter}&limit=200`)
        .then((r) => r.json())
        .then((d) => { setWorks(d.works || []); setLoading(false); });
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-indigo-400">MPLADS</span> AI Risk Intelligence
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Powered by Public MPLADS report data
            </p>
          </div>
          <div className="text-xs text-slate-500 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-3">
            <span>SIH 2026 · Problem SIH26102</span>
            <div className="h-4 w-px bg-slate-700"></div>
            <span>Role: Ministry Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Works", value: stats.total_works, color: "text-slate-100" },
              { label: "Total MPs", value: stats.total_mps, color: "text-slate-100" },
              { label: "HIGH Risk Works", value: stats.high_risk_works, color: "text-red-400" },
              { label: "HIGH Risk MPs", value: stats.high_risk_mps, color: "text-red-400" },
              { label: "Total Disbursed", value: fmt(stats.total_disbursed), color: "text-indigo-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mb-6 items-center flex-wrap">
          {/* Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 mr-4">
            {(["MPs", "Works"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-800 mr-4"></div>

          {["HIGH", "MEDIUM", "LOW"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                filter === lvl
                  ? lvl === "HIGH"
                    ? "bg-red-500 border-red-400 text-white"
                    : lvl === "MEDIUM"
                    ? "bg-amber-500 border-amber-400 text-white"
                    : "bg-green-500 border-green-400 text-white"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {lvl}
            </button>
          ))}
          <input
            className="ml-auto bg-slate-900 border border-slate-700 rounded-lg px-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 w-64"
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {activeTab === "MPs" ? (
            <>
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                <div className="col-span-3">MP / Constituency</div>
                <div className="col-span-1">State</div>
                <div className="col-span-1 text-right">Risk</div>
                <div className="col-span-1 text-right">Util%</div>
                <div className="col-span-2 text-right">Allocated</div>
                <div className="col-span-2">Risk Signals</div>
                <div className="col-span-1 text-right">Txns</div>
                <div className="col-span-1 text-right">Vendors</div>
              </div>
              {loading ? (
                <div className="py-16 text-center text-slate-500">Loading MPs...</div>
              ) : filteredMps.length === 0 ? (
                <div className="py-16 text-center text-slate-500">No results found.</div>
              ) : (
                filteredMps.map((mp) => (
                  <Link
                    key={mp.mp_name}
                    href={`/mp/${encodeURIComponent(mp.mp_name)}`}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <div className="col-span-3">
                      <div className="font-medium text-slate-100 text-sm group-hover:text-indigo-400 transition-colors truncate">
                        {mp.mp_name}
                      </div>
                      <div className="text-slate-500 text-xs truncate">{mp.constituency}</div>
                    </div>
                    <div className="col-span-1 text-slate-400 text-xs self-center truncate">{mp.state}</div>
                    <div className="col-span-1 self-center text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${RISK_COLORS[mp.risk_level]}`}>
                        {mp.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <div className="col-span-1 self-center text-right">
                      <span className={`text-sm font-semibold ${mp.utilization_pct < 20 ? "text-red-400" : mp.utilization_pct < 60 ? "text-amber-400" : "text-green-400"}`}>
                        {mp.utilization_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-span-2 self-center text-right text-slate-300 text-sm">{fmt(mp.allocated_amount)}</div>
                    <div className="col-span-2 self-center flex gap-1 flex-wrap">
                      {Object.entries(mp.signals).map(([key, val]) =>
                        val > 0 ? (
                          <span key={key} className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded" title={`${MP_SIGNAL_LABELS[key]}: ${val}`}>
                            {MP_SIGNAL_LABELS[key] || key}
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="col-span-1 self-center text-right text-slate-400 text-sm">{mp.transaction_count}</div>
                    <div className="col-span-1 self-center text-right text-slate-400 text-sm">{mp.unique_vendor_count}</div>
                  </Link>
                ))
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                <div className="col-span-4">Work ID / Type</div>
                <div className="col-span-2">MP / District</div>
                <div className="col-span-1 text-right">Risk</div>
                <div className="col-span-2 text-right">Expenditure</div>
                <div className="col-span-3">Signals</div>
              </div>
              {loading ? (
                <div className="py-16 text-center text-slate-500">Loading Works...</div>
              ) : filteredWorks.length === 0 ? (
                <div className="py-16 text-center text-slate-500">No results found.</div>
              ) : (
                filteredWorks.map((work) => (
                  <Link
                    key={work.work_id}
                    href={`/work/${encodeURIComponent(work.work_id)}`}
                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <div className="col-span-4">
                      <div className="font-medium text-slate-100 text-xs font-mono group-hover:text-indigo-400 transition-colors truncate">
                        {work.work_id}
                      </div>
                      <div className="text-slate-500 text-xs truncate" title={work.work_type}>{work.work_type}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-300 text-xs truncate">{work.mp_name}</div>
                      <div className="text-slate-500 text-xs truncate">{work.district}</div>
                    </div>
                    <div className="col-span-1 self-center text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${RISK_COLORS[work.risk_level]}`}>
                        {work.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <div className="col-span-2 self-center text-right">
                      <div className="text-slate-300 text-sm">{fmt(work.total_expenditure)}</div>
                      <div className="text-slate-500 text-[10px]">{work.payment_count} txns, {work.unique_vendors} vendors</div>
                    </div>
                    <div className="col-span-3 self-center flex gap-1 flex-wrap">
                      {Object.entries(work.signals).map(([key, val]) =>
                        val > 0 ? (
                          <span key={key} className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded" title={`${WORK_SIGNAL_LABELS[key]}: ${val}`}>
                            {WORK_SIGNAL_LABELS[key] || key}
                          </span>
                        ) : null
                      )}
                    </div>
                  </Link>
                ))
              )}
            </>
          )}
        </div>
        <div className="mt-3 text-slate-600 text-xs">
          {activeTab === "MPs" ? filteredMps.length : filteredWorks.length} {activeTab} shown
        </div>
      </main>
    </div>
  );
}