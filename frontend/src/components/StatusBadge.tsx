import React from 'react';

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface StatusBadgeProps {
  level: string;
  score?: number;
  showLabel?: boolean;
}

export default function StatusBadge({ level, score, showLabel = true }: StatusBadgeProps) {
  const normalizedLevel = level.toUpperCase() as RiskLevel;
  
  let colorClasses = "bg-surface-secondary text-foreground-secondary border-border";
  let labelText = level;

  if (normalizedLevel === "HIGH") {
    colorClasses = "bg-risk-high-bg text-risk-high border-risk-high-border";
    labelText = "High Priority";
  } else if (normalizedLevel === "MEDIUM") {
    colorClasses = "bg-risk-medium-bg text-risk-medium border-risk-medium-border";
    labelText = "Needs Review";
  } else if (normalizedLevel === "LOW") {
    colorClasses = "bg-risk-low-bg text-risk-low border-risk-low-border";
    labelText = "Standard";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold ${colorClasses}`}>
      {score !== undefined && (
        <span className="font-bold">{score.toFixed(0)}</span>
      )}
      {showLabel && (
        <>
          {score !== undefined && <span className="opacity-50">·</span>}
          <span>{labelText}</span>
        </>
      )}
    </span>
  );
}
