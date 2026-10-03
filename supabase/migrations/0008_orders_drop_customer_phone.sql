-- The order form no longer asks for a phone number: collection orders are
-- called out by name at the counter, and the receipt goes by email. Dropping
-- the column rather than nulling it keeps us from holding a contact detail we
-- have stopped using.
--
-- Idempotent: safe to run on a database where 0003 has not been applied yet.
alter table if exists public.orders drop column if exists customer_phone;
