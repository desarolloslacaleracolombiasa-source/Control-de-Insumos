-- Trigger para restaurar stock automáticamente al borrar un consumo
-- Ajusta los nombres de las columnas si tu esquema es diferente

CREATE OR REPLACE FUNCTION restaurar_stock_consumo()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplica si la transacción es de tipo 'CONSUMO'
  IF (SELECT tipo FROM transacciones WHERE id = OLD.transaccion_id) = 'CONSUMO' THEN
    UPDATE stock
    SET cantidad = cantidad + OLD.cantidad
    WHERE insumo_sku = OLD.insumo_sku
      AND bodega_id = (SELECT bodega_origen_id FROM transacciones WHERE id = OLD.transaccion_id);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restaurar_stock_consumo ON transaccion_items;
CREATE TRIGGER trigger_restaurar_stock_consumo
AFTER DELETE ON transaccion_items
FOR EACH ROW
EXECUTE FUNCTION restaurar_stock_consumo();
