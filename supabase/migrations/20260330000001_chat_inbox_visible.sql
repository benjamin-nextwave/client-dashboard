-- Add toggle to show/hide the "Inbox" (chat) tab per client
ALTER TABLE clients ADD COLUMN chat_inbox_visible BOOLEAN DEFAULT true;

-- Default to true for all existing clients (Inbox was always visible before)
UPDATE clients SET chat_inbox_visible = true;
