-- Supabase Auth is the source of truth for client credentials and email verification.
-- D1 keeps the 24Adz client profile, wallet, ads ownership and chat relationships.
ALTER TABLE client_accounts ADD COLUMN supabase_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_accounts_supabase_uid
  ON client_accounts(supabase_uid)
  WHERE supabase_uid IS NOT NULL;
