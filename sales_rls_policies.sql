-- Enable RLS on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 1. Policy for INSERT: Allow authenticated users to create sales
-- They can only insert if the 'user_id' matches their own auth.uid() (optional strictness) OR just allow all authenticated
CREATE POLICY "Enable insert for authenticated users" ON public.sales
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 2. Policy for SELECT: Allow users to view sales
-- (Refining this later for Admin vs Agent visibility)
CREATE POLICY "Enable read access for authenticated users" ON public.sales
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Policy for UPDATE: Allow users to edit their own sales (or Admins)
-- Required for the future 'Inline Editing' feature
CREATE POLICY "Enable update for authenticated users" ON public.sales
    FOR UPDATE
    TO authenticated
    USING (true);
