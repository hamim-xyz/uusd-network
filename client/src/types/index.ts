export interface UserWallet {
  telegramId: string;
  address: string;
  availableBalance: number;
  lockedBalance: number;
  balances: Record<string, number>;
  depositEnabled: boolean;
  blocked: boolean;
  createdAt?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  points?: number;
  rewardAmount?: number;
  rewardSymbol?: string;
  type?: string;
  link?: string;
  platform?: string;
  isActive?: boolean;
}
