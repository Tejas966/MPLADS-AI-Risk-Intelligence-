import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
  valueClassName?: string;
}

export default function MetricCard({
  label,
  value,
  subtext,
  highlight = false,
  valueClassName = "",
}: MetricCardProps) {
  return (
    <div
      className={`bg-surface border rounded-xl p-4 transition-colors ${
        highlight ? "border-risk-high-border bg-risk-high-bg/30" : "border-border"
      }`}
    >
      <div className="text-foreground-secondary text-xs mb-1 font-medium">{label}</div>
      <div
        className={`text-2xl font-bold ${
          highlight ? "text-risk-high" : "text-foreground"
        } ${valueClassName}`}
      >
        {value}
      </div>
      {subtext && (
        <div
          className={`text-xs mt-1 ${
            highlight ? "text-risk-high font-medium" : "text-foreground-secondary"
          }`}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
