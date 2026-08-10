/**
 * Wallet hook — source of truth = MySQL via Express API.
 * No Firebase, no localStorage for wallet data.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserWallet } from '../types';
import { TelegramUser } from './useTelegramUser';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

export type ActivityType = 'deposit' | 'withdraw' | 'transfer_out' | 'transfer_in' | 'earn' | 'reward' | 'swap';

export interface Activity {
  id: string;
  type: ActivityType;
  amount: number;
  symbol: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  toAddress?: string;
  toName?: string;
  fromAddress?: string;
  fromName?: string;
  note?: string;
}

export interface UserRegistryEntry {
  telegramId: string;
  address: string;
  firstName: string | null;
  username: string | null;
  photoUrl: string | null;
  joinedAt?: string;
}

export function useWallet(telegramUser: TelegramUser | null) {
  const telegramId = telegramUser?.telegramId || null;
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsCreation, setNeedsCreation] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  const loadWallet = useCallback(async () => {
    if (!telegramId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getWallet(telegramId);
      if (data.needsCreation || !data.wallet) {
        setWallet(null);
        setActivities([]);
        setNeedsCreation(true);
      } else {
        setWallet(data.wallet);
        setActivities(data.activities || []);
        setNeedsCreation(false);
        api.getBnbBalance(telegramId).then((b) => {
          setWallet((w: any) => w ? { ...w, balances: { ...w.balances, BNB: b.bnb } } : w);
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
      setError(err.message || 'Failed to load wallet');
      setNeedsCreation(true);
    } finally {
      setIsLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const createWallet = async () => {
    if (!telegramId || !telegramUser) return;
    setIsCreating(true);
    try {
      const res = await api.createWallet({
        telegramId,
        firstName: telegramUser.firstName,
        username: telegramUser.username,
        photoUrl: telegramUser.photoUrl,
      });
      setWallet(res.wallet);
      setNeedsCreation(false);
      setActivities([]);
      if (telegramUser.startParam && telegramUser.startParam !== telegramId) {
        api.bindReferral(telegramUser.startParam, telegramId).catch(() => {});
      }
      showToast?.('Wallet created successfully');
    } catch (err: any) {
      console.error(err);
      showToast?.(err.message || 'Failed to create wallet');
      if (err.message?.includes('already')) {
        await loadWallet();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const refresh = () => loadWallet();

  return {
    wallet,
    fullWallet: wallet,
    telegramId,
    address: wallet?.address || null,
    activities,
    isLoading,
    error,
    needsCreation,
    isCreating,
    createWallet,
    refresh,
    balances: wallet?.balances || {},
  };
}
