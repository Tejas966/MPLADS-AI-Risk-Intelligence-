'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/config';
import StatusBadge from '@/components/StatusBadge';

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
}

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const initialState = searchParams.get('state') || searchParams.get('search') || '';

  const [works, setWorks] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState(initialState);
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  const fetchWorks = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (stateFilter) params.append('state', stateFilter);
    if (typeFilter) params.append('work_type', typeFilter);
    if (riskFilter) params.append('risk_level', riskFilter);
    params.append('limit', limit.toString());

    fetch(`${API_BASE}/api/v1/works?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setWorks(d.works || []);
        setTotal(d.total || (d.works ? d.works.length : 0));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching works', err);
        setWorks([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorks();
  }, [stateFilter, riskFilter, limit]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorks();
  };

  const handleClear = () => {
    setSearch('');
    setStateFilter('');
    setTypeFilter('');
    setRiskFilter('');
    setLoading(true);
    fetch(`${API_BASE}/api/v1/works?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setWorks(d.works || []);
        setTotal(d.total || 0);
        setLoading(false);
      });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (works.length === 0) return;
    const headers = ['Work ID', 'Work Type', 'State', 'District', 'MP Name', 'Constituency', 'Expenditure (INR)', 'Payment Status', 'Risk Level', 'Risk Score'];
    const rows = works.map((w) => [
      `"${w.work_id}"`,
      `"${w.work_type.replace(/"/g, '""')}"`,
      `"${w.state}"`,
      `"${w.district}"`,
      `"${w.mp_name}"`,
      `"${w.constituency}"`,
      w.total_expenditure,
      `"${w.latest_payment_status}"`,
      w.risk_level,
      w.risk_score,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mplads_projects_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-side pagination slicing
  const pageSize = 15;
  const totalPages = Math.ceil(works.length / pageSize) || 1;
  const paginatedWorks = works.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <i className="fas fa-list-check text-brand"></i>
            All Sanctioned Works Directory
          </h1>
          <p className="text-xs text-foreground-secondary mt-1">
            Browse and filter through {total.toLocaleString()} projects with AI anomaly and risk scoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-surface border border-border px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <i className="fas fa-file-csv text-emerald-700"></i> Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <form
        onSubmit={handleApply}
        className="bg-surface border border-border rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 items-center"
      >
        <div className="flex-1 min-w-[200px] relative">
          <i className="fas fa-search absolute left-3 top-2.5 text-xs text-stone-400" />
          <input
            type="text"
            placeholder="Search by Work ID, MP Name, District..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-50 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand"
          />
        </div>

        <select
          value={stateFilter}
          onChange={(e) => {
            setStateFilter(e.target.value);
            setPage(1);
          }}
          className="bg-stone-50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand cursor-pointer"
        >
          <option value="">All States / UTs</option>
          <option value="Uttar Pradesh">Uttar Pradesh</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Gujarat">Gujarat</option>
          <option value="Punjab">Punjab</option>
          <option value="Madhya Pradesh">Madhya Pradesh</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Rajasthan">Rajasthan</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Bihar">Bihar</option>
          <option value="Karnataka">Karnataka</option>
          <option value="West Bengal">West Bengal</option>
          <option value="Kerala">Kerala</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setPage(1);
          }}
          className="bg-stone-50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand cursor-pointer"
        >
          <option value="">All Risk Tiers</option>
          <option value="HIGH">High Risk Only (Critical Review)</option>
          <option value="MEDIUM">Medium Risk (Watchlist)</option>
          <option value="LOW">Low Risk (Normal)</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-stone-50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-brand cursor-pointer"
        >
          <option value="">All Work Categories</option>
          <option value="Road">Roads & Pathways</option>
          <option value="School">School & Education</option>
          <option value="Water">Drinking Water & Sanitation</option>
          <option value="sheds">Community Sheds / Hall</option>
          <option value="Healthcare">Healthcare & PHC</option>
        </select>

        <button
          type="submit"
          className="bg-brand text-white text-xs font-semibold px-4 py-1.5 rounded-xl hover:bg-brand-hover transition-colors flex items-center gap-1.5"
        >
          <i className="fas fa-filter"></i> Apply
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="bg-stone-100 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-stone-200 transition-colors flex items-center gap-1.5"
        >
          <i className="fas fa-times"></i> Clear
        </button>
      </form>

      {/* Projects Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary border-b border-border text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                <th className="p-3.5">Work ID</th>
                <th className="p-3.5">Category & Description</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">MP & Constituency</th>
                <th className="p-3.5 text-right">Expenditure</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-500">
                    <i className="fas fa-circle-notch fa-spin text-brand text-xl mb-2 block"></i>
                    Querying project database...
                  </td>
                </tr>
              ) : paginatedWorks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-500">
                    No matching projects found with selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedWorks.map((w) => (
                  <tr
                    key={w.work_id}
                    className="border-b border-border hover:bg-stone-50 transition-colors group"
                  >
                    <td className="p-3.5 font-mono font-bold text-foreground">
                      <Link
                        href={`/work/${w.work_id}`}
                        className="text-brand hover:underline flex items-center gap-1"
                      >
                        {w.work_id}
                      </Link>
                    </td>
                    <td className="p-3.5 max-w-[280px]">
                      <div className="font-semibold text-foreground line-clamp-1">{w.work_type}</div>
                      <div className="text-[10px] text-stone-500">FY {w.fiscal_year || '2025-26'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-foreground">{w.district}</div>
                      <div className="text-[10px] text-stone-500">{w.state}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-stone-900">{w.mp_name}</div>
                      <div className="text-[10px] text-stone-500">{w.constituency}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-foreground">
                      ₹{(w.total_expenditure / 100000).toFixed(2)} L
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          w.latest_payment_status?.includes('Success')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {w.latest_payment_status || 'Pending'}
                      </span>
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

        {/* Pagination Bar */}
        <div className="p-3.5 bg-stone-50/70 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <span className="text-stone-500">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, works.length)} of {works.length} loaded (Total {total.toLocaleString()})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md border border-border bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    page === pNum
                      ? 'bg-brand text-white'
                      : 'border border-border bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md border border-border bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-[1400px] mx-auto p-12 text-center text-foreground-secondary text-sm">
          <i className="fas fa-spinner fa-spin text-brand text-xl mr-2" /> Loading Projects Explorer...
        </div>
      }
    >
      <ProjectsPageContent />
    </React.Suspense>
  );
}
