'use client';

import React, { useState, useEffect } from 'react';
import { INDIA_STATES, StatePath } from '@/lib/indiaMapData';

export interface StateRiskData {
  state: string;
  total_works: number;
  high_risk_works: number;
  medium_risk_works: number;
  low_risk_works: number;
  total_expenditure: number;
}

interface IndiaMapProps {
  onSelectState?: (stateName: string | null) => void;
  selectedState?: string | null;
  compact?: boolean;
}

export default function IndiaMap({
  onSelectState,
  selectedState,
  compact = false,
}: IndiaMapProps) {
  const [stateStats, setStateStats] = useState<Record<string, StateRiskData>>({});
  const [hoveredState, setHoveredState] = useState<StatePath | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeState, setActiveState] = useState<string | null>(selectedState || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStateData() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/states');
        if (res.ok) {
          const data: StateRiskData[] = await res.json();
          const map: Record<string, StateRiskData> = {};
          data.forEach((s) => {
            map[s.state.toLowerCase().trim()] = s;
          });
          setStateStats(map);
        }
      } catch (err) {
        console.error('Failed to load state stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStateData();
  }, []);

  useEffect(() => {
    if (selectedState !== undefined) {
      setActiveState(selectedState);
    }
  }, [selectedState]);

  const getStateStats = (name: string): StateRiskData | undefined => {
    const key = name.toLowerCase().trim();
    if (stateStats[key]) return stateStats[key];
    // Handle aliases
    if (key.includes('andaman')) return stateStats['andaman and nicobar islands'];
    if (key.includes('jammu')) return stateStats['jammu and kashmir'];
    if (key.includes('delhi')) return stateStats['delhi'];
    return undefined;
  };

  const getFillColor = (path: StatePath, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return '#8b2622';
    if (isHovered) return '#c2410c';

    const data = getStateStats(path.name);
    if (!data || data.total_works === 0) {
      return '#e8dfd8';
    }

    const highRatio = data.high_risk_works / data.total_works;
    if (data.high_risk_works > 35 || highRatio > 0.18) {
      return '#b91c1c'; // High risk: bold crimson/maroon
    }
    if (data.high_risk_works > 10 || highRatio > 0.08) {
      return '#d97706'; // Medium risk: warm amber
    }
    return '#2d6a2d'; // Low risk: deep forest green
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, path: StatePath) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 20,
      });
    }
    setHoveredState(path);
  };

  const handleClickState = (path: StatePath) => {
    const next = activeState === path.name ? null : path.name;
    setActiveState(next);
    if (onSelectState) onSelectState(next);
  };

  const currentData = hoveredState ? getStateStats(hoveredState.name) : (activeState ? getStateStats(activeState) : null);
  const selectedData = activeState ? getStateStats(activeState) : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      {/* Map SVG container */}
      <div className="relative w-full flex-1 flex items-center justify-center p-2 min-h-[360px]">
        <svg
          viewBox="0 0 612 696"
          className="w-full h-full max-h-[520px] drop-shadow-sm select-none transition-all duration-300"
          style={{ filter: 'drop-shadow(0 4px 6px -1px rgba(0, 0, 0, 0.05))' }}
          onMouseLeave={() => setHoveredState(null)}
        >
          <g>
            {INDIA_STATES.map((path) => {
              const isSelected = activeState?.toLowerCase() === path.name.toLowerCase();
              const isHovered = hoveredState?.name === path.name;
              const fill = getFillColor(path, isHovered, isSelected);

              return (
                <path
                  key={path.id}
                  id={`state-${path.id}`}
                  d={path.d}
                  fill={fill}
                  stroke={isSelected ? '#ffffff' : '#ffffff'}
                  strokeWidth={isSelected ? '2.5' : isHovered ? '1.8' : '0.8'}
                  className="transition-colors duration-150 cursor-pointer hover:opacity-95"
                  onMouseEnter={(e) => handleMouseMove(e, path)}
                  onMouseMove={(e) => handleMouseMove(e, path)}
                  onClick={() => handleClickState(path)}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredState && (
          <div
            className="pointer-events-none absolute z-20 bg-stone-900/95 text-white text-xs rounded-lg shadow-xl px-3 py-2.5 backdrop-blur-md border border-stone-700/60 transition-all duration-75 min-w-[170px]"
            style={{
              left: Math.min(Math.max(10, tooltipPos.x), 420),
              top: Math.max(10, tooltipPos.y),
            }}
          >
            <div className="font-semibold text-stone-100 text-sm border-b border-stone-700/60 pb-1 mb-1.5 flex items-center justify-between">
              <span>{hoveredState.name}</span>
              <span className="text-[10px] text-stone-400 font-mono">#{hoveredState.id.toUpperCase()}</span>
            </div>
            {currentData ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-300">
                  <span>Total Works:</span>
                  <span className="font-semibold text-white">{currentData.total_works.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span>High Risk Works:</span>
                  <span className="font-bold text-rose-400">{currentData.high_risk_works.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Medium Risk:</span>
                  <span className="font-semibold text-amber-400">{currentData.medium_risk_works.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-300 pt-1 border-t border-stone-800">
                  <span>Expenditure:</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    ₹{(currentData.total_expenditure / 10000000).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-stone-400 italic">No project anomalies recorded</div>
            )}
            <div className="text-[9px] text-stone-500 mt-1.5 text-center">Click to isolate state data</div>
          </div>
        )}
      </div>

      {/* Selected State Banner / Quick Inspection */}
      {selectedData && (
        <div className="w-full mt-2 p-3 bg-stone-100/90 border border-stone-200 rounded-xl flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-stone-900">{selectedData.state}</div>
              <div className="text-[11px] text-stone-500">
                {selectedData.total_works} works · {selectedData.high_risk_works} high risk · ₹
                {(selectedData.total_expenditure / 10000000).toFixed(2)} Cr total expenditure
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/projects?state=${encodeURIComponent(selectedData.state)}`}
              className="text-xs bg-primary text-white px-2.5 py-1 rounded-md font-medium hover:bg-primary-hover transition-colors"
            >
              Inspect Projects
            </a>
            <button
              onClick={() => {
                setActiveState(null);
                if (onSelectState) onSelectState(null);
              }}
              className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Legend and Summary Counters */}
      <div className="w-full pt-3 border-t border-border mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/70">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#b91c1c]" />
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">High Risk</span>
          </div>
          <div className="text-base font-bold text-[#8b2622]">
            {Object.values(stateStats)
              .reduce((acc, s) => acc + s.high_risk_works, 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/70">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">Medium Risk</span>
          </div>
          <div className="text-base font-bold text-[#b45309]">
            {Object.values(stateStats)
              .reduce((acc, s) => acc + s.medium_risk_works, 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/70">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#2d6a2d]" />
            <span className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">Low Risk</span>
          </div>
          <div className="text-base font-bold text-[#2d6a2d]">
            {Object.values(stateStats)
              .reduce((acc, s) => acc + s.low_risk_works, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
