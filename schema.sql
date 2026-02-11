-- Esquema de base de datos para la aplicación de control de insumos.

-- Tabla para las bodegas
CREATE TABLE bodegas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para las categorías de insumos
CREATE TABLE categorias (
  id VARCHAR(4) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los clientes
CREATE TABLE clientes (
  id VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los proveedores
CREATE TABLE proveedores (
  id VARCHAR(3) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los insumos (suministros)
CREATE TABLE insumos (
  sku VARCHAR(255) PRIMARY KEY, -- Formato: proveedorId-categoriaId-insumoId
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

-- Tabla para el stock de insumos por bodega
CREATE TABLE stock (
  id SERIAL PRIMARY KEY,
  insumo_sku VARCHAR(255) NOT NULL REFERENCES insumos(sku) ON DELETE CASCADE,
  bodega_id INT NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(insumo_sku, bodega_id)
);

-- Tabla para el historial de transacciones
CREATE TABLE transacciones (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(50) NOT NULL, -- 'CREACIÓN', 'INGRESO', 'EDICIÓN', 'CONSUMO', 'TRASLADO'
  detalle TEXT,
  observaciones TEXT,
  nota_siigo VARCHAR(255),
  bodega_origen_id INT REFERENCES bodegas(id),
  bodega_destino_id INT REFERENCES bodegas(id),
  cliente_id VARCHAR(3) REFERENCES clientes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para los items de una transacción
CREATE TABLE transaccion_items (
  id SERIAL PRIMARY KEY,
  transaccion_id INT NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
  insumo_sku VARCHAR(255) NOT NULL REFERENCES insumos(sku),
  cantidad NUMERIC NOT NULL
);

-- Insertar datos iniciales que están en la aplicación
INSERT INTO bodegas (id, nombre, principal) VALUES
(1, 'Terrapuerto', true),
(2, 'Bogota Plaza', false),
(3, 'Medellin', false),
(4, 'Barranquilla', false);

INSERT INTO categorias (id, nombre) VALUES
('0001', 'BANDEJAS'),
('0002', 'BOLSAS'),
('0003', 'CAJAS'),
('0004', 'CINTA'),
('0005', 'ESTUCHES'),
('0006', 'ETIQUETAS'),
('0007', 'MALLA ESPAÑOLA'),
('0008', 'VINIPEL'),
('0009', 'KIT EMPAQUE');

INSERT INTO clientes (id, nombre) VALUES
('001', 'Cliente General');

INSERT INTO proveedores (id, nombre) VALUES
('001', 'Proveedor General');

-- Función para actualizar el campo updated_at en la tabla de stock
CREATE OR REPLACE FUNCTION update_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para la tabla de stock
CREATE TRIGGER update_stock_modtime
BEFORE UPDATE ON stock
FOR EACH ROW
EXECUTE FUNCTION update_stock_updated_at();
