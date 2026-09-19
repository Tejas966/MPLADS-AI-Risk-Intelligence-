'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { API_BASE } from '@/lib/config';
import {
  normalizeStateName,
  getStateDistrictFile,
  normalizeDistrictName,
} from '@/lib/geoNormalization';

export interface StateRiskStats {
  state: string;
  total_works: number;
  high_risk_works: number;
  medium_risk_works: number;
  low_risk_works: number;
  total_expenditure: number;
}

export interface DistrictRiskStats {
  state: string;
  district: string;
  total_works: number;
  high_risk_works: number;
  medium_risk_works: number;
  low_risk_works: number;
  avg_risk_score: number;
  total_expenditure: number;
}

interface LiveIndiaMapProps {
  selectedState?: string | null;
  selectedDistrict?: string | null;
  onSelectState?: (stateName: string | null) => void;
  onSelectDistrict?: (districtName: string | null) => void;
  compact?: boolean;
  className?: string;
}

export default function LiveIndiaMap({
  selectedState = null,
  selectedDistrict = null,
  onSelectState,
  onSelectDistrict,
  compact = false,
  className = '',
}: LiveIndiaMapProps) {
  // National GeoJSON & stats
  const [nationalGeo, setNationalGeo] = useState<FeatureCollection | null>(null);
  const [stateStatsMap, setStateStatsMap] = useState<Record<string, StateRiskStats>>({});

  // District GeoJSON & stats for selected state
  const [districtGeo, setDistrictGeo] = useState<FeatureCollection | null>(null);
  const [districtStatsMap, setDistrictStatsMap] = useState<Record<string, DistrictRiskStats>>({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [hoveredEntity, setHoveredEntity] = useState<{
    name: string;
    type: 'state' | 'district';
    stats?: StateRiskStats | DistrictRiskStats;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentHoveredRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 620, height: 560 });

  // 1. Fetch National States GeoJSON and State-level Risk Stats on mount
  useEffect(() => {
    let isMounted = true;
    async function loadNationalData() {
      try {
        setLoading(true);
        const [geoRes, statsRes] = await Promise.all([
          fetch('/data/india_states.geojson'),
          fetch(`${API_BASE}/api/v1/states`),
        ]);

        if (!geoRes.ok) throw new Error('Failed to load India states boundary data');

        const geo: FeatureCollection = await geoRes.json();
        if (isMounted) setNationalGeo(geo);

        if (statsRes.ok) {
          const stats: StateRiskStats[] = await statsRes.json();
          const map: Record<string, StateRiskStats> = {};
          stats.forEach((s) => {
            map[s.state.toLowerCase().trim()] = s;
            map[normalizeStateName(s.state).toLowerCase()] = s;
          });
          if (isMounted) setStateStatsMap(map);
        }
      } catch (err) {
        console.error('Error loading national geospatial data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNationalData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch District GeoJSON & District Risk Stats when a state is selected
  useEffect(() => {
    if (!selectedState) {
      setDistrictGeo(null);
      setDistrictStatsMap({});
      return;
    }

    let isMounted = true;
    async function loadDistrictData(state: string) {
      setDistrictLoading(true);
      try {
        const districtFile = getStateDistrictFile(state);
        const [distGeoRes, distStatsRes] = await Promise.all([
          fetch(districtFile),
          fetch(`${API_BASE}/api/v1/states/${encodeURIComponent(state)}/districts`),
        ]);

        if (distGeoRes.ok) {
          const dGeo: FeatureCollection = await distGeoRes.json();
          if (isMounted) setDistrictGeo(dGeo);
        } else {
          if (isMounted) setDistrictGeo(null);
        }

        if (distStatsRes.ok) {
          const stats: DistrictRiskStats[] = await distStatsRes.json();
          const dMap: Record<string, DistrictRiskStats> = {};
          stats.forEach((ds) => {
            const rawKey = ds.district.toLowerCase().trim();
            const normKey = normalizeDistrictName(ds.district);
            dMap[rawKey] = ds;
            dMap[normKey] = ds;
          });
          if (isMounted) setDistrictStatsMap(dMap);
        }
      } catch (err) {
        console.warn(`District boundary or stats unavailable for ${state}:`, err);
        if (isMounted) setDistrictGeo(null);
      } finally {
        if (isMounted) setDistrictLoading(false);
      }
    }

    loadDistrictData(selectedState);
    return () => {
      isMounted = false;
    };
  }, [selectedState]);

  // Adjust SVG dimensions based on parent container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        const targetWidth = Math.max(300, Math.min(width, 700));
        setDimensions({
          width: targetWidth,
          height: compact ? 380 : Math.round(targetWidth * 0.95),
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [compact]);

  // Find the selected state's Feature object in nationalGeo
  const selectedStateFeature = useMemo(() => {
    if (!selectedState || !nationalGeo) return null;
    const target = normalizeStateName(selectedState).toLowerCase();
    return nationalGeo.features.find(
      (f) =>
        f.properties?.ST_NM?.toLowerCase() === target ||
        f.properties?.state_name?.toLowerCase() === target
    );
  }, [selectedState, nationalGeo]);

function getPlanarBoundingBoxFeature(col: FeatureCollection) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  function traverse(coords: any) {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(coords)) {
      for (const c of coords) traverse(c);
    }
  }
  for (const f of col.features) {
    if (f.geometry) traverse((f.geometry as any).coordinates);
  }
  if (!isFinite(minLng) || !isFinite(maxLng)) return null;
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [minLng, minLat],
        [minLng, maxLat],
        [maxLng, maxLat],
        [maxLng, minLat],
        [minLng, minLat],
      ]],
    },
  };
}

// D3 Projection and Path Generator
  const { pathGenerator } = useMemo(() => {
    const projection = geoMercator();

    if (selectedState && districtGeo && districtGeo.features.length > 0) {
      // Zoom into selected state using its district bounds
      const bbox = getPlanarBoundingBoxFeature(districtGeo);
      if (bbox) {
        projection.fitExtent(
          [
            [25, 25],
            [dimensions.width - 25, dimensions.height - 25],
          ],
          bbox
        );
      } else {
        projection.fitExtent(
          [
            [25, 25],
            [dimensions.width - 25, dimensions.height - 25],
          ],
          districtGeo
        );
      }
    } else if (selectedStateFeature) {
      // Zoom into state polygon bounds
      projection.fitExtent(
        [
          [35, 35],
          [dimensions.width - 35, dimensions.height - 35],
        ],
        selectedStateFeature
      );
    } else if (nationalGeo) {
      // National India view
      projection.fitExtent(
        [
          [15, 15],
          [dimensions.width - 15, dimensions.height - 15],
        ],
        nationalGeo
      );
    }

    const generator = geoPath().projection(projection);
    return { pathGenerator: generator };
  }, [dimensions, selectedState, selectedStateFeature, districtGeo, nationalGeo]);

  // Precompute and memoize rendered district path strings
  const renderedDistricts = useMemo(() => {
    if (!selectedState || !districtGeo || districtGeo.features.length === 0 || !pathGenerator) {
      return [];
    }
    return districtGeo.features.map((feature, idx) => {
      const rawDistrict = feature.properties?.district || feature.properties?.dtname || `dist-${idx}`;
      const pathD = pathGenerator(feature) || '';
      return {
        feature,
        idx,
        rawDistrict,
        pathD,
      };
    });
  }, [selectedState, districtGeo, pathGenerator]);

  // Precompute and memoize rendered state path strings
  const renderedStates = useMemo(() => {
    if (selectedState || !nationalGeo || !pathGenerator) {
      return [];
    }
    return nationalGeo.features.map((feature, idx) => {
      const name = feature.properties?.ST_NM || feature.properties?.state_name || `state-${idx}`;
      const pathD = pathGenerator(feature) || '';
      return {
        feature,
        idx,
        name,
        pathD,
      };
    });
  }, [selectedState, nationalGeo, pathGenerator]);

  // Color logic for state choropleth based on backend stats
  const getStateColor = (feature: Feature<Geometry, any>, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return '#7a1f1f'; // Deep burgundy for selected state
    if (isHovered) return '#9a2e2e'; // Hover accent

    const name = feature.properties?.ST_NM || feature.properties?.state_name || '';
    const stats = stateStatsMap[name.toLowerCase()] || stateStatsMap[normalizeStateName(name).toLowerCase()];

    if (!stats || stats.total_works === 0) {
      return '#e8dfd8'; // Neutral stone for no recorded works
    }

    const highRatio = stats.high_risk_works / stats.total_works;

    // High risk concentration
    if (stats.high_risk_works >= 30 || highRatio >= 0.18) {
      return '#b91c1c'; // Crimson
    }
    // Medium risk
    if (stats.high_risk_works >= 8 || highRatio >= 0.08) {
      return '#d97706'; // Warm Amber
    }
    // Low risk
    return '#15803d'; // Forest Green
  };

  // Color logic for district choropleth
  const getDistrictColor = (feature: Feature<Geometry, any>, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return '#7a1f1f';
    if (isHovered) return '#c2410c';

    const rawDistrict = feature.properties?.district || feature.properties?.dtname || '';
    const norm = normalizeDistrictName(rawDistrict);
    const stats = districtStatsMap[rawDistrict.toLowerCase()] || districtStatsMap[norm];

    if (!stats || stats.total_works === 0) {
      return '#e6dfd7';
    }

    if (stats.high_risk_works >= 5 || stats.avg_risk_score >= 38) {
      return '#b91c1c'; // High risk
    }
    if (stats.high_risk_works >= 1 || stats.avg_risk_score >= 20) {
      return '#d97706'; // Medium risk
    }
    return '#15803d'; // Low risk
  };

  // Tooltip handler: 60fps hardware-accelerated GPU translation without React state thrashing
  const handleMouseMove = (e: React.MouseEvent<SVGElement>, name: string, type: 'state' | 'district') => {
    if (tooltipRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(10, e.clientX - rect.left + 15), dimensions.width - 230);
      const y = Math.max(10, e.clientY - rect.top - 20);
      tooltipRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      tooltipRef.current.style.opacity = '1';
    }

    // Only update React state when moving to a DIFFERENT entity
    if (currentHoveredRef.current !== name) {
      currentHoveredRef.current = name;
      if (type === 'state') {
        const stats = stateStatsMap[name.toLowerCase()] || stateStatsMap[normalizeStateName(name).toLowerCase()];
        setHoveredEntity({ name, type: 'state', stats });
      } else {
        const stats = districtStatsMap[name.toLowerCase()] || districtStatsMap[normalizeDistrictName(name)];
        setHoveredEntity({ name, type: 'district', stats });
      }
    }
  };

  const handleMouseLeave = () => {
    currentHoveredRef.current = null;
    setHoveredEntity(null);
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = '0';
    }
  };

  const handleStateClick = (stateName: string) => {
    const clean = normalizeStateName(stateName);
    const next = selectedState === clean ? null : clean;
    if (onSelectState) onSelectState(next);
    if (onSelectDistrict) onSelectDistrict(null);
  };

  const handleDistrictClick = (districtName: string) => {
    const next = selectedDistrict === districtName ? null : districtName;
    if (onSelectDistrict) onSelectDistrict(next);
  };

  const handleReset = () => {
    if (onSelectState) onSelectState(null);
    if (onSelectDistrict) onSelectDistrict(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center select-none ${className}`}
    >
      {/* Top Map Breadcrumb & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            id="breadcrumb-national-india"
            onClick={handleReset}
            className={`font-semibold flex items-center gap-1.5 transition-colors ${
              selectedState
                ? 'text-brand hover:underline cursor-pointer'
                : 'text-foreground font-bold cursor-default'
            }`}
          >
            <i className="fas fa-landmark text-brand text-[10px]" />
            <span>National India</span>
          </button>

          {selectedState && (
            <>
              <span className="text-stone-400">/</span>
              <button
                type="button"
                id="breadcrumb-state"
                onClick={() => onSelectDistrict && onSelectDistrict(null)}
                className={`font-semibold transition-colors ${
                  selectedDistrict
                    ? 'text-brand hover:underline cursor-pointer'
                    : 'text-foreground font-bold cursor-default'
                }`}
              >
                {selectedState}
              </button>
            </>
          )}

          {selectedDistrict && (
            <>
              <span className="text-stone-400">/</span>
              <span className="font-bold text-foreground bg-surface-secondary px-2 py-0.5 rounded border border-border">
                {selectedDistrict}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedState && (
            <button
              type="button"
              id="btn-back-to-india"
              onClick={handleReset}
              className="text-[11px] bg-surface-secondary hover:bg-border text-foreground px-2.5 py-1 rounded-lg font-medium border border-border transition-colors flex items-center gap-1 cursor-pointer"
            >
              <i className="fas fa-arrow-left text-[9px]" /> Back to India Map
            </button>
          )}
          <span className="text-[10px] text-foreground-secondary hidden sm:inline-block font-mono">
            {selectedState ? 'District View' : 'State View'}
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full flex-1 flex items-center justify-center p-1 min-h-[380px] bg-stone-50/50 dark:bg-stone-900/30 rounded-xl border border-border/70 overflow-hidden">
        {loading || districtLoading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/60 backdrop-blur-xs">
            <i className="fas fa-circle-notch fa-spin text-brand text-2xl mb-2" />
            <span className="text-xs font-semibold text-foreground-secondary">
              {districtLoading ? `Loading ${selectedState} district boundaries...` : 'Rendering live boundary data...'}
            </span>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-full max-h-[540px] drop-shadow-xs"
          onMouseLeave={handleMouseLeave}
        >
          {/* 1. National States View (When no state selected) */}
          {!selectedState && nationalGeo && (
            <g>
              {renderedStates.map(({ feature, idx, name, pathD }) => {
                if (!pathD) return null;
                const isHovered = hoveredEntity?.name === name;
                const fill = getStateColor(feature, isHovered, false);

                return (
                  <path
                    key={`state-${idx}-${name}`}
                    id={`state-path-${idx}`}
                    d={pathD}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? '2' : '0.8'}
                    strokeLinejoin="round"
                    className="cursor-pointer hover:opacity-95"
                    onMouseEnter={(e) => handleMouseMove(e, name, 'state')}
                    onMouseMove={(e) => handleMouseMove(e, name, 'state')}
                    onClick={() => handleStateClick(name)}
                  />
                );
              })}
            </g>
          )}

          {/* 2. District View (When state selected and district boundaries available) */}
          {selectedState && districtGeo && districtGeo.features.length > 0 && (
            <g>
              {renderedDistricts.map(({ feature, idx, rawDistrict, pathD }) => {
                if (!pathD) return null;
                const isSelected = selectedDistrict?.toUpperCase() === rawDistrict.toUpperCase();
                const isHovered = hoveredEntity?.name === rawDistrict;
                const fill = getDistrictColor(feature, isHovered, isSelected);

                return (
                  <path
                    key={`dist-${idx}-${rawDistrict}`}
                    id={`district-path-${idx}`}
                    d={pathD}
                    fill={fill}
                    stroke={isSelected ? '#ffffff' : '#f5f0eb'}
                    strokeWidth={isSelected ? '2.5' : isHovered ? '1.8' : '0.6'}
                    strokeLinejoin="round"
                    className="cursor-pointer hover:opacity-95"
                    onMouseEnter={(e) => handleMouseMove(e, rawDistrict, 'district')}
                    onMouseMove={(e) => handleMouseMove(e, rawDistrict, 'district')}
                    onClick={() => handleDistrictClick(rawDistrict)}
                  />
                );
              })}
            </g>
          )}

          {/* 3. Fallback: If state selected but district boundary not in local file, render zoomed state boundary */}
          {selectedState && (!districtGeo || districtGeo.features.length === 0) && selectedStateFeature && (
            <g>
              <path
                d={pathGenerator(selectedStateFeature) || ''}
                fill="#7a1f1f"
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip with GPU Transform and Zero Component Thrashing */}
        <div
          ref={tooltipRef}
          className={`pointer-events-none absolute left-0 top-0 z-30 bg-stone-900/95 text-white text-xs rounded-xl shadow-xl px-3.5 py-3 backdrop-blur-md border border-stone-700/70 min-w-[210px] will-change-transform transition-opacity duration-150 ${
            hoveredEntity ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ transform: 'translate3d(0px, 0px, 0px)' }}
        >
          {hoveredEntity && (
            <>
              <div className="font-bold text-stone-100 text-sm border-b border-stone-700/60 pb-1.5 mb-2 flex items-center justify-between">
                <span>{hoveredEntity.name}</span>
                <span className="text-[10px] text-stone-400 font-mono uppercase">
                  {hoveredEntity.type}
                </span>
              </div>

              {hoveredEntity.stats ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-stone-300">
                    <span>Total Works:</span>
                    <span className="font-semibold font-mono text-white">
                      {hoveredEntity.stats.total_works.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-300">
                    <span>High-Priority Works:</span>
                    <span className="font-bold font-mono text-rose-400">
                      {hoveredEntity.stats.high_risk_works.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Medium Risk (Timing):</span>
                    <span className="font-semibold font-mono text-amber-400">
                      {hoveredEntity.stats.medium_risk_works.toLocaleString()}
                    </span>
                  </div>
                  {'avg_risk_score' in hoveredEntity.stats && (
                    <div className="flex justify-between text-purple-300">
                      <span>Average Risk Score:</span>
                      <span className="font-bold font-mono text-purple-300">
                        {hoveredEntity.stats.avg_risk_score} / 100
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-300 pt-1.5 border-t border-stone-800">
                    <span>Expenditure:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      ₹{(hoveredEntity.stats.total_expenditure / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-stone-400 italic text-[11px]">
                  No recorded MPLADS works in this jurisdiction
                </div>
              )}

              <div className="text-[9px] text-stone-500 mt-2 text-center pt-1 border-t border-stone-800">
                {hoveredEntity.type === 'state' ? 'Click to drill-down to districts' : 'Click to filter project dossier'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Entity Summary Banner */}
      {selectedState && (
        <div className="w-full mt-2 p-3 bg-surface/90 border border-border rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            <div>
              <div className="text-xs font-bold text-foreground">
                {selectedDistrict ? `${selectedDistrict} District, ${selectedState}` : `${selectedState} State Overview`}
              </div>
              <div className="text-[11px] text-foreground-secondary">
                {selectedDistrict && districtStatsMap[selectedDistrict.toLowerCase()] ? (
                  <>
                    {districtStatsMap[selectedDistrict.toLowerCase()].total_works} works ·{' '}
                    {districtStatsMap[selectedDistrict.toLowerCase()].high_risk_works} high priority · ₹
                    {(districtStatsMap[selectedDistrict.toLowerCase()].total_expenditure / 10000000).toFixed(2)} Cr outlay
                  </>
                ) : stateStatsMap[selectedState.toLowerCase()] ? (
                  <>
                    {stateStatsMap[selectedState.toLowerCase()].total_works} works across {Object.keys(districtStatsMap).length / 2 || 30}+ districts · ₹
                    {(stateStatsMap[selectedState.toLowerCase()].total_expenditure / 10000000).toFixed(2)} Cr outlay
                  </>
                ) : (
                  'Active state selected'
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedDistrict && (
              <button
                onClick={() => onSelectDistrict && onSelectDistrict(null)}
                className="text-xs text-foreground-secondary hover:text-foreground px-2 py-1"
              >
                Clear District
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-xs bg-surface-secondary hover:bg-border text-foreground px-2.5 py-1 rounded-md font-medium transition-colors"
            >
              Reset View
            </button>
          </div>
        </div>
      )}

      {/* Verified Geographic Legend & Metadata */}
      <div className="w-full pt-3 border-t border-border/80 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-[11px] font-medium text-foreground-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]" /> High Priority
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" /> Needs Review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" /> Standard
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e8dfd8]" /> No Outlay
          </span>
        </div>

        <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
          <i className="fas fa-shield-alt text-brand" />
          <span>DataMeet CC BY 4.0 Verified Boundaries</span>
        </div>
      </div>
    </div>
  );
}
