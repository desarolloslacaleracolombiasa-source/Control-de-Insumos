import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrlaxrafygkxwgfjmdpv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybGF4cmFmeWdreHdnZmptZHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDY5MzgsImV4cCI6MjA4NjMyMjkzOH0.nVK1q6vwkTcNkg0g3WyIhcVLsCr885ccc-WuOm32-iM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  try {
    console.log('Insertando proveedor de prueba y luego insumos...');
    // Asegurar que el proveedor existe para evitar violación FK
    const { error: provErr } = await supabase.from('proveedores').upsert({ id: '001', nombre: 'Proveedor 001' }, { onConflict: 'id' }).select();
    if (provErr) throw provErr;
    const insumos = [
      {
        sku: '001-0001-000100', proveedor_id: '001', categoria_id: '0001', insumo_id: '000100',
        nombre: 'PRUEBA Rollo Vinipel 100m', unidad_principal: 'Rollo', cantidad_principal: 1,
        unidad_secundaria: 'm', factor_conversion: 100, stock_minimo: 5
      },
      {
        sku: '001-0001-000200', proveedor_id: '001', categoria_id: '0001', insumo_id: '000200',
        nombre: 'PRUEBA Bolsa Plástica', unidad_principal: 'Bolsa', cantidad_principal: 1,
        unidad_secundaria: 'unidad', factor_conversion: 1, stock_minimo: 10
      }
    ];

    const { data: upserted, error: upsertErr } = await supabase.from('insumos').upsert(insumos, { onConflict: 'sku' }).select();
    if (upsertErr) throw upsertErr;
    console.log('Insumos upserted:', upserted.map(i => i.sku));

    // Crear transacción CREACIÓN con ambos insumos
    const { data: transCreacion, error: creErr } = await supabase.from('transacciones').insert({
      tipo: 'CREACIÓN', detalle: 'Creación de prueba automática', observaciones: 'Seed test', nota_siigo: '', bodega_origen_id: null, bodega_destino_id: 1, cliente_id: null
    }).select().maybeSingle();
    if (creErr) throw creErr;

    const itemsCre = [
      { transaccion_id: transCreacion.id, insumo_sku: '001-0001-000100', cantidad: 20 },
      { transaccion_id: transCreacion.id, insumo_sku: '001-0001-000200', cantidad: 50 }
    ];
    const { error: itemsCreErr } = await supabase.from('transaccion_items').insert(itemsCre);
    if (itemsCreErr) throw itemsCreErr;

    // Upsert stock for destination bodega
    const stockUpserts = [
      { insumo_sku: '001-0001-000100', bodega_id: 1, cantidad: 20 },
      { insumo_sku: '001-0001-000200', bodega_id: 1, cantidad: 50 }
    ];
    const { error: stockErr } = await supabase.from('stock').upsert(stockUpserts, { onConflict: 'insumo_sku,bodega_id' });
    if (stockErr) throw stockErr;

    console.log('Creación de prueba insertada con id:', transCreacion.id);

    // Insertar un INGRESO adicional
    const { data: transIngreso, error: ingErr } = await supabase.from('transacciones').insert({
      tipo: 'INGRESO', detalle: 'Ingreso de prueba adicional', observaciones: 'Seed ingreso', nota_siigo: '', bodega_origen_id: null, bodega_destino_id: 1, cliente_id: null
    }).select().maybeSingle();
    if (ingErr) throw ingErr;

    const itemsIng = [ { transaccion_id: transIngreso.id, insumo_sku: '001-0001-000100', cantidad: 5 } ];
    const { error: itemsIngErr } = await supabase.from('transaccion_items').insert(itemsIng);
    if (itemsIngErr) throw itemsIngErr;

    // Actualizar stock
    const { data: currentStock, error: curStockErr } = await supabase.from('stock').select('*').eq('insumo_sku', '001-0001-000100').eq('bodega_id', 1).maybeSingle();
    if (curStockErr) throw curStockErr;
    const newQty = (currentStock ? currentStock.cantidad : 0) + 5;
    const { error: upStockErr } = await supabase.from('stock').upsert({ insumo_sku: '001-0001-000100', bodega_id: 1, cantidad: newQty }, { onConflict: 'insumo_sku,bodega_id' });
    if (upStockErr) throw upStockErr;

    console.log('Ingreso de prueba insertado con id:', transIngreso.id);
    console.log('Scripts finalizado correctamente.');
  } catch (e) {
    console.error('Error en script de prueba:', e);
    process.exit(1);
  }
}

run();
