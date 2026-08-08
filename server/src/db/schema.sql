-- UUSD Network MySQL Schema
-- Works on Railway MySQL (database name from MYSQLDATABASE, usually "railway")
-- Do NOT CREATE DATABASE here — Railway already provides the database.

-- Users registry
CREATE TABLE IF NOT EXISTS users (
  telegram_id VARCHAR(64) PRIMARY KEY,
  address VARCHAR(66) NOT NULL UNIQUE,
  first_name VARCHAR(255) NULL,
  username VARCHAR(255) NULL,
  photo_url TEXT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked TINYINT(1) DEFAULT 0,
  INDEX idx_address (address),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallets (balances JSON for multi-token)
CREATE TABLE IF NOT EXISTS wallets (
  telegram_id VARCHAR(64) PRIMARY KEY,
  address VARCHAR(66) NOT NULL UNIQUE,
  available_balance DECIMAL(36,18) DEFAULT 0,
  locked_balance DECIMAL(36,18) DEFAULT 0,
  balances JSON,
  deposit_enabled TINYINT(1) DEFAULT 1,
  blocked TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  INDEX idx_wallet_address (address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity / CEX-style ledger
CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(64) PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL,
  type ENUM('deposit','withdraw','transfer_out','transfer_in','earn','reward','swap') NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  symbol VARCHAR(32) NOT NULL DEFAULT 'UUSD',
  status ENUM('completed','pending','failed') DEFAULT 'completed',
  to_address VARCHAR(66) NULL,
  to_name VARCHAR(255) NULL,
  from_address VARCHAR(66) NULL,
  from_name VARCHAR(255) NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activities_user (telegram_id),
  INDEX idx_activities_time (created_at DESC),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks (admin managed)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  points INT DEFAULT 0,
  reward_amount DECIMAL(36,18) DEFAULT 0,
  reward_symbol VARCHAR(32) DEFAULT 'UUSD',
  type VARCHAR(64) DEFAULT 'social',
  link TEXT NULL,
  platform VARCHAR(64) NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  reward_amount DECIMAL(36,18) DEFAULT 0,
  reward_symbol VARCHAR(32) DEFAULT 'UUSD',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('active','ended','upcoming') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Completed tasks
CREATE TABLE IF NOT EXISTS completed_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL,
  task_id VARCHAR(64) NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  claimed TINYINT(1) DEFAULT 0,
  UNIQUE KEY unique_user_task (telegram_id, task_id),
  INDEX idx_completed_user (telegram_id),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_telegram_id VARCHAR(64) NOT NULL,
  referred_telegram_id VARCHAR(64) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reward_given TINYINT(1) DEFAULT 0,
  INDEX idx_referrer (referrer_telegram_id),
  FOREIGN KEY (referrer_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  FOREIGN KEY (referred_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  telegram_id VARCHAR(64) PRIMARY KEY,
  language VARCHAR(8) DEFAULT 'en',
  currency VARCHAR(8) DEFAULT 'USD',
  notifications TINYINT(1) DEFAULT 1,
  passcode_enabled TINYINT(1) DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PIN security (hashed)
CREATE TABLE IF NOT EXISTS user_security (
  telegram_id VARCHAR(64) PRIMARY KEY,
  pin_hash VARCHAR(128) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Global settings + API keys (JSON blobs)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(64) PRIMARY KEY,
  value JSON NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default global settings (no secrets)
INSERT IGNORE INTO settings (`key`, value) VALUES
  ('global', JSON_OBJECT(
    'depositEnabled', true,
    'withdrawEnabled', true,
    'maintenanceMode', false,
    'minTransferAmount', 0,
    'minWithdrawAmount', 10,
    'withdrawAuto', false,
    'botUsername', 'our_bot',
    'supportUsername', 'support'
  )),
  ('api_keys', JSON_OBJECT(
    'botUsername', '',
    'supportUsername', '',
    'botToken', '',
    'paymentChannel', '',
    'hotWalletAddress', '',
    'twitterBearer', ''
  )),
  ('app_content', JSON_OBJECT(
    'faq', JSON_ARRAY(),
    'news', JSON_ARRAY()
  ));
