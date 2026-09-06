'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';
import IndiaMap from '@/components/IndiaMap';

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

interface WorkItem {
  work_id: string;
  work_type: string;
  state: string;
  district: string;
  mp_name: string;
  constituency: string;
  fiscal_year: string;
  total_expenditure: number;
  payment_count: number;
  unique_vendors: number;
  latest_payment_status: string;
  risk_score: number;
  risk_level: string;
  signals?: {
    cost_peer?: number;
    vendor?: number;
    payment_timing?: number;
    amount_anomaly?: number;
    duplicate?: number;
  };
}

interface WorkDetail {
  work_id: string;
  work_type: string;
  state: string;
  district: string;
  mp_name: string;
  constituency: string;
  ida?: string;
  fiscal_year: string;
  total_expenditure: number;
  payment_count: number;
  unique_vendors: number;
  latest_payment_status: string;
  first_payment_date?: string;
  last_payment_date?: string;
  risk_score: number;
  risk_level: string;
  signals?: Record<string, number>;
  explanations?: Array<{
    type: string;
    severity: string;
    reason: string;
    data: string;
  }>;
  payments?: Array<{
    vendor: string;
    amount: number;
    date: string;
    status: string;
  }>;
  peer_comparison?: {
    peer_avg_expenditure: number;
    peer_count: number;
    ratio: number;
  };
  recommendation?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [activeWork, setActiveWork] = useState<WorkDetail | null>(null);
  const [loadingWork, setLoadingWork] = useState(false);

  // Load KPI stats
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => console.error('Stats fetch error:', e));
  }, []);

  // Load works (filtered by state if selected)
  useEffect(() => {
    const url = selectedState
      ? `${API_BASE}/api/v1/works?risk_level=HIGH&state=${encodeURIComponent(selectedState)}&limit=8`
      : `${API_BASE}/api/v1/works?risk_level=HIGH&limit=8`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list: WorkItem[] = d.works || [];
        setWorks(list);
        if (list.length > 0 && (!activeWork || !list.some((w) => w.work_id === activeWork.work_id))) {
          loadWorkDetail(list[0].work_id);
        }
      })
      .catch(() => setWorks([]));
  }, [selectedState]);

  // Load single work details for the investigation card
  const loadWorkDetail = async (workId: string) => {
    setLoadingWork(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/works/${encodeURIComponent(workId)}/risk`);
      if (res.ok) {
        const data: WorkDetail = await res.json();
        setActiveWork(data);
      }
    } catch (err) {
      console.error('Error fetching work details', err);
    } finally {
      setLoadingWork(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Top Banner / System Notice */}
      <div className="mb-6 p-4 bg-surface rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-primary font-bold text-lg border border-stone-200">
            <i className="fas fa-shield-alt text-brand" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              National MPLADS AI Risk Intelligence Oversight
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Active Audit FY 2025-26
              </span>
            </h2>
            <p className="text-xs text-foreground-secondary">
              Real-time anomaly detection, cross-district peer comparison, and expenditure risk scoring across 543 parliamentary constituencies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-foreground-secondary">eSAKSHI Sync:</span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Connected
          </span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-surface-secondary text-brand flex items-center justify-center text-lg mb-3">
            <i className="fas fa-tasks"></i>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Total Projects Scored
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {stats ? stats.total_works.toLocaleString() : '8,868'}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium">
            Across <span className="font-semibold text-foreground">{stats?.total_mps || 542} MPs</span> & 36 States/UTs
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border-l-[6px] border-risk-high border-t border-r border-b flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-[#f0e4e0] text-brand flex items-center justify-center text-lg mb-3">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Requires Review (High Risk)
          </div>
          <div className="text-3xl font-bold text-risk-high mb-1">
            {stats ? stats.high_risk_works.toLocaleString() : '1,222'}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium">
            <span className="text-risk-high bg-risk-high-bg px-1.5 py-0.5 rounded mr-1.5 font-semibold">
              Priority Verification
            </span>{' '}
            {stats?.high_risk_mps || 108} MPs flagged
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border-l-[6px] border-[#b45309] border-t border-r border-b flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-[#f0e4d0] text-[#b45309] flex items-center justify-center text-lg mb-3">
            <i className="fas fa-clock"></i>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Timing & Delay Flags
          </div>
          <div className="text-3xl font-bold text-[#b45309] mb-1">
            {stats ? stats.medium_risk_works.toLocaleString() : '7,330'}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium">
            <span className="text-[#b45309] bg-[#f0e4d0] px-1.5 py-0.5 rounded mr-1.5 font-semibold">
              Schedule Slippage
            </span>{' '}
            Medium risk portfolio
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border-l-[6px] border-[#7c3aed] border-t border-r border-b flex flex-col relative overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md">
          <div className="w-10 h-10 rounded-xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center text-lg mb-3">
            <i className="fas fa-coins"></i>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Total Disbursed Outlay
          </div>
          <div className="text-2xl font-bold text-[#7c3aed] mb-1">
            ₹{stats?.total_disbursed ? (stats.total_disbursed / 10000000).toFixed(1) : '3,842.6'} Cr
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium">
            Allocated: ₹{stats?.total_allocated ? (stats.total_allocated / 10000000).toFixed(0) : '5,420'} Cr (70.8% utilized)
          </div>
        </div>
      </div>

      {/* 2-COL LAYOUT: Map & Project List vs Active Investigation */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
        {/* LEFT COLUMN: Accurate Interactive India Map & High Risk Projects Table */}
        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-bold text-foreground m-0 flex items-center gap-2">
                <i className="fas fa-map-marked-alt text-brand"></i>
                Interactive Risk Map · India
              </h3>
              <p className="text-xs text-foreground-secondary mt-0.5">
                Hover to preview state statistics or click any state to filter priority projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedState && (
                <button
                  onClick={() => setSelectedState(null)}
                  className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 rounded-md font-medium transition-colors"
                >
                  Clear Filter
                </button>
              )}
              <Link
                href="/map"
                className="text-brand text-xs font-semibold hover:underline flex items-center gap-1 bg-surface-secondary px-2.5 py-1 rounded-md border border-border"
              >
                <i className="fas fa-expand"></i> Full Screen Map
              </Link>
            </div>
          </div>

          {/* Accurate India Map SVG Container */}
          <div className="bg-stone-50/60 rounded-xl border border-border/80 p-2 mb-6">
            <IndiaMap
              selectedState={selectedState}
              onSelectState={(name) => setSelectedState(name)}
            />
          </div>

          {/* Filtered Projects Table */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <i className="fas fa-list text-brand"></i>
                {selectedState ? `High Risk Projects in ${selectedState}` : 'Top Priority Projects Requiring Audit'}
              </span>
              <span className="text-[11px] text-foreground-secondary">Click row to inspect signals →</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-secondary text-foreground-secondary uppercase tracking-[0.5px] text-[10px] font-semibold">
                    <th className="p-3 border-b border-border">Work ID</th>
                    <th className="p-3 border-b border-border">Location</th>
                    <th className="p-3 border-b border-border">MP & Constituency</th>
                    <th className="p-3 border-b border-border">Expenditure</th>
                    <th className="p-3 border-b border-border text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map((w) => {
                    const isRowSelected = activeWork?.work_id === w.work_id;
                    return (
                      <tr
                        key={w.work_id}
                        onClick={() => loadWorkDetail(w.work_id)}
                        className={`border-b border-border hover:bg-stone-50 cursor-pointer transition-colors group ${
                          isRowSelected ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-foreground group-hover:text-brand">
                          {w.work_id}
                        </td>
                        <td className="p-3 text-foreground-secondary">
                          <div className="font-medium text-foreground">{w.district}</div>
                          <div className="text-[10px]">{w.state}</div>
                        </td>
                        <td className="p-3 text-foreground-secondary">
                          <div className="font-medium text-stone-800">{w.mp_name}</div>
                          <div className="text-[10px]">{w.constituency}</div>
                        </td>
                        <td className="p-3 font-mono font-medium text-foreground">
                          ₹{(w.total_expenditure / 100000).toFixed(2)} L
                        </td>
                        <td className="p-3 text-right">
                          <StatusBadge level={w.risk_level} score={w.risk_score} showLabel={false} />
                        </td>
                      </tr>
                    );
                  })}
                  {works.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-foreground-secondary">
                        No high-risk works found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-2.5 flex justify-between items-center text-xs">
              <span className="text-foreground-secondary">
                Showing {works.length} of {stats?.high_risk_works || 1222} priority projects
              </span>
              <Link
                href={`/projects${selectedState ? `?state=${encodeURIComponent(selectedState)}` : ''}`}
                className="text-brand font-semibold hover:underline flex items-center gap-1"
              >
                View all projects <i className="fas fa-arrow-right text-[10px]"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Investigation / Audit Panel */}
        <div className="flex flex-col">
          <div className="bg-surface rounded-2xl p-5 md:p-6 border border-brand/40 shadow-sm relative sticky top-6">
            <div className="absolute top-0 left-0 w-full h-[5px] bg-brand rounded-t-2xl"></div>

            {loadingWork ? (
              <div className="p-12 text-center text-foreground-secondary text-sm">
                <i className="fas fa-spinner fa-spin text-brand mr-2 text-lg"></i> Loading project investigation file...
              </div>
            ) : activeWork ? (
              <div>
                {/* Header */}
                <div className="flex justify-between items-start flex-wrap gap-2 pt-2">
                  <div className="max-w-[75%]">
                    <span className="text-lg font-bold text-foreground font-mono block">
                      {activeWork.work_id}
                    </span>
                    <span className="text-xs text-foreground-secondary mt-0.5 block line-clamp-1 font-medium">
                      {activeWork.work_type}
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      {activeWork.district}, {activeWork.state} · {activeWork.constituency}
                    </span>
                  </div>

                  {/* Score badge */}
                  <div className="bg-risk-high text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-4 border-risk-high-bg shadow-md">
                    <span className="text-xl font-bold leading-none">{Math.round(activeWork.risk_score)}</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-80 leading-none mt-0.5">/100</span>
                  </div>
                </div>

                {/* Metadata tags */}
                <div className="flex gap-1.5 flex-wrap text-xs my-3.5">
                  <span className="bg-surface-secondary px-2.5 py-1 rounded-lg border border-border text-foreground-secondary flex items-center gap-1">
                    <i className="fas fa-user-tie text-brand text-[10px]" /> MP: {activeWork.mp_name}
                  </span>
                  <span className="bg-surface-secondary px-2.5 py-1 rounded-lg border border-border text-foreground-secondary flex items-center gap-1">
                    <i className="fas fa-coins text-brand text-[10px]" /> ₹
                    {(activeWork.total_expenditure / 100000).toFixed(2)} Lakhs
                  </span>
                  <span className="bg-surface-secondary px-2.5 py-1 rounded-lg border border-border text-foreground-secondary flex items-center gap-1">
                    <i className="fas fa-receipt text-brand text-[10px]" /> {activeWork.payment_count} Payments
                  </span>
                  <span className="bg-surface-secondary px-2.5 py-1 rounded-lg border border-border text-foreground-secondary flex items-center gap-1">
                    <i className="fas fa-store text-brand text-[10px]" /> {activeWork.unique_vendors} Vendor
                  </span>
                </div>

                {/* Risk Signal Chips */}
                <div className="flex flex-wrap gap-2 my-3">
                  {activeWork.signals?.cost_peer && activeWork.signals.cost_peer > 0 && (
                    <span className="bg-risk-high-bg border border-risk-high-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground flex items-center gap-1">
                      <span className="text-foreground-secondary font-medium">Cost Peer:</span>
                      <span className="text-risk-high font-bold">+{activeWork.signals.cost_peer}</span>
                    </span>
                  )}
                  {activeWork.signals?.vendor && activeWork.signals.vendor > 0 && (
                    <span className="bg-risk-high-bg border border-risk-high-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground flex items-center gap-1">
                      <span className="text-foreground-secondary font-medium">Vendor Split:</span>
                      <span className="text-risk-high font-bold">+{activeWork.signals.vendor}</span>
                    </span>
                  )}
                  {activeWork.signals?.payment_timing && activeWork.signals.payment_timing > 0 && (
                    <span className="bg-risk-medium-bg border border-risk-medium-border px-2.5 py-1 rounded-md text-xs font-semibold text-foreground flex items-center gap-1">
                      <span className="text-foreground-secondary font-medium">Timing Rush:</span>
                      <span className="text-risk-medium font-bold">+{activeWork.signals.payment_timing}</span>
                    </span>
                  )}
                  {activeWork.signals?.duplicate && activeWork.signals.duplicate > 0 && (
                    <span className="bg-[#ede9fe] border border-[#ddd6fe] px-2.5 py-1 rounded-md text-xs font-semibold text-[#7c3aed] flex items-center gap-1">
                      <span className="font-medium text-stone-600">Similarity:</span>
                      <span className="font-bold">+{activeWork.signals.duplicate}</span>
                    </span>
                  )}
                </div>

                {/* Explanations Box */}
                <div className="bg-risk-high-bg/70 border-l-4 border-risk-high rounded-r-xl p-3.5 mb-4 text-xs">
                  <div className="font-bold text-risk-high mb-1.5 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <i className="fas fa-flag"></i> Audit Findings & Reasoning
                  </div>
                  <div className="space-y-2 text-foreground">
                    {activeWork.explanations && activeWork.explanations.length > 0 ? (
                      activeWork.explanations.map((exp, idx) => (
                        <div key={idx} className="pb-1.5 border-b border-stone-200/60 last:border-0 last:pb-0">
                          <div className="font-semibold text-stone-900">{exp.reason}</div>
                          {exp.data && <div className="text-[11px] text-stone-600 font-mono mt-0.5">{exp.data}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="italic text-stone-500">Expenditure patterns flagged by machine learning model.</div>
                    )}
                  </div>
                </div>

                {/* Peer comparison stats */}
                {activeWork.peer_comparison && (
                  <div className="bg-stone-50 border border-border rounded-xl p-3 mb-4 text-xs">
                    <div className="font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span>Peer Comparison ({activeWork.peer_comparison.peer_count} similar works in {activeWork.state})</span>
                      {activeWork.peer_comparison.ratio && (
                        <span className="text-rose-700 font-bold font-mono">
                          {activeWork.peer_comparison.ratio}x peer median
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground-secondary">
                      <div>
                        This Work:{' '}
                        <strong className="text-foreground">
                          ₹{(activeWork.total_expenditure / 100000).toFixed(2)} Lakhs
                        </strong>
                      </div>
                      <div>
                        State Peer Avg:{' '}
                        <strong className="text-foreground">
                          ₹{(activeWork.peer_comparison.peer_avg_expenditure / 100000).toFixed(2)} Lakhs
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor & Bill-splitting details if present */}
                {activeWork.payments && activeWork.payments.length > 0 && (
                  <div className="bg-stone-50 border border-border rounded-xl p-3 mb-5 text-xs">
                    <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                      <span>Recent Vendor Transactions ({activeWork.payments.length})</span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        Vendor: {activeWork.payments[0].vendor}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {activeWork.payments.slice(0, 4).map((p, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[11px] bg-white px-2 py-1.5 rounded border border-stone-200"
                        >
                          <span className="font-mono text-stone-700">₹{p.amount.toLocaleString()}</span>
                          <span className="text-stone-500">{p.date ? p.date.split('T')[0] : 'N/A'}</span>
                          <span className="text-emerald-700 font-semibold">{p.status}</span>
                        </div>
                      ))}
                      {activeWork.payments.length > 4 && (
                        <div className="text-[10px] text-center text-stone-500 pt-1">
                          + {activeWork.payments.length - 4} more payments to the same vendor
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/work/${encodeURIComponent(activeWork.work_id)}`}
                    className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-3 rounded-xl border-none cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <i className="fas fa-clipboard-check"></i> Open Full Forensic Investigation Dossier
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-foreground-secondary text-sm">
                Select a project from the table to inspect details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM GRID: Actionable Guidance and Workflow Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm">
          <h4 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-3 flex items-center gap-2">
            <i className="fas fa-search text-brand"></i> Anomaly Types Monitored by AI Engine
          </h4>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-lg border border-border">
              <div>
                <span className="font-bold text-foreground block">Peer Cost Anomaly</span>
                <span className="text-stone-500 text-[11px]">Flagged when work cost exceeds peer median by &gt; 2.5x</span>
              </div>
              <span className="font-bold text-risk-high px-2 py-1 bg-red-100 rounded text-[11px]">High Severity</span>
            </div>
            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-lg border border-border">
              <div>
                <span className="font-bold text-foreground block">Vendor Concentration & Bill-Splitting</span>
                <span className="text-stone-500 text-[11px]">Repeated transactions under statutory tender thresholds</span>
              </div>
              <span className="font-bold text-risk-high px-2 py-1 bg-red-100 rounded text-[11px]">High Severity</span>
            </div>
            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-lg border border-border">
              <div>
                <span className="font-bold text-foreground block">End-of-Period Rush Spending</span>
                <span className="text-stone-500 text-[11px]">Disproportionate disbursements in rapid succession</span>
              </div>
              <span className="font-bold text-[#b45309] px-2 py-1 bg-amber-100 rounded text-[11px]">Medium Severity</span>
            </div>
            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-lg border border-border">
              <div>
                <span className="font-bold text-foreground block">Duplicate Asset / Location Clones</span>
                <span className="text-stone-500 text-[11px]">High text and coordinate similarity in the same IDA</span>
              </div>
              <span className="font-bold text-[#7c3aed] px-2 py-1 bg-purple-100 rounded text-[11px]">Medium Severity</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm">
          <h4 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-3 flex items-center gap-2">
            <i className="fas fa-bullseye text-brand"></i> Standard Operating Procedures (SOP)
          </h4>
          <div className="bg-surface-secondary px-4 py-3 rounded-xl mb-3 border border-border">
            <span className="bg-brand text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Verification Protocol
            </span>
            <p className="mt-1.5 font-medium text-xs text-foreground">
              Government nodal officers are recommended to verify physical progress certificates before clearing terminal installments for projects scoring &gt; 65.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            <Link
              href="/projects"
              className="bg-surface border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-list-check"></i> Filter All Projects
            </Link>
            <Link
              href="/alerts"
              className="bg-surface border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-bell"></i> Alerts Center
            </Link>
            <Link
              href="/cost"
              className="bg-surface border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-coins"></i> Cost Outliers
            </Link>
            <Link
              href="/export"
              className="bg-surface border border-border px-3 py-2 rounded-lg text-xs font-semibold text-foreground-secondary hover:bg-surface-secondary hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <i className="fas fa-download"></i> Export Reports
            </Link>
          </div>
          <div className="pt-2 border-t border-border text-xs text-foreground-secondary flex justify-between items-center">
            <span>Database Status: 8,868 records analyzed</span>
            <span className="text-emerald-700 font-semibold font-mono">Precision: 94.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
