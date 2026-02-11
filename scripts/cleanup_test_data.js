import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrlaxrafygkxwgfjmdpv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybGF4cmFmeWdreHdnZmptZHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDY5MzgsImV4cCI6MjA4NjMyMjkzOH0.nVK1q6vwkTcNkg0g3WyIhcVLsCr885ccc-WuOm32-iM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runCleanup() {
  const skus = ['001-0001-000100', '001-0001-000200'];
  const detalles = ['Creación de prueba automática', 'Ingreso de prueba adicional'];
  try {
    console.log('Borrando transaccion_items para skus:', skus);
    const { error: itemsErr } = await supabase.from('transaccion_items').delete().in('insumo_sku', skus);
    if (itemsErr) throw itemsErr;

    console.log('Borrando transacciones con detalle de prueba');
    const { error: transErr } = await supabase.from('transacciones').delete().in('detalle', detalles);
    if (transErr) throw transErr;

    console.log('Borrando registros de stock para skus');
    const { error: stockErr } = await supabase.from('stock').delete().in('insumo_sku', skus);
    if (stockErr) throw stockErr;

    console.log('Borrando insumos de prueba');
    const { error: insErr } = await supabase.from('insumos').delete().in('sku', skus);
    if (insErr) throw insErr;

    console.log('Limpieza completada correctamente.');
  } catch (e) {
    console.error('Error limpiando datos de prueba:', e);
    process.exit(1);
  }
}

runCleanup();
