import Link from '@/components/structure/NavigationLink';
import { IconArrowRight, IconEyeglass } from '@tabler/icons-react';

/**
 * "This is designed data, and nothing here can be saved."
 *
 * ⚠ THE STATE THIS EXISTS FOR IS REAL AND WAS COMPLETELY SILENT.
 *
 * `middleware.ts` admits any request carrying the platform cookie — it says so:
 * *"coarse access control … this only avoids rendering a shell for a request
 * that has no session."* The live readers need something stricter: a resolvable
 * Supabase auth session. The two come apart whenever the identity provider's
 * token expires while the cookie survives, which is an ordinary Tuesday.
 *
 * When they came apart, `getLiveProfile()` returned null, `?? getProfile()` did
 * its job, and the console rendered the DESIGNED profile as though it were the
 * reader's account — a name, an "Admin since 14 Mar 2025", three devices in
 * Nairobi and Mombasa, an address marked verified. All of it invented, none of
 * it labelled.
 *
 * Then every control failed on click with an authentication error, because the
 * server actions resolve the session properly and correctly refused.
 *
 * ⚠ IT IS `attention`, NOT `failure`. Nothing has broken. The reader is signed
 * out of one of two things and can fix it in a click, and painting that red
 * teaches people to ignore red.
 *
 * ⚠ AND IT CARRIES `?next=`. 02 §3 preserves the return path everywhere else;
 * a banner that drops somebody on the console overview after they sign in has
 * made them navigate back to the screen they were already on.
 */
export function PreviewNotice() {
  return (
    <div
      className="mb-5 flex flex-col gap-3 rounded-overlay px-5 py-4 sm:flex-row sm:items-center"
      style={{
        background: 'var(--badge-warning-bg)',
        border: '1px solid var(--badge-warning-edge)',
      }}
      role="status"
    >
      <IconEyeglass
        size={18}
        stroke={1.75}
        aria-hidden
        className="shrink-0"
        style={{ color: 'var(--warning-fg)' }}
      />

      <div className="min-w-0 flex-1">
        <p
          className="t-compact"
          style={{ color: 'var(--text-primary)', fontWeight: 500, textWrap: 'pretty' }}
        >
          You are looking at designed sample data, not your account.
        </p>
        <p
          className="t-caption mt-1"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
        >
          Your sign-in could not be resolved, so this page fell back to the reference profile. The
          name, devices and record below belong to nobody. Nothing on this screen can be changed
          until you sign in again.
        </p>
      </div>

      <Link
        href="/sign-in?next=%2Fplatform%2Fprofile"
        className="t-compact inline-flex h-9 shrink-0 items-center gap-2 rounded-chip px-4 whitespace-nowrap transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        Sign in again
        <IconArrowRight size={14} stroke={2} aria-hidden />
      </Link>
    </div>
  );
}
