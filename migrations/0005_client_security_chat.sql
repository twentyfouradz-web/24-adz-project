-- Client security, email verification/reset tokens, API rate limiting and admin/client chat.
ALTER TABLE client_accounts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE client_accounts ADD COLUMN updated_at TEXT;
CREATE TABLE IF NOT EXISTS email_action_tokens (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL CHECK(action IN ('verify_email','password_reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_action_client ON email_action_tokens(client_id, action, expires_at);
CREATE TABLE IF NOT EXISTS api_rate_limits (
  rate_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_api_rate_updated ON api_rate_limits(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_sender_client ON chat_messages(sender_client_id,id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver_client ON chat_messages(receiver_client_id,id);
