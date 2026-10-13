import { IconCheck, IconCrown, IconMinus } from '@tabler/icons-react';
import type { AdminRole, ProfileCapability } from '@/lib/console/data';
import { Panel } from '@/components/console/Surface';
import { RailEyebrow } from '@/components/console/profile/shared';

/** Shows live capabilities and the separately maintained operator access record. */
export function AccessRail({
  role,
  capabilities,
  facts,
}: {
  role: AdminRole;
  capabilities: ProfileCapability[];
  facts: Array<{ label: string; value: string }>;
}) {
  return (
    <Panel
      title="Your access"
      variant="elevated"
      action={
        <span
          className="inline-flex h-[34px] items-center gap-1.5 rounded-overlay px-3"
          style={{
            background: 'var(--blue-50)',
            border: '1px solid var(--blue-100)',
            color: 'var(--blue-600)',
            font: '500 var(--type-compact)/1 var(--font-mono)',
          }}
        >
          <IconCrown size={14} stroke={1.5} aria-hidden />
          {role.toLowerCase().replace('_', ' ')}
        </span>
      }
    >
      <div className="mt-2 grid gap-4">
        {capabilities.map((c) => (
          <div key={c.key} className="flex items-start gap-4">
            <span
              className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full"
              style={{
                background: c.granted ? 'var(--badge-success-bg)' : 'var(--surface-inset)',
                color: c.granted ? 'var(--success-fg)' : 'var(--text-disabled)',
              }}
              aria-hidden
            >
              {c.granted ? (
                <IconCheck size={12} stroke={2.5} />
              ) : (
                <IconMinus size={12} stroke={2.5} />
              )}
            </span>
            <span className="w-full">
              <span
                className="block text-base"
                style={{
                  color: c.granted ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontWeight: 500,
                }}
              >
                {c.label}
                {/* The state in words as well as in the glyph. A tick and a dash
                    are the same shape to a screen reader and to anyone reading
                    this in a screenshot at 60% zoom. */}
                {c.granted ? null : <span style={{ fontWeight: 400 }}> &mdash; not granted</span>}
              </span>
              <span
                className="mt-0.5 block text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
              >
                {c.detail}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <RailEyebrow>Your record</RailEyebrow>
      </div>

      <dl className="grid gap-3.5">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3">
            {/*
              ⚠ `dt` BEFORE `dd` IN THE MARKUP, ALWAYS. 18 §12: a description
              list can be made to LOOK right with `order` or `flex-row-reverse`
              while reading in the opposite order to a screen reader, which
              pairs every term with the wrong value. Layout here is
              `justify-between`, which changes nothing about source order.
            */}
            <dt className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {f.label}
            </dt>
            <dd
              className="numeric shrink-0"
              style={{
                font: '500 var(--type-compact)/1 var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
