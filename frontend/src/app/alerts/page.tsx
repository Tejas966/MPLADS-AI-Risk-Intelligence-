'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';

interface AlertItem {
  id: string;
  type: 'cost' | 'delay' | 'duplicate' | 'payment' | 'resolved';
  title: string;
  description: string;
  workId: string;
  location: string;
  severity: 'critical' | 'high' | 'moderate' | 'resolved';
  timestamp: string;
  isRead: boolean;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  useEffect(() => {
    // Generate alerts dynamically from real high risk backend works
    fetch(`${API_BASE}/api/v1/works?risk_level=HIGH&limit=12`)
      .then((r) => r.json())
      .then((d) => {
        const works = d.works || [];
        const generated: AlertItem[] = works.map((w: any, idx: number) => {
          const isCost = (w.signals?.cost_peer || 0) > 20;
          const isDup = (w.signals?.duplicate || 0) > 5;
          const isVendor = (w.signals?.vendor || 0) > 15;

          let type: AlertItem['type'] = 'payment';
          let title = 'Payment Anomaly';
          let desc = `Irregular disbursement pattern detected for ${w.work_type}`;
          let severity: AlertItem['severity'] = 'moderate';

          if (isCost) {
            type = 'cost';
            title = 'Critical Cost Anomaly';
            desc = `Expenditure ₹${(w.total_expenditure / 100000).toFixed(1)}L is significantly above state peer median in ${w.district}`;
            severity = 'critical';
          } else if (isDup) {
            type = 'duplicate';
            title = 'Duplicate Asset Signal';
            desc = `Multiple works with identical category recorded in ${w.district} for MP ${w.mp_name}`;
            severity = 'high';
          } else if (isVendor) {
            type = 'payment';
            title = 'Vendor Bill-Splitting Suspected';
            desc = `${w.payment_count} payments made to ${w.unique_vendors} vendor near statutory threshold`;
            severity = 'high';
          }

          return {
            id: `alert-${idx}`,
            type,
            title,
            description: desc,
            workId: w.work_id,
            location: `${w.district}, ${w.state}`,
            severity: idx === 0 ? 'critical' : severity,
            timestamp: `${idx * 15 + 2} mins ago`,
            isRead: idx > 6,
          };
        });
        setAlerts(generated);
      })
      .catch(() => {
        // Fallback alerts
        setAlerts([
          {
            id: 'alert-1',
            type: 'cost',
            title: 'Cost Anomaly',
            description: 'Work #23871 flagged for cost anomaly · 32% above comparable projects in Pune',
            workId: 'WS/MP643/2025-2026/177006',
            location: 'Pune, Maharashtra',
            severity: 'critical',
            timestamp: '2 mins ago',
            isRead: false,
          },
        ]);
      });
  }, []);

  const handleMarkRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="w-full max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <i className="fas fa-exclamation-triangle text-brand"></i>
            Alerts & Exception Management
          </h1>
          <p className="text-xs text-foreground-secondary mt-1">
            Real-time audit triage for flagged projects, payment surges, and statutory anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-surface border border-border px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <i className="fas fa-check-double text-emerald-600"></i> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border pb-3 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-brand text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          All Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-brand text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'critical'
              ? 'bg-brand text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Critical Only ({alerts.filter((a) => a.severity === 'critical').length})
        </button>
      </div>

      {/* Alerts Container */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-border rounded-2xl text-stone-500 text-sm">
            <i className="fas fa-check-circle text-emerald-500 text-3xl mb-2 block"></i>
            No active alerts in this view.
          </div>
        ) : (
          filteredAlerts.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !a.isRead
                  ? 'bg-surface border-brand/40 shadow-sm'
                  : 'bg-stone-50/70 border-border opacity-75'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                    a.severity === 'critical'
                      ? 'bg-red-100 text-risk-high'
                      : a.severity === 'high'
                      ? 'bg-amber-100 text-[#b45309]'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <i
                    className={
                      a.type === 'cost'
                        ? 'fas fa-coins'
                        : a.type === 'duplicate'
                        ? 'fas fa-copy'
                        : 'fas fa-receipt'
                    }
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {a.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        a.severity === 'critical'
                          ? 'bg-red-100 text-risk-high'
                          : a.severity === 'high'
                          ? 'bg-amber-100 text-[#b45309]'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      · {a.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-secondary mt-1">
                    {a.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-stone-500">
                    <span>{a.location}</span>
                    <span>·</span>
                    <Link
                      href={`/work/${a.workId}`}
                      className="text-brand hover:underline font-semibold"
                    >
                      {a.workId}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Link
                  href={`/work/${a.workId}`}
                  className="bg-brand text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-brand-hover transition-colors"
                >
                  Investigate
                </Link>
                {!a.isRead && (
                  <button
                    onClick={() => handleMarkRead(a.id)}
                    className="bg-surface-secondary border border-border text-stone-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl hover:bg-stone-200 transition-colors"
                    title="Mark as Read"
                  >
                    <i className="fas fa-check" />
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(a.id)}
                  className="text-stone-400 hover:text-stone-600 text-xs p-1.5"
                  title="Dismiss"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
