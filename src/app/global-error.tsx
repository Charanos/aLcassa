'use client';

/**
 * THE LAST-RESORT BOUNDARY. Catches a failure in the ROOT LAYOUT itself,
 * which `error.tsx` cannot: that file renders INSIDE the layout, so if the
 * layout is what throws, `error.tsx` never mounts either. Next requires this
 * file to bring its own `<html>` and `<body>`, because at this point nothing
 * from the normal tree, including the token stylesheet, is a safe assumption.
 *
 * System fonts and inline styles only, deliberately not `@/app/globals.css`.
 * A last-resort screen that itself depends on the thing that might have
 * failed to load is not a last resort.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f9f9fa', // emulate surface-sunken
          color: '#171717',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '40px 32px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05)',
            maxWidth: '440px',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              color: '#ef4444',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 style={{ fontSize: '18px', fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>
            Something broke on our side.
          </h1>
          <p style={{ marginTop: '10px', color: '#525252', fontSize: '14px', lineHeight: 1.5 }}>
            We have logged it. Nobody caused this. Reloading usually fixes this.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '32px',
              padding: '10px 24px',
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '14px',
              color: '#ffffff',
              background: '#171717',
              border: '1px solid #171717',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              transition: 'opacity 0.2s',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
