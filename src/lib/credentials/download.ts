/** Keep user-supplied metadata on comment lines in the exported environment file. */
export function credentialDownload(
  name: string,
  scopes: readonly string[],
  secret: string,
): string {
  const comment = (value: string) => value.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();
  return `# ${comment(name)}\n# Scopes: ${scopes.map(comment).join(', ')}\n# Store this key in your secret manager.\nAPI_KEY=${secret}\n`;
}
