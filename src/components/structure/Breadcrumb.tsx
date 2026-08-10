import Link from 'next/link';
import { Fragment } from 'react';

export type BreadcrumbProps = {
  items: { label: string; href?: string }[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  const renderItems = () => {
    if (items.length <= 4) return items;

    // Truncate middle items if more than 4
    return [
      items[0]!,
      { label: '…' },
      items[items.length - 2]!,
      items[items.length - 1]!,
    ];
  };

  const displayItems = renderItems();

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 sm:gap-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isTruncated = item.label === '…';

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center">
                {isLast || isTruncated || !item.href ? (
                  <span
                    className={`t-compact ${
                      isLast ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-tertiary)]'
                    }`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="t-compact text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)] transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="text-[var(--ink-faint)] t-compact select-none">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
