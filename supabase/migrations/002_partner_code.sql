-- ============================================================
-- Migration 002: Auto-generated partner_code
-- Adds a unique sequential code per partner_type on INSERT
-- e.g. CLT-0001 for clients, SUP-0001 for suppliers, CUS-0001 for customers
-- ============================================================

ALTER TABLE partner
  ADD COLUMN IF NOT EXISTS partner_code VARCHAR(20) UNIQUE;

CREATE OR REPLACE FUNCTION generate_partner_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix     TEXT;
  next_seq   INT;
BEGIN
  prefix := CASE NEW.partner_type
    WHEN 'c' THEN 'CLT'
    WHEN 's' THEN 'SUP'
    WHEN 'u' THEN 'CUS'
    ELSE 'PTR'
  END;

  SELECT COUNT(*) + 1
    INTO next_seq
    FROM partner
   WHERE partner_type = NEW.partner_type;

  NEW.partner_code := prefix || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_code
  BEFORE INSERT ON partner
  FOR EACH ROW
  WHEN (NEW.partner_code IS NULL)
  EXECUTE FUNCTION generate_partner_code();
