import type { RenderedTemplate } from './types';

/**
 * 10 §14. THE FIVE TEMPLATES, TRANSCRIBED RATHER THAN WRITTEN.
 *
 * Every subject and opening line below is copied from the copy deck. Where a
 * sentence here differs from that document, the document is right and this is
 * a bug — which is the same rule the interface copy follows, and the reason
 * both live in one reviewable place rather than being invented at call sites.
 *
 * ⚠ EMAIL IS NOT THE WEB, AND THREE HABITS HAVE TO GO.
 *
 *   No stylesheet.   Gmail strips <style> in some contexts and Outlook in
 *                    others. Every rule is an inline attribute.
 *   No CSS variables. The token layer cannot reach here, so the brand values
 *                    are literals — the only place in the codebase where
 *                    that is correct rather than a violation of 03 §2.
 *   No web fonts.    DM Sans will not load in most clients, so the stack
 *                    falls through to what the reader already has.
 *
 * Tables rather than flex, for the same reason: Outlook's rendering engine is
 * Word, and Word does not do flexbox.
 */

// 03 §2's palette, resolved. Kept together so a brand change is one edit.
const BRAND = {
  blue: '#043ae1',
  navy: '#17225d',
  cream: '#fbfdf4',
  rule: '#e9edf5',
  muted: '#64708b',
  white: '#ffffff',
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * The shell every template renders into.
 *
 * `preheader` is the line a client shows in the inbox list beside the
 * subject. Left unset, clients scrape the first text they find, which here
 * would be "aLcassa" — so every invitation would preview identically and
 * usefully say nothing. It is hidden in the body by being zero-height rather
 * than by `display: none`, which some clients ignore.
 */
function layout(input: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${BRAND.white};border:1px solid ${BRAND.rule};border-radius:8px;">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <span style="font:600 15px/1 ${FONT_STACK};color:${BRAND.navy};letter-spacing:-0.01em;">aLcassa</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 32px 32px;font:400 15px/1.55 ${FONT_STACK};color:${BRAND.navy};">
            <h1 style="margin:0 0 14px 0;font:500 20px/1.3 ${FONT_STACK};color:${BRAND.navy};">${escapeHtml(input.heading)}</h1>
            ${input.body}
          </td>
        </tr>
      </table>
      <p style="max-width:520px;margin:16px auto 0 auto;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};text-align:center;">
        Sent by aLcassa because someone acted on an account you are part of.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * A button that survives Outlook.
 *
 * The URL is repeated as visible text underneath, and that is not clutter: a
 * client that strips the anchor, a forwarded plain-text copy, or a reader who
 * distrusts buttons in email — all of them still need a way in. An
 * invitation whose only route is a styled link is an invitation that fails
 * silently for the people most careful about email.
 */
function action(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 18px 0;">
  <tr>
    <td style="background:${BRAND.blue};border-radius:6px;">
      <a href="${escapeAttr(url)}" style="display:inline-block;padding:11px 22px;font:500 15px/1 ${FONT_STACK};color:${BRAND.white};text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px 0;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};">Or paste this into your browser:</p>
<p style="margin:0;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};word-break:break-all;">${escapeHtml(url)}</p>`;
}

/**
 * ⚠ EVERY INTERPOLATED VALUE IS ESCAPED, AND THESE ARE NOT ALL OURS.
 *
 * `companyName` and `inviterName` are typed by tenants. Dropping either into
 * markup unescaped is stored XSS with an email client as the sink — and a
 * mail client is a worse place to have it than a browser, because the reader
 * has no origin to inspect and no console to check.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Attribute context additionally forbids a bare quote breaking out of href. */
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

/**
 * 10 §14 · Invitation.
 *   Subject      `{inviterName} invited you to {companyName}`
 *   Opening line `You have been invited to join {companyName} as {role}.`
 */
export function invitationEmail(input: {
  inviterName: string;
  companyName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): RenderedTemplate {
  const expires = input.expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subject = `${input.inviterName} invited you to ${input.companyName}`;
  const opening = `You have been invited to join ${input.companyName} as ${input.role}.`;

  const html = layout({
    preheader: opening,
    heading: subject,
    body: `<p style="margin:0 0 12px 0;">${escapeHtml(opening)}</p>
${action(input.acceptUrl, 'Accept invitation')}
<p style="margin:18px 0 0 0;font:400 13px/1.5 ${FONT_STACK};color:${BRAND.muted};">
  This invitation expires on ${escapeHtml(expires)}. If you were not expecting it, you can ignore this message — nothing happens until you accept.
</p>`,
  });

  const text = `${opening}

Accept your invitation:
${input.acceptUrl}

This invitation expires on ${expires}. If you were not expecting it, you can ignore this message — nothing happens until you accept.`;

  return { subject, html, text };
}

/**
 * 10 §14 · Credential created. M5.
 *
 * The copy deck calls this one unusual and argues for it anyway: "A
 * credential creation notification catches a compromised account." It is
 * written now because the wording is settled, and it costs nothing to have
 * ready when the credential module lands.
 */
export function credentialCreatedEmail(input: {
  actorName: string;
  credentialName: string;
  companyName: string;
  dashboardUrl: string;
}): RenderedTemplate {
  const subject = 'A new API credential was created';
  const opening = `${input.actorName} created the credential "${input.credentialName}" in ${input.companyName}. If this was not expected, revoke it in your dashboard.`;

  return {
    subject,
    html: layout({
      preheader: opening,
      heading: subject,
      body: `<p style="margin:0 0 12px 0;">${escapeHtml(opening)}</p>
${action(input.dashboardUrl, 'Review credentials')}`,
    }),
    text: `${opening}\n\nReview credentials:\n${input.dashboardUrl}`,
  };
}

/**
 * 10 §14 · Support session. M4.
 *
 * "The transparency claim in 09 §7 made active rather than passive, and it
 * costs one email." A tenant who has to go looking for the fact that we
 * entered their workspace has been told in a way that does not count.
 */
export function supportSessionEmail(input: {
  platformAdminName: string;
  companyName: string;
  reason?: string | null;
  activityUrl: string;
}): RenderedTemplate {
  const subject = 'Our support team opened your workspace';
  const opening = `${input.platformAdminName} opened ${input.companyName} to help with a support request.`;

  return {
    subject,
    html: layout({
      preheader: opening,
      heading: subject,
      body: `<p style="margin:0 0 12px 0;">${escapeHtml(opening)}</p>
${input.reason ? `<p style="margin:0 0 12px 0;">Reason given: ${escapeHtml(input.reason)}</p>` : ''}
<p style="margin:0 0 12px 0;">Everything they do is recorded in your activity log, and you can end the session at any time.</p>
${action(input.activityUrl, 'View activity')}`,
    }),
    text: `${opening}
${input.reason ? `\nReason given: ${input.reason}\n` : ''}
Everything they do is recorded in your activity log, and you can end the session at any time.

View activity:
${input.activityUrl}`,
  };
}
