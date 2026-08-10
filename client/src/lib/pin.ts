/**
 * PIN helpers — MySQL via API
 */
import { api } from './api';

export async function hasPinSet(telegramId: string): Promise<boolean> {
  if (!telegramId) return false;
  try {
    const res = await api.hasPin(telegramId);
    return !!res.hasPin;
  } catch {
    return false;
  }
}

export async function setPin(telegramId: string, pin: string): Promise<void> {
  await api.setPin(telegramId, pin);
}

export async function verifyPin(telegramId: string, pin: string): Promise<boolean> {
  const res = await api.verifyPin(telegramId, pin);
  return !!res.valid;
}

export const setUserPin = setPin;
export const verifyUserPin = verifyPin;
export async function changeUserPin(telegramId: string, _oldPin: string, newPin: string): Promise<void> {
  await setPin(telegramId, newPin);
}
