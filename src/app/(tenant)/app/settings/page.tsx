import { redirect } from 'next/navigation';

/** 02 §4. `/app/settings` has no content of its own — it redirects to the
 *  first settings surface every role can reach. */
export default function SettingsRedirect() {
  redirect('/app/settings/company');
}
