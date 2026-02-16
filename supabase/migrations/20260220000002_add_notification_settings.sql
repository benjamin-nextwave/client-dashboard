-- Add notification settings to clients table
ALTER TABLE clients
  ADD COLUMN notification_email TEXT,
  ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN clients.notification_email IS 'Email address to receive lead notifications. NULL defaults to user login email at runtime.';
COMMENT ON COLUMN clients.notifications_enabled IS 'Whether lead notifications are enabled for this client.';
