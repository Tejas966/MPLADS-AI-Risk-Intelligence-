'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LiveIndiaMap from '@/components/LiveIndiaMap';
import { API_BASE } from '@/lib/config';

export interface StateRiskData {
  state: string;
  total_works: number;
  high_risk_works: number;
  medium_risk_works: number;
  low_risk_works: number;
  total_expenditure: number;
}

export default function MapPage() {
  const [states, setStates] = useState<StateRiskData[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/states`)
      .then((r) => r.json())
      .then((data: StateRiskData[]) => {
        setStates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load state stats', err);
        setLoading(false);
      });
  }, []);

  const filteredStates = states.filter((s) =>
    s.state.toLowerCase().includes(search.toLowerCase())
  );

  const totalHighRisk = states.reduce((acc, s) => acc + s.high_risk_works, 0);
  const totalMedRisk = states.reduce((acc, s) => acc + s.medium_risk_works, 0);
  const totalLowRisk = states.reduce((acc, s) => acc + s.low_risk_works, 0);
  const totalExpenditure = states.reduce((acc, s) => acc + s.total_expenditure, 0);

  return (
    <div className="w-full max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <i className="fas fa-map-marked-alt text-brand"></i>
            Geographic Risk Intelligence · India
          </h1>
          <p className="text-xs text-foreground-secondary mt-1">
            Live administrative boundary geospatial risk intelligence with state and district drill-down
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="bg-surface border border-border px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-list-check text-brand"></i> All Projects
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-brand text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-download"></i> Export Map Dossier
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-risk-high flex items-center justify-center font-bold text-base">
            <i className="fas fa-shield-halved" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              High Risk Works
            </div>
            <div className="text-2xl font-bold text-risk-high font-mono">
              {totalHighRisk.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b45309] flex items-center justify-center font-bold text-base">
            <i className="fas fa-clock" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Medium Risk Works
            </div>
            <div className="text-2xl font-bold text-[#b45309] font-mono">
              {totalMedRisk.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2d6a2d] flex items-center justify-center font-bold text-base">
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Standard Works
            </div>
            <div className="text-2xl font-bold text-[#2d6a2d] font-mono">
              {totalLowRisk.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-border flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#7c3aed] flex items-center justify-center font-bold text-base">
            <i className="fas fa-coins" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Total Outlay
            </div>
            <div className="text-xl font-bold text-[#7c3aed] font-mono">
              ₹{(totalExpenditure / 10000000).toFixed(1)} Cr
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Map + State Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Map Container */}
        <div className="lg:col-span-7 bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <i className="fas fa-globe-asia text-brand"></i> Vector Choropleth Map
            </h2>
            {(selectedState || selectedDistrict) && (
              <button
                onClick={() => {
                  setSelectedState(null);
                  setSelectedDistrict(null);
                }}
                className="text-xs text-stone-500 hover:text-stone-800 bg-stone-100 px-2.5 py-1 rounded-md"
              >
                Reset Map
              </button>
            )}
          </div>
          <div className="bg-stone-50/50 rounded-xl border border-stone-200/80 p-3 flex-1 flex items-center justify-center">
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
        </div>

        {/* Right: State Analytics Table */}
        <div className="lg:col-span-5 bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <i className="fas fa-table text-brand"></i> State Risk Breakdown
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              {filteredStates.length} Regions
            </span>
          </div>

          <div className="mb-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-2.5 text-xs text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by state or UT name..."
                className="w-full bg-stone-50 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-surface-secondary z-10">
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                  <th className="p-2.5">State</th>
                  <th className="p-2.5 text-center">Total Works</th>
                  <th className="p-2.5 text-center">High Risk</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-stone-500">
                      Loading state data...
                    </td>
                  </tr>
                ) : filteredStates.map((s) => {
                  const isSelected = selectedState?.toLowerCase() === s.state.toLowerCase();
                  return (
                    <tr
                      key={s.state}
                      onClick={() => setSelectedState(s.state)}
                      className={`border-b border-border hover:bg-stone-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-amber-50/80 font-semibold' : ''
                      }`}
                    >
                      <td className="p-2.5">
                        <div className="font-medium text-foreground">{s.state}</div>
                        <div className="text-[10px] text-stone-500">
                          ₹{(s.total_expenditure / 10000000).toFixed(2)} Cr outlay
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-mono">{s.total_works}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.high_risk_works > 30
                              ? 'bg-red-100 text-risk-high'
                              : s.high_risk_works > 10
                              ? 'bg-amber-100 text-[#b45309]'
                              : 'bg-emerald-100 text-[#2d6a2d]'
                          }`}
                        >
                          {s.high_risk_works}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <Link
                          href={`/projects?state=${encodeURIComponent(s.state)}`}
                          className="text-xs text-brand hover:underline font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
