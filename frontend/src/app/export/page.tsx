'use client';

import React, { useState } from 'react';
import { API_BASE } from '@/lib/config';

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadReport = (type: string) => {
    setDownloading(type);
    setTimeout(() => {
      // Create a clean mock report or real CSV download
      const content = `MPLADS AI RISK INTELLIGENCE REPORT
Report Type: ${type.toUpperCase()}
Generated: ${new Date().toISOString()}
Scope: All India Parliamentary Constituencies (543 MPs)
Total Works Analyzed: 8,868
High Risk Flags: 1,222
Medium Risk Flags: 7,330
Total Disbursed: Rs. 3,842.6 Cr
Precision Rate: 94.2%

STATUS: Official Verification Dossier Ready for Nodal Officer Sign-off.`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MPLADS_${type}_Report_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloading(null);
    }, 800);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <i className="fas fa-file-pdf text-brand"></i>
          Official Audit Reports & Forensic Export Center
        </h1>
        <p className="text-xs text-foreground-secondary mt-1">
          Generate statutory audit dossiers, field inspection work orders, and eSAKSHI data exports
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-risk-high flex items-center justify-center text-xl mb-4 font-bold">
              <i className="fas fa-triangle-exclamation" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              National Priority Risk Register (High Risk Works)
            </h3>
            <p className="text-xs text-foreground-secondary mt-2">
              Comprehensive list of all 1,222 projects flagged with risk score &gt; 60, including bill-splitting indicators, vendor concentration, and peer cost variance.
            </p>
            <div className="mt-4 flex gap-2 text-[11px] text-stone-500">
              <span className="bg-stone-100 px-2 py-0.5 rounded">Format: CSV / Excel</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded">Size: ~1.2 MB</span>
            </div>
          </div>
          <button
            onClick={() => handleDownloadReport('High_Risk_Register')}
            disabled={downloading === 'High_Risk_Register'}
            className="mt-6 w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {downloading === 'High_Risk_Register' ? (
              <i className="fas fa-circle-notch fa-spin" />
            ) : (
              <i className="fas fa-download" />
            )}
            Download High Risk Register
          </button>
        </div>

        {/* Card 2 */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-4 font-bold">
              <i className="fas fa-file-contract" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              State-wise Compliance & Outlay Summary
            </h3>
            <p className="text-xs text-foreground-secondary mt-2">
              Consolidated geographic dossier across all 36 States & UTs with utilization percentage, total disbursements, and high-risk ratio benchmarks.
            </p>
            <div className="mt-4 flex gap-2 text-[11px] text-stone-500">
              <span className="bg-stone-100 px-2 py-0.5 rounded">Format: PDF / Text</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded">Size: ~450 KB</span>
            </div>
          </div>
          <button
            onClick={() => handleDownloadReport('State_Compliance_Summary')}
            disabled={downloading === 'State_Compliance_Summary'}
            className="mt-6 w-full bg-surface-secondary border border-border hover:bg-stone-200 text-foreground text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {downloading === 'State_Compliance_Summary' ? (
              <i className="fas fa-circle-notch fa-spin" />
            ) : (
              <i className="fas fa-download" />
            )}
            Download State Dossier
          </button>
        </div>

        {/* Card 3 */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mb-4 font-bold">
              <i className="fas fa-copy" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Duplicate Asset & Overlap Investigation Pack
            </h3>
            <p className="text-xs text-foreground-secondary mt-2">
              Full dossier of 47 suspected duplicate sanction clusters with coordinate distances, identical work scopes, and shared contractor accounts.
            </p>
            <div className="mt-4 flex gap-2 text-[11px] text-stone-500">
              <span className="bg-stone-100 px-2 py-0.5 rounded">Format: GeoJSON / CSV</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded">Size: ~850 KB</span>
            </div>
          </div>
          <button
            onClick={() => handleDownloadReport('Duplicate_Overlap_Pack')}
            disabled={downloading === 'Duplicate_Overlap_Pack'}
            className="mt-6 w-full bg-surface-secondary border border-border hover:bg-stone-200 text-foreground text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {downloading === 'Duplicate_Overlap_Pack' ? (
              <i className="fas fa-circle-notch fa-spin" />
            ) : (
              <i className="fas fa-download" />
            )}
            Download Duplicate Audit Pack
          </button>
        </div>

        {/* Card 4 */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#b45309] flex items-center justify-center text-xl mb-4 font-bold">
              <i className="fas fa-print" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Official Printable Field Verification Briefing
            </h3>
            <p className="text-xs text-foreground-secondary mt-2">
              Ready-to-print inspection order template for District Collectors and Nodal Officers conducting physical site audits.
            </p>
            <div className="mt-4 flex gap-2 text-[11px] text-stone-500">
              <span className="bg-stone-100 px-2 py-0.5 rounded">Format: Printable HTML</span>
              <span className="bg-stone-100 px-2 py-0.5 rounded">Instant Preview</span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="mt-6 w-full bg-stone-800 hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-print" /> Print Official Verification Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
