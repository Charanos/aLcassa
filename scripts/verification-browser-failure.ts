/** Bounded diagnostics for owned browser fixtures; never publish DOM, input values or worker logs. */
import type { Page } from 'playwright';

export async function browserFailure(
  step: string,
  error: unknown,
  page: Page | undefined,
  secrets: string[],
  state: Record<string, unknown>,
) {
  const redact = (value: string) => {
    for (const secret of secrets.filter(Boolean)) value = value.split(secret).join('[private]');
    return value
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[fixture email]')
      .replace(/\/invite\/[A-Za-z0-9_-]+/g, '/invite/[private]')
      .replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi, '[fixture id]')
      .replace(/[A-Za-z0-9_-]{24,}/g, '[private value]')
      .slice(0, 1600);
  };
  const alerts =
    page && !page.isClosed()
      ? await page
          .getByRole('alert')
          .allTextContents()
          .catch(() => [])
      : [];
  console.error(
    JSON.stringify({
      verificationFailure: true,
      step: redact(step),
      error: redact(error instanceof Error ? error.message : 'Browser assertion failed'),
      alerts: alerts.slice(0, 4).map(redact),
      state,
    }),
  );
}
