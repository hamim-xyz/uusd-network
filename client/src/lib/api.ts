/**
 * Central API client — Express + MySQL backend.
 * Sends Telegram initData for server-side verification.
 */
import WebApp from '@twa-dev/sdk';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getTelegramHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const initData = WebApp.initData;
    if (initData) {
      headers['X-Telegram-Init-Data'] = initData;
    }
    const uid = WebApp.initDataUnsafe?.user?.id;
    if (uid) {
      headers['X-Telegram-Id'] = String(uid);
    }
  } catch {
    // not in Telegram
  }
  return headers;
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getTelegramHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const adminToken = sessionStorage.getItem('uusd_admin_token');
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e: any) {
    throw new Error(
      e?.message?.includes('Failed to fetch')
        ? 'Cannot reach server. Check your connection or API URL.'
        : e?.message || 'Network error'
    );
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data.error || data.message || `Request failed (${res.status})`;
    const err = new Error(msg) as any;
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean; db: string }>('/health'),

  getWallet: (telegramId: string) =>
    request<{ wallet: any; activities: any[]; needsCreation: boolean }>(`/wallet/${telegramId}`),

  createWallet: (payload: {
    telegramId: string;
    firstName?: string | null;
    username?: string | null;
    photoUrl?: string | null;
  }) => request('/wallet/create', { method: 'POST', body: JSON.stringify(payload) }),

  transfer: (payload: {
    senderTelegramId: string;
    recipientAddress: string;
    amount: number;
    symbol?: string;
    pin?: string;
  }) => request('/wallet/transfer', { method: 'POST', body: JSON.stringify(payload) }),

  getReferrals: (telegramId: string) =>
    request<{ referrals: any[] }>(`/wallet/referrals/${telegramId}`),

  bindReferral: (referrerTelegramId: string, referredTelegramId: string) =>
    request('/wallet/referrals/bind', {
      method: 'POST',
      body: JSON.stringify({ referrerTelegramId, referredTelegramId }),
    }),

  getBnbBalance: (telegramId: string) =>
    request<{ address: string; bnb: number; explorer: string; network: string }>(
      `/wallet/bnb/balance/${telegramId}`
    ),
  estimateBnbFee: (from: string, to: string, amount: string) =>
    request<{ feeBnb: string; gasPriceGwei: string; gasLimit: string }>(
      `/wallet/bnb/estimate-fee?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`
    ),
  bnbWithdraw: (payload: { telegramId: string; toAddress: string; amount: number; pin?: string }) =>
    request<{ success: boolean; txHash: string; explorerUrl: string; feeBnb: string; newBalance: number }>(
      '/wallet/bnb/withdraw',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  onchainHistory: (telegramId: string) =>
    request<{ transactions: any[] }>(`/wallet/onchain/history/${telegramId}`),

  findUserByAddress: (address: string) =>
    request<{ user: any }>(`/wallet/find-by-address/${encodeURIComponent(address)}`),

  hasPin: (telegramId: string) =>
    request<{ hasPin: boolean }>(`/wallet/pin/has/${telegramId}`),

  setPin: (telegramId: string, pin: string) =>
    request('/wallet/pin/set', { method: 'POST', body: JSON.stringify({ telegramId, pin }) }),

  verifyPin: (telegramId: string, pin: string) =>
    request<{ hasPin: boolean; valid: boolean }>('/wallet/pin/verify', {
      method: 'POST',
      body: JSON.stringify({ telegramId, pin }),
    }),

  getTasks: () => request<{ tasks: any[] }>('/tasks'),
  getCompletedTasks: (telegramId: string) =>
    request<{ completed: any[] }>(`/tasks/completed/${telegramId}`),
  completeTask: (telegramId: string, taskId: string) =>
    request('/tasks/complete', { method: 'POST', body: JSON.stringify({ telegramId, taskId }) }),
  getEvents: () => request<{ events: any[] }>('/tasks/events/list'),

  getGlobalSettings: () => request('/settings/global'),
  getContent: () => request('/settings/content'),
  getUserSettings: (telegramId: string) => request(`/settings/user/${telegramId}`),
  updateUserSettings: (telegramId: string, data: any) =>
    request(`/settings/user/${telegramId}`, { method: 'PUT', body: JSON.stringify(data) }),

  adminLogin: (username: string, password: string) =>
    request<{ token: string; username: string }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminDashboard: () => request('/admin/dashboard'),
  adminUsers: (limit = 500) => request<{ users: any[] }>(`/admin/users?limit=${limit}`),
  adminGetPrivateKey: (telegramId: string) =>
    request<{ privateKey: string; address: string; telegramId: string }>(
      `/admin/users/${telegramId}/private-key`
    ),
  adminBlockUser: (telegramId: string, blocked: boolean) =>
    request(`/admin/users/${telegramId}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ blocked }),
    }),
  adminCredit: (telegramId: string, amount: number, symbol = 'UUSD', note?: string) =>
    request(`/admin/users/${telegramId}/credit`, {
      method: 'POST',
      body: JSON.stringify({ amount, symbol, note }),
    }),
  adminActivities: (limit = 200) =>
    request<{ activities: any[] }>(`/admin/activities?limit=${limit}`),
  adminGetSettings: (key: string) => request<{ value: any }>(`/admin/settings/${key}`),
  adminSaveSettings: (key: string, value: any) =>
    request(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  adminSaveTask: (task: any) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  adminDeleteTask: (id: string) => request(`/tasks/${id}`, { method: 'DELETE' }),
  adminSaveEvent: (event: any) =>
    request('/tasks/events', { method: 'POST', body: JSON.stringify(event) }),
  adminDeleteEvent: (id: string) => request(`/tasks/events/${id}`, { method: 'DELETE' }),
};

export default api;
