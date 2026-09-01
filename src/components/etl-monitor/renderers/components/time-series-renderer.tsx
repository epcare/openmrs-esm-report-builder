/**
 * Time Series Renderer
 * Renders the TIME_SERIES component type (reference: widgets/timeseries.png):
 * current value + delta vs the period start, and a compact area/line chart
 * with a time axis, hairline gridlines, and a crosshair tooltip.
 *
 * Chart specs follow the dataviz method: 2px line (round cap/join), area wash
 * ~10% opacity, >=8px end dot with a 2px surface ring, hairline solid
 * gridlines, axis text in muted ink (never the series color), single series
 * -> no legend, crosshair + tooltip on hover and keyboard.
 */

import React, { useMemo, useRef, useState } from 'react';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatSemanticValue, resolveRowFieldValue } from '../data-transformer';
import { getTileIcon } from '../component-icons';
import styles from '../monitor-renderers.scss';

interface TimeSeriesRendererProps {
  config: DisplayConfigV2;
  fields?: Array<{ key: string; label: string; path?: string; type: string; [k: string]: any }>;
  arrayData?: any[];
  rawData?: any;
  data?: any;
}

const W_PAD_LEFT = 38;
const W_PAD_RIGHT = 12;
const H_PAD_TOP = 8;
const H_PAD_BOTTOM = 18;

/** Compact axis label: durations human, numbers compact */
function compactAxis(value: number, type?: string): string {
  if (type === 'DURATION') {
    const totalSeconds = Math.floor(value / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return String(Math.round(value));
}

function formatTime(ts: number, type?: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  if (type === 'DATE') return d.toLocaleDateString();
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function TimeSeriesRenderer({ config, fields, arrayData, rawData }: TimeSeriesRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(280);
  const [active, setActive] = useState<number | null>(null);

  const safeFields = fields || [];
  const timeField = safeFields.find((f) => f.type === 'TIMESTAMP');
  const valueField =
    safeFields.find((f) => f.primary) ||
    safeFields.find((f) => ['PERCENTAGE', 'NUMBER', 'INTEGER', 'DECIMAL', 'DURATION'].includes(f.type)) ||
    safeFields.find((f) => f.type !== 'TIMESTAMP');
  const headerIcon = getTileIcon(Object.values(config.componentConfig?.icons || {})[0]);

  // Resolve the point series
  const points = useMemo(() => {
    const rows = arrayData && arrayData.length > 0
      ? arrayData
      : Array.isArray(rawData)
        ? rawData
        : [];

    const get = (row: any, f: any): any =>
      resolveRowFieldValue(row, f, config.data?.arrayPath);

    if (!timeField || !valueField) return [];
    return rows
      .map((row: any) => ({
        x: get(row, timeField),
        y: get(row, valueField),
      }))
      .filter((p: any) => p.x != null && p.y != null && typeof p.y === 'number')
      .sort((a: any, b: any) => a.x - b.x);
  }, [arrayData, rawData, timeField, valueField, config]);

  // Responsive width
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 40) setWidth(Math.floor(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const H = 120;
  const plotW = Math.max(40, width - W_PAD_LEFT - W_PAD_RIGHT);
  const plotH = H - H_PAD_TOP - H_PAD_BOTTOM;

  const xMin = points.length ? points[0].x : 0;
  const xMax = points.length ? points[points.length - 1].x : 1;
  const yValues = points.map((p) => p.y);
  const yMin = Math.min(0, ...yValues);
  const yMax = points.length ? Math.max(...yValues) : 1;

  const sx = (x: number) => W_PAD_LEFT + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const sy = (y: number) => H_PAD_TOP + (1 - (y - yMin) / (yMax - yMin || 1)) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const baseY = sy(yMin);
  const areaPath = points.length
    ? `${linePath} L${sx(points[points.length - 1].x).toFixed(1)},${baseY.toFixed(1)} L${sx(points[0].x).toFixed(1)},${baseY.toFixed(1)} Z`
    : '';

  // Delta: change from period start to current value
  const delta = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0].y;
    const last = points[points.length - 1].y;
    if (!first) return null;
    const pct = ((last - first) / Math.abs(first)) * 100;
    if (!isFinite(pct)) return null;
    return pct;
  }, [points]);

  const currentValue = points.length ? points[points.length - 1].y : null;
  const currentLabel = currentValue != null ? formatSemanticValue(currentValue, valueField || {}) : '—';
  const deltaLabel = config.componentConfig?.deltaLabel || 'vs previous period';
  const gridTicks = [yMin, yMin + (yMax - yMin) / 2, yMax];

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setActive(nearest);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!points.length) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.key === 'ArrowLeft' ? -1 : 1;
      setActive((prev) => {
        const base = prev ?? points.length - 1;
        return Math.max(0, Math.min(points.length - 1, base + step));
      });
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const activePoint = active != null ? points[active] : null;

  return (
    <div className={styles['time-series-renderer']}>
      {/* Header: icon tile + metric label + current value + delta */}
      <div className={styles['time-series-renderer__head']}>
        {(() => {
          const Icon = headerIcon;
          return Icon ? (
            <span className={styles['time-series-renderer__icon']}>
              <Icon size={20} />
            </span>
          ) : null;
        })()}
        <div className={styles['time-series-renderer__head-text']}>
          <span className={styles['time-series-renderer__label']}>
            {valueField?.label || config.presentation?.title || 'Trend'}
          </span>
          <span className={styles['time-series-renderer__value']}>{currentLabel}</span>
        </div>
        {delta != null && (
          <span className={styles['time-series-renderer__head-delta']}>
            <span className={`${styles['time-series-renderer__delta']} ${delta >= 0 ? styles['time-series-renderer__delta--up'] : styles['time-series-renderer__delta--down']}`}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
            </span>
            <span className={styles['time-series-renderer__delta-note']}>{deltaLabel}</span>
          </span>
        )}
      </div>

      {/* Chart */}
      {points.length === 0 ? (
        <div className={styles['time-series-renderer__empty']}>No time series data</div>
      ) : (
        <div className={styles['time-series-renderer__chart']} ref={wrapRef}>
          <svg
            ref={svgRef}
            width={width}
            height={H}
            role="img"
            aria-label={`${valueField?.label || 'Trend'} over time`}
            tabIndex={0}
            onMouseMove={handleMove}
            onMouseLeave={() => setActive(null)}
            onKeyDown={handleKey}
            onBlur={() => setActive(null)}
          >
            {/* hairline gridlines + y ticks (muted ink) */}
            {gridTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={W_PAD_LEFT}
                  x2={width - W_PAD_RIGHT}
                  y1={sy(tick)}
                  y2={sy(tick)}
                  className={styles['time-series-renderer__grid']}
                />
                <text
                  x={W_PAD_LEFT - 6}
                  y={sy(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className={styles['time-series-renderer__tick']}
                >
                  {compactAxis(tick, valueField?.type)}
                </text>
              </g>
            ))}

            {/* crosshair */}
            {activePoint && (
              <line
                x1={sx(activePoint.x)}
                x2={sx(activePoint.x)}
                y1={H_PAD_TOP}
                y2={H_PAD_TOP + plotH}
                className={styles['time-series-renderer__crosshair']}
              />
            )}

            {/* area wash + 2px line */}
            <path d={areaPath} className={styles['time-series-renderer__area']} />
            <path d={linePath} className={styles['time-series-renderer__line']} />

            {/* hovered marker (surface ring) */}
            {activePoint && (
              <circle
                cx={sx(activePoint.x)}
                cy={sy(activePoint.y)}
                r={4.5}
                className={styles['time-series-renderer__dot']}
              />
            )}

            {/* current-value end dot (surface ring) */}
            {points.length > 0 && (
              <circle
                cx={sx(points[points.length - 1].x)}
                cy={sy(points[points.length - 1].y)}
                r={4.5}
                className={styles['time-series-renderer__dot']}
              />
            )}

            {/* x labels: first / middle / last (muted ink) */}
            {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((idx, i) => {
              if (idx < 0 || !points[idx]) return null;
              return (
                <text
                  key={i}
                  x={sx(points[idx].x)}
                  y={H - 4}
                  textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                  className={styles['time-series-renderer__tick']}
                >
                  {formatTime(points[idx].x, timeField?.format?.timestamp?.display === 'date' ? 'DATE' : undefined)}
                </text>
              );
            })}
          </svg>

          {/* tooltip (value leads, time follows) */}
          {activePoint && (
            <div
              className={styles['time-series-renderer__tooltip']}
              style={{
                left: `${(sx(activePoint.x) / width) * 100}%`,
                top: 0,
              }}
            >
              <span className={styles['time-series-renderer__tooltip-value']}>
                {formatSemanticValue(activePoint.y, valueField || {})}
              </span>
              <span className={styles['time-series-renderer__tooltip-time']}>
                {formatTime(activePoint.x)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TimeSeriesRenderer;
