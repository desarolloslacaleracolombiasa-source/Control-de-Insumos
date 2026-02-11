-- Inicializador para Supabase: crea tablas, seed y políticas RLS para DESARROLLO
BEGIN;

-- TABLAS (si no existen)
CREATE TABLE IF NOT EXISTS bodegas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
  id VARCHAR(4) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insumos (
  sku VARCHAR(255) PRIMARY KEY,
  proveedor_id VARCHAR(3) NOT NULL REFERENCES proveedores(id),
  categoria_id VARCHAR(4) NOT NULL REFERENCES categorias(id),
  insumo_id VARCHAR(6) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  unidad_principal VARCHAR(50),
  cantidad_principal NUMERIC,
  unidad_secundaria VARCHAR(50),
  factor_conversion NUMERIC,
  stock_minimo NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proveedor_id, categoria_id, insumo_id)
);

CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  insumo_sku VARCHAR(255) NOT NULL REFERENCES insumos(sku) ON DELETE CASCADE,
  bodega_id INT NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(insumo_sku, bodega_id)
);

CREATE TABLE IF NOT EXISTS transacciones (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(50) NOT NULL,
  detalle TEXT,
  observaciones TEXT,
  nota_siigo VARCHAR(255),
  bodega_origen_id INT REFERENCES bodegas(id),
  bodega_destino_id INT REFERENCES bodegas(id),
  cliente_id VARCHAR(3) REFERENCES clientes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaccion_items (
  id SERIAL PRIMARY KEY,
  transaccion_id INT NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
  insumo_sku VARCHAR(255) NOT NULL REFERENCES insumos(sku),
  cantidad NUMERIC NOT NULL
);

-- SEED inicial (no duplicar)
INSERT INTO bodegas (id, nombre, principal) VALUES
(1, 'Terrapuerto', true),
(2, 'Bogota Plaza', false),
(3, 'Medellin', false),
(4, 'Barranquilla', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categorias (id, nombre) VALUES
('0001', 'BANDEJAS'),
('0002', 'BOLSAS'),
('0003', 'CAJAS'),
('0004', 'CINTA'),
('0005', 'ESTUCHES'),
('0006', 'ETIQUETAS'),
('0007', 'MALLA ESPAÑOLA'),
('0008', 'VINIPEL'),
('0009', 'KIT EMPAQUE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clientes (id, nombre) VALUES
('001', 'Cliente General')
ON CONFLICT (id) DO NOTHING;

INSERT INTO proveedores (id, nombre) VALUES
('001', 'Proveedor General')
ON CONFLICT (id) DO NOTHING;

-- Función y trigger para stock.updated_at
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_stock_modtime ON stock;
CREATE TRIGGER update_stock_modtime
BEFORE UPDATE ON stock
FOR EACH ROW
EXECUTE FUNCTION update_stock_updated_at();

-- POLÍTICAS RLS (DESARROLLO) - CORREGIDAS
ALTER TABLE IF EXISTS public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_insert_categorias ON public.categorias;
CREATE POLICY allow_anon_insert_categorias
  ON public.categorias FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS allow_anon_select_categorias ON public.categorias;
CREATE POLICY allow_anon_select_categorias
  ON public.categorias FOR SELECT TO anon USING (true);

ALTER TABLE IF EXISTS public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_insert_proveedores ON public.proveedores;
CREATE POLICY allow_anon_insert_proveedores
  ON public.proveedores FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS allow_anon_select_proveedores ON public.proveedores;
CREATE POLICY allow_anon_select_proveedores
  ON public.proveedores FOR SELECT TO anon USING (true);

ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_insert_clientes ON public.clientes;
CREATE POLICY allow_anon_insert_clientes
  ON public.clientes FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS allow_anon_select_clientes ON public.clientes;
CREATE POLICY allow_anon_select_clientes
  ON public.clientes FOR SELECT TO anon USING (true);

ALTER TABLE IF EXISTS public.insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_insert_insumos ON public.insumos;
CREATE POLICY allow_anon_insert_insumos
  ON public.insumos FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS allow_anon_select_insumos ON public.insumos;
CREATE POLICY allow_anon_select_insumos
  ON public.insumos FOR SELECT TO anon USING (true);

ALTER TABLE IF EXISTS public.stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_select_stock ON public.stock;
CREATE POLICY allow_anon_select_stock
  ON public.stock FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS allow_anon_insert_stock ON public.stock;
CREATE POLICY allow_anon_insert_stock
  ON public.stock FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS allow_anon_update_stock ON public.stock;
CREATE POLICY allow_anon_update_stock
  ON public.stock FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.transacciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_select_transacciones ON public.transacciones;
CREATE POLICY allow_anon_select_transacciones
  ON public.transacciones FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS allow_anon_insert_transacciones ON public.transacciones;
CREATE POLICY allow_anon_insert_transacciones
  ON public.transacciones FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE IF EXISTS public.transaccion_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_select_transaccion_items ON public.transaccion_items;
CREATE POLICY allow_anon_select_transaccion_items
  ON public.transaccion_items FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS allow_anon_insert_transaccion_items ON public.transaccion_items;
CREATE POLICY allow_anon_insert_transaccion_items
  ON public.transaccion_items FOR INSERT TO anon WITH CHECK (true);

COMMIT;
