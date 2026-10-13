import type { RenderedTemplate } from './types';

/** Shared email markup uses inline styles, system fonts and presentation tables. */

// 03 §2's palette, resolved. Kept together so a brand change is one edit.
const BRAND = {
  blue: '#043ae1',
  navy: '#17225d',
  cream: '#f4f5f7',
  rule: '#e9edf5',
  muted: '#64708b',
  white: '#ffffff',
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** The hidden preheader gives inbox previews useful context before the visible brand. */
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.white};border:1px solid ${BRAND.rule};border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:28px 28px 30px;background:${BRAND.navy};background-image:radial-gradient(rgba(255,255,255,0.12) 0.7px,transparent 0.9px);background-size:18px 18px;border-radius:20px 20px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td><span style="font:600 19px/1 ${FONT_STACK};color:${BRAND.white};letter-spacing:-0.03em;">aLcassa</span></td>
                <td align="right" aria-hidden="true" style="font:400 34px/1 ${FONT_STACK};color:#a2abce;">&#9993;</td>
              </tr>
            </table>
            <p style="margin:28px 0 10px;font:500 10px/1.4 ${FONT_STACK};color:#bdc5e2;letter-spacing:0.16em;text-transform:uppercase;">Workspace &amp; account updates</p>
            <h1 style="margin:0;font:500 28px/1.16 ${FONT_STACK};letter-spacing:-0.035em;color:${BRAND.white};">${escapeHtml(input.heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;font:400 15px/1.65 ${FONT_STACK};color:${BRAND.navy};">
            ${input.body}
          </td>
        </tr>
      </table>
      <p style="max-width:520px;margin:16px auto 0 auto;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};text-align:center;">
        aLcassa &middot; Workspace and account updates<br>Keep account links private. Never forward a password reset email.
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Keep a visible URL fallback for clients that strip button styling. */
function action(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 18px 0;">
  <tr>
    <td style="background:${BRAND.blue};border-radius:10px;">
      <a href="${escapeAttr(url)}" style="display:inline-block;padding:15px 24px;font:500 15px/1.2 ${FONT_STACK};color:${BRAND.white};text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px 0;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};">Or paste this into your browser:</p>
<p style="margin:0;font:400 12px/1.5 ${FONT_STACK};color:${BRAND.muted};word-break:break-all;">${escapeHtml(url)}</p>`;
}

/** Escape customer-supplied names and values before inserting them into email markup. */
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

/** Auth supplies the verification URL. Do not substitute customer metadata into its markup. */
export function authProviderEmail(
  purpose: 'invite' | 'recovery' | 'confirmation',
): RenderedTemplate {
  const invited = purpose === 'invite';
  const confirmation = purpose === 'confirmation';
  const subject = confirmation
    ? 'Confirm your aLcassa email'
    : invited
      ? 'Your aLcassa workspace invitation'
      : 'Reset your aLcassa password';
  const opening = confirmation
    ? 'Confirm your email to continue to aLcassa. Open this link in the browser where you started signing up.'
    : invited
      ? 'Your workspace is ready for you. Open your invitation to verify your email and choose a password.'
      : 'A password reset was requested for your aLcassa account. Open this link to verify your email before choosing a new password.';
  const label = confirmation
    ? 'Confirm your email'
    : invited
      ? 'Open your invitation'
      : 'Reset your password';
  const guidance = confirmation
    ? 'If you did not create an account or accept an invitation, ignore this email.'
    : invited
      ? 'If you were not expecting this invitation, you can ignore this email. No action is needed.'
      : 'If you did not request a reset, ignore this email. Your password has not changed.';
  const url = '{{ .ConfirmationURL }}';
  return {
    subject,
    html: layout({
      preheader: opening,
      heading: confirmation
        ? 'Confirm your email.'
        : invited
          ? 'A place to begin.'
          : 'A clear path back in.',
      body: `<p style="margin:0 0 16px;">${escapeHtml(opening)}</p>
${action(url, label)}
<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${BRAND.rule};font:400 13px/1.65 ${FONT_STACK};color:${BRAND.muted};">${escapeHtml(guidance)} Open the latest email; an expired or used link cannot be reused.</p>`,
    }),
    text: `${opening}\n\n${label}:\n${url}\n\n${guidance}\nOpen the latest email and keep its link private.`,
  };
}

/** Render the workspace invitation with its recorded role and expiry. */
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

/** Credential creation notification; activation depends on the credential milestone. */
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

/** Notify the customer when support opens their workspace. */
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

/** Unexpected device revocation gives the recipient a reason to review account access. */
export function sessionsRevokedEmail(input: {
  name: string;
  count: number;
  /** The device that did it, so the recipient can tell "me" from "not me". */
  fromDevice: string;
  when: string;
}): RenderedTemplate {
  const plural = input.count === 1 ? 'session was' : 'sessions were';
  const subject = 'Your other devices were signed out';
  const opening = `${input.count} ${plural} ended on your aLcassa platform account.`;

  return {
    subject,
    html: layout({
      preheader: opening,
      heading: subject,
      body: `<p style="margin:0 0 12px 0;">${escapeHtml(input.name)}, ${escapeHtml(opening)}</p>
<p style="margin:0 0 12px 0;">Requested from ${escapeHtml(input.fromDevice)} at ${escapeHtml(input.when)}. That device is still signed in.</p>
<p style="margin:0 0 12px 0;"><strong>If this was not you</strong>, someone else has your password. Change it through the sign-in page's recovery link, which proves control of this address first.</p>`,
    }),
    text: `${input.name}, ${opening}

Requested from ${input.fromDevice} at ${input.when}. That device is still signed in.

If this was not you, someone else has your password. Change it through the sign-in page's recovery link, which proves control of this address first.`,
  };
}
