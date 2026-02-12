import React, { useRef, useState } from 'react';
import { supabase } from './supabaseClient';

export default function CargaMasivaConsumos({ clientes, insumos, bodegaId, onFinish }) {
	const fileInput = useRef();
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState([]);

	// Espera un CSV con columnas: fecha,cliente_id,sku,cantidad,unidad,observaciones
	const handleFile = async (e) => {
		setResult(null);
		setErrors([]);
		setLoading(true);
		const file = e.target.files[0];
		if (!file) return;
		const text = await file.text();
		const lines = text.split(/\r?\n/).filter(Boolean);
		if (lines.length < 2) {
			setErrors(['El archivo debe tener encabezado y al menos una fila de datos.']);
			setLoading(false);
			return;
		}
		const header = lines[0].split(',').map(h => h.trim().toLowerCase());
		const required = ['fecha','cliente_id','sku','cantidad'];
		for (const r of required) {
			if (!header.includes(r)) {
				setErrors([`Falta columna obligatoria: ${r}`]);
				setLoading(false);
				return;
			}
		}
		const idx = k => header.indexOf(k);
		const rows = lines.slice(1).map(l => l.split(',').map(x => x.trim()));
		let ok = 0, fail = 0, failRows = [];
		for (const [i, row] of rows.entries()) {
			if (row.length < header.length) continue;
			const fecha = row[idx('fecha')];
			const cliente_id = row[idx('cliente_id')];
			const sku = row[idx('sku')];
			const cantidad = parseFloat(row[idx('cantidad')]);
			const unidad = idx('unidad') >= 0 ? row[idx('unidad')] : '';
			const observaciones = idx('observaciones') >= 0 ? row[idx('observaciones')] : '';
			// Validaciones básicas
			if (!fecha || !cliente_id || !sku || isNaN(cantidad)) {
				fail++;
				failRows.push(`Fila ${i+2}: datos incompletos`);
				continue;
			}
			if (!clientes.some(c => c.id === cliente_id)) {
				fail++;
				failRows.push(`Fila ${i+2}: cliente no existe (${cliente_id})`);
				continue;
			}
			if (!insumos.some(i => i.sku === sku)) {
				fail++;
				failRows.push(`Fila ${i+2}: SKU no existe (${sku})`);
				continue;
			}
			// Registrar consumo
			try {
				const { data: transaccion, error } = await supabase.from('transacciones').insert({
					tipo: 'CONSUMO',
					detalle: `Carga masiva archivo plano`,
					observaciones,
					bodega_origen_id: bodegaId,
					cliente_id,
					fecha,
				}).select().single();
				if (error) throw error;
				// Insertar item
				const { error: err3 } = await supabase.from('transaccion_items').insert({
					transaccion_id: transaccion.id,
					insumo_sku: sku,
					cantidad
				});
				if (err3) throw err3;
				ok++;
			} catch (e) {
				fail++;
				failRows.push(`Fila ${i+2}: error al guardar (${e.message || e})`);
			}
		}
		setResult({ ok, fail });
		setErrors(failRows);
		setLoading(false);
		if (onFinish) onFinish({ ok, fail, errors: failRows });
	};

	// Función para descargar archivo guía
	const handleDownloadGuia = () => {
		const headers = ['fecha','sku','cantidad','cliente_id'];
		const example = [
			{ fecha: '2026-02-12', sku: '001-0001-000001', cantidad: '10', cliente_id: '001' },
			{ fecha: '2026-02-12', sku: '001-0001-000002', cantidad: '5', cliente_id: '002' }
		];
		const csv = [headers.join(','), ...example.map(r => headers.map(h => r[h]).join(','))].join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'guia_carga_consumos.csv';
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="bg-white p-6 rounded-xl shadow border max-w-xl mx-auto mt-8">
			<h3 className="text-lg font-bold mb-2">Carga Masiva de Consumos</h3>
			<p className="text-sm mb-4">Sube un archivo CSV con columnas: <b>fecha, cliente_id, sku, cantidad, unidad, observaciones</b>.<br/>Ejemplo: <code>2026-01-01,001,001-0001-000100,5,unidad,Consumo inicial</code></p>
			<div className="mb-2 flex gap-2">
				<input type="file" accept=".csv" onChange={handleFile} className="mb-4" />
				<button onClick={handleDownloadGuia} className="bg-blue-600 text-white px-3 py-2 rounded text-xs">Descargar Excel Guía</button>
			</div>
			{loading && <div className="text-emerald-600 font-bold">Procesando archivo...</div>}
			{result && <div className="mt-2 text-sm">Registros exitosos: <b>{result.ok}</b> — Fallidos: <b>{result.fail}</b></div>}
			{errors.length > 0 && <div className="mt-2 text-rose-600 text-xs"><ul>{errors.map((e,i) => <li key={i}>{e}</li>)}</ul></div>}
		</div>
	);
}

