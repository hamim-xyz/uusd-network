/**
 * #AI_ZONE: ROUTES
 * Keep paths in sync with BottomNav and Profile links.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Wallet } from './pages/Wallet';
import { Profile } from './pages/Profile';
import { Withdraw } from './pages/Withdraw';
import { WithdrawCountdown } from './pages/WithdrawCountdown';
import { Deposit } from './pages/Deposit';
import { ScanQR } from './pages/ScanQR';
import { Rewards } from './pages/Rewards';
import { AdminPanel } from './pages/AdminPanel';
import { Referrals } from './pages/Referrals';

import { DeFiAccountFAQ } from './pages/DeFiAccountFAQ';
import { WalletNewsPage } from './pages/WalletNewsPage';
import { Language } from './pages/Language';
import { DefaultCurrency } from './pages/DefaultCurrency';
import { Notifications } from './pages/Notifications';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/withdraw-soon" element={<WithdrawCountdown />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/faq" element={<DeFiAccountFAQ />} />
          <Route path="/news" element={<WalletNewsPage />} />
          <Route path="/language" element={<Language />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/currency" element={<DefaultCurrency />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
