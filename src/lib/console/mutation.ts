/** A lost action response is an unconfirmed outcome; preserve the editor for recovery. */
export async function runConsoleMutation<T>(perform: () => Promise<T>, subject: string) {
  try {
    return await perform();
  } catch {
    return {
      ok: false as const,
      error: `${subject} could not be confirmed. Reload to check the current state before trying again.`,
    };
  }
}
