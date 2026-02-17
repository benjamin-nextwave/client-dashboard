-- Add password column to clients table so operators can look up credentials
ALTER TABLE public.clients ADD COLUMN password TEXT;
