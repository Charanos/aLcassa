import type { Metadata } from 'next';
import { AppearanceSettings } from '@/components/tenant/AppearanceSettings';

export const metadata: Metadata = { title: 'Appearance & Personalization' };

export default function AppearancePage() {
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="t-title text-[var(--text-primary)]">Appearance & Layout</h1>
        <p className="t-lede mt-1 text-[var(--text-secondary)]">
          Personalize your workspace. Choose your brand accent color and customize layout
          preferences.
        </p>
      </div>

      <AppearanceSettings />
    </div>
  );
}
