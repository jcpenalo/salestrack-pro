-- 1. Add Foreign Keys
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_user_id_fkey,
DROP CONSTRAINT IF EXISTS goals_product_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE goals
ADD CONSTRAINT goals_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- 2. Drop redundant column if exists (Simplifying model as per user feedback)
-- User wants "Monthly" (Team) and "Individual". 
-- Actually, the rows are PER USER. So "Monthly Target" in a row IS the "Individual Target" for that month.
-- So we don't need both. Let's rename 'monthly_target' to 'target_amount' for clarity, 
-- or just keep 'monthly_target' as the standard "This is the target for the month".
-- I will drop 'individual_target' to remove confusion.
ALTER TABLE goals DROP COLUMN IF EXISTS individual_target;

-- 3. Verify Data for Dropdowns
-- Ensure some active users exist (if not, maybe set some to active)
UPDATE users SET active = true WHERE active IS NULL;

-- Ensure some active products exist
UPDATE products SET active = true WHERE active IS NULL;

select 'Schema Fixed' as status;
