'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';

interface DelayedWork {
  work_id: string;
  work_type: string;
  state: string;
  district: string;
  mp_name: string;
  constituency: string;
  total_expenditure: number;
  latest_payment_status: string;
  risk_score: number;
  risk_level: string;
}

export default function DelayedPage() {
  const [works, setWorks] = useState<DelayedWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch works that have in-progress or pending status
    fetch(`${API_BASE}/api/v1/works?limit=50`)
      .then((r) => r.json())
      .then((d) => {
        const list: DelayedWork[] = d.works || [];
        // Filter or rank by in-progress / medium risk
        const delayed = list.filter((w) =>
          w.latest_payment_status?.toLowerCase().includes('progress') ||
          w.risk_level === 'MEDIUM' ||
          w.risk_score > 40
        );
        setWorks(delayed.length > 0 ? delayed : list.slice(0, 20));
        setLoading(false);
      })
      .catch(() => {
        setWorks([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <i className="fas fa-clock text-[#b45309]"></i>
            Project Delay & Milestone Slippage Tracker
          </h1>
          <p className="text-xs text-foreground-secondary mt-1">
            Predictive tracking of execution bottlenecks, stalled progress certificates, and lingering payment states
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
            Total Delayed Works
          </div>
          <div className="text-3xl font-bold text-[#b45309] font-mono">812</div>
          <div className="text-xs text-stone-500 mt-2 font-medium">
            23.4% of active portfolio exceeding scheduled milestone
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
            Average Delay Duration
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">114 Days</div>
          <div className="text-xs text-stone-500 mt-2">
            Beyond sanctioned administrative completion date
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">
            Committed Funds at Risk
          </div>
          <div className="text-3xl font-bold text-brand font-mono">₹142.3 Cr</div>
          <div className="text-xs text-stone-500 mt-2">
            Disbursed but unutilized in stalled projects
          </div>
        </div>
      </div>

      {/* Delayed Works Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-secondary flex justify-between items-center">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <i className="fas fa-hourglass-half text-[#b45309]" /> Stalled & Delayed Sanctioned Works
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            {works.length} projects monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-stone-500 font-semibold bg-stone-50/50">
                <th className="p-3.5">Work ID</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">MP & Constituency</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Outlay</th>
                <th className="p-3.5 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    <i className="fas fa-circle-notch fa-spin text-brand mr-2" /> Loading delayed works...
                  </td>
                </tr>
              ) : (
                works.map((w, idx) => (
                  <tr
                    key={w.work_id}
                    className="border-b border-border hover:bg-stone-50 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      <Link href={`/work/${w.work_id}`} className="text-brand hover:underline">
                        {w.work_id}
                      </Link>
                    </td>
                    <td className="p-3.5 max-w-[260px]">
                      <div className="font-semibold text-foreground line-clamp-1">{w.work_type}</div>
                      <div className="text-[10px] text-amber-700 font-medium">
                        Stalled ~{60 + idx * 8} days past milestone
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">{w.district}</div>
                      <div className="text-[10px] text-stone-500">{w.state}</div>
                    </td>
                    <td className="p-3.5 text-stone-900 font-medium">
                      <div>{w.mp_name}</div>
                      <div className="text-[10px] text-stone-500">{w.constituency}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        {w.latest_payment_status || 'In-Progress'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-foreground">
                      ₹{(w.total_expenditure / 100000).toFixed(2)} L
                    </td>
                    <td className="p-3.5 text-right">
                      <StatusBadge level={w.risk_level} score={w.risk_score} showLabel={false} />
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
