import assert from 'node:assert/strict';

/** Read only the owned fixture's captured email; never publish its verification URL. */
export async function capturedConfirmation(email: string, seen = new Set<string>()) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(
      `http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const mail = (await response.json()) as { messages: { ID: string; Subject: string }[] };
    const message = mail.messages.find(
      (entry) => !seen.has(entry.ID) && /confirm/i.test(entry.Subject),
    );
    if (message) {
      seen.add(message.ID);
      const body = (await (
        await fetch(`http://127.0.0.1:55424/api/v1/message/${message.ID}`)
      ).json()) as { HTML: string };
      assert(body.HTML.includes('Confirm your email.'));
      const link = [...body.HTML.matchAll(/href="([^"]+)"/g)]
        .map((match) => match[1]!.replaceAll('&amp;', '&'))
        .find((url) => url.startsWith('http://127.0.0.1:55421/auth/v1/verify'));
      assert(link, 'Captured confirmation must contain a real provider verification link.');
      return link;
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw Error('Owned confirmation email did not arrive.');
}
