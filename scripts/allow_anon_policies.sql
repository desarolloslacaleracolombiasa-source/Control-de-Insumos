-- WARNING: These policies permit anonymous INSERT/UPDATE on several tables.
-- Use only for testing. Remove or tighten policies for production.

-- Enable RLS and allow anon INSERT/UPDATE on tablas de maestro y transacciones

-- Categorias
ALTER TABLE IF EXISTS public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_categorias
  ON public.categorias FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Proveedores
ALTER TABLE IF EXISTS public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_proveedores
  ON public.proveedores FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Clientes
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_clientes
  ON public.clientes FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Insumos (maestro)
ALTER TABLE IF EXISTS public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_insumos
  ON public.insumos FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Stock
ALTER TABLE IF EXISTS public.stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT_EXISTS allow_anon_upsert_stock
  ON public.stock FOR ALL TO anon USING (true) WITH CHECK (true);

-- Transacciones
ALTER TABLE IF EXISTS public.transacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_transacciones
  ON public.transacciones FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Transaccion items
ALTER TABLE IF EXISTS public.transaccion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_anon_insert_transaccion_items
  ON public.transaccion_items FOR INSERT TO anon USING (true) WITH CHECK (true);

-- Note: If your Postgres version does not support CREATE POLICY IF NOT EXISTS,
-- remove IF NOT EXISTS and run carefully in Supabase SQL editor.
