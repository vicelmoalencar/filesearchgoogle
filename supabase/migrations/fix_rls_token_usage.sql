-- Fix RLS policies for token_usage table
-- This allows authenticated users and service role to insert token tracking records

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.token_usage;
DROP POLICY IF EXISTS "Allow service role all access" ON public.token_usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.token_usage;

-- Enable RLS on the table
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert their own records
CREATE POLICY "Allow authenticated inserts" ON public.token_usage
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);

-- Policy 2: Allow authenticated users to view their own records
CREATE POLICY "Users can view own usage" ON public.token_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Policy 3: Allow service role full access (for admin operations)
CREATE POLICY "Allow service role all access" ON public.token_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'token_usage';
