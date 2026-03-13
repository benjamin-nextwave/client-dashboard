-- Add refresh_lock_until column for idempotent webhook refresh
ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS refresh_lock_until timestamptz DEFAULT NULL;
