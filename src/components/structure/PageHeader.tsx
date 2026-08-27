import React from 'react';
import { Breadcrumb, type BreadcrumbProps } from './Breadcrumb';

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbProps['items'];
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 border-b border-[var(--rule-base)] pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-1">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}
          <h1 className="t-title text-[var(--ink-primary)]">{title}</h1>
          {description && (
            <p
              className="t-body text-[var(--ink-secondary)]"
              style={{ maxWidth: 'var(--measure-body)' }}
            >
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
