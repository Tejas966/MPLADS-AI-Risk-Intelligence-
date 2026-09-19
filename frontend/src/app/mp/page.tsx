'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';

interface MPItem {
  mp_name: string;
  constituency: string;
  state: string;
  house: string;
  allocated_amount: number;
  total_disbursed: number;
  utilization_pct: number;
  transaction_count: number;
  unique_vendor_count: number;
  risk_score: number;
  risk_level: string;
  signals?: {
    underspend?: number;
  };
}

export default function MPDirectoryPage() {
  const [mps, setMps] = useState<MPItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [houseFilter, setHouseFilter] = useState<'ALL' | 'LOK_SABHA' | 'RAJYA_SABHA'>('ALL');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  const fetchMPs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (houseFilter !== 'ALL') params.append('house', houseFilter);
    if (search.trim()) params.append('search', search.trim());
    if (stateFilter) params.append('state', stateFilter);
    if (riskFilter) params.append('risk_level', riskFilter);
    params.append('limit', '800');

    fetch(`${API_BASE}/api/v1/mps?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const list: MPItem[] = d.mps || [];
        setMps(list);
        setTotal(d.total || list.length);
        setLoading(false);

        // Populate unique states once
        if (availableStates.length === 0) {
          const states = Array.from(new Set(list.map((m) => m.state).filter(Boolean))).sort();
          setAvailableStates(states);
        }
      })
      .catch((err) => {
        console.error('Error loading MPs:', err);
        setMps([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMPs();
  }, [houseFilter, stateFilter, riskFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMPs();
  };

  const handleClear = () => {
    setSearch('');
    setStateFilter('');
    setRiskFilter('');
    setHouseFilter('ALL');
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-foreground-secondary" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground font-semibold" aria-current="page">MP Portfolios</span>
      </nav>

      {/* Header Banner */}
      <div className="mb-6 p-5 bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand font-bold text-xl border border-brand/20 shrink-0">
            <i className="fas fa-users" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                Parliamentary Members Oversight Directory
              </h1>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 uppercase tracking-wider">
                775 Total Parliamentarians
              </span>
            </div>
            <p className="text-xs text-foreground-secondary mt-0.5 max-w-3xl leading-relaxed">
              Real-time directory covering all 543 Lok Sabha (Lower House) constituencies and 232 Rajya Sabha (Upper House) State representatives with allocation audits and disbursement tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-surface-secondary border border-border hover:bg-surface text-foreground transition-colors flex items-center gap-1.5"
          >
            <i className="fas fa-chart-pie text-brand text-[11px]" />
            Return to Dashboard
          </Link>
        </div>
      </div>

      {/* Chamber Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 p-2.5 bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-sm">
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <i className="fas fa-landmark text-brand text-xs" /> Filter by Chamber:
          </span>
        </div>
        <div className="inline-flex p-1 bg-surface-secondary rounded-xl border border-border/70 self-stretch sm:self-auto gap-1">
          <button
            type="button"
            onClick={() => setHouseFilter('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              houseFilter === 'ALL'
                ? 'bg-brand text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>🏛️</span>
            <span>All Parliament</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              houseFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              775
            </span>
          </button>
          <button
            type="button"
            onClick={() => setHouseFilter('LOK_SABHA')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              houseFilter === 'LOK_SABHA'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>🗳️</span>
            <span>Lok Sabha</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              houseFilter === 'LOK_SABHA' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              543
            </span>
          </button>
          <button
            type="button"
            onClick={() => setHouseFilter('RAJYA_SABHA')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              houseFilter === 'RAJYA_SABHA'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-foreground-secondary hover:text-foreground hover:bg-surface/50'
            }`}
          >
            <span>📜</span>
            <span>Rajya Sabha</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
              houseFilter === 'RAJYA_SABHA' ? 'bg-white/20 text-white' : 'bg-border text-foreground-secondary'
            }`}>
              232
            </span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-surface/90 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-border/80 shadow-sm mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1">
              Search MP / Constituency
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-2.5 text-foreground-secondary text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="E.g. Narendra Modi, Sharma, Nagpur..."
                className="w-full bg-surface-secondary border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder-stone-400 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1">
              State / UT
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand transition-colors"
            >
              <option value="">All States & UTs</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-foreground-secondary uppercase tracking-wider mb-1">
              Audit Priority
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-surface-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand transition-colors"
            >
              <option value="">All Risk Levels</option>
              <option value="HIGH">High Priority (Score ≥ 40)</option>
              <option value="MEDIUM">Medium Priority (Score 20-39)</option>
              <option value="LOW">Low Risk (Score &lt; 20)</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2 px-4 rounded-xl border-none cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-filter text-[10px]" /> Apply
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 bg-surface-secondary hover:bg-border text-foreground-secondary text-xs font-semibold rounded-xl border border-border cursor-pointer transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* MP Directory Table */}
      <div className="bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/70 flex justify-between items-center bg-surface-secondary/40">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <i className="fas fa-address-book text-brand text-xs" />
              Parliamentary Roster
            </span>
            <span className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {total} Members Found
            </span>
          </div>
          <span className="text-[11px] text-foreground-secondary">
            Click any member to open individual forensic dossier →
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-secondary text-foreground-secondary uppercase tracking-[0.5px] text-[10px] font-semibold border-b border-border">
                <th className="p-3.5">Parliamentarian</th>
                <th className="p-3.5">Chamber</th>
                <th className="p-3.5">Constituency / State</th>
                <th className="p-3.5">Allocated Limit</th>
                <th className="p-3.5">Disbursed Outlay</th>
                <th className="p-3.5">Utilization</th>
                <th className="p-3.5 text-right">Audit Priority</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-foreground-secondary">
                    <i className="fas fa-spinner fa-spin text-brand text-lg mr-2" />
                    Querying parliamentary intelligence records...
                  </td>
                </tr>
              ) : mps.length > 0 ? (
                mps.map((mp, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/60 hover:bg-stone-50/80 dark:hover:bg-stone-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="p-3.5">
                      <Link
                        href={`/mp/${encodeURIComponent(mp.mp_name)}`}
                        className="font-bold text-foreground group-hover:text-brand transition-colors block"
                      >
                        {mp.mp_name}
                      </Link>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {mp.transaction_count > 0 ? `${mp.transaction_count} disbursements recorded` : 'Allocation stage'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {mp.house === 'RAJYA_SABHA' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900">
                          <span>📜</span> Rajya Sabha
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                          <span>🗳️</span> Lok Sabha
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{mp.constituency}</div>
                      <div className="text-[10px] text-stone-500">{mp.state}</div>
                    </td>

                    <td className="p-3.5 font-mono font-medium text-foreground">
                      ₹{(mp.allocated_amount / 10000000).toFixed(2)} Cr
                    </td>

                    <td className="p-3.5 font-mono font-medium text-foreground">
                      ₹{(mp.total_disbursed / 10000000).toFixed(2)} Cr
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-secondary rounded-full h-1.5 overflow-hidden border border-border">
                          <div
                            className={`h-full rounded-full ${
                              mp.utilization_pct < 10
                                ? 'bg-rose-500'
                                : mp.utilization_pct < 30
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, mp.utilization_pct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-foreground-secondary">
                          {mp.utilization_pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <StatusBadge level={mp.risk_level} score={mp.risk_score} showLabel={false} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-foreground-secondary italic">
                    No parliamentarians found matching the current search & chamber filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
