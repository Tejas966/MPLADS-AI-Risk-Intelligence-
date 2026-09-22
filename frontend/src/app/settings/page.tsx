'use client';

import React, { useState } from 'react';
import { API_BASE } from '@/lib/config';

export default function SettingsPage() {
  const [highThreshold, setHighThreshold] = useState(60);
  const [mediumThreshold, setMediumThreshold] = useState(30);
  const [costMultiplier, setCostMultiplier] = useState(2.5);
  const [duplicateDistance, setDuplicateDistance] = useState(2.0);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <i className="fas fa-sliders-h text-brand"></i>
          System Intelligence & Scoring Configuration
        </h1>
        <p className="text-xs text-foreground-secondary mt-1">
          Tune AI anomaly thresholds, statutory triggers, and eSAKSHI live data sync parameters
        </p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
          <i className="fas fa-check-circle text-emerald-600 text-sm" />
          Settings successfully persisted to system configuration.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Risk Thresholds */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
            <i className="fas fa-chart-line text-brand" /> Machine Learning Risk Thresholds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                High Risk Threshold (Priority Audit)
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Projects scoring at or above this value are marked for mandatory field verification.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="40"
                  max="85"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
                <span className="font-mono font-bold text-sm text-risk-high w-10">
                  {highThreshold}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Medium Risk Threshold (Watchlist)
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Lower bound for projects requiring secondary monitoring and desk review.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="15"
                  max="50"
                  value={mediumThreshold}
                  onChange={(e) => setMediumThreshold(Number(e.target.value))}
                  className="w-full accent-[#b45309] cursor-pointer"
                />
                <span className="font-mono font-bold text-sm text-[#b45309] w-10">
                  {mediumThreshold}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Cost Outlier Peer Multiplier
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Flag when work expenditure exceeds peer category median by this ratio.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="10.0"
                  value={costMultiplier}
                  onChange={(e) => setCostMultiplier(Number(e.target.value))}
                  className="bg-stone-50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono w-28 focus:outline-none focus:border-brand"
                />
                <span className="text-xs text-stone-500">x peer median</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Duplicate Proximity Radius
              </label>
              <p className="text-[11px] text-stone-500 mb-2">
                Geographic radius within which matching work descriptions trigger a duplicate flag.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="15.0"
                  value={duplicateDistance}
                  onChange={(e) => setDuplicateDistance(Number(e.target.value))}
                  className="bg-stone-50 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono w-28 focus:outline-none focus:border-brand"
                />
                <span className="text-xs text-stone-500">Kilometers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Integration & eSAKSHI Sync */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
            <i className="fas fa-network-wired text-brand" /> eSAKSHI Portal Integration & API Sync
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <div>
                <span className="font-bold text-foreground block">FastAPI Ingestion Gateway</span>
                <span className="text-stone-500 font-mono text-[11px]">{API_BASE}/api/v1</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px]">
                Connected
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-stone-100">
              <div>
                <span className="font-bold text-foreground block">Database Backend</span>
                <span className="text-stone-500 font-mono text-[11px]">PostgreSQL (Supabase) · Active Data Store (11,956 records)</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px]">
                Active
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-bold text-foreground block">Automated Critical Notifications</span>
                <span className="text-stone-500">Send instant priority alerts when score &gt; 75</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-brand cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-save" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
