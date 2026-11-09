-- 24Adz.com client accounts, monthly free-ad tracking, coin wallet and payment requests.
-- Additive only: existing ads, admin data, categories, districts and R2 objects remain untouched.
-- A separate account table is intentional: multiple email accounts may share one mobile number.
-- The mobile column is indexed but NOT unique so the shared monthly quota can be enforced across accounts.
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  mobile TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_accounts_mobile ON client_accounts(mobile);
ALTER TABLE ads ADD COLUMN owner_email TEXT;
ALTER TABLE ads ADD COLUMN owner_client_id TEXT;
ALTER TABLE ads ADD COLUMN model_year INTEGER;
ALTER TABLE ads ADD COLUMN expires_at TEXT;
ALTER TABLE ads ADD COLUMN is_vip INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ad_owners ADD COLUMN owner_email TEXT;
ALTER TABLE chat_messages ADD COLUMN sender_client_id TEXT;
ALTER TABLE chat_messages ADD COLUMN receiver_client_id TEXT;
CREATE TABLE IF NOT EXISTS client_coin_wallets (
  client_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS coin_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('admin_credit','vip_debit','admin_debit','refund')),
  coins INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  note TEXT DEFAULT '',
  admin_reference TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_client ON coin_transactions(client_id,created_at DESC);
CREATE TABLE IF NOT EXISTS coin_purchase_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  email TEXT NOT NULL,
  coins INTEGER NOT NULL CHECK(coins IN (1000,2000,3000,4000,5000)),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coin_requests_status ON coin_purchase_requests(status,created_at DESC);
CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ads_owner_email ON ads(owner_email,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_phone_month ON ads(phone,created_at);
