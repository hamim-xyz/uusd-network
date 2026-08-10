/**
 * Compatibility layer — old Firestore-style functions now call MySQL API.
 */
import { api } from './api';

export const getUsers = async () => {
  const res = await api.adminUsers(1000);
  return res.users;
};

export const getWallets = async () => {
  const res = await api.adminUsers(1000);
  return res.users.map((u: any) => ({
    telegramId: u.telegramId,
    address: u.address,
    balances: u.balances,
    blocked: u.blocked,
  }));
};

export const getAllActivities = async () => {
  const res = await api.adminActivities(500);
  return res.activities;
};

export const findUserByAddress = async (address: string) => {
  const res = await api.findUserByAddress(address);
  return res.user;
};

export const transferFunds = async (
  senderId: string,
  recipientAddress: string,
  amount: number,
  symbol: string,
  recipientName?: string,
  senderAddress?: string,
  senderName?: string,
  pin?: string
) => {
  return api.transfer({
    senderTelegramId: senderId,
    recipientAddress,
    amount,
    symbol,
    pin,
  });
};

export const getTasks = async () => {
  const res = await api.getTasks();
  return res.tasks;
};

export const getEvents = async () => {
  const res = await api.getEvents();
  return res.events;
};

export const saveTask = async (task: any) => api.adminSaveTask(task);
export const saveEvent = async (event: any) => api.adminSaveEvent(event);
export const deleteTaskDoc = async (id: string) => api.adminDeleteTask(id);
export const deleteEventDoc = async (id: string) => api.adminDeleteEvent(id);

export const getCompletedTasks = async (telegramId: string) => {
  const res = await api.getCompletedTasks(telegramId);
  return res.completed;
};

export const saveCompletedTasks = async (_telegramId: string, _tasks: any) => {};
export const getReferrals = async () => [];
export const saveUser = async () => {};
export const saveWallet = async () => {};
export const saveActivity = async () => {};
