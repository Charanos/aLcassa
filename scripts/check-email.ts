#!/usr/bin/env tsx
/**
 * Will an email actually leave this environment?
 *
 * ⚠ WRITTEN BECAUSE SETTING THE TWO VARIABLES IS NOT THE SAME AS BEING ABLE
 *   TO SEND, AND THE DIFFERENCE IS INVISIBLE UNTIL SOMEBODY IS WAITING FOR AN
 *   INVITATION THAT NEVER ARRIVES.
 *
 * `RESEND_API_KEY` and `EMAIL_FROM` being present is what makes the
 * application choose the Resend adapter over the logging one. It is NOT what
 * makes a send succeed. Resend refuses any `from` address on a domain that has
 * not been verified with DNS records, with a 422 — so a half-configured
 * environment is strictly worse than an unconfigured one: the honest "we could
 * not email it, here is the link" path is switched off, and every send fails
 * instead.
 *
 * That is exactly the state this project was in when the client reported that
 * invitations were not arriving. The key existed. No domain did.
 *
 * ⚠ IT SENDS NOTHING. A check that proves delivery by delivering something
 * mails a real person every time anybody runs it, and the first thing that
 * happens to such a script is that people stop running it. This asks the
 * provider which domains it will accept and compares the answer to the address
 * configured here, which is the whole of what can be known without a recipient.
 *
 *   pnpm check:email
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });

let failures = 0;
const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => {
  console.log(`  ✗ ${s}`);
  failures += 1;
};
const note = (s: string) => console.log(`    ${s}`);

/** `aLcassa <support@alcassa.co.ke>` and `support@alcassa.co.ke` both parse. */
function domainOf(from: string): string | null {
  const angled = /<([^>]+)>/.exec(from);
  const address = (angled?.[1] ?? from).trim();
  const at = address.lastIndexOf('@');
  return at === -1 ? null : address.slice(at + 1).toLowerCase();
}

type ResendDomain = { id: string; name: string; status: string; region?: string };

type ResendRecord = {
  record: string;
  type: string;
  name: string;
  value: string;
  priority?: number;
  status?: string;
};

/**
 * What to publish, in the shape a DNS panel asks for it.
 *
 * The host column is the part that trips people up: most registrars want the
 * subdomain alone (`resend._domainkey`), a few want it fully qualified. Both
 * are printed so nobody has to guess which one their panel means.
 */
async function printRecords(apiKey: string, id: string, domain: string): Promise<void> {
  const res = await fetch(`https://api.resend.com/domains/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    note(`Could not read the records (HTTP ${res.status}). They are in the dashboard.`);
    return;
  }
  const body = (await res.json()) as { records?: ResendRecord[] };
  const records = body.records ?? [];
  if (records.length === 0) return;

  console.log(`
   Publish these on ${domain}:
`);
  for (const r of records) {
    /* ⚠ THE MX ROW IS FOR INBOUND MAIL AND SENDING DOES NOT WAIT ON IT.
       Resend returns it alongside the rest, and publishing an MX record you do
       not need can quietly redirect mail for the apex domain — worth saying
       rather than leaving in a list captioned "publish these". */
    const inboundOnly = r.type.toUpperCase() === 'MX';
    console.log(
      `   ${r.record} · ${r.type}${inboundOnly ? '   — only if you want to RECEIVE' : ''}`,
    );
    console.log(`     host   ${r.name || '@'}   (or ${r.name ? `${r.name}.` : ''}${domain}.)`);
    console.log(`     value  ${r.value}`);
    if (r.priority !== undefined) console.log(`     prio   ${r.priority}`);
    console.log();
  }
  note('Sending needs the DKIM and SPF rows. Resend re-checks them on its own;');
  note('re-run this to see the status move to "verified".');
}

async function main() {
  console.log('\nEMAIL · what this environment can actually send\n');

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  // ── 1 · which adapter the application will choose ──────────────────────
  console.log('1. Adapter selection');
  if (!apiKey && !from) {
    ok('neither variable is set, so the logging adapter runs');
    note('Nothing is sent, and the interface says so rather than pretending.');
    note('The invite form hands the owner the accept link to pass on.');
    console.log('\nThis is a coherent configuration. Set both to send for real.\n');
    return;
  }

  if (!apiKey || !from) {
    bad(`only ${apiKey ? 'RESEND_API_KEY' : 'EMAIL_FROM'} is set`);
    note('Both are required together, so the logging adapter still runs — but');
    note('this is a configuration somebody abandoned half-finished, and the next');
    note('person to read it will assume email works.');
    return;
  }
  ok('both variables are set, so the Resend adapter will be chosen');
  ok(`from: ${from}`);

  const domain = domainOf(from);
  if (!domain) {
    bad(`EMAIL_FROM has no domain in it — "${from}" is not an address`);
    return;
  }

  // ── 2 · does the key work ──────────────────────────────────────────────
  console.log('\n2. The key');
  const response = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (response.status === 401 || response.status === 403) {
    bad(`the provider rejected the key (HTTP ${response.status})`);
    note('Every send will fail. Check RESEND_API_KEY against the Resend dashboard.');
    return;
  }
  if (!response.ok) {
    bad(`the provider answered HTTP ${response.status}`);
    note('Cannot tell whether sending would work. Try again.');
    return;
  }
  ok('the provider accepted the key');

  // ── 3 · the domain, which is the part that actually bites ──────────────
  console.log('\n3. The sending domain');
  const body = (await response.json()) as { data?: ResendDomain[] };
  const domains = body.data ?? [];

  if (domains.length === 0) {
    bad('the account has NO verified domains');
    note(`Every send from ${from} will fail with a 422.`);
    note('');
    note(`Add ${domain} in the Resend dashboard, publish the DNS records it`);
    note('gives you, and wait for them to verify. Until then the only address');
    note('that sends is onboarding@resend.dev, which delivers ONLY to the');
    note('Resend account owner — enough to prove the path, not enough to invite');
    note('anybody.');
    return;
  }

  const match = domains.find((d) => d.name.toLowerCase() === domain);
  if (!match) {
    bad(`${domain} is not among the account's domains`);
    note(`Verified: ${domains.map((d) => `${d.name} (${d.status})`).join(', ')}`);
    note(`Either verify ${domain}, or set EMAIL_FROM to an address on one above.`);
    return;
  }

  if (match.status !== 'verified') {
    bad(`${domain} is present but its status is "${match.status}"`);
    if (match.status === 'not_started') {
      note('The domain was added but its DNS records have not been published.');
    } else {
      note('The records are published but have not verified yet — propagation,');
      note('or one of them is wrong.');
    }
    /* ⚠ PRINT THE RECORDS RATHER THAN SAY "check the dashboard". The whole
       cost of this failure is somebody having to go and find them. */
    await printRecords(apiKey, match.id, domain);
    return;
  }

  ok(`${domain} is verified${match.region ? ` (${match.region})` : ''}`);
  ok('an invitation sent from this environment will leave');
}

/**
 * ⚠ `process.exitCode`, NOT `process.exit()`.
 *
 * `fetch` leaves undici sockets closing behind it, and calling `process.exit`
 * from a `finally` tears the event loop down underneath them — on Windows that
 * surfaces as `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and an
 * exit code of 3221226505, which is a crash wearing a failed check's clothing.
 * Setting the code and letting the loop drain reports the same verdict without
 * inventing a second failure on top of it.
 */
main()
  .catch((error: unknown) => {
    console.error('\nThe check itself failed:', error);
    failures += 1;
  })
  .finally(() => {
    console.log(
      failures === 0
        ? '\nEmail configuration is coherent.\n'
        : `\n${failures} ${failures === 1 ? 'problem' : 'problems'} above. Email will not arrive.\n`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  });
