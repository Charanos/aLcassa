/**
 * Shared state surfaces for the aLcassa platform console.
 *
 * Four states, one vocabulary, so a screen never invents its own way of being
 * empty or broken:
 *
 *   Skeleton      — loading. Mirrors the real layout's geometry so nothing
 *                   jumps when data lands.
 *   EmptyFirstRun — nothing exists yet. Has a primary action; this is the only
 *                   empty state that is an opportunity rather than a dead end.
 *   EmptyFiltered — things exist, the filter hides them. Names the filter and
 *                   offers to clear it. Never shows a "create" action, which
 *                   would be the wrong answer to "I over-filtered".
 *   ErrorState    — the request failed. States what failed, gives a retry, and
 *                   carries a request id support can actually trace.
 *
 * Mounted with <x-import component-from-global-scope="…" from="./states.jsx">.
 */

function token(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

function useTheme() {
  const [, bump] = React.useState(0);
  React.useEffect(() => {
    const obs = new MutationObserver(() => bump((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
}

const h = React.createElement;

function path(d, i) {
  return h('path', { key: i, d });
}

function Icon(props) {
  return h(
    'svg',
    {
      width: props.size || 20, height: props.size || 20, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      style: props.style
    },
    props.d.split('|').map(path)
  );
}

const GLYPH = {
  building: 'M3 21l18 0|M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16|M9 8h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1',
  filter: 'M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z',
  warn: 'M12 9v4|M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0|M12 16h.01',
  refresh: 'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4|M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
  plus: 'M12 5l0 14|M5 12l14 0',
  x: 'M18 6l-12 12|M6 6l12 12'
};

/* ── Skeleton ───────────────────────────────────────────────────────────── */

/** One shimmering block. Width may be a number (px) or any CSS length. */
function Bar(props) {
  const w = typeof props.w === 'number' ? props.w + 'px' : props.w || '100%';
  return h('span', {
    style: {
      display: 'block', width: w, height: (props.h || 10) + 'px',
      borderRadius: '3px', background: token('--surface-inset', '#e9edf5'),
      animation: 'skeleton-pulse 1.6s ease-in-out infinite',
      animationDelay: (props.delay || 0) + 'ms'
    }
  });
}

/**
 * Table skeleton. Columns are relative weights, so the shimmer lines up with
 * the real table's colgroup rather than looking like a generic grey box.
 */
function Skeleton(props) {
  useTheme();
  const rows = props.rows || 8;
  const cols = props.cols || [3, 1, 1.2, 1.4, 1.6, 1.2, 1];
  const rule = token('--border-subtle', '#e9edf5');

  return h(
    'div',
    { role: 'status', 'aria-busy': 'true', 'aria-live': 'polite', style: { width: '100%' } },
    h('span', { key: 'sr', style: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)' } }, 'Loading'),
    Array.from({ length: rows }, (_, r) =>
      h(
        'div',
        {
          key: r,
          style: {
            display: 'grid',
            gridTemplateColumns: cols.map((c) => c + 'fr').join(' '),
            gap: '16px', alignItems: 'center',
            height: 'var(--row-h, 44px)', padding: '0 18px',
            borderBottom: '1px solid ' + rule
          }
        },
        cols.map((_, c) =>
          h(Bar, {
            key: c,
            w: c === 0 ? '72%' : ['54%', '40%', '62%', '48%', '58%', '44%'][c % 6],
            h: c === 0 ? 11 : 9,
            delay: (r * 60 + c * 25) % 700
          })
        )
      )
    )
  );
}

/** Card-grid skeleton for KPI strips and chart panels. */
function SkeletonCards(props) {
  useTheme();
  const n = props.count || 4;
  return h(
    'div',
    {
      role: 'status', 'aria-busy': 'true',
      style: { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', 1fr)', gap: '14px' }
    },
    Array.from({ length: n }, (_, i) =>
      h(
        'div',
        {
          key: i,
          style: {
            border: '1px solid ' + token('--border-subtle', '#e9edf5'),
            borderRadius: '12px', background: token('--surface-raised', '#fff'),
            padding: '16px 18px 18px', display: 'grid', gap: '12px'
          }
        },
        h(Bar, { key: 'a', w: '52%', h: 9, delay: i * 90 }),
        h(Bar, { key: 'b', w: '70%', h: 22, delay: i * 90 + 40 }),
        h(Bar, { key: 'c', w: '86%', h: 8, delay: i * 90 + 80 })
      )
    )
  );
}

/* ── Shared shell for the three non-loading states ──────────────────────── */

function Shell(props) {
  return h(
    'div',
    {
      role: props.role || 'status',
      style: {
        display: 'grid', justifyItems: 'center', gap: 0,
        padding: (props.pad || 64) + 'px 24px',
        border: '1px ' + (props.solid ? 'solid' : 'dashed') + ' ' + (props.border || token('--border-strong', '#bbc1d2')),
        borderRadius: '12px',
        background: props.bg || token('--surface-sunken', '#f3f6fb')
      }
    },
    h(
      'span',
      {
        key: 'i',
        style: {
          display: 'grid', placeItems: 'center', width: '44px', height: '44px',
          borderRadius: '10px', marginBottom: '16px',
          background: props.chipBg || token('--surface-raised', '#fff'),
          border: '1px solid ' + (props.border || token('--border-subtle', '#e9edf5')),
          color: props.iconInk || token('--text-tertiary', '#8b8f99')
        }
      },
      h(Icon, { d: props.glyph, size: 21 })
    ),
    h(
      'p',
      {
        key: 't',
        style: {
          margin: 0, fontFamily: token('--font-display', 'Georgia, serif'),
          fontWeight: 400, fontSize: '21px', lineHeight: 1.18,
          letterSpacing: '-0.008em', color: token('--text-primary', '#17225d'),
          textAlign: 'center'
        }
      },
      props.title
    ),
    h(
      'p',
      {
        key: 'b',
        style: {
          margin: '8px 0 0', maxWidth: '48ch', textAlign: 'center',
          font: '400 13px/1.55 ' + token('--font-ui', 'sans-serif'),
          color: token('--text-secondary', '#64708b'), textWrap: 'pretty'
        }
      },
      props.body
    ),
    props.children
      ? h('div', { key: 'a', style: { display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' } }, props.children)
      : null
  );
}

function Button(props) {
  const primary = props.variant === 'primary';
  const danger = props.variant === 'danger';
  return h(
    'button',
    {
      type: 'button', onClick: props.onClick,
      style: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '34px', padding: '0 14px', borderRadius: '7px',
        border: primary ? 'none' : '1px solid ' + token('--border-strong', '#bbc1d2'),
        background: primary ? token('--blue-500', '#043ae1') : token('--surface-raised', '#fff'),
        color: primary ? '#ffffff' : danger ? token('--danger-fg', '#c4243a') : token('--text-primary', '#17225d'),
        font: (primary ? '500' : '400') + ' 13px/1 ' + token('--font-ui', 'sans-serif'),
        whiteSpace: 'nowrap', cursor: 'pointer'
      }
    },
    props.glyph ? h(Icon, { d: props.glyph, size: 15 }) : null,
    props.label
  );
}

/* ── Empty · first run ──────────────────────────────────────────────────── */

function EmptyFirstRun(props) {
  useTheme();
  return h(
    Shell,
    {
      glyph: props.glyph || GLYPH.building,
      title: props.title || 'No workspaces yet',
      body: props.body || 'Provision the first one and its owner receives an invitation to set their own password.',
      pad: props.pad
    },
    props.actionLabel
      ? h(Button, { key: 'p', variant: 'primary', glyph: GLYPH.plus, label: props.actionLabel, onClick: props.onAction })
      : null,
    props.secondaryLabel
      ? h(Button, { key: 's', label: props.secondaryLabel, onClick: props.onSecondary })
      : null
  );
}

/* ── Empty · filtered ───────────────────────────────────────────────────── */

function EmptyFiltered(props) {
  useTheme();
  const filters = props.filters || [];
  return h(
    Shell,
    {
      glyph: GLYPH.filter,
      title: props.title || 'Nothing matches those filters',
      body: props.body || 'All ' + (props.total || 47) + ' records are still there. The current filter is hiding every one of them.',
      pad: props.pad || 56
    },
    filters.length
      ? h(
          'div',
          { key: 'f', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4px', width: '100%' } },
          filters.map((f, i) =>
            h(
              'span',
              {
                key: i,
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  height: '26px', padding: '0 10px', borderRadius: '9999px',
                  background: token('--surface-raised', '#fff'),
                  border: '1px solid ' + token('--border-subtle', '#e9edf5'),
                  font: '400 12px/1 ' + token('--font-mono', 'monospace'),
                  color: token('--text-secondary', '#64708b')
                }
              },
              f
            )
          )
        )
      : null,
    h(Button, { key: 'c', variant: 'primary', glyph: GLYPH.x, label: props.clearLabel || 'Clear filters', onClick: props.onClear })
  );
}

/* ── Error ──────────────────────────────────────────────────────────────── */

function ErrorState(props) {
  useTheme();
  return h(
    Shell,
    {
      role: 'alert',
      glyph: GLYPH.warn,
      solid: true,
      border: token('--danger-fg', '#c4243a'),
      bg: token('--danger-bg', '#fce8eb'),
      chipBg: token('--surface-raised', '#fff'),
      iconInk: token('--danger-fg', '#c4243a'),
      title: props.title || 'Could not load workspaces',
      body: props.body || 'The request failed after 10 seconds. Nothing was changed, and retrying is safe.',
      pad: props.pad || 56
    },
    h(Button, { key: 'r', variant: 'primary', glyph: GLYPH.refresh, label: 'Retry', onClick: props.onRetry }),
    h(
      'span',
      {
        key: 'id',
        style: {
          display: 'inline-flex', alignItems: 'center', height: '34px',
          font: '400 11.5px/1 ' + token('--font-mono', 'monospace'),
          color: token('--text-tertiary', '#8b8f99')
        }
      },
      props.requestId || 'req_7f21a9c04'
    )
  );
}

window.Skeleton = Skeleton;
window.SkeletonCards = SkeletonCards;
window.EmptyFirstRun = EmptyFirstRun;
window.EmptyFiltered = EmptyFiltered;
window.ErrorState = ErrorState;
