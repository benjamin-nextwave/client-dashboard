-- Enable Supabase Realtime on inbox tables so the browser can
-- receive live updates when leads/emails are synced.

alter publication supabase_realtime add table synced_leads;
alter publication supabase_realtime add table cached_emails;
