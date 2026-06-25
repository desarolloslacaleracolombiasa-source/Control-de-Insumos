-- Migration: Add NIT column to clientes table and enable UPDATE policy
-- Run this in Supabase SQL Editor

-- Step 1: Add NIT column if it doesn't exist
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS nit VARCHAR(9);

-- Step 2: Enable RLS on clientes table
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS allow_anon_select_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_insert_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_update_clientes ON public.clientes;

-- Step 4: Create new policies
CREATE POLICY allow_anon_select_clientes
  ON public.clientes FOR SELECT TO anon USING (true);

CREATE POLICY allow_anon_insert_clientes
  ON public.clientes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY allow_anon_update_clientes
  ON public.clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Test: Try to update a client with NIT
-- SELECT * FROM clientes LIMIT 1;

