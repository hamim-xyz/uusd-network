/**
 * Client-side UX helper only.
 * Real verification & claim enforcement happen on the server.
 * This never grants rewards by itself.
 */
export async function verifyTaskCompletion(_task: any, _telegramId: string): Promise<boolean> {
  // Brief delay for UX feedback while user returns from external link / channel
  await new Promise((r) => setTimeout(r, 800));
  // Always return true here — server decides if claim is allowed
  return true;
}

export const verifyTask = verifyTaskCompletion;

export async function getReferralCount(_telegramId: string): Promise<number> {
  return 0;
}
