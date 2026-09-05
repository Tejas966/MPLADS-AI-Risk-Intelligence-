import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  subtext?: string;
}

export default function ProgressBar({ percentage, label, subtext }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(percentage, 100));
  
  // Logic: < 30 is red, < 60 is amber, >= 60 is green
  let barColor = "bg-risk-low";
  if (clamped < 30) {
    barColor = "bg-risk-high";
  } else if (clamped < 60) {
    barColor = "bg-risk-medium";
  }

  return (
    <div className="w-full">
      {(label || subtext) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
          {subtext && <span className="text-sm text-foreground-secondary">{subtext}</span>}
        </div>
      )}
      <div
        className="w-full h-3 bg-border rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-in-out ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
