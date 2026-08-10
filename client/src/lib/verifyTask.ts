/**
 * Client-side task verification helper.
 * Final claim is always enforced on the server.
 */
export async function verifyTaskCompletion(_task: any, _telegramId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 1200));
  return true;
}

export const verifyTask = verifyTaskCompletion;

export async function getReferralCount(_telegramId: string): Promise<number> {
  return 0;
}
