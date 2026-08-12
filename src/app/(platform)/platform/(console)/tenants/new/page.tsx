import { redirect } from 'next/navigation';

/**
 * The provisioning flow now lives in `ProvisionWorkspaceDialog.tsx`, opened
 * from any console page via `?provision=1` — see `ConsoleShell.tsx`. This
 * route is kept only so an existing link or bookmark to `/platform/tenants/new`
 * still lands somewhere real rather than 404ing.
 */
export default function ProvisionRedirect() {
  redirect('/platform?provision=1');
}
