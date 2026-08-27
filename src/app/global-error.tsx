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
          fontFamily: 'Georgia, serif',
          background: '#FBF9F5',
          color: '#1F1C18',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 400, margin: 0 }}>
          Something broke on our side.
        </h1>
        <p style={{ marginTop: '12px', fontFamily: 'system-ui, sans-serif', color: '#55504A' }}>
          We have logged it. Reloading usually fixes this.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '28px',
            padding: '10px 20px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            color: '#FFFFFF',
            background: '#A6572A',
            border: '1px solid #8A4A1E',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
