/**
 * 03 §22. The mark: a 1:1 square outline in copper containing two horizontal
 * rules offset from centre — a conduit passing through a boundary. There is no
 * brand yet; this placeholder ships and is meant to look deliberate.
 */
export function Mark({
  size = 20,
  tone = 'copper',
}: {
  size?: number;
  tone?: 'copper' | 'graphite';
}) {
  const stroke = tone === 'copper' ? 'var(--copper-600)' : 'var(--graphite-900)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-slot="mark"
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="1" stroke={stroke} strokeWidth="1.5" />
      <line x1="5" y1="10" x2="19" y2="10" stroke={stroke} strokeWidth="1.5" />
      <line x1="5" y1="14.5" x2="15" y2="14.5" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
