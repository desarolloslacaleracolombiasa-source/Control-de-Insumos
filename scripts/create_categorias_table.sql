-- Crear tabla categorias si no existe y poblarla con valores iniciales
CREATE TABLE IF NOT EXISTS public.categorias (
  id VARCHAR(4) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar categorías iniciales (no duplica si ya existen)
INSERT INTO public.categorias (id, nombre)
VALUES
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

-- Opcional: comprobar resultados
-- SELECT * FROM public.categorias ORDER BY id;
