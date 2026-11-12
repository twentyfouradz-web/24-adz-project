-- Client-to-client chat block / unblock controls.
CREATE TABLE IF NOT EXISTS client_chat_blocks (
  blocker_client_id TEXT NOT NULL,
  blocked_client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_client_id, blocked_client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_chat_blocks_blocked ON client_chat_blocks(blocked_client_id);
