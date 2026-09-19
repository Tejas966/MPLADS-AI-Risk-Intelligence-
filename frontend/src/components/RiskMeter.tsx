'use client';

import React, { useEffect, useState } from 'react';

export interface RiskSignalItem {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence?: string;
  reason?: string;
}

export interface RiskMeterProps {
  score: number | null | undefined;
  riskLevel?: string; // 'HIGH' | 'MEDIUM' | 'LOW'
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showFactors?: boolean;
  signals?: Record<string, number | undefined>;
  explanations?: Array<{
    type: string;
    severity: string;
    reason: string;
    data?: string;
  }>;
  peerComparison?: {
    peer_avg_expenditure?: number;
    peer_count?: number;
    ratio?: number | null;
  };
  uniqueVendors?: number;
  paymentCount?: number;
  className?: string;
}

const SIGNAL_METADATA: Record<string, { label: string; max: number; icon: string }> = {
  cost_peer: { label: 'Peer Cost Variance', max: 30, icon: 'fa-coins' },
  vendor: { label: 'Vendor Concentration', max: 25, icon: 'fa-store' },
  payment_timing: { label: 'Payment Timing & Lag', max: 20, icon: 'fa-clock' },
  amount_anomaly: { label: 'Amount Z-Score Outlier', max: 15, icon: 'fa-chart-line' },
  duplicate: { label: 'Work Asset Similarity', max: 10, icon: 'fa-copy' },
  underspend: { label: 'Fund Underspending', max: 40, icon: 'fa-hand-holding-usd' },
};

export default function RiskMeter({
  score,
  riskLevel,
  title = 'Risk Priority Index',
  size = 'md',
  showFactors = true,
  signals,
  explanations = [],
  peerComparison,
  uniqueVendors,
  className = '',
}: RiskMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Validate and clamp score safely between 0 and 100
  const validScore = typeof score === 'number' && !isNaN(score) && isFinite(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, validScore));

  // Determine severity from verified backend level or score thresholds (High >= 40, Med >= 20, Low < 20)
  const normalizedLevel = (riskLevel?.toUpperCase() ||
    (clampedScore >= 40 ? 'HIGH' : clampedScore >= 20 ? 'MEDIUM' : 'LOW')) as 'HIGH' | 'MEDIUM' | 'LOW';

  // Smooth single-mount animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(clampedScore);
    }, 60);
    return () => clearTimeout(timer);
  }, [clampedScore]);

  // Geometry calculations for a 180° semi-circle arc
  // Center: (120, 115), Radius: 82, stroke width: 14
  const radius = 82;
  const arcLength = Math.PI * radius; // ~257.61
  const strokeWidth = 14;

  // Arc path: starts at (38, 115), sweeps over top (120, 33) to (202, 115)
  const arcPath = `M 38,115 A ${radius},${radius} 0 0,1 202,115`;

  // Dash offset for dynamic score fill
  const progressRatio = animatedScore / 100;
  const strokeDashoffset = arcLength * (1 - progressRatio);

  // Indicator bead coordinate on the arc
  const beadRad = -Math.PI + progressRatio * Math.PI;
  const beadX = 120 + radius * Math.cos(beadRad);
  const beadY = 115 + radius * Math.sin(beadRad);

  // Semantic color tokens
  const colorMap = {
    HIGH: {
      track: '#b91c1c',
      bgPill: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900',
      label: 'HIGH PRIORITY',
      desc: 'Requires immediate forensic audit before fund release',
    },
    MEDIUM: {
      track: '#b45309',
      bgPill: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900',
      label: 'NEEDS REVIEW',
      desc: 'Significant variance detected; nodal verification advised',
    },
    LOW: {
      track: '#15803d',
      bgPill: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-900',
      label: 'STANDARD MONITORING',
      desc: 'Expenditure conforms to district peer benchmarks',
    },
  };

  const currentTheme = colorMap[normalizedLevel];

  // Extract and rank top contributing factors from backend signals & explanations
  const contributingFactors: RiskSignalItem[] = [];

  if (signals) {
    Object.entries(signals).forEach(([key, val]) => {
      if (typeof val === 'number' && val > 0) {
        const meta = SIGNAL_METADATA[key] || { label: key.replace('_', ' '), max: 30, icon: 'fa-flag' };
        
        const matchedExp = explanations.find(
          e => e.type.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(e.type.toLowerCase())
        );
        
        let evidence = matchedExp?.data || '';
        if (!evidence) {
          if (key === 'cost_peer' && peerComparison?.ratio) {
            evidence = `${peerComparison.ratio}x peer median expenditure`;
          } else if (key === 'vendor' && uniqueVendors) {
            evidence = `${uniqueVendors} vendor(s) handling 100% of outlay`;
          } else {
            evidence = `Signal contribution: +${val} pts`;
          }
        }

        contributingFactors.push({
          key,
          label: meta.label,
          score: val,
          maxScore: meta.max,
          severity: val >= meta.max * 0.65 ? 'HIGH' : val >= meta.max * 0.35 ? 'MEDIUM' : 'LOW',
          evidence,
          reason: matchedExp?.reason,
        });
      }
    });
  }

  contributingFactors.sort((a, b) => b.score - a.score);
  const topFactors = contributingFactors.slice(0, 4);

  return (
    <div
      className={`bg-surface/90 backdrop-blur-md rounded-2xl border border-border/80 p-5 shadow-sm transition-all duration-300 ${className}`}
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${title}: ${Math.round(clampedScore)} out of 100, ${currentTheme.label}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary block">
            {title}
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Calibrated multi-signal audit index
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${currentTheme.bgPill}`}
        >
          {currentTheme.label}
        </span>
      </div>

      {/* Modern Radial Gauge SVG with No Needle Hub Clutter */}
      <div className="relative flex flex-col items-center justify-center pt-1">
        <svg
          viewBox="0 0 240 135"
          className={`w-full ${size === 'sm' ? 'max-w-[190px]' : size === 'lg' ? 'max-w-[280px]' : 'max-w-[230px]'} select-none`}
        >
          {/* Background Zone Arc Segments */}
          {/* Low Zone: 0 - 19 */}
          <path
            d={arcPath}
            fill="none"
            stroke="#15803d"
            strokeOpacity="0.18"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength * 0.19} ${arcLength}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          {/* Med Zone: 20 - 39 */}
          <path
            d={arcPath}
            fill="none"
            stroke="#b45309"
            strokeOpacity="0.18"
            strokeWidth={strokeWidth}
            strokeDasharray={`0 ${arcLength * 0.19} ${arcLength * 0.20} ${arcLength}`}
            strokeLinecap="butt"
          />
          {/* High Zone: 40 - 100 */}
          <path
            d={arcPath}
            fill="none"
            stroke="#b91c1c"
            strokeOpacity="0.18"
            strokeWidth={strokeWidth}
            strokeDasharray={`0 ${arcLength * 0.39} ${arcLength * 0.61} 0`}
            strokeLinecap="round"
          />

          {/* Active Colored Score Arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={currentTheme.track}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />

          {/* Precision Indicator Bead on the Arc Rim (Zero Text Collision) */}
          {animatedScore > 0 && (
            <g className="transition-all duration-1000 ease-out">
              <circle
                cx={beadX}
                cy={beadY}
                r="7"
                fill={currentTheme.track}
                stroke="#ffffff"
                strokeWidth="2.5"
                className="filter drop-shadow-sm"
              />
              <circle cx={beadX} cy={beadY} r="2.5" fill="#ffffff" />
            </g>
          )}
        </svg>

        {/* Clean, Non-Overlapping Score Typography inside Open Arc Center */}
        <div className="text-center -mt-10 mb-1 z-10">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-foreground">
              {Math.round(clampedScore)}
            </span>
            <span className="text-sm font-semibold text-foreground-secondary font-mono">/100</span>
          </div>
          <p className="text-[11px] text-foreground-secondary mt-0.5 font-medium max-w-[240px] mx-auto leading-tight">
            {currentTheme.desc}
          </p>
        </div>

        {/* Semantic Zone Scale Legend */}
        <div className="w-full max-w-[220px] flex justify-between items-center text-[10px] font-mono text-stone-500 pt-2.5 border-t border-border/40 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>0-19 Low</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>20-39 Med</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>40+ High</span>
          </span>
        </div>
      </div>

      {/* Top Contributing Factors Section */}
      {showFactors && (
        <div className="mt-4 pt-3 border-t border-border/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <i className="fas fa-list-check text-brand text-[10px]" />
              Top Contributing Factors
            </span>
            <span className="text-[10px] text-foreground-secondary font-mono">
              {topFactors.length} statistical signals
            </span>
          </div>

          {topFactors.length > 0 ? (
            <div className="space-y-2">
              {topFactors.map((factor) => {
                const meta = SIGNAL_METADATA[factor.key] || { label: factor.label, max: 30, icon: 'fa-flag' };
                return (
                  <div
                    key={factor.key}
                    className="p-2.5 rounded-xl bg-surface-secondary/70 border border-border/60 hover:border-border transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <i className={`fas ${meta.icon} text-brand text-[11px] w-3.5`} />
                        <span>{factor.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          factor.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : factor.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        +{factor.score} pts
                      </span>
                    </div>

                    {factor.evidence && (
                      <div className="text-[11px] text-stone-600 dark:text-stone-300 font-mono pl-5">
                        {factor.evidence}
                      </div>
                    )}

                    {factor.reason && (
                      <p className="text-[10px] text-foreground-secondary pl-5 mt-0.5 line-clamp-2 leading-relaxed">
                        {factor.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-stone-50/70 dark:bg-stone-900/50 rounded-xl border border-dashed border-border text-center text-xs text-foreground-secondary">
              <i className="fas fa-check-circle text-emerald-600 mr-1" />
              All expenditure metrics within normal statistical tolerance.
            </div>
          )}

          <div className="mt-2 text-[9px] text-stone-400 text-center">
            Statistical breakdown: Peer Cost (30) + Vendor (25) + Timing (20) + Outlier (15) + Clone (10)
          </div>
        </div>
      )}
    </div>
  );
}
