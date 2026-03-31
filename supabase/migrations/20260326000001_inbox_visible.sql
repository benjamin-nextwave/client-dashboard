-- Toggle om de E-mail inbox pagina te verbergen/tonen per klant
ALTER TABLE clients ADD COLUMN inbox_visible BOOLEAN DEFAULT false;

-- Klanten die al een inbox_url hebben, zet inbox_visible op true
UPDATE clients SET inbox_visible = true WHERE inbox_url IS NOT NULL;
