/**
 * Recharts surfaces for the aLcassa platform console.
 *
 * Recharts is loaded lazily as an ESM bundle, with React and ReactDOM mapped
 * back to the page's own instances through the import map in the shell's
 * helmet. Nothing is destructured at module scope: if the CDN is unreachable,
 * each chart falls back to a quiet placeholder inside its own card rather than
 * taking down every chart on the four screens that use them.
 *
 * Charts read their colours from CSS custom properties at mount and re-resolve
 * them when the theme flips, so they invert with the rest of the console.
 */

const CDN = 'https://esm.sh/recharts@2.12.7?external=react,react-dom';

let rechartsPromise = null;
function loadRecharts() {
  if (!rechartsPromise) rechartsPromise = import(CDN);
  return rechartsPromise;
}

/** Resolves to the Recharts namespace, or a failure flag if the CDN is out. */
function useRecharts() {
  const [lib, setLib] = React.useState(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    loadRecharts().then(
      (mod) => { if (alive) setLib(mod); },
      () => { if (alive) setFailed(true); }
    );
    return () => { alive = false; };
  }, []);
  return [lib, failed];
}

function token(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

/** Re-render on theme change so token colours are re-resolved. */
function useTheme() {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const obs = new MutationObserver(() => bump((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
}

function Fallback(props) {
  return React.createElement(
    'div',
    {
      style: {
        display: 'grid', placeItems: 'center', height: (props.height || 220) + 'px',
        borderRadius: '7px', background: token('--surface-sunken', '#f3f6fb'),
        font: '400 12.5px/1.5 ' + token('--font-ui', 'sans-serif'),
        color: token('--text-tertiary', '#8b8f99'),
        animation: props.failed ? 'none' : 'skeleton-pulse 1.6s ease-in-out infinite'
      }
    },
    props.failed ? 'Chart unavailable offline' : ''
  );
}

/** Wraps a chart body so every export shares the same load and fail handling. */
function chart(height, body) {
  return function ChartShell() {
    const [R, failed] = useRecharts();
    useTheme();
    if (!R) return React.createElement(Fallback, { height, failed });
    return React.createElement(
      R.ResponsiveContainer,
      { width: '100%', height },
      body(R)
    );
  };
}

const AXIS = () => ({
  stroke: token('--text-tertiary', '#8b8f99'),
  fontSize: 11,
  fontFamily: token('--font-mono', 'monospace'),
  tickLine: false
});

function Frame(props) {
  return React.createElement(
    'div',
    {
      style: {
        background: token('--surface-raised', '#fff'),
        border: '1px solid ' + token('--border-subtle', '#d8ddea'),
        borderRadius: '7px',
        padding: '9px 11px',
        boxShadow: token('--shadow-md', '0 2px 8px rgba(0,0,0,.08)'),
        font: '400 12px/1.5 ' + token('--font-ui', 'sans-serif'),
        color: token('--text-primary', '#17225d')
      }
    },
    props.children
  );
}

function tip(formatter) {
  return function TipInner(p) {
    if (!p.active || !p.payload || !p.payload.length) return null;
    return React.createElement(
      Frame,
      null,
      React.createElement(
        'div',
        { style: { fontFamily: token('--font-mono', 'monospace'), fontSize: '11px', color: token('--text-tertiary', '#8b8f99'), marginBottom: '5px' } },
        p.label
      ),
      p.payload.map((row, i) =>
        React.createElement(
          'div',
          { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' } },
          React.createElement('span', { style: { width: '8px', height: '8px', borderRadius: '2px', background: row.color, flex: '0 0 auto' } }),
          React.createElement('span', { style: { flex: 1 } }, row.name),
          React.createElement(
            'span',
            { style: { fontFamily: token('--font-mono', 'monospace'), fontVariantNumeric: 'tabular-nums' } },
            formatter ? formatter(row.value) : row.value
          )
        )
      )
    );
  };
}

const kes = (n) => (n >= 1000000 ? (n / 1000000).toFixed(2) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));
const num = (n) => n.toLocaleString('en-US');

/* ── Workspace detail · AI-handled vs escalated ─────────────────────────── */

const VOLUME = [
  { d: '12 Jul', ai: 402, esc: 61 }, { d: '15 Jul', ai: 448, esc: 58 },
  { d: '18 Jul', ai: 471, esc: 66 }, { d: '21 Jul', ai: 512, esc: 54 },
  { d: '24 Jul', ai: 498, esc: 49 }, { d: '27 Jul', ai: 566, esc: 52 },
  { d: '30 Jul', ai: 604, esc: 47 }, { d: '02 Aug', ai: 588, esc: 44 },
  { d: '05 Aug', ai: 641, esc: 41 }, { d: '08 Aug', ai: 677, esc: 38 }
];

const VolumeChart = chart(220, (R) => {
  const blue = token('--blue-500', '#043ae1');
  const grey = token('--ink-300', '#bbc1d2');
  return React.createElement(
    R.AreaChart,
    { data: VOLUME, margin: { top: 4, right: 4, left: -18, bottom: 0 } },
    React.createElement(
      'defs',
      { key: 'defs' },
      React.createElement(
        'linearGradient',
        { id: 'aiFill', x1: '0', y1: '0', x2: '0', y2: '1' },
        React.createElement('stop', { offset: '0%', stopColor: blue, stopOpacity: 0.22 }),
        React.createElement('stop', { offset: '100%', stopColor: blue, stopOpacity: 0.02 })
      )
    ),
    React.createElement(R.CartesianGrid, { key: 'g', vertical: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', dataKey: 'd' }, AXIS(), { axisLine: false })),
    React.createElement(R.YAxis, Object.assign({ key: 'y' }, AXIS(), { axisLine: false, width: 48 })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip(num)), cursor: { stroke: token('--border-strong', '#bbc1d2') } }),
    React.createElement(R.Area, { key: 'a1', type: 'monotone', dataKey: 'ai', name: 'Handled by AI', stroke: blue, strokeWidth: 1.75, fill: 'url(#aiFill)' }),
    React.createElement(R.Area, { key: 'a2', type: 'monotone', dataKey: 'esc', name: 'Escalated', stroke: grey, strokeWidth: 1.75, fill: 'transparent' })
  );
});

/* ── Revenue · MRR trend with net-new bars ──────────────────────────────── */

const MRR = [
  { m: 'Sep', mrr: 3820000, net: 210000 }, { m: 'Oct', mrr: 4010000, net: 190000 },
  { m: 'Nov', mrr: 4180000, net: 170000 }, { m: 'Dec', mrr: 4120000, net: -60000 },
  { m: 'Jan', mrr: 4390000, net: 270000 }, { m: 'Feb', mrr: 4640000, net: 250000 },
  { m: 'Mar', mrr: 4880000, net: 240000 }, { m: 'Apr', mrr: 4810000, net: -70000 },
  { m: 'May', mrr: 5120000, net: 310000 }, { m: 'Jun', mrr: 5460000, net: 340000 },
  { m: 'Jul', mrr: 5720000, net: 260000 }, { m: 'Aug', mrr: 6040000, net: 320000 }
];

const MrrChart = chart(260, (R) => {
  const blue = token('--blue-500', '#043ae1');
  const green = token('--success-fg', '#3f7d53');
  const red = token('--danger-fg', '#c4243a');
  return React.createElement(
    R.ComposedChart,
    { data: MRR, margin: { top: 6, right: 4, left: -8, bottom: 0 } },
    React.createElement(R.CartesianGrid, { key: 'g', vertical: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', dataKey: 'm' }, AXIS(), { axisLine: false })),
    React.createElement(R.YAxis, Object.assign({ key: 'y' }, AXIS(), { axisLine: false, width: 52, tickFormatter: kes })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip(kes)), cursor: { fill: token('--surface-sunken', '#f3f6fb') } }),
    React.createElement(R.ReferenceLine, { key: 'r', y: 0, stroke: token('--border-strong', '#bbc1d2') }),
    React.createElement(
      R.Bar,
      { key: 'b', dataKey: 'net', name: 'Net new', barSize: 15, radius: [2, 2, 0, 0] },
      MRR.map((row, i) => React.createElement(R.Cell, { key: i, fill: row.net < 0 ? red : green, fillOpacity: 0.5 }))
    ),
    React.createElement(R.Line, { key: 'l', type: 'monotone', dataKey: 'mrr', name: 'MRR', stroke: blue, strokeWidth: 2, dot: false })
  );
});

/* ── Revenue · by plan ──────────────────────────────────────────────────── */

const BY_PLAN = [
  { name: 'Scale', value: 3496000 },
  { name: 'Growth', value: 1932000 },
  { name: 'Starter', value: 612000 }
];

const PlanMixChart = chart(214, (R) => {
  const fills = [token('--blue-500', '#043ae1'), token('--blue-400', '#4980fc'), token('--ink-300', '#bbc1d2')];
  return React.createElement(
    R.PieChart,
    null,
    React.createElement(
      R.Pie,
      { key: 'p', data: BY_PLAN, dataKey: 'value', nameKey: 'name', innerRadius: 54, outerRadius: 82, paddingAngle: 2, strokeWidth: 0 },
      BY_PLAN.map((row, i) => React.createElement(R.Cell, { key: i, fill: fills[i] }))
    ),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip(kes)) })
  );
});

/* ── Revenue · invoice ageing ───────────────────────────────────────────── */

const AGEING = [
  { b: 'Current', v: 5804000 }, { b: '1–30', v: 348000 },
  { b: '31–60', v: 184000 }, { b: '61–90', v: 0 }, { b: '90+', v: 62000 }
];

const AgeingChart = chart(214, (R) => {
  const blue = token('--blue-400', '#4980fc');
  const amber = token('--warning-fg', '#b7791f');
  const red = token('--danger-fg', '#c4243a');
  return React.createElement(
    R.BarChart,
    { data: AGEING, margin: { top: 6, right: 4, left: -8, bottom: 0 } },
    React.createElement(R.CartesianGrid, { key: 'g', vertical: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', dataKey: 'b' }, AXIS(), { axisLine: false })),
    React.createElement(R.YAxis, Object.assign({ key: 'y' }, AXIS(), { axisLine: false, width: 52, tickFormatter: kes })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip(kes)), cursor: { fill: token('--surface-sunken', '#f3f6fb') } }),
    React.createElement(
      R.Bar,
      { key: 'b', dataKey: 'v', name: 'Outstanding', barSize: 34, radius: [3, 3, 0, 0] },
      AGEING.map((row, i) => React.createElement(R.Cell, { key: i, fill: i === 0 ? blue : i < 3 ? amber : red }))
    )
  );
});

/* ── Health · latency ───────────────────────────────────────────────────── */

const LATENCY = Array.from({ length: 48 }, (_, i) => {
  const base = 118 + Math.sin(i / 5) * 22 + (i > 38 ? (i - 38) * 4 : 0);
  return {
    t: String(i % 24).padStart(2, '0') + ':00',
    p50: Math.round(base * 0.52),
    p95: Math.round(base),
    p99: Math.round(base * 1.72)
  };
});

const LatencyChart = chart(240, (R) => {
  const blue = token('--blue-500', '#043ae1');
  const mid = token('--blue-300', '#96b9ff');
  const faint = token('--ink-300', '#bbc1d2');
  const amber = token('--warning-fg', '#b7791f');
  return React.createElement(
    R.LineChart,
    { data: LATENCY, margin: { top: 6, right: 4, left: -14, bottom: 0 } },
    React.createElement(R.CartesianGrid, { key: 'g', vertical: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', dataKey: 't' }, AXIS(), { axisLine: false, interval: 7 })),
    React.createElement(R.YAxis, Object.assign({ key: 'y' }, AXIS(), { axisLine: false, width: 52, tickFormatter: (n) => n + 'ms' })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip((n) => n + 'ms')), cursor: { stroke: token('--border-strong', '#bbc1d2') } }),
    React.createElement(R.ReferenceLine, { key: 'r', y: 250, stroke: amber, strokeDasharray: '4 4', label: { value: 'SLO 250ms', position: 'insideTopRight', fill: amber, fontSize: 10, fontFamily: token('--font-mono', 'monospace') } }),
    React.createElement(R.Line, { key: 'l3', type: 'monotone', dataKey: 'p99', name: 'p99', stroke: faint, strokeWidth: 1.5, dot: false }),
    React.createElement(R.Line, { key: 'l2', type: 'monotone', dataKey: 'p95', name: 'p95', stroke: blue, strokeWidth: 2, dot: false }),
    React.createElement(R.Line, { key: 'l1', type: 'monotone', dataKey: 'p50', name: 'p50', stroke: mid, strokeWidth: 1.5, dot: false })
  );
});

/* ── Health · throughput ────────────────────────────────────────────────── */

const THROUGHPUT = Array.from({ length: 24 }, (_, i) => ({
  t: String(i).padStart(2, '0') + ':00',
  ok: Math.round(3800 + Math.sin(i / 3.4) * 1500 + i * 42),
  err: i === 17 ? 128 : 4 + ((i * 7) % 9)
}));

const ThroughputChart = chart(200, (R) => {
  const blue = token('--blue-400', '#4980fc');
  const red = token('--danger-fg', '#c4243a');
  return React.createElement(
    R.ComposedChart,
    { data: THROUGHPUT, margin: { top: 6, right: 4, left: -10, bottom: 0 } },
    React.createElement(R.CartesianGrid, { key: 'g', vertical: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', dataKey: 't' }, AXIS(), { axisLine: false, interval: 3 })),
    React.createElement(R.YAxis, Object.assign({ key: 'y' }, AXIS(), { axisLine: false, width: 54, tickFormatter: num })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip(num)), cursor: { fill: token('--surface-sunken', '#f3f6fb') } }),
    React.createElement(R.Bar, { key: 'b', dataKey: 'ok', name: 'Requests', fill: blue, fillOpacity: 0.32, barSize: 11, radius: [2, 2, 0, 0] }),
    React.createElement(R.Line, { key: 'l', type: 'monotone', dataKey: 'err', name: 'Errors', stroke: red, strokeWidth: 1.75, dot: false })
  );
});

/* ── Plans · tenants per plan ───────────────────────────────────────────── */

const PLAN_TENANTS = [
  { p: 'Starter', t: 7 }, { p: 'Growth', t: 21 }, { p: 'Scale', t: 19 }
];

const PlanTenantsChart = chart(150, (R) =>
  React.createElement(
    R.BarChart,
    { data: PLAN_TENANTS, layout: 'vertical', margin: { top: 2, right: 16, left: 6, bottom: 0 } },
    React.createElement(R.CartesianGrid, { key: 'g', horizontal: false, stroke: token('--border-subtle', '#e9edf5') }),
    React.createElement(R.XAxis, Object.assign({ key: 'x', type: 'number' }, AXIS(), { axisLine: false, hide: true })),
    React.createElement(R.YAxis, Object.assign({ key: 'y', type: 'category', dataKey: 'p' }, AXIS(), { axisLine: false, width: 58 })),
    React.createElement(R.Tooltip, { key: 't', content: React.createElement(tip((n) => n + ' workspaces')), cursor: { fill: token('--surface-sunken', '#f3f6fb') } }),
    React.createElement(R.Bar, { key: 'b', dataKey: 't', name: 'Workspaces', fill: token('--blue-500', '#043ae1'), fillOpacity: 0.75, barSize: 20, radius: [0, 3, 3, 0] })
  )
);

window.VolumeChart = VolumeChart;
window.MrrChart = MrrChart;
window.PlanMixChart = PlanMixChart;
window.AgeingChart = AgeingChart;
window.LatencyChart = LatencyChart;
window.ThroughputChart = ThroughputChart;
window.PlanTenantsChart = PlanTenantsChart;
