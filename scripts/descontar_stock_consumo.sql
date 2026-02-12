-- Trigger para descontar stock automáticamente al registrar un consumo
-- Ajusta los nombres de las columnas si tu esquema es diferente

CREATE OR REPLACE FUNCTION descontar_stock_consumo()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplica si la transacción es de tipo 'CONSUMO'
  IF (SELECT tipo FROM transacciones WHERE id = NEW.transaccion_id) = 'CONSUMO' THEN
    UPDATE stock
    SET cantidad = cantidad - NEW.cantidad
    WHERE insumo_sku = NEW.insumo_sku
      AND bodega_id = (SELECT bodega_origen_id FROM transacciones WHERE id = NEW.transaccion_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descontar_stock_consumo ON transaccion_items;
CREATE TRIGGER trigger_descontar_stock_consumo
AFTER INSERT ON transaccion_items
FOR EACH ROW
EXECUTE FUNCTION descontar_stock_consumo();
