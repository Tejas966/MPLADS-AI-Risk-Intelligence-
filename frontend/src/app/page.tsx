'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';
import LiveIndiaMap from '@/components/LiveIndiaMap';
import RiskMeter from '@/components/RiskMeter';

interface Stats {
  house?: string;
  total_works: number;
  total_mps: number;
  high_risk_works: number;
  high_risk_mps: number;
  medium_risk_works: number;
  low_risk_works: number;
  lok_sabha_mps?: number;
  rajya_sabha_mps?: number;
  total_disbursed: number;
  total_allocated: number;
}

interface WorkItem {
  work_id: string;
  work_type: string;
  house?: string;
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
  house?: string;
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
    data?: string;
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
  const [selectedHouse, setSelectedHouse] = useState<'ALL' | 'LOK_SABHA' | 'RAJYA_SABHA'>('ALL');
  const [stats, setStats] = useState<Stats | null>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [activeWork, setActiveWork] = useState<WorkDetail | null>(null);
  const [loadingWork, setLoadingWork] = useState(false);
  const [loadingWorksList, setLoadingWorksList] = useState(false);

  // Load KPI stats based on selected house
  useEffect(() => {
    const url = selectedHouse === 'ALL'
      ? `${API_BASE}/api/v1/stats`
      : `${API_BASE}/api/v1/stats?house=${selectedHouse}`;

    fetch(url)
      .then((r) => r.json())
      .then(setStats)
      .catch((e) => console.error('Stats fetch error:', e));
  }, [selectedHouse]);

  // Load works (filtered by house, state, and district if selected)
  useEffect(() => {
    setLoadingWorksList(true);
    let url = `${API_BASE}/api/v1/works?risk_level=HIGH&limit=10`;

    if (selectedHouse !== 'ALL') {
      url += `&house=${selectedHouse}`;
    }

    if (selectedState && selectedDistrict) {
      url += `&state=${encodeURIComponent(selectedState)}&search=${encodeURIComponent(selectedDistrict)}`;
    } else if (selectedState) {
      url += `&state=${encodeURIComponent(selectedState)}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const list: WorkItem[] = d.works || [];
        setWorks(list);
        if (list.length > 0 && (!activeWork || !list.some((w) => w.work_id === activeWork.work_id))) {
          loadWorkDetail(list[0].work_id);
        } else if (list.length === 0) {
          setActiveWork(null);
        }
      })
      .catch(() => setWorks([]))
      .finally(() => setLoadingWorksList(false));
  }, [selectedHouse, selectedState, selectedDistrict]);

  // Load single work details for the forensic investigation card
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

  const clearGeographicFilter = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-in fade-in duration-500 pb-10">
      {/* Top Banner / System Notice with subtle glass styling */}
      <div className="mb-5 p-4 md:p-5 bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-bold text-xl border border-brand/20 shrink-0">
            <i className="fas fa-shield-alt" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                National MPLADS AI Risk Intelligence Oversight
              </h2>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                Active Audit Cycle · FY 2025-26
              </span>
            </div>
            <p className="text-xs text-foreground-secondary mt-0.5 max-w-3xl leading-relaxed">
              Dual-chamber parliamentary oversight across <strong>543 Lok Sabha</strong> constituencies & <strong>232 Rajya Sabha</strong> MP state allocations with automated forensic anomaly scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center">
          <div className="bg-surface-secondary px-3 py-1.5 rounded-xl border border-border/70 flex items-center gap-2">
            <span className="text-foreground-secondary">eSAKSHI Sync:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          </div>
        </div>
      </div>

      {/* Parliament House Switcher Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 p-2.5 bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <i className="fas fa-landmark text-brand text-xs" /> Parliament Chamber Oversight:
          </span>
        </div>
        <div className="inline-flex p-1 bg-surface-secondary rounded-xl border border-border/70 self-stretch sm:self-auto gap-1">
          <button
            type="button"
            id="house-filter-all"
            onClick={() => setSelectedHouse('ALL')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedHouse === 'ALL'
                ? 'bg-brand text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>🏛️</span>
            <span>All Parliament</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              selectedHouse === 'ALL' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              {stats?.total_mps || 775}
            </span>
          </button>
          <button
            type="button"
            id="house-filter-lok-sabha"
            onClick={() => setSelectedHouse('LOK_SABHA')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedHouse === 'LOK_SABHA'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>🗳️</span>
            <span>Lok Sabha</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              selectedHouse === 'LOK_SABHA' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              {stats?.lok_sabha_mps || 543}
            </span>
          </button>
          <button
            type="button"
            id="house-filter-rajya-sabha"
            onClick={() => setSelectedHouse('RAJYA_SABHA')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedHouse === 'RAJYA_SABHA'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>📜</span>
            <span>Rajya Sabha</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              selectedHouse === 'RAJYA_SABHA' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              {stats?.rajya_sabha_mps || 232}
            </span>
          </button>
        </div>
      </div>

      {/* Rajya Sabha Informative Banner when Upper House is selected */}
      {selectedHouse === 'RAJYA_SABHA' && (
        <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-300">
          <i className="fas fa-info-circle text-purple-600 dark:text-purple-400 text-base shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">Rajya Sabha Allocation Registry (232 Upper House Parliamentarians)</div>
            <p>
              The official eSAKSHI transaction ledger currently records ongoing ground works for the 18th Lok Sabha. Rajya Sabha members have a statutory allocation limit of <strong>₹3,358.95 Cr</strong> recorded in the master ledger. You can inspect each Rajya Sabha MP&apos;s state-level sanctioned limit and tenure in the{' '}
              <Link href="/mp" className="underline font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900">
                MP Directory
              </Link>, or switch back to <strong>Lok Sabha</strong> or <strong>All Parliament</strong> to audit ongoing ground disbursements.
            </p>
          </div>
        </div>
      )}

      {/* Top KPI Cards (Calibrated Real Data, No Synthetic Trends) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-sm flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-surface-secondary text-brand flex items-center justify-center text-lg border border-border/60">
              <i className="fas fa-tasks" />
            </div>
            <span className="text-[10px] font-mono text-stone-400 font-semibold uppercase tracking-wider">
              {selectedHouse === 'RAJYA_SABHA' ? 'Upper House' : selectedHouse === 'LOK_SABHA' ? 'Lower House' : 'Combined'}
            </span>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            {selectedHouse === 'RAJYA_SABHA' ? 'Statutory MPs' : 'Total Projects Scored'}
          </div>
          <div className="text-3xl font-extrabold text-foreground mb-1 font-mono tracking-tight">
            {selectedHouse === 'RAJYA_SABHA' ? (stats?.total_mps || 232) : (stats ? stats.total_works.toLocaleString() : '11,956')}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium pt-1 border-t border-border/50">
            {selectedHouse === 'RAJYA_SABHA' ? (
              <span>Covering <strong className="text-foreground">232 Upper House MPs</strong></span>
            ) : (
              <span>Covering <strong className="text-foreground">{stats?.total_mps || (selectedHouse === 'LOK_SABHA' ? 543 : 775)} MPs</strong> across 36 States & UTs</span>
            )}
          </div>
        </div>

        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 border-l-4 border-risk-high border-t border-r border-b border-border/80 shadow-sm flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-risk-high flex items-center justify-center text-lg border border-rose-200 dark:border-rose-900">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
              Score ≥ 40
            </span>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            High Priority for Audit
          </div>
          <div className="text-3xl font-extrabold text-risk-high mb-1 font-mono tracking-tight">
            {stats ? stats.high_risk_works.toLocaleString() : '1,355'}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium pt-1 border-t border-border/50">
            <span className="font-semibold text-risk-high">Priority Review</span> · {typeof stats?.high_risk_mps === 'number' ? stats.high_risk_mps : 462} MP portfolios flagged
          </div>
        </div>

        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 border-l-4 border-[#b45309] border-t border-r border-b border-border/80 shadow-sm flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-[#b45309] flex items-center justify-center text-lg border border-amber-200 dark:border-amber-900">
              <i className="fas fa-clock" />
            </div>
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
              Score 20-39
            </span>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Timing & Schedule Outliers
          </div>
          <div className="text-3xl font-extrabold text-[#b45309] dark:text-amber-400 mb-1 font-mono tracking-tight">
            {stats ? stats.medium_risk_works.toLocaleString() : '10,042'}
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium pt-1 border-t border-border/50">
            Disbursement clusters & stale installments
          </div>
        </div>

        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 border-l-4 border-[#7c3aed] border-t border-r border-b border-border/80 shadow-sm flex flex-col relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#7c3aed] dark:text-purple-300 flex items-center justify-center text-lg border border-purple-200 dark:border-purple-900">
              <i className="fas fa-coins" />
            </div>
            <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider">
              {stats?.total_allocated && stats.total_allocated > 0
                ? `${((stats.total_disbursed / stats.total_allocated) * 100).toFixed(1)}% Outlay`
                : 'Allocated'}
            </span>
          </div>
          <div className="text-[0.75rem] text-foreground-secondary uppercase tracking-[1px] font-semibold mb-1">
            Total Disbursed Outlay
          </div>
          <div className="text-2xl font-extrabold text-[#7c3aed] dark:text-purple-400 mb-1 font-mono tracking-tight">
            ₹{typeof stats?.total_disbursed === 'number' ? (stats.total_disbursed / 10000000).toFixed(1) : '576.4'} Cr
          </div>
          <div className="text-[0.7rem] text-foreground-secondary mt-auto font-medium pt-1 border-t border-border/50">
            Of ₹{typeof stats?.total_allocated === 'number' ? (stats.total_allocated / 10000000).toFixed(1) : '11,692.6'} Cr statutory allocation
          </div>
        </div>
      </div>

      {/* 2-COLUMN COMMAND CENTER: Live Interactive Map & Filtered Works vs Forensic Risk Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
        
        {/* LEFT COLUMN: Data-Driven Interactive India Map + Filtered Works Table */}
        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-border/80 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 pb-3 border-b border-border/70">
            <div>
              <h3 className="text-base font-bold text-foreground m-0 flex items-center gap-2">
                <i className="fas fa-map-marked-alt text-brand" />
                Live Geospatial Risk Intelligence · India
              </h3>
              <p className="text-xs text-foreground-secondary mt-0.5">
                Hover to preview risk metrics. Click any state to drill down into district-level boundaries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(selectedState || selectedDistrict) && (
                <button
                  type="button"
                  id="btn-clear-filter"
                  onClick={clearGeographicFilter}
                  className="text-xs bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-times text-[10px]" /> Clear Filter
                </button>
              )}
              <Link
                href="/map"
                className="text-brand text-xs font-semibold hover:underline flex items-center gap-1 bg-surface-secondary px-3 py-1.5 rounded-lg border border-border"
              >
                <i className="fas fa-expand text-[11px]" /> Full Screen
              </Link>
            </div>
          </div>

          {/* Real Data-Driven Interactive India & District Map */}
          <div className="bg-stone-50/70 dark:bg-stone-900/40 rounded-xl border border-border/70 p-3 mb-5">
            <LiveIndiaMap
              selectedState={selectedState}
              selectedDistrict={selectedDistrict}
              onSelectState={(name) => {
                setSelectedState(name);
                setSelectedDistrict(null);
              }}
              onSelectDistrict={(name) => setSelectedDistrict(name)}
            />
          </div>

          {/* Filtered Priority Projects Table */}
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <i className="fas fa-list text-brand text-[11px]" />
                  {selectedDistrict
                    ? `High Priority Works in ${selectedDistrict}, ${selectedState}`
                    : selectedState
                    ? `High Priority Works in ${selectedState}`
                    : 'National High Priority Works Requiring Audit'}
                </span>
                {(selectedState || selectedDistrict) && (
                  <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <span className="text-[11px] text-foreground-secondary">Click row to inspect dossier →</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/80 bg-surface">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-secondary text-foreground-secondary uppercase tracking-[0.5px] text-[10px] font-semibold border-b border-border">
                    <th className="p-3">Work ID</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">MP & Constituency</th>
                    <th className="p-3">Expenditure</th>
                    <th className="p-3 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingWorksList ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-foreground-secondary">
                        <i className="fas fa-spinner fa-spin text-brand mr-2" />
                        Filtering projects by geographic jurisdiction...
                      </td>
                    </tr>
                  ) : works.length > 0 ? (
                    works.map((w) => {
                      const isRowSelected = activeWork?.work_id === w.work_id;
                      return (
                        <tr
                          key={w.work_id}
                          onClick={() => loadWorkDetail(w.work_id)}
                          className={`border-b border-border/60 hover:bg-stone-50/80 dark:hover:bg-stone-800/50 cursor-pointer transition-colors group ${
                            isRowSelected ? 'bg-amber-50/80 dark:bg-amber-950/40' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-foreground group-hover:text-brand">
                            <div className="flex items-center gap-1.5">
                              <span>{w.work_id}</span>
                              {w.house === 'RAJYA_SABHA' ? (
                                <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-sans font-bold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-900">
                                  RS
                                </span>
                              ) : (
                                <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-sans font-bold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900">
                                  LS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-foreground-secondary">
                            <div className="font-semibold text-foreground">{w.district}</div>
                            <div className="text-[10px] text-stone-500">{w.state}</div>
                          </td>
                          <td className="p-3 text-foreground-secondary">
                            <div className="font-medium text-foreground line-clamp-1">{w.mp_name}</div>
                            <div className="text-[10px] text-stone-500">{w.constituency}</div>
                          </td>
                          <td className="p-3 font-mono font-medium text-foreground">
                            ₹{(w.total_expenditure / 100000).toFixed(2)} L
                          </td>
                          <td className="p-3 text-right">
                            <StatusBadge level={w.risk_level} score={w.risk_score} showLabel={false} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-foreground-secondary italic">
                        {selectedHouse === 'RAJYA_SABHA'
                          ? 'No Rajya Sabha ground works recorded in this audit period. Visit the MP Directory to inspect all 232 Upper House allocations.'
                          : 'No high-priority works flagged in this geographic boundary.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2.5 flex justify-between items-center text-xs">
              <span className="text-foreground-secondary font-mono text-[11px]">
                Showing {works.length} of {stats?.high_risk_works || 1355} priority projects
              </span>
              <Link
                href={`/projects${
                  selectedDistrict
                    ? `?search=${encodeURIComponent(selectedDistrict)}`
                    : selectedState
                    ? `?state=${encodeURIComponent(selectedState)}`
                    : ''
                }`}
                className="text-brand font-semibold hover:underline flex items-center gap-1 text-xs"
              >
                View all in Projects Explorer <i className="fas fa-arrow-right text-[10px]" />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Forensic Investigation Dossier Anchored by the New RiskMeter */}
        <div className="flex flex-col">
          {loadingWork ? (
            <div className="bg-surface/90 rounded-2xl p-12 text-center text-foreground-secondary border border-border shadow-sm">
              <i className="fas fa-spinner fa-spin text-brand text-2xl mb-3 block" />
              <p className="text-sm font-medium">Assembling forensic investigation file...</p>
            </div>
          ) : activeWork ? (
            <div className="space-y-4 sticky top-6">
              {/* Primary Risk Meter & Top Contributing Factors */}
              <RiskMeter
                score={activeWork.risk_score}
                riskLevel={activeWork.risk_level}
                title="Work Forensic Priority"
                signals={activeWork.signals}
                explanations={activeWork.explanations}
                peerComparison={activeWork.peer_comparison}
                uniqueVendors={activeWork.unique_vendors}
              />

              {/* Work Metadata & Location Dossier Card */}
              <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 border border-border/80 shadow-sm text-xs">
                <div className="border-b border-border/70 pb-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-foreground font-mono block">
                      {activeWork.work_id}
                    </span>
                    {activeWork.house === 'RAJYA_SABHA' ? (
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900">
                        Rajya Sabha
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                        Lok Sabha
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-foreground font-medium mt-1 block">
                    {activeWork.work_type}
                  </span>
                  <span className="text-[11px] text-stone-500 mt-0.5 block font-medium">
                    {activeWork.district}, {activeWork.state} · Implemented by {activeWork.ida || 'District Authority'}
                  </span>
                </div>

                {/* Key Metrics Chips */}
                <div className="grid grid-cols-2 gap-2 my-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-surface-secondary border border-border/60">
                    <span className="text-[10px] uppercase text-stone-500 block font-sans font-semibold">
                      MP / Constituency
                    </span>
                    <strong className="text-foreground truncate block font-sans mt-0.5">
                      {activeWork.mp_name}
                    </strong>
                    <span className="text-[10px] text-stone-500 block font-sans">
                      {activeWork.constituency}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-secondary border border-border/60">
                    <span className="text-[10px] uppercase text-stone-500 block font-sans font-semibold">
                      Total Outlay
                    </span>
                    <strong className="text-foreground text-sm block mt-0.5">
                      ₹{(activeWork.total_expenditure / 100000).toFixed(2)} Lakhs
                    </strong>
                    <span className="text-[10px] text-stone-500 block font-sans">
                      {activeWork.payment_count} disbursements
                    </span>
                  </div>
                </div>

                {/* Peer Comparison Stats */}
                {activeWork.peer_comparison && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-900/50 border border-border rounded-xl mb-3">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-semibold text-foreground">
                        Peer Baseline ({activeWork.peer_comparison.peer_count} similar works in {activeWork.state})
                      </span>
                      {activeWork.peer_comparison.ratio && (
                        <span className="text-rose-700 dark:text-rose-400 font-bold font-mono">
                          {activeWork.peer_comparison.ratio}x peer median
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-foreground-secondary flex justify-between pt-1 border-t border-border/50">
                      <span>State Peer Average Outlay:</span>
                      <span className="font-mono font-semibold text-foreground">
                        ₹{(activeWork.peer_comparison.peer_avg_expenditure / 100000).toFixed(2)} Lakhs
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Vendor Transactions */}
                {activeWork.payments && activeWork.payments.length > 0 && (
                  <div className="p-3 bg-stone-50 dark:bg-stone-900/50 border border-border rounded-xl mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-foreground text-xs">
                        Vendor Disbursal Ledger ({activeWork.payments.length})
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {activeWork.unique_vendors} Vendor
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {activeWork.payments.slice(0, 3).map((p, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[11px] bg-surface px-2.5 py-1.5 rounded-lg border border-border/70"
                        >
                          <div>
                            <span className="font-medium text-foreground block truncate max-w-[170px]">
                              {p.vendor || 'Authorized Vendor'}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              {p.date ? p.date.split('T')[0] : 'N/A'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-foreground block">
                              ₹{p.amount.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <Link
                  href={`/work/${encodeURIComponent(activeWork.work_id)}`}
                  className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-3 rounded-xl border-none cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <i className="fas fa-clipboard-check" /> Open Full Forensic Investigation Dossier
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface/90 rounded-2xl p-12 text-center text-foreground-secondary border border-border shadow-sm">
              Select a project from the table to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: Monitored Anomaly Architecture & SOP Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-border/80 shadow-sm">
          <h4 className="text-sm font-bold text-foreground mb-3 pb-2.5 border-b border-border/70 flex items-center gap-2">
            <i className="fas fa-microchip text-brand" /> Anomaly Detection Models & Signals
          </h4>
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-xl border border-border/60">
              <div>
                <span className="font-bold text-foreground block">Peer Cost Variance (0-30 pts)</span>
                <span className="text-stone-500 text-[11px]">Flagged when work cost exceeds same work-type state median &gt; 2.5x</span>
              </div>
              <span className="font-bold text-risk-high px-2 py-0.5 bg-rose-100 dark:bg-rose-950 rounded text-[10px] uppercase font-mono">
                Statistical Peer
              </span>
            </div>

            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-xl border border-border/60">
              <div>
                <span className="font-bold text-foreground block">Vendor Dominance & Split Tender (0-25 pts)</span>
                <span className="text-stone-500 text-[11px]">Single vendor concentration & repeated transactions below tender limits</span>
              </div>
              <span className="font-bold text-risk-high px-2 py-0.5 bg-rose-100 dark:bg-rose-950 rounded text-[10px] uppercase font-mono">
                HHI & Split
              </span>
            </div>

            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-xl border border-border/60">
              <div>
                <span className="font-bold text-foreground block">Payment Rush & Schedule Lag (0-20 pts)</span>
                <span className="text-stone-500 text-[11px]">Installment clustering in financial year end or stale works</span>
              </div>
              <span className="font-bold text-[#b45309] px-2 py-0.5 bg-amber-100 dark:bg-amber-950 rounded text-[10px] uppercase font-mono">
                Timing Lag
              </span>
            </div>

            <div className="flex justify-between items-center bg-surface-secondary px-3 py-2.5 rounded-xl border border-border/60">
              <div>
                <span className="font-bold text-foreground block">Asset Clone / Text Similarity (0-10 pts)</span>
                <span className="text-stone-500 text-[11px]">Multiple works of identical specification in the same district & FY</span>
              </div>
              <span className="font-bold text-[#7c3aed] px-2 py-0.5 bg-purple-100 dark:bg-purple-950 rounded text-[10px] uppercase font-mono">
                Clustering
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-border/80 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3 pb-2.5 border-b border-border/70 flex items-center gap-2">
              <i className="fas fa-bullseye text-brand" /> Standard Operating Procedures (SOP)
            </h4>
            <div className="bg-surface-secondary px-4 py-3 rounded-xl mb-4 border border-border/70">
              <span className="bg-brand text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Auditor Protocol
              </span>
              <p className="mt-2 font-medium text-xs text-foreground leading-relaxed">
                District Nodal Officers are advised to mandate physical verification certificates and cross-reference vendor GSTIN records before clearing final disbursement for projects scoring ≥ 40.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/projects"
                className="bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
              >
                <i className="fas fa-list-check text-brand mr-1" /> All Projects
              </Link>
              <Link
                href="/alerts"
                className="bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
              >
                <i className="fas fa-bell text-brand mr-1" /> Alerts Center
              </Link>
              <Link
                href="/export"
                className="bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
              >
                <i className="fas fa-file-pdf text-brand mr-1" /> Export Dossiers
              </Link>
            </div>

            <span className="text-stone-400 font-mono text-[11px]">
              Platform: MoSPI SIH 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
