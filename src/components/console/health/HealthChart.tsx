'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  Tooltip,
  type ChartDataset,
} from 'chart.js';
import type { AuditVolumePoint } from '@/lib/console/data';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  Tooltip,
);

/** Canvas charts share measured records with their keyboard-readable daily breakdown. */
export function HealthChart({
  points,
  variant = 'activity',
  inverse = false,
}: {
  points: AuditVolumePoint[];
  variant?: 'operations' | 'activity';
  inverse?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const id = useId();
  const [windowDays, setWindowDays] = useState(30);
  const [selectedDay, setSelectedDay] = useState('');
  const visible = points.slice(-windowDays);
  const selectedPoint = visible.find((point) => point.day === selectedDay) ?? visible.at(-1);
  const selected = selectedPoint ? activityRow(selectedPoint) : null;
  const line = variant === 'operations';
  const total = visible.reduce((sum, point) => sum + point.total, 0);
  const foreground = inverse ? 'var(--chrome-fg)' : 'var(--text-primary)';
  const muted = inverse ? 'var(--chrome-fg-muted)' : 'var(--text-secondary)';

  useEffect(() => {
    if (!canvas.current) return;
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const text = token(inverse ? '--chrome-fg-muted' : '--text-secondary', '#64708b');
    const rule = token(inverse ? '--chrome-rule' : '--border-subtle', '#d8ddea');
    const blue = token(inverse ? '--chrome-info' : '--blue-400', '#4980fc');
    const reads = token('--ink-300', '#bbc1d2');
    const routine = token('--blue-200', '#c0d5ff');
    const warning = token('--warning-fg', '#b7791f');
    const rows = points.slice(-windowDays).map(activityRow);
    const datasets: ChartDataset<'line' | 'bar'>[] = line
      ? [
          {
            label: 'Recorded operations',
            data: rows.map((row) => row.total),
            borderColor: blue,
            backgroundColor: blue,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.2,
          },
        ]
      : [
          { label: 'Audited reads', data: rows.map((row) => row.reads), backgroundColor: reads },
          {
            label: 'Routine changes',
            data: rows.map((row) => row.routine),
            backgroundColor: routine,
          },
          {
            label: 'Support-session changes',
            data: rows.map((row) => row.support),
            backgroundColor: blue,
          },
          {
            label: 'Service-role changes',
            data: rows.map((row) => row.bypass),
            backgroundColor: warning,
          },
        ];
    const chart = new Chart(canvas.current, {
      type: line ? 'line' : 'bar',
      data: { labels: rows.map((row) => row.day), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => rows[items[0]?.dataIndex ?? 0]?.day ?? '',
              footer: (items) => {
                const row = rows[items[0]?.dataIndex ?? 0];
                return row ? `${row.changes} changes · ${row.reads} audited reads` : '';
              },
            },
          },
        },
        scales: {
          x: {
            stacked: !line,
            grid: { display: false },
            border: { color: rule },
            ticks: {
              color: text,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 5,
              font: { size: 11 },
              callback: (_value, index) => rows[index]?.day.slice(5) ?? '',
            },
          },
          y: {
            stacked: !line,
            beginAtZero: true,
            border: { display: false },
            grid: { color: rule },
            ticks: { color: text, precision: 0, maxTicksLimit: 4, font: { size: 11 } },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [points, windowDays, line, inverse]);

  return (
    <div className="min-w-0" style={{ color: foreground }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="t-caption" style={{ color: muted }}>
          Nairobi calendar days
        </p>
        <div
          className="flex gap-1"
          role="group"
          aria-label={`${line ? 'Operations' : 'Activity'} chart period`}
        >
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={windowDays === days}
              onClick={() => {
                setWindowDays(days);
                setSelectedDay('');
              }}
              className="t-caption min-h-11 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
              style={{
                color: windowDays === days ? foreground : muted,
                background:
                  windowDays === days
                    ? inverse
                      ? 'var(--chrome-hover)'
                      : 'var(--surface-sunken)'
                    : 'transparent',
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>
      <div className={`relative w-full ${line ? 'h-44' : 'h-60'}`}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${line ? 'Recorded operations' : 'Recorded activity by category'}: ${total} operations in the displayed ${visible.length} days. Daily values are available below.`}
        />
      </div>
      {!line && (
        <div className="t-caption mt-4 flex flex-wrap gap-x-5 gap-y-2" style={{ color: muted }}>
          {[
            ['Audited reads', '--ink-300'],
            ['Routine changes', '--blue-200'],
            ['Support-session changes', '--blue-400'],
            ['Service-role changes', '--warning-fg'],
          ].map(([label, colour]) => (
            <span className="inline-flex items-center gap-2" key={label}>
              <span
                aria-hidden
                className="size-2 rounded-bar"
                style={{ background: `var(${colour})` }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
      <details className="t-caption mt-4" style={{ color: muted }}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2">
          Explore daily values
        </summary>
        <div className="mt-2 grid gap-3">
          <label htmlFor={id}>Recorded day</label>
          <select
            id={id}
            value={selected?.day ?? ''}
            onChange={(event) => setSelectedDay(event.target.value)}
            className="min-h-11 w-full rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 text-[var(--text-primary)]"
          >
            {visible.map((point) => (
              <option value={point.day} key={point.day}>
                {point.day}
              </option>
            ))}
          </select>
          <p role="status">
            {selected
              ? `${selected.day}: ${selected.total} operations, ${selected.changes} changes and ${selected.reads} audited reads. Changes include ${selected.routine} routine, ${selected.support} support-session and ${selected.bypass} service-role changes.`
              : 'No records available for this period.'}
          </p>
        </div>
      </details>
    </div>
  );
}

function activityRow(point: AuditVolumePoint) {
  const changes = Math.max(0, point.total - point.reads);
  const bypass = Math.max(0, Math.min(changes, point.serviceRole - point.reads));
  const support = Math.max(0, Math.min(changes - bypass, point.support));
  return { ...point, changes, bypass, support, routine: Math.max(0, changes - bypass - support) };
}
