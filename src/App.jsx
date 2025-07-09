import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LogIn, User, Building, PlusCircle, Edit, Bell, Download, Lock, Paperclip, Send, XCircle, UploadCloud, ChevronsLeft, ChevronsRight, UserPlus, DownloadCloud, TrendingUp, KeyRound, AlertTriangle, ShieldCheck, FileText, FileImage, Home, CheckCircle, Trash2, Printer } from 'lucide-react';
import { supabase } from './supabaseClient.js';

// --- DATOS INICIALES (EN CEROS) ---


const initialCuentasContables = [];
const initialTiposGasto = [];
const initialTerceros = [];
const initialMovimientos = [];
const initialIngresos = [];
const initialSolicitudes = [];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- Componentes ---
const AlertModal = ({isOpen, onClose, title, message, type = 'warning'}) => { if(!isOpen) return null; const colors = { warning: { border: 'border-yellow-400', icon: <AlertTriangle className="text-yellow-400 mb-4" size={48}/>, button: 'bg-yellow-500 hover:bg-yellow-600' }, success: { border: 'border-green-400', icon: <CheckCircle className="text-green-400 mb-4" size={48}/>, button: 'bg-green-500 hover:bg-green-600' }, error: { border: 'border-red-400', icon: <XCircle className="text-red-400 mb-4" size={48}/>, button: 'bg-red-500 hover:bg-red-600' }, }; const selectedColor = colors[type] || colors.warning;
    return ( <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4"> <div className={`bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border-t-4 ${selectedColor.border}`}> <div className="flex flex-col items-center text-center"> {selectedColor.icon} <h2 className="text-2xl font-bold text-white mb-2">{title}</h2> <p className="text-gray-300 mb-6 whitespace-pre-wrap">{message}</p> <button onClick={onClose} className={`${selectedColor.button} text-white font-bold py-2 px-8 rounded-lg transition-colors`}>Entendido</button> </div> </div> </div> ); 
};
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[101] flex justify-center items-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm border-t-4 border-yellow-500">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="text-yellow-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <div className="flex justify-center space-x-4 w-full">
            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-8 rounded-lg transition-colors w-1/2">
              Cancelar
            </button>
            <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-lg transition-colors w-1/2">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
const Header = ({ currentUser, onLogout }) => ( <header className="bg-sky-950 p-4 text-white flex justify-between items-center shadow-lg sticky top-0 z-40"> <div className="flex items-center space-x-3"><Building className="text-teal-400" /><h1 className="text-xl font-bold">La Calera Colombia SA - Gastos de Caja</h1></div> <div className="flex items-center space-x-4"> <span className="text-sm">Usuario: <span className="font-semibold">{currentUser.id_usuario}</span></span> <button onClick={onLogout} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"><LogIn className="transform rotate-180" size={18} /><span>Salir</span></button> </div> </header> );

const GastoModal = ({ isOpen, onClose, sedeId, terceros, handleAnadirMovimiento, tiposGasto, cuentasContables }) => {
  if (!isOpen) return null;
  const [loading, setLoading] = useState(true);
  const [tipoGasto, setTipoGasto] = useState('');
  const [cuentaContable, setCuentaContable] = useState('');
  const [tercero, setTercero] = useState('');
  const [detalle, setDetalle] = useState('');
  const [valor, setValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaGasto, setFechaGasto] = useState(new Date().toISOString().split('T')[0]);
  const [alertInfo, setAlertInfo] = useState({isOpen: false, message:''});

  const handleTipoGastoChange = (e) => {
    const selectedTipoId = e.target.value;
    setTipoGasto(selectedTipoId);
    const tipo = tiposGasto.find(t => t.id === parseInt(selectedTipoId));
    if (tipo) {
      const cuenta = cuentasContables.find(c => c.id === tipo.id_cuenta);
      setCuentaContable(cuenta ? cuenta.numero : '');
    } else { setCuentaContable(''); }
  };

  const handleSubmit = (e) => {
      e.preventDefault();
      let missingField = '';
      if (!fechaGasto) missingField = 'Fecha del Gasto';
      else if (!tipoGasto) missingField = 'Tipo de Gasto';
      else if (!tercero) missingField = 'Tercero';
      else if (!detalle) missingField = 'Detalle';
      else if (!valor) missingField = 'Valor';
      if (missingField) {
          setAlertInfo({isOpen: true, message: `El campo "${missingField}" es obligatorio.`});
          return;
      }
      const nuevoMovimiento = {
          id_sede: sedeId,
          id_tipo_gasto: parseInt(tipoGasto),
          id_tercero: parseInt(tercero),
          detalle: detalle,
          valor: parseFloat(valor),
          observaciones: observaciones,
          fecha_gasto: fechaGasto,
      };
      handleAnadirMovimiento(nuevoMovimiento);
      onClose();
  }

  const sedeTerceros = terceros.filter(t => t.id_sede_creacion === sedeId);
  const sedeTiposGasto = tiposGasto.filter(t => t.id_sede === sedeId);

  return (
    <>
      <AlertModal isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({isOpen: false, message: ''})} title="Campo Requerido" message={alertInfo.message} />
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl border-t-4 border-red-500">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Registrar Nuevo Gasto</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div><label className="block text-red-300 text-sm font-bold mb-2">Fecha del Gasto</label><input type="date" value={fechaGasto} onChange={e => setFechaGasto(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-red-300 text-sm font-bold mb-2">Tipo de Gasto</label><select onChange={handleTipoGastoChange} value={tipoGasto} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">Seleccione...</option>{sedeTiposGasto.map(tg => <option key={tg.id} value={tg.id}>{tg.nombre}</option>)}</select></div>
              <div><label className="block text-red-300 text-sm font-bold mb-2">Cuenta Contable</label><input type="text" readOnly value={cuentaContable} className="w-full bg-gray-900 text-gray-400 p-3 rounded-lg border border-gray-600" placeholder="Se autocompleta..."/></div>
            </div>
            <div><label className="block text-red-300 text-sm font-bold mb-2">Tercero (NIT o CC)</label><select value={tercero} onChange={e => setTercero(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"><option value="">Seleccione...</option>{sedeTerceros.map(t => <option key={t.id} value={t.id}>{t.nombre} - {t.nit_cc}</option>)}</select></div>
            <div><label className="block text-red-300 text-sm font-bold mb-2">Detalle del Gasto</label><input type="text" value={detalle} onChange={e => setDetalle(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500" /></div>
            <div><label className="block text-red-300 text-sm font-bold mb-2">Valor</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500" /></div>
            <div><label className="block text-red-300 text-sm font-bold mb-2">Observaciones</label><textarea rows="2" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"></textarea></div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancelar</button><button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Guardar Gasto</button></div>
          </form>
        </div>
      </div>
    </>
  );
};
const IngresoModal = ({ isOpen, onClose, sedeId, handleAnadirIngreso }) => { if(!isOpen) return null; const [concepto, setConcepto] = useState(''); const [valor, setValor] = useState(''); const [observaciones, setObservaciones] = useState(''); const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]); const [alertInfo, setAlertInfo] = useState({isOpen: false, message:''}); const handleSubmit = (e) => { e.preventDefault(); if(!fechaIngreso) {setAlertInfo({isOpen: true, message: "El campo 'Fecha de Ingreso' es obligatorio."}); return;} if(!concepto) {setAlertInfo({isOpen: true, message: "El campo 'Concepto' es obligatorio."}); return;} if(!valor) {setAlertInfo({isOpen: true, message: "El campo 'Valor' es obligatorio."}); return;} const nuevoIngreso = { id_sede: sedeId, concepto, valor: parseFloat(valor), observaciones, fecha_ingreso: fechaIngreso, }; handleAnadirIngreso(nuevoIngreso); onClose(); }
  return ( <> <AlertModal isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({isOpen: false, message: ''})} title="Campo Requerido" message={alertInfo.message} /> <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"> <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-green-500"> <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Registrar Ingreso / Reintegro</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div> <form onSubmit={handleSubmit} className="space-y-4"> <div><label className="block text-green-300 text-sm font-bold mb-2">Fecha del Ingreso</label><input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" /></div> <div><label className="block text-green-300 text-sm font-bold mb-2">Concepto</label><input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" /></div> <div><label className="block text-green-300 text-sm font-bold mb-2">Valor</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" /></div> <div><label className="block text-green-300 text-sm font-bold mb-2">Observaciones</label><textarea rows="3" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"></textarea></div> <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancelar</button><button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Guardar Ingreso</button></div> </form> </div> </div> </> ); };

const EditGastoModal = ({ isOpen, onClose, movimiento, handleEditarMovimiento, terceros, tiposGasto, cuentasContables }) => {
  if (!isOpen || !movimiento) return null;
  const [tipoGasto, setTipoGasto] = useState('');
  const [cuentaContable, setCuentaContable] = useState('');
  const [tercero, setTercero] = useState('');
  const [detalle, setDetalle] = useState('');
  const [valor, setValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaGasto, setFechaGasto] = useState('');

  useEffect(() => {
    if (movimiento) {
        setTipoGasto(movimiento.id_tipo_gasto);
        setTercero(movimiento.id_tercero);
        setDetalle(movimiento.detalle);
        setValor(movimiento.valor);
        setObservaciones(movimiento.observaciones);
        setFechaGasto(movimiento.fecha_gasto);
        const tipo = tiposGasto.find(t => t.id === movimiento.id_tipo_gasto);
        if (tipo) {
            const cuenta = cuentasContables.find(c => c.id === tipo.id_cuenta);
            setCuentaContable(cuenta ? cuenta.numero : '');
        }
    }
  }, [movimiento, tiposGasto, cuentasContables]);

  const handleTipoGastoChange = (e) => {
    const selectedTipoId = parseInt(e.target.value);
    setTipoGasto(selectedTipoId);
    const tipo = tiposGasto.find(t => t.id === selectedTipoId);
    if (tipo) {
      const cuenta = cuentasContables.find(c => c.id === tipo.id_cuenta);
      setCuentaContable(cuenta ? cuenta.numero : '');
    } else { setCuentaContable(''); }
  };

  const handleSubmit = (e) => {
      e.preventDefault();
      const movimientoActualizado = { ...movimiento, id_tipo_gasto: tipoGasto, id_tercero: tercero, detalle, valor: parseFloat(valor), observaciones, fecha_gasto: fechaGasto };
      handleEditarMovimiento(movimientoActualizado);
      onClose();
  }

  const sedeTerceros = terceros.filter(t => t.id_sede_creacion === movimiento.id_sede);
  const sedeTiposGasto = tiposGasto.filter(t => t.id_sede === movimiento.id_sede);

  return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl border-t-4 border-orange-500">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Editar Gasto</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div><label className="block text-orange-300 text-sm font-bold mb-2">Fecha del Gasto</label><input type="date" value={fechaGasto} onChange={e => setFechaGasto(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-orange-300 text-sm font-bold mb-2">Tipo de Gasto</label><select onChange={handleTipoGastoChange} value={tipoGasto} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="">Seleccione...</option>{sedeTiposGasto.map(tg => <option key={tg.id} value={tg.id}>{tg.nombre}</option>)}</select></div>
              <div><label className="block text-orange-300 text-sm font-bold mb-2">Cuenta Contable</label><input type="text" readOnly value={cuentaContable} className="w-full bg-gray-900 text-gray-400 p-3 rounded-lg border border-gray-600" placeholder="Se autocompleta..."/></div>
            </div>
            <div><label className="block text-orange-300 text-sm font-bold mb-2">Tercero (NIT o CC)</label><select value={tercero} onChange={e => setTercero(parseInt(e.target.value))} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="">Seleccione...</option>{sedeTerceros.map(t => <option key={t.id} value={t.id}>{t.nombre} - {t.nit_cc}</option>)}</select></div>
            <div><label className="block text-orange-300 text-sm font-bold mb-2">Detalle del Gasto</label><input type="text" value={detalle} onChange={e => setDetalle(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-orange-300 text-sm font-bold mb-2">Valor</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-orange-300 text-sm font-bold mb-2">Observaciones</label><textarea rows="2" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea></div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancelar</button><button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Guardar Cambios</button></div>
          </form>
        </div>
      </div>
  );
};

const EditIngresoModal = ({ isOpen, onClose, ingreso, handleEditarIngreso }) => {
  if (!isOpen || !ingreso) return null;
  const [concepto, setConcepto] = useState('');
  const [valor, setValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');

  useEffect(() => {
    if (ingreso) {
        setConcepto(ingreso.concepto);
        setValor(ingreso.valor);
        setObservaciones(ingreso.observaciones);
        setFechaIngreso(ingreso.fecha_ingreso);
    }
  }, [ingreso]);

  const handleSubmit = (e) => {
      e.preventDefault();
      const ingresoActualizado = { ...ingreso, concepto, valor: parseFloat(valor), observaciones, fecha_ingreso: fechaIngreso };
      handleEditarIngreso(ingresoActualizado);
      onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-orange-500">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Editar Ingreso / Reintegro</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-orange-300 text-sm font-bold mb-2">Fecha del Ingreso</label><input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
          <div><label className="block text-orange-300 text-sm font-bold mb-2">Concepto</label><input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
          <div><label className="block text-orange-300 text-sm font-bold mb-2">Valor</label><input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" /></div>
          <div><label className="block text-orange-300 text-sm font-bold mb-2">Observaciones</label><textarea rows="3" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea></div>
          <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancelar</button><button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Guardar Cambios</button></div>
        </form>
      </div>
    </div>
  );
};

const SolicitudesModal = ({ isOpen, onClose, sedeId, movimientos, handleEnviarSoporte, terceros }) => {
    if (!isOpen) return null;
    const [selectedFiles, setSelectedFiles] = useState({});
    const handleFileSelect = (movId, file) => {
        setSelectedFiles(prev => ({...prev, [movId]: file }));
    };
    const misSolicitudes = movimientos.filter(m => m.id_sede === sedeId && m.soporteRequerido && !m.soporteEnviado);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl border-t-4 border-orange-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center"><Bell className="mr-3 text-orange-400"/>Solicitudes de Soporte</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {misSolicitudes.length > 0 ? misSolicitudes.map(mov => {
                        const tercero = terceros.find(t => t.id === mov.id_tercero);
                        return (
                        <div key={mov.id} className="bg-gray-700 p-4 rounded-lg">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <p className="text-white col-span-3"><span className="font-bold text-teal-300">Item {String(mov.item_sede).padStart(4, '0')}:</span> {mov.detalle}</p>
                                <p className="text-gray-300"><span className="font-semibold">Fecha Gasto:</span> {mov.fecha_gasto}</p>
                                <p className="text-gray-300"><span className="font-semibold">Tercero:</span> {tercero?.nombre || 'N/A'}</p>
                                <p className="text-gray-300"><span className="font-semibold">Valor:</span> ${new Intl.NumberFormat('es-CO').format(mov.valor)}</p>
                            </div>
                            <div className="mt-3 flex items-center space-x-3">
                                <input type="file" accept="image/png, image/jpeg, .pdf, .doc, .docx" onChange={(e) => handleFileSelect(mov.id, e.target.files[0])} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"/>
                                <button onClick={() => handleEnviarSoporte(mov.id, selectedFiles[mov.id])} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"><Send size={16}/><span>Enviar</span></button>
                            </div>
                        </div>
                    )}) : <p className="text-gray-400 text-center py-8">No hay solicitudes pendientes.</p>}
                </div>
            </div>
        </div>
    );
};
const VerSoporteModal = ({ isOpen, onClose, solicitud }) => { if (!isOpen || !solicitud || !solicitud.url_foto) return null; const fileName = solicitud.fileName || `soporte_movimiento_${solicitud.id_movimiento}.png`; const isImage = solicitud.fileType && solicitud.fileType.startsWith('image/'); const isPdf = solicitud.fileType === 'application/pdf';
return ( <div className="fixed inset-0 bg-black bg-opacity-75 z-[101] flex justify-center items-center p-4" onClick={onClose}> <div className="bg-gray-800 p-4 rounded-xl shadow-2xl relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}> <div className="flex justify-between items-center mb-4"> <h3 className="text-lg font-bold text-white">Visor de Soporte</h3> <div className="flex items-center space-x-4"> <a href={solicitud.url_foto} download={fileName} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2"> <DownloadCloud size={20}/> <span>Descargar</span> </a> <button onClick={onClose} className="bg-red-600 text-white rounded-full p-1 hover:bg-red-500 transition-colors"><XCircle size={28}/></button> </div> </div> <div className="bg-black rounded-lg overflow-hidden flex justify-center items-center h-[75vh]"> {isImage ? <img src={solicitud.url_foto} alt="Soporte de gasto" className="max-w-full max-h-full object-contain" /> : isPdf ? <embed src={solicitud.url_foto} type="application/pdf" width="100%" height="100%" /> : <div className="text-center text-white p-10"><FileText size={80} className="mx-auto text-gray-400 mb-4"/><p className="text-xl">No se puede previsualizar este archivo.</p><p className="text-gray-400">{fileName}</p></div>} </div> </div> </div> ); };
const GestionarTercerosModal = ({isOpen, onClose, sedeId, terceros, handleAnadirTercero, handleEditarTercero}) => { 
    if(!isOpen) return null; 
    const [addNit, setAddNit] = useState(''); 
    const [addNombre, setAddNombre] = useState(''); 
    const [addDireccion, setAddDireccion] = useState(''); 
    const [addTelefono, setAddTelefono] = useState(''); 
    const [addCorreo, setAddCorreo] = useState(''); 
    const [editingTercero, setEditingTercero] = useState(null); 
    const [localAlert, setLocalAlert] = useState({ isOpen: false, message: '' });

    const sedeTerceros = terceros.filter(t => t.id_sede_creacion === sedeId); 
    const handleSelectToEdit = (tercero) => { setEditingTercero(JSON.parse(JSON.stringify(tercero))); }; 
    const handleCancelEdit = () => { setEditingTercero(null); }; 
    
    const handleAddSubmit = (e) => { 
        e.preventDefault(); 
        if(!addNit || !addNombre || !addDireccion || !addTelefono) {
            setLocalAlert({ isOpen: true, message: "Debe digitar todos los campos obligatorios." });
            return; 
        } 
        const nuevoTercero = { id: Date.now(), nit_cc: addNit, nombre: addNombre, direccion: addDireccion, telefono: addTelefono, correo: addCorreo, id_sede_creacion: sedeId }; 
        handleAnadirTercero(nuevoTercero); 
        setAddNit(''); setAddNombre(''); setAddDireccion(''); setAddTelefono(''); setAddCorreo(''); 
    }; 
    
    const handleEditSubmit = (e) => { 
        e.preventDefault(); 
        if (!editingTercero.nit_cc || !editingTercero.nombre || !editingTercero.direccion || !editingTercero.telefono) {
             setLocalAlert({ isOpen: true, message: "Debe digitar todos los campos obligatorios." });
            return;
        }
        handleEditarTercero(editingTercero); 
        setEditingTercero(null); 
    }

    return(
    <>
        <AlertModal isOpen={localAlert.isOpen} onClose={() => setLocalAlert({isOpen: false, message: ''})} title="Campos Obligatorios" message={localAlert.message} type="error" />
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl border-t-4 border-sky-500">
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Gestionar Terceros</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div> 
                        {editingTercero ? ( <><h3 className="text-xl text-orange-400 font-semibold mb-4">Editando a {editingTercero.nombre}</h3><form onSubmit={handleEditSubmit} className="space-y-3"> <div><label className="text-sm text-gray-300">NIT o CC</label><input type="text" value={editingTercero.nit_cc} onChange={e => setEditingTercero({...editingTercero, nit_cc: e.target.value})} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Nombre Completo</label><input type="text" value={editingTercero.nombre} onChange={e => setEditingTercero({...editingTercero, nombre: e.target.value})} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Dirección</label><input type="text" value={editingTercero.direccion} onChange={e => setEditingTercero({...editingTercero, direccion: e.target.value})} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Teléfono</label><input type="text" value={editingTercero.telefono} onChange={e => setEditingTercero({...editingTercero, telefono: e.target.value})} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Correo (Opcional)</label><input type="email" value={editingTercero.correo} onChange={e => setEditingTercero({...editingTercero, correo: e.target.value})} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div className="flex space-x-4 mt-4"><button type="button" onClick={handleCancelEdit} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg">Guardar</button></div> </form></> ) 
                        : ( <><h3 className="text-xl text-sky-300 font-semibold mb-4">Añadir Nuevo Tercero</h3><form onSubmit={handleAddSubmit} className="space-y-3"> <div><label className="text-sm text-gray-300">NIT o CC</label><input type="text" value={addNit} onChange={e => setAddNit(e.target.value)} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Nombre Completo</label><input type="text" value={addNombre} onChange={e => setAddNombre(e.target.value)} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Dirección</label><input type="text" value={addDireccion} onChange={e => setAddDireccion(e.target.value)} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Teléfono</label><input type="text" value={addTelefono} onChange={e => setAddTelefono(e.target.value)} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <div><label className="text-sm text-gray-300">Correo (Opcional)</label><input type="email" value={addCorreo} onChange={e => setAddCorreo(e.target.value)} className="w-full bg-gray-700 text-white p-2 mt-1 rounded-md border border-gray-600" /></div> <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg mt-4 flex items-center justify-center space-x-2"><UserPlus size={18}/><span>Añadir Tercero</span></button> </form></> )} 
                    </div> 
                    <div>
                        <h3 className="text-xl text-sky-300 font-semibold mb-4">Terceros Existentes</h3>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2"> 
                            {sedeTerceros.map(t => ( 
                                <div key={t.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                    <div><p className="font-semibold text-white">{t.nombre}</p><p className="text-sm text-gray-400">{t.nit_cc}</p></div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleSelectToEdit(t)} className="text-sky-400 hover:text-sky-300 p-2 rounded-full hover:bg-sky-800"><Edit size={18}/></button>
                                    </div>
                                </div> 
                            ))} 
                        </div>
                    </div> 
                </div>
            </div>
        </div>
    </>
    ); 
};
const CargaMasivaModal = ({isOpen, onClose, handleCargaMasivaCuentas, handleCargaMasivaTerceros, sedes, setAlertInfo}) => {
    if(!isOpen) return null;
    const [cuentasFile, setCuentasFile] = useState(null);
    const [tercerosFile, setTercerosFile] = useState(null);

    const processFile = async (file, handler, requiredColumns) => {
  if (typeof window.XLSX === 'undefined') {
    setAlertInfo({isOpen: true, title: "Librería no cargada", message: "La funcionalidad para leer archivos Excel aún no está lista. Por favor, espere un momento e intente de nuevo.", type: 'error'});
    return;
  }
  if (!file) {
    setAlertInfo({isOpen: true, title: "Archivo no seleccionado", message: "Por favor, seleccione un archivo para procesar.", type: 'error'});
    return;
  }

  try {
    const json = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = window.XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            return reject(new Error("El archivo seleccionado no contiene datos."));
          }
          
          const firstRow = jsonData[0];
          for (const col of requiredColumns) {
            if (!firstRow.hasOwnProperty(col)) {
              return reject(new Error(`El archivo no tiene la columna requerida: "${col}".`));
            }
          }
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
    
    // --- AQUÍ ESTABA EL ERROR ---
    if (json) { // CORREGIDO: antes decía "data"
      try {
        await handler(json); // CORREGIDO: antes decía "data"
        onClose(); 
      } catch (err) {
        setAlertInfo({ isOpen: true, title: "Error en la Carga", message: `Hubo un problema al subir los datos: ${err.message}`, type: 'error' });
      }
    }
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    setAlertInfo({ isOpen: true, title: "Error de Procesamiento", message: error.message, type: 'error' });
  }
};

    return( <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"> <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-teal-500"> <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white flex items-center"><UploadCloud className="mr-3 text-teal-300"/>Cargas Masivas</h2><button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button></div> <div className="space-y-6"> <div><h3 className="text-lg font-semibold text-teal-300 mb-2">Cargar Cuentas Contables</h3><p className="text-sm text-gray-400 mb-3">Columnas requeridas: `Numero_Cuenta`, `Nombre_Cuenta`.</p><input type="file" onChange={(e) => setCuentasFile(e.target.files[0])} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"/><button onClick={() => processFile(cuentasFile, handleCargaMasivaCuentas, ['Numero_Cuenta', 'Nombre_Cuenta'])} className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">Procesar Cuentas</button></div> <div className="border-t border-gray-700 pt-6"><h3 className="text-lg font-semibold text-teal-300 mb-2">Cargar Terceros</h3><p className="text-sm text-gray-400 mb-3">Columnas: `ID_Sede`, `NIT_CC`, `Nombre`, `Direccion`, `Telefono`, `Correo`.</p><p className="text-xs text-gray-500">IDs de Sede válidos: {sedes.map(s => `${s.id} (${s.nombre})`).join(', ')}</p><input type="file" onChange={(e) => setTercerosFile(e.target.files[0])} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"/><button onClick={() => processFile(tercerosFile, handleCargaMasivaTerceros, ['ID_Sede', 'NIT_CC', 'Nombre'])} className="mt-2 w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">Procesar Terceros</button></div> </div> <div className="flex justify-end pt-8 space-x-4"><button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cerrar</button></div> </div> </div> ) };
const GestionarTiposCuentasModal = ({isOpen, onClose, sedes, tiposGasto, cuentasContables, handleAnadirTipoGasto, handleAnadirCuentaContable, handleEditarTipoGasto, handleEditarCuentaContable}) => {
    if(!isOpen) return null;
    const [selectedSedeId, setSelectedSedeId] = useState(sedes[0]?.id || '');
    const [nombreGasto, setNombreGasto] = useState('');
    const [cuentaAsociadaId, setCuentaAsociadaId] = useState('');
    const [numeroCuenta, setNumeroCuenta] = useState('');
    const [nombreCuenta, setNombreCuenta] = useState('');
    const [editingCuenta, setEditingCuenta] = useState(null);
    const [editingTipoGasto, setEditingTipoGasto] = useState(null);

    const tiposGastoFiltrados = useMemo(() => {
        return tiposGasto.filter(tg => tg.id_sede === selectedSedeId);
    }, [tiposGasto, selectedSedeId]);

    const handleAddTipoGastoSubmit = (e) => {
        e.preventDefault();
        if(!nombreGasto || !cuentaAsociadaId || !selectedSedeId) {
            alert("Todos los campos para añadir tipo de gasto son obligatorios.");
            return;
        }
        const nuevoTipo = { nombre: nombreGasto, id_cuenta: parseInt(cuentaAsociadaId), id_sede: selectedSedeId };
        handleAnadirTipoGasto(nuevoTipo);
        setNombreGasto('');
        setCuentaAsociadaId('');
    };

    const handleAddCuentaSubmit = (e) => {
        e.preventDefault();
        if(!numeroCuenta || !nombreCuenta) {
            alert("Número y Nombre de cuenta son obligatorios.");
            return;
        }
        handleAnadirCuentaContable({numero: numeroCuenta, nombre: nombreCuenta});
        setNumeroCuenta('');
        setNombreCuenta('');
    };

    const handleEditCuentaSubmit = (e) => {
        e.preventDefault();
        handleEditarCuentaContable(editingCuenta);
        setEditingCuenta(null);
    };

    const handleEditTipoGastoSubmit = (e) => {
        e.preventDefault();
        handleEditarTipoGasto(editingTipoGasto);
        setEditingTipoGasto(null);
    };

    return( 
    <>
        {editingCuenta && (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[51] flex justify-center items-center p-4">
                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-orange-500">
                    <h3 className="text-xl text-orange-400 font-semibold mb-4">Editar Cuenta Contable</h3>
                    <form onSubmit={handleEditCuentaSubmit} className="space-y-3">
                        <div><label className="text-sm text-gray-300">Número de Cuenta</label><input type="text" value={editingCuenta.numero} onChange={e => setEditingCuenta({...editingCuenta, numero: e.target.value})} className="w-full bg-gray-700 p-2 mt-1 rounded-md" /></div>
                        <div><label className="text-sm text-gray-300">Nombre de la Cuenta</label><input type="text" value={editingCuenta.nombre} onChange={e => setEditingCuenta({...editingCuenta, nombre: e.target.value})} className="w-full bg-gray-700 p-2 mt-1 rounded-md" /></div>
                        <div className="flex space-x-4 mt-4"><button type="button" onClick={() => setEditingCuenta(null)} className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded-md">Cancelar</button><button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded-md">Guardar</button></div>
                    </form>
                </div>
            </div>
        )}
         {editingTipoGasto && (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[51] flex justify-center items-center p-4">
                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-orange-500">
                    <h3 className="text-xl text-orange-400 font-semibold mb-4">Editar Tipo de Gasto</h3>
                    <form onSubmit={handleEditTipoGastoSubmit} className="space-y-3">
                        <div><label className="text-sm text-gray-300">Nombre del Tipo de Gasto</label><input type="text" value={editingTipoGasto.nombre} onChange={e => setEditingTipoGasto({...editingTipoGasto, nombre: e.target.value})} className="w-full bg-gray-700 p-2 mt-1 rounded-md" /></div>
                        <div><label className="text-sm text-gray-300">Enlazar a Cuenta</label><select value={editingTipoGasto.id_cuenta} onChange={e => setEditingTipoGasto({...editingTipoGasto, id_cuenta: parseInt(e.target.value)})} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md"><option value="">Seleccione...</option>{cuentasContables.map(cc => <option key={cc.id} value={cc.id}>{cc.numero} - {cc.nombre}</option>)}</select></div>
                        <div className="flex space-x-4 mt-4"><button type="button" onClick={() => setEditingTipoGasto(null)} className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded-md">Cancelar</button><button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded-md">Guardar</button></div>
                    </form>
                </div>
            </div>
        )}
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"> 
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-6xl border-t-4 border-teal-500"> 
                <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-bold text-white">Gestionar Parámetros Contables</h2> <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button> </div> 
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> 
                    <div className="md:col-span-1">
                        <h3 className="text-xl text-teal-300 font-semibold mb-4">Cuentas Contables</h3>
                        <div className="space-y-4 bg-gray-700 p-4 rounded-lg"> 
                            <form onSubmit={handleAddCuentaSubmit} className="space-y-2"> <label className="text-sm text-gray-300">Añadir Nueva Cuenta</label> <input type="text" value={numeroCuenta} onChange={e=>setNumeroCuenta(e.target.value)} placeholder="Número de Cuenta (10 dígitos)" className="w-full bg-gray-600 p-2 rounded-md"/> <input type="text" value={nombreCuenta} onChange={e=>setNombreCuenta(e.target.value)} placeholder="Nombre de la Cuenta" className="w-full bg-gray-600 p-2 rounded-md"/> <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 py-2 rounded-md">Añadir Cuenta</button> </form> 
                            <div className="border-t border-gray-600 my-4"></div> 
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2"> {cuentasContables.map(cc => <div key={cc.id} className="bg-gray-900 p-2 rounded-md flex justify-between items-center"><div><p className="font-semibold text-sm">{cc.nombre}</p><p className="text-xs text-gray-400">{cc.numero}</p></div><button onClick={() => setEditingCuenta(cc)} className="text-orange-400 hover:text-orange-300 p-1"><Edit size={16}/></button></div>)} </div> 
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-xl text-teal-300 font-semibold mb-4">Tipos de Gasto por Sede</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <form onSubmit={handleAddTipoGastoSubmit} className="space-y-4 bg-gray-700 p-4 rounded-lg"> 
                                    <div> <label className="text-sm text-gray-300">Sede</label> <select value={selectedSedeId} onChange={e => setSelectedSedeId(parseInt(e.target.value))} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500"> {sedes.map(sede => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)} </select> </div> 
                                    <div> <label className="text-sm text-gray-300">Nombre del Tipo de Gasto</label> <input type="text" value={nombreGasto} onChange={e => setNombreGasto(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" placeholder="Ej: Mantenimiento Vehículo"/> </div> 
                                    <div> <label className="text-sm text-gray-300">Enlazar a Cuenta</label> <select value={cuentaAsociadaId} onChange={e => setCuentaAsociadaId(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500"> <option value="">Seleccione...</option> {cuentasContables.map(cc => <option key={cc.id} value={cc.id}>{cc.numero} - {cc.nombre}</option>)} </select> </div> 
                                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg mt-4">Añadir Tipo de Gasto</button> 
                                </form>
                            </div>
                            <div>
                                <div className="max-h-96 overflow-y-auto space-y-2 pr-2"> {tiposGastoFiltrados.length > 0 ? tiposGastoFiltrados.map(tg => { const cuenta = cuentasContables.find(c => c.id === tg.id_cuenta); return( <div key={tg.id} className="bg-gray-900 p-3 rounded-md flex justify-between items-center"><div> <p className="font-semibold text-white">{tg.nombre}</p> <p className="text-sm text-teal-400">Cuenta: {cuenta ? `${cuenta.numero}` : 'N/A'}</p> </div><button onClick={() => setEditingTipoGasto(tg)} className="text-orange-400 hover:text-orange-300 p-1"><Edit size={16}/></button></div> ) }) : <p className="text-gray-500 text-center">No hay tipos de gasto para esta sede.</p>} </div>
                            </div>
                        </div>
                    </div> 
                </div> 
            </div> 
        </div> 
    </>
    ); 
};
const SeguridadModal = ({isOpen, onClose, sedes, handleSeguridadSede, adminPassword, handleChangeAdminPassword}) => { if(!isOpen) return null; const [newAdminPass, setNewAdminPass] = useState(''); const [confirmAdminPass, setConfirmAdminPass] = useState(''); const [sedePasswords, setSedePasswords] = useState({}); const handleSedePassChange = (sedeId, pass) => { setSedePasswords(prev => ({ ...prev, [sedeId]: pass })); }; const handleSetSedePassword = (sedeId) => { if(sedePasswords[sedeId]){ handleSeguridadSede(sedeId, 'setPassword', sedePasswords[sedeId]); alert(`Contraseña establecida.`); } else { alert('Por favor ingrese una contraseña.'); } }; const handleRemoveSedePassword = (sedeId) => { handleSeguridadSede(sedeId, 'removePassword'); alert(`Contraseña eliminada.`); }; const handleToggleBlock = (sedeId) => { handleSeguridadSede(sedeId, 'toggleBlock'); }; const handleAdminPassSubmit = (e) => { e.preventDefault(); if(newAdminPass !== confirmAdminPass){ alert("Las contraseñas no coinciden."); return; } if(newAdminPass.length < 4){ alert("La contraseña debe tener al menos 4 caracteres."); return; } handleChangeAdminPassword(newAdminPass); alert("Contraseña de administrador cambiada."); setNewAdminPass(''); setConfirmAdminPass(''); };
    return ( <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"> <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl border-t-4 border-yellow-500"> <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-bold text-white flex items-center"><ShieldCheck className="mr-3 text-yellow-400"/>Gestionar Seguridad</h2> <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> <div> <h3 className="text-xl text-yellow-300 font-semibold mb-4">Seguridad de Sedes</h3> <div className="max-h-96 overflow-y-auto space-y-4 pr-2"> {sedes.map(sede => ( <div key={sede.id} className="bg-gray-700 p-4 rounded-lg"> <p className="font-bold text-white text-lg">{sede.nombre}</p> <div className="mt-2 space-y-3"> <div className="flex items-center space-x-2"> <input type="text" placeholder="Nueva contraseña..." onChange={(e) => handleSedePassChange(sede.id, e.target.value)} className="w-full bg-gray-600 text-white p-2 rounded-md border border-gray-500" /> <button onClick={() => handleSetSedePassword(sede.id)} className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-2 rounded-md">Fijar</button> </div> <div className="flex items-center justify-between"> <p className="text-sm text-gray-400">Contraseña: {sede.password ? 'Establecida' : 'Ninguna'}</p> {sede.password && <button onClick={() => handleRemoveSedePassword(sede.id)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>} </div> <button onClick={() => handleToggleBlock(sede.id)} className={`w-full py-2 rounded-md font-semibold ${sede.blocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{sede.blocked ? 'Desbloquear' : 'Bloquear'} Sede</button> </div> </div> ))} </div> </div> <div> <h3 className="text-xl text-yellow-300 font-semibold mb-4">Contraseña de Administrador</h3> <form onSubmit={handleAdminPassSubmit} className="bg-gray-700 p-4 rounded-lg space-y-3"> <div><label className="text-sm text-gray-300">Nueva Contraseña</label><input type="password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" /></div> <div><label className="text-sm text-gray-300">Confirmar Contraseña</label><input type="password" value={confirmAdminPass} onChange={e => setConfirmAdminPass(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" /></div> <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg mt-4">Cambiar Contraseña</button> </form> </div> </div> </div> </div> ) };
const GestionarSedesModal = ({isOpen, onClose, sedes, handleAnadirSede}) => {
    if(!isOpen) return null;
    const [nombre, setNombre] = useState('');
    const [idUsuario, setIdUsuario] = useState('');
    const [saldo_inicial, setsaldo_inicial] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if(!nombre || !idUsuario || !saldo_inicial) {
            alert("Todos los campos son obligatorios.");
            return;
        }
        const nuevaSede = {
            nombre,
            id_usuario: idUsuario.toUpperCase(),
            saldo_inicial: parseFloat(saldo_inicial)
        };
        handleAnadirSede(nuevaSede);
        setNombre('');
        setIdUsuario('');
        setsaldo_inicial('');
    };
    return(
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl border-t-4 border-indigo-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center"><Home className="mr-3 text-indigo-400"/>Gestionar Sedes</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl text-indigo-300 font-semibold mb-4">Añadir Nueva Sede</h3>
                        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-700 p-4 rounded-lg">
                            <div>
                                <label className="text-sm text-gray-300">Nombre de la Sede</label>
                                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" placeholder="Ej: Sede Eje Cafetero"/>
                            </div>
                             <div>
                                <label className="text-sm text-gray-300">ID de Usuario (corto, mayúsculas)</label>
                                <input type="text" value={idUsuario} onChange={e => setIdUsuario(e.target.value.toUpperCase())} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" placeholder="Ej: EJE"/>
                            </div>
                             <div>
                                <label className="text-sm text-gray-300">Saldo Inicial</label>
                                <input type="number" value={saldo_inicial} onChange={e => setsaldo_inicial(e.target.value)} className="w-full bg-gray-600 text-white p-2 mt-1 rounded-md border border-gray-500" placeholder="Ej: 2000000"/>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg mt-4">Añadir Sede</button>
                        </form>
                    </div>
                    <div>
                        <h3 className="text-xl text-indigo-300 font-semibold mb-4">Sedes Existentes</h3>
                        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                            {sedes.map(s => (
                                <div key={s.id} className="bg-gray-700 p-3 rounded-md">
                                    <p className="font-semibold text-white">{s.nombre}</p>
                                    <p className="text-sm text-gray-400">ID: {s.id_usuario} | Saldo Inicial: ${new Intl.NumberFormat('es-CO').format(s.saldo_inicial)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
const BloquearFechaModal = ({ isOpen, onClose, fechaBloqueoActual, handleSetFechaBloqueo }) => {
    if (!isOpen) return null;
    const [nuevaFecha, setNuevaFecha] = useState(fechaBloqueoActual || '');

    const handleSubmit = () => {
        handleSetFechaBloqueo(nuevaFecha);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-purple-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center"><Lock className="mr-3 text-purple-400"/>Bloquear Movimientos por Fecha</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button>
                </div>
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Seleccione una fecha. Todos los movimientos (gastos e ingresos) registrados en o antes de esta fecha 
                        no podrán ser editados ni eliminados por los usuarios de las sedes.
                    </p>
                    <div>
                        <label className="block text-purple-300 text-sm font-bold mb-2">Fecha de Bloqueo</label>
                        <input 
                            type="date" 
                            value={nuevaFecha} 
                            onChange={e => setNuevaFecha(e.target.value)} 
                            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                        />
                    </div>
                     {fechaBloqueoActual && (
                        <p className="text-sm text-yellow-400">Fecha de bloqueo actual: {fechaBloqueoActual}</p>
                    )}
                    <p className="text-xs text-gray-500">
                        Para desbloquear, simplemente borre la fecha y guarde.
                    </p>
                </div>
                <div className="flex justify-end space-x-4 pt-8">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">Guardar Bloqueo</button>
                </div>
            </div>
        </div>
    );
};
const DescargarPlanoModal = ({isOpen, onClose, sedes, movimientos, terceros, cuentasContables, tiposGasto}) => {
    if(!isOpen) return null;
    const [sedeId, setSedeId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [alertInfo, setAlertInfo] = useState({isOpen: false, message:''});

    const handleDownload = () => {
        if (!sedeId || !startDate || !endDate) {
            setAlertInfo({isOpen: true, message: "Debe seleccionar una sede y un rango de fechas."});
            return;
        }
        handleDescargarPlano(movimientos, terceros, cuentasContables, tiposGasto, sedes, parseInt(sedeId), startDate, endDate);
        onClose();
    }
    
    return (
    <>
    <AlertModal isOpen={alertInfo.isOpen} onClose={() => setAlertInfo({isOpen: false, message: ''})} title="Campos Requeridos" message={alertInfo.message} />
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg border-t-4 border-cyan-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center"><DownloadCloud className="mr-3 text-cyan-400"/>Descargar Plano Contable (SIIGO)</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><XCircle size={28}/></button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-cyan-300 text-sm font-bold mb-2">Sede</label>
                    <select value={sedeId} onChange={e => setSedeId(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="">Seleccione una sede...</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-cyan-300 text-sm font-bold mb-2">Fecha Inicial</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                     <div>
                        <label className="block text-cyan-300 text-sm font-bold mb-2">Fecha Final</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-4 pt-8">
                <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                <button onClick={handleDownload} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><Download size={18}/><span>Descargar</span></button>
            </div>
        </div>
    </div>
    </>
    );
};


// -- DASHBOARDS --
const SedeDashboard = ({ currentUser, onLogout, movimientos, ingresos, solicitudes, handleEnviarSoporte, viewDate, setViewDate, terceros, handleAnadirTercero, handleEditarTercero, handleAnadirMovimiento, handleAnadirIngreso, tiposGasto, cuentasContables, sedes, handleEditarMovimiento, handleEditarIngreso, fechaBloqueo, handleEliminarMovimiento, handleEliminarIngreso }) => {
  const [isGastoModalOpen, setGastoModalOpen] = useState(false);
  const [isIngresoModalOpen, setIngresoModalOpen] = useState(false);
  const [isSolicitudesModalOpen, setSolicitudesModalOpen] = useState(false);
  const [isTercerosModalOpen, setTercerosModalOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [editingIngreso, setEditingIngreso] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
  const [localAlertInfo, setLocalAlertInfo] = useState({ isOpen: false, title: '', message: '', type: 'warning' });
  const sedeInfo = sedes.find(s => s.id === currentUser.sedeId);
  const printRef = useRef();
  
  const { allTransactions, saldo_inicialDelMes, totalIngresosMes, totalGastosMes } = useMemo(() => {
    const historicoDate = new Date(viewDate);
    historicoDate.setDate(1);
    historicoDate.setHours(0, 0, 0, 0);

    const gastosHistoricos = movimientos
        .filter(m => m.id_sede === currentUser.sedeId && new Date(m.fecha_gasto) < historicoDate)
        .reduce((sum, m) => sum + m.valor, 0);

    const ingresosHistoricos = ingresos
        .filter(i => i.id_sede === currentUser.sedeId && new Date(i.fecha_ingreso) < historicoDate)
        .reduce((sum, i) => sum + i.valor, 0);

    const saldo_inicialCalculado = sedeInfo.saldo_inicial + ingresosHistoricos - gastosHistoricos;
    
    const filterByMonth = (item) => {
        const itemDate = new Date(item.fecha_gasto || item.fecha_ingreso);
        return item.id_sede === currentUser.sedeId && itemDate.getFullYear() === viewDate.getFullYear() && itemDate.getMonth() === viewDate.getMonth();
    };
    
    const gastosMes = movimientos.filter(filterByMonth).map(m => ({ ...m, type: 'gasto' }));
    const ingresosMes = ingresos.filter(filterByMonth).map(i => ({ ...i, type: 'ingreso' }));
    
    const all = [...gastosMes, ...ingresosMes].sort((a, b) => new Date(b.fecha_gasto || b.fecha_ingreso) - new Date(a.fecha_gasto || a.fecha_ingreso));
    
    const totalGastosDelMes = gastosMes.reduce((sum, mov) => sum + mov.valor, 0);
    const totalIngresosDelMes = ingresosMes.reduce((sum, i) => sum + i.valor, 0);

    return { 
        allTransactions: all, 
        saldo_inicialDelMes: saldo_inicialCalculado,
        totalIngresosMes: totalIngresosDelMes,
        totalGastosMes: totalGastosDelMes
    };
  }, [movimientos, ingresos, currentUser.sedeId, viewDate, sedeInfo.saldo_inicial]);

  const saldoFinal = saldo_inicialDelMes + totalIngresosMes - totalGastosMes;
  const solicitudesPendientes = movimientos.filter(m => m.id_sede === currentUser.sedeId && m.soporteRequerido && !m.soporteEnviado).length;
  
  const handleEditGastoClick = (movimiento) => { setEditingMovimiento(movimiento); };
  const handleEditIngresoClick = (ingreso) => { setEditingIngreso(ingreso); };
  const changeMonth = (offset) => { setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + offset); return n; }); };
  
  const openConfirmation = (onConfirm, title, message) => {
      setConfirmModalState({ isOpen: true, onConfirm: () => { onConfirm(); closeConfirmation(); }, title, message });
  };
  const closeConfirmation = () => setConfirmModalState({ isOpen: false, onConfirm: null, title: '', message: '' });

  const handleOpenGastoModal = () => {
    if (fechaBloqueo) {
        const lockDate = new Date(fechaBloqueo);
        const endOfLockMonth = new Date(lockDate.getFullYear(), lockDate.getMonth() + 1, 0);
        const startOfViewMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

        if (startOfViewMonth <= endOfLockMonth) {
            setLocalAlertInfo({
                isOpen: true,
                title: "Mes Bloqueado",
                message: "El mes se encuentra bloqueado, no se puede ingresar información. Comuníquese con el administrador.",
                type: 'error'
            });
            return;
        }
    }
    setGastoModalOpen(true);
  };

  const handleOpenIngresoModal = () => {
      if (fechaBloqueo) {
        const lockDate = new Date(fechaBloqueo);
        const endOfLockMonth = new Date(lockDate.getFullYear(), lockDate.getMonth() + 1, 0);
        const startOfViewMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

        if (startOfViewMonth <= endOfLockMonth) {
            setLocalAlertInfo({
                isOpen: true,
                title: "Mes Bloqueado",
                message: "El mes se encuentra bloqueado, no se puede ingresar información. Comuníquese con el administrador.",
                type: 'error'
            });
            return;
        }
    }
    setIngresoModalOpen(true);
  };

  const handlePrintPDF = () => {
    const input = printRef.current;
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        alert('Las librerías para generar PDF aún se están cargando. Por favor, espere un momento e intente de nuevo.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFontSize(16);
    pdf.text("La Calera Colombia SA", pdfWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Sede: ${sedeInfo.nombre}`, 14, 25);
    pdf.text(`Fecha Impresión: ${new Date().toLocaleString('es-CO')}`, pdfWidth - 14, 25, { align: 'right' });
    pdf.setLineWidth(0.5);
    pdf.line(14, 28, pdfWidth - 14, 28);
    
    window.html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth - 28;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 14, 35, imgWidth, imgHeight);
        pdf.save(`Reporte_${sedeInfo.nombre}_${MESES[viewDate.getMonth()]}_${viewDate.getFullYear()}.pdf`);
    });
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <AlertModal isOpen={localAlertInfo.isOpen} onClose={() => setLocalAlertInfo({isOpen: false, title: '', message: '', type: 'warning'})} title={localAlertInfo.title} message={localAlertInfo.message} type={localAlertInfo.type} />
      <Header currentUser={currentUser} onLogout={onLogout} />
      <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={closeConfirmation} onConfirm={confirmModalState.onConfirm} title={confirmModalState.title} message={confirmModalState.message} />
      <GastoModal isOpen={isGastoModalOpen} onClose={() => setGastoModalOpen(false)} sedeId={currentUser.sedeId} terceros={terceros} handleAnadirMovimiento={handleAnadirMovimiento} tiposGasto={tiposGasto} cuentasContables={cuentasContables} />
      <IngresoModal isOpen={isIngresoModalOpen} onClose={() => setIngresoModalOpen(false)} sedeId={currentUser.sedeId} handleAnadirIngreso={handleAnadirIngreso} />
      <EditGastoModal isOpen={!!editingMovimiento} onClose={() => setEditingMovimiento(null)} movimiento={editingMovimiento} handleEditarMovimiento={handleEditarMovimiento} terceros={terceros} tiposGasto={tiposGasto} cuentasContables={cuentasContables} />
      <EditIngresoModal isOpen={!!editingIngreso} onClose={() => setEditingIngreso(null)} ingreso={editingIngreso} handleEditarIngreso={handleEditarIngreso} />
      <SolicitudesModal isOpen={isSolicitudesModalOpen} onClose={() => setSolicitudesModalOpen(false)} sedeId={currentUser.sedeId} movimientos={movimientos} handleEnviarSoporte={handleEnviarSoporte} terceros={terceros}/>
      <GestionarTercerosModal isOpen={isTercerosModalOpen} onClose={()=>setTercerosModalOpen(false)} sedeId={currentUser.sedeId} terceros={terceros} handleAnadirTercero={handleAnadirTercero} handleEditarTercero={handleEditarTercero} />

      <main className="p-8">
        <div className="bg-sky-950 p-6 rounded-xl shadow-xl mb-8">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-teal-300">Dashboard: {sedeInfo.nombre}</h2><div className="flex items-center space-x-2"><button onClick={() => changeMonth(-1)} className="p-2 bg-sky-800 rounded-md hover:bg-sky-700"><ChevronsLeft/></button><span className="font-semibold text-lg w-48 text-center">{MESES[viewDate.getMonth()]} {viewDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-2 bg-sky-800 rounded-md hover:bg-sky-700"><ChevronsRight/></button></div></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Saldo Inicial</p><p className="text-2xl font-semibold">${new Intl.NumberFormat('es-CO').format(saldo_inicialDelMes)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Ingresos</p><p className="text-2xl font-semibold text-green-400">+ ${new Intl.NumberFormat('es-CO').format(totalIngresosMes)}</p></div>
                <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Total Gastos</p><p className="text-2xl font-semibold text-red-400">- ${new Intl.NumberFormat('es-CO').format(totalGastosMes)}</p></div>
                <div className="bg-teal-800 p-4 rounded-lg"><p className="text-sm text-teal-200">Saldo Final</p><p className="text-2xl font-bold text-white">${new Intl.NumberFormat('es-CO').format(saldoFinal)}</p></div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-8">
            <button onClick={handleOpenIngresoModal} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><TrendingUp size={20} /><span>Registrar Ingreso</span></button>
            <button onClick={handleOpenGastoModal} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><PlusCircle size={20} /><span>Registrar Gasto</span></button>
            <button onClick={() => setTercerosModalOpen(true)} className="bg-sky-700 hover:bg-sky-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><UserPlus size={20}/><span>Gestionar Terceros</span></button>
            <button onClick={handlePrintPDF} className="bg-sky-700 hover:bg-sky-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><Printer size={20}/><span>Imprimir PDF</span></button>
            <button onClick={() => setSolicitudesModalOpen(true)} className="relative bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2">
                <Bell size={20}/><span>Solicitudes</span>
                {solicitudesPendientes > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">{solicitudesPendientes}</span>}
            </button>
        </div>

        <div className="bg-sky-950 p-6 rounded-xl shadow-xl" ref={printRef}>
             <h3 className="text-xl font-bold mb-4 text-teal-300">Historial de Transacciones de {MESES[viewDate.getMonth()]}</h3>
             <div className="overflow-x-auto"><table className="w-full text-left">
                     <thead><tr className="border-b border-gray-700"><th className="p-3">Tipo</th><th className="p-3">Fecha</th><th className="p-3">Concepto/Tercero</th><th className="p-3">Detalle</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Acciones</th></tr></thead>
                     <tbody>
                        {allTransactions.length > 0 ? allTransactions.map(mov => {
                            const isGasto = mov.type === 'gasto';
                            const fecha = isGasto ? mov.fecha_gasto : mov.fecha_ingreso;
                            const tercero = isGasto ? terceros.find(t => t.id === mov.id_tercero) : null;
                            const isPending = isGasto && mov.soporteRequerido && !mov.soporteEnviado;

                            const lockDate = fechaBloqueo ? new Date(`${fechaBloqueo}T00:00:00-05:00`) : null;
                            const transactionDate = new Date(`${fecha}T00:00:00-05:00`);
                            const isLocked = lockDate && transactionDate <= lockDate;

                            return (
                                <tr key={`${mov.type}-${mov.id}`} className="border-b border-gray-800 hover:bg-sky-900">
                                    <td className="p-3"><span className={`font-bold px-2 py-1 rounded-full text-xs ${isGasto ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{isGasto ? 'GASTO' : 'INGRESO'}</span></td>
                                    <td className="p-3">{fecha}</td>
                                    <td className="p-3">{isGasto ? (tercero ? tercero.nombre : 'N/A') : mov.concepto}</td>
                                    <td className="p-3">{isGasto ? mov.detalle : mov.observaciones}</td>
                                    <td className={`p-3 text-right font-semibold ${isGasto ? 'text-red-300' : 'text-green-300'}`}>{isGasto ? '-' : '+'} ${new Intl.NumberFormat('es-CO').format(mov.valor)}</td>
                                    <td className="p-3 text-center">
                                      {isLocked ? (
                                        <div className="flex items-center justify-center text-gray-500" title={`Bloqueado el ${fechaBloqueo}`}>
                                            <Lock size={18} />
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center space-x-3">
                                            {isGasto && isPending ? (
                                                <button onClick={() => setSolicitudesModalOpen(true)} className="text-orange-400 hover:text-orange-300 font-semibold flex items-center justify-center w-full"><Bell size={18} className="mr-2"/> Responder</button>
                                            ) : (
                                                <>
                                                    <button onClick={() => isGasto ? handleEditGastoClick(mov) : handleEditIngresoClick(mov)} className="text-teal-400 hover:text-teal-300"><Edit size={18}/></button>
                                                    <button onClick={() => openConfirmation(() => isGasto ? handleEliminarMovimiento(mov.id) : handleEliminarIngreso(mov.id), `Eliminar ${isGasto ? 'Gasto' : 'Ingreso'}`, `¿Está seguro que desea eliminar esta transacción? Esta acción no se puede deshacer.`)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                                </>
                                            )}
                                        </div>
                                      )}
                                    </td>
                                </tr>
                            )
                        }) : <tr><td colSpan="6" className="text-center text-gray-500 py-8">No hay transacciones para este mes.</td></tr>}
                     </tbody>
                 </table></div>
        </div>
      </main>
    </div>
  );
};
const AdminDashboard = ({ currentUser, onLogout, movimientos, ingresos, solicitudes, handleSolicitarSoporte, viewDate, setViewDate, terceros, tiposGasto, cuentasContables, handleAnadirTipoGasto, sedes, handleSeguridadSede, adminPassword, handleChangeAdminPassword, handleAnadirSede, handleCargaMasivaCuentas, handleCargaMasivaTerceros, setAlertInfo, handleEditarCuentaContable, handleEditarTipoGasto, fechaBloqueo, handleSetFechaBloqueo, handleAnadirCuentaContable }) => {
  const [filtroSede, setFiltroSede] = useState(sedes.length > 0 ? sedes[0].id : '');
  const [viendoSoporte, setViendoSoporte] = useState(null);
  const [isCargaModalOpen, setCargaModalOpen] = useState(false);
  const [isTiposCuentasModalOpen, setTiposCuentasModalOpen] = useState(false);
  const [isSeguridadModalOpen, setSeguridadModalOpen] = useState(false);
  const [isSedesModalOpen, setSedesModalOpen] = useState(false);
  const [isBloqueoFechaModalOpen, setBloqueoFechaModalOpen] = useState(false);
  const [isPlanoModalOpen, setPlanoModalOpen] = useState(false);
  
  const resumenCajas = useMemo(() => {
    return sedes.map(sede => {
        const historicoDate = new Date(viewDate);
        historicoDate.setDate(1);
        historicoDate.setHours(0, 0, 0, 0);

        const gastosHistoricos = movimientos
            .filter(m => m.id_sede === sede.id && new Date(m.fecha_gasto) < historicoDate)
            .reduce((sum, m) => sum + m.valor, 0);

        const ingresosHistoricos = ingresos
            .filter(i => i.id_sede === sede.id && new Date(i.fecha_ingreso) < historicoDate)
            .reduce((sum, i) => sum + i.valor, 0);
        
        const saldo_inicialDelMes = sede.saldo_inicial + ingresosHistoricos - gastosHistoricos;

        const filterByMonth = (item) => {
            const d = new Date(item.fecha_gasto || item.fecha_ingreso);
            return item.id_sede === sede.id && d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth();
        };
        const gastosMes = movimientos.filter(filterByMonth).reduce((sum, m) => sum + m.valor, 0);
        const ingresosMes = ingresos.filter(filterByMonth).reduce((sum, i) => sum + i.valor, 0);

        const saldoFinal = saldo_inicialDelMes + ingresosMes - gastosMes;

        return { ...sede, saldo_inicialMes: saldo_inicialDelMes, gastos: gastosMes, ingresos: ingresosMes, saldoFinal };
    });
  }, [sedes, movimientos, ingresos, viewDate]);

  const allTransactionsSede = useMemo(() => {
    const filterByMonth = (item) => {
        const itemDate = new Date(item.fecha_gasto || item.fecha_ingreso);
        return item.id_sede === filtroSede && itemDate.getFullYear() === viewDate.getFullYear() && itemDate.getMonth() === viewDate.getMonth();
    };
    const gastosMes = movimientos.filter(filterByMonth).map(m => ({ ...m, type: 'gasto' }));
    const ingresosMes = ingresos.filter(filterByMonth).map(i => ({ ...i, type: 'ingreso' }));
    return [...gastosMes, ...ingresosMes].sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));
  }, [movimientos, ingresos, filtroSede, viewDate]);
  
  const changeMonth = (offset) => { setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + offset); return n; }); };

  return (
     <div className="bg-gray-900 min-h-screen text-white">
      <Header currentUser={currentUser} onLogout={onLogout} />
      <VerSoporteModal isOpen={!!viendoSoporte} onClose={() => setViendoSoporte(null)} solicitud={viendoSoporte} />
      <CargaMasivaModal isOpen={isCargaModalOpen} onClose={() => setCargaModalOpen(false)} handleCargaMasivaCuentas={handleCargaMasivaCuentas} handleCargaMasivaTerceros={handleCargaMasivaTerceros} sedes={sedes} setAlertInfo={setAlertInfo} />
      <GestionarTiposCuentasModal isOpen={isTiposCuentasModalOpen} onClose={() => setTiposCuentasModalOpen(false)} sedes={sedes} tiposGasto={tiposGasto} cuentasContables={cuentasContables} handleAnadirTipoGasto={handleAnadirTipoGasto} handleAnadirCuentaContable={handleAnadirCuentaContable} handleEditarTipoGasto={handleEditarTipoGasto} handleEditarCuentaContable={handleEditarCuentaContable} />
      <SeguridadModal isOpen={isSeguridadModalOpen} onClose={() => setSeguridadModalOpen(false)} sedes={sedes} handleSeguridadSede={handleSeguridadSede} adminPassword={adminPassword} handleChangeAdminPassword={handleChangeAdminPassword} />
      <GestionarSedesModal isOpen={isSedesModalOpen} onClose={() => setSedesModalOpen(false)} sedes={sedes} handleAnadirSede={handleAnadirSede} />
      <BloquearFechaModal isOpen={isBloqueoFechaModalOpen} onClose={() => setBloqueoFechaModalOpen(false)} fechaBloqueoActual={fechaBloqueo} handleSetFechaBloqueo={handleSetFechaBloqueo} />
      <DescargarPlanoModal isOpen={isPlanoModalOpen} onClose={() => setPlanoModalOpen(false)} sedes={sedes} movimientos={movimientos} terceros={terceros} cuentasContables={cuentasContables} tiposGasto={tiposGasto} />

      <main className="p-8">
        <div className="flex flex-wrap items-center gap-4 mb-8">
            <button onClick={() => setSedesModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><Home size={16}/><span>Gestionar Sedes</span></button>
            <button onClick={() => setTiposCuentasModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><User size={16}/><span>Gestionar Tipos/Cuentas</span></button>
            <button onClick={() => setCargaModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><UploadCloud size={16}/><span>Cargas Masivas</span></button>
            <button onClick={() => setPlanoModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><DownloadCloud size={16}/><span>Descargar Plano Contable</span></button>
            <button onClick={() => setSeguridadModalOpen(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><ShieldCheck size={16}/><span>Gestionar Seguridad</span></button>
            <button onClick={() => setBloqueoFechaModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-lg flex items-center space-x-2"><Lock size={16}/><span>Bloquear por Fecha</span></button>
        </div>
        
        <div className="bg-sky-950 p-6 rounded-xl shadow-xl mb-8">
             <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-teal-300">Estado de Cajas</h3><div className="flex items-center space-x-2"><button onClick={() => changeMonth(-1)} className="p-2 bg-sky-800 rounded-md hover:bg-sky-700"><ChevronsLeft/></button><span className="font-semibold text-lg w-48 text-center">{MESES[viewDate.getMonth()]} {viewDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-2 bg-sky-800 rounded-md hover:bg-sky-700"><ChevronsRight/></button></div></div>
             <div className="overflow-x-auto"><table className="w-full text-left">
                     <thead><tr className="border-b border-gray-700"><th className="p-3">Sede</th><th className="p-3 text-right">Saldo Inicial</th><th className="p-3 text-right">Ingresos</th><th className="p-3 text-right">Gastos</th><th className="p-3 text-right">Saldo Final</th></tr></thead>
                     <tbody>
                        {resumenCajas.map(sede => (
                          <tr key={sede.id} className="border-b border-gray-800 hover:bg-sky-900">
                              <td className="p-3 font-semibold">{sede.nombre}</td>
                              <td className="p-3 text-right">${new Intl.NumberFormat('es-CO').format(sede.saldo_inicialMes)}</td>
                              <td className="p-3 text-right text-green-400">+ ${new Intl.NumberFormat('es-CO').format(sede.ingresos)}</td>
                              <td className="p-3 text-right text-red-400">- ${new Intl.NumberFormat('es-CO').format(sede.gastos)}</td>
                              <td className="p-3 text-right font-bold text-teal-300">${new Intl.NumberFormat('es-CO').format(sede.saldoFinal)}</td>
                          </tr>
                        ))}
                     </tbody>
                 </table></div>
        </div>

         <div className="bg-sky-950 p-6 rounded-xl shadow-xl">
             <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-teal-300">Auditoría de Movimientos</h3><div className="flex items-center space-x-2"><label>Sede:</label><select value={filtroSede} onChange={e => setFiltroSede(parseInt(e.target.value))} className="bg-gray-700 text-white p-2 rounded-lg border border-gray-600">{sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div></div>
             <div className="overflow-x-auto"><table className="w-full text-left">
                     <thead><tr className="border-b border-gray-700"><th className="p-3">Tipo</th><th className="p-3">Fecha Gasto</th><th className="p-3">Fecha Registro</th><th className="p-3">Concepto/Tercero</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Acción</th></tr></thead>
                     <tbody>
                        {allTransactionsSede.length > 0 ? allTransactionsSede.map(mov => {
                           const isGasto = mov.type === 'gasto';
                           const tercero = isGasto ? terceros.find(t => t.id === mov.id_tercero) : null;
                           const solicitud = isGasto ? solicitudes.find(s => s.id_movimiento === mov.id) : null;
                           return (
                                <tr key={`${mov.type}-${mov.id}`} className="border-b border-gray-800 hover:bg-sky-900">
                                    <td className="p-3"><span className={`font-bold px-2 py-1 rounded-full text-xs ${isGasto ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{isGasto ? 'GASTO' : 'INGRESO'}</span></td>
                                    <td className="p-3">{isGasto ? mov.fecha_gasto : mov.fecha_ingreso}</td>
                                    <td className="p-3 text-gray-400">{new Date(mov.fecha_registro).toLocaleString('es-CO')}</td>
                                    <td className="p-3">{isGasto ? (tercero ? tercero.nombre : 'N/A') : mov.concepto}</td>
                                    <td className={`p-3 text-right font-semibold ${isGasto ? 'text-red-300' : 'text-green-300'}`}>{isGasto ? '-' : '+'} ${new Intl.NumberFormat('es-CO').format(mov.valor)}</td>
                                    <td className="p-3 text-center">
                                      {isGasto && mov.soporteEnviado && solicitud ? (<button onClick={() => setViendoSoporte(solicitud)} className="bg-green-600 text-white text-sm font-semibold py-1 px-3 rounded-full flex items-center mx-auto hover:bg-green-500"><Paperclip size={14} className="mr-2"/> Ver</button>) : isGasto && mov.soporteRequerido ? (<span className="bg-yellow-600 text-white text-sm font-semibold py-1 px-3 rounded-full">Pendiente</span>) : isGasto ? (<button onClick={() => handleSolicitarSoporte(mov.id)} className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold py-1 px-3 rounded-full">Solicitar</button>) : ('-')}
                                    </td>
                                </tr>
                           )
                        }) : <tr><td colSpan="6" className="text-center text-gray-500 py-8">No hay transacciones para esta sede en este mes.</td></tr>}
                     </tbody>
                 </table></div>
        </div>
      </main>
     </div>
  )
};
const LoginScreen = ({ onLogin, sedes, adminPassword }) => {
  const [password, setPassword] = useState('');
  const [adminLogin, setAdminLogin] = useState(false);
  const [sedeLogin, setSedeLogin] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState({isOpen: false, message: ''});

  const handleSedeClick = (sede) => {
    if (sede.blocked) {
      setInfo({isOpen: true, message: `El usuario de la sede ${sede.nombre} se encuentra bloqueado.`});
      return;
    }
    if(sede.password) {
        setSedeLogin(sede);
    } else {
        onLogin({ id_usuario: sede.id_usuario, sedeId: sede.id });
    }
  }

  const handlePasswordSubmit = (e) => {
      e.preventDefault();
      if(adminLogin) {
          if (password === adminPassword) { onLogin({ id_usuario: 'ADMIN', sedeId: null }); }
          else { setError('Contraseña incorrecta.'); }
      } else if (sedeLogin) {
          if (password === sedeLogin.password) { onLogin({ id_usuario: sedeLogin.id_usuario, sedeId: sedeLogin.id }); }
          else { setError('Contraseña incorrecta.'); }
      }
      setPassword('');
  }

  const handleForgotPassword = () => { setInfo({isOpen: true, message:'Se ha enviado un recordatorio al correo yezid.rodriguez@lacaleracolombia.com.co'}); setError(''); }
  
  const clearLogin = () => { setAdminLogin(false); setSedeLogin(null); setError(''); setPassword(''); }

  if(adminLogin || sedeLogin) {
      return (
        <div className="bg-gray-900 min-h-screen flex flex-col justify-center items-center p-4">
          <AlertModal isOpen={info.isOpen} onClose={() => setInfo({isOpen: false, message:''})} title="Información" message={info.message}/>
          <div className="text-center mb-10"><h1 className="text-4xl font-bold text-white">Ingreso a Sede: {sedeLogin?.nombre || 'Administrador'}</h1></div>
          <div className="bg-sky-950 p-8 rounded-2xl shadow-2xl w-full max-w-md">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                 <label className="block text-white text-center">Ingrese la contraseña</label>
                 <input type="password" value={password} onChange={e => {setPassword(e.target.value); setError('')}} className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"/>
                 {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                 <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg">Ingresar</button>
                 <button type="button" onClick={clearLogin} className="w-full text-sm text-gray-400 hover:text-white text-center mt-2">Volver a la selección de sede</button>
                 {adminLogin && <button type="button" onClick={handleForgotPassword} className="w-full text-sm text-sky-400 hover:text-sky-300 text-center mt-2">¿Olvidó su contraseña?</button>}
             </form>
          </div>
        </div>
      );
  }

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col justify-center items-center p-4">
      <AlertModal isOpen={info.isOpen} onClose={() => setInfo({isOpen: false, message:''})} title="Usuario Bloqueado" message={info.message}/>
      <div className="text-center mb-10"><Building size={60} className="mx-auto text-teal-400 mb-4" /><h1 className="text-4xl font-bold text-white">Sistema de Registro de Gastos</h1><p className="text-xl text-gray-400 mt-2">La Calera Colombia SA</p></div>
      <div className="bg-sky-950 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-center text-xl text-teal-300 font-semibold mb-6">Seleccione su punto de acceso:</h2>
        <div className="space-y-4">
          {sedes.map(sede => (<button key={sede.id} onClick={() => handleSedeClick(sede)} disabled={sede.blocked} className={`w-full text-white font-bold py-4 rounded-lg text-lg transition-transform transform hover:scale-105 ${sede.blocked ? 'bg-gray-600 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600'}`}>{sede.nombre} {sede.blocked && '(Bloqueado)'}</button>))}
        </div>
        <div className="border-t border-gray-700 my-6"></div>
        <button onClick={() => setAdminLogin(true)} className="w-full bg-sky-700 hover:bg-sky-600 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"><Lock size={20} /><span>Acceso de Administrador</span></button>
      </div>
       <p className="text-gray-600 text-sm mt-8">&copy; {new Date().getFullYear()} - Desarrollado para La Calera Colombia SA</p>
    </div>
  );
};

const handleDescargarPlano = (movimientos, terceros, cuentasContables, tiposGasto, sedes, sedeId, startDate, endDate) => {
    if (typeof window.XLSX === 'undefined') {
        alert('La librería para generar Excel aún se está cargando. Por favor, espere un momento e intente de nuevo.');
        return;
    }

    const centroDeCostoMap = { 1: { cc: '3', scc: '1' }, 2: { cc: '2', scc: '2' }, 3: { cc: '2', scc: '3' }, 4: { cc: '2', scc: '5' }, default: { cc: '3', scc: '1' } };
    const sDate = new Date(`${startDate}T00:00:00-05:00`);
    const eDate = new Date(`${endDate}T23:59:59-05:00`);

    const filteredMovimientos = movimientos.filter(m => {
        const movDate = new Date(m.fecha_gasto);
        return m.id_sede === sedeId && movDate >= sDate && movDate <= eDate;
    });

    const header = [
        "TIPO DE COMPROBANTE (OBLIGATORIO)", "CÓDIGO COMPROBANTE (OBLIGATORIO)", "NÚMERO DE DOCUMENTO", "CUENTA CONTABLE (OBLIGATORIO)", "DÉBITO O CRÉDITO (OBLIGATORIO)", "VALOR DE LA SECUENCIA (OBLIGATORIO)", "AÑO DEL DOCUMENTO", "MES DEL DOCUMENTO", "DÍA DEL DOCUMENTO", "CÓDIGO DEL VENDEDOR", "CÓDIGO DE LA CIUDAD", "CÓDIGO DE LA ZONA", "SECUENCIA", "CENTRO DE COSTO", "SUBCENTRO DE COSTO", "NIT", "SUCURSAL", "DESCRIPCIÓN DE LA SECUENCIA"
    ];

    const dataRows = filteredMovimientos.flatMap(mov => {
        const tipoGasto = tiposGasto.find(tg => tg.id === mov.id_tipo_gasto) || {};
        const cuenta = cuentasContables.find(c => c.id === tipoGasto.id_cuenta) || {};
        const tercero = terceros.find(t => t.id === mov.id_tercero) || {};
        const cc_scc = centroDeCostoMap[mov.id_sede] || centroDeCostoMap.default;
        const fecha = new Date(mov.fecha_gasto + 'T00:00:00');

        const rowGasto = {};
        rowGasto[header[0]] = 'L';
        rowGasto[header[1]] = 11;
        rowGasto[header[2]] = '';
        rowGasto[header[3]] = cuenta.numero || '';
        rowGasto[header[4]] = 'D';
        rowGasto[header[5]] = mov.valor;
        rowGasto[header[6]] = fecha.getFullYear();
        rowGasto[header[7]] = fecha.getMonth() + 1;
        rowGasto[header[8]] = fecha.getDate();
        rowGasto[header[9]] = '';
        rowGasto[header[10]] = '';
        rowGasto[header[11]] = '';
        rowGasto[header[12]] = '';
        rowGasto[header[13]] = cc_scc.cc;
        rowGasto[header[14]] = cc_scc.scc;
        rowGasto[header[15]] = tercero.nit_cc || '';
        rowGasto[header[16]] = '';
        rowGasto[header[17]] = mov.detalle || '';
        
        const rowCaja = {};
        rowCaja[header[0]] = 'L';
        rowCaja[header[1]] = 11;
        rowCaja[header[2]] = '';
        rowCaja[header[3]] = '11050501';
        rowCaja[header[4]] = 'C';
        rowCaja[header[5]] = mov.valor;
        rowCaja[header[6]] = fecha.getFullYear();
        rowCaja[header[7]] = fecha.getMonth() + 1;
        rowCaja[header[8]] = fecha.getDate();
        rowCaja[header[9]] = '';
        rowCaja[header[10]] = '';
        rowCaja[header[11]] = '';
        rowCaja[header[12]] = '';
        rowCaja[header[13]] = cc_scc.cc;
        rowCaja[header[14]] = cc_scc.scc;
        rowCaja[header[15]] = '900188032';
        rowCaja[header[16]] = '';
        rowCaja[header[17]] = `Pago ${mov.detalle}`;

        return [rowGasto, rowCaja];
    });

    const ws_data = [header, ...dataRows.map(row => header.map(h => row[h] || ''))];
    const ws = window.XLSX.utils.aoa_to_sheet(ws_data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Plano SIIGO");
    const sedeNombre = sedes.find(s=>s.id === sedeId)?.nombre || 'Sede';
    window.XLSX.writeFile(wb, `Plano_Contable_SIIGO_${sedeNombre}_${startDate}_a_${endDate}.xlsx`);
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // <-- Añadido el estado de carga

  // Todos los estados ahora empiezan vacíos, se llenarán desde Supabase
  const [movimientos, setMovimientos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [tiposGasto, setTiposGasto] = useState([]);
  const [cuentasContables, setCuentasContables] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [alertInfo, setAlertInfo] = useState({isOpen: false, title: '', message: '', type: 'warning'});
  const [fechaBloqueo, setFechaBloqueo] = useState(null);

  // useEffect para cargar TODOS los datos de la base de datos al iniciar
 useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          sedesRes,
          tercerosRes,
          cuentasRes,
          tiposGastoRes,
          movimientosRes,
          ingresosRes,
          configRes
        ] = await Promise.all([
          supabase.from('sedes').select('*'),
          supabase.from('terceros').select('*'),
          supabase.from('cuentas_contables').select('*'),
          supabase.from('tipos_gasto').select('*'),
          supabase.from('movimientos').select('*'),
          supabase.from('ingresos').select('*'),
          supabase.from('config').select('admin_password, fecha_bloqueo').eq('id', 1).single()
        ]);
        
        // Verificamos y asignamos los datos de forma segura, sin detener todo si algo falla
        if (sedesRes.error) console.error("Error en sedes:", sedesRes.error);
        else setSedes(sedesRes.data || []);

        if (tercerosRes.error) console.error("Error en terceros:", tercerosRes.error);
        else setTerceros(tercerosRes.data || []);
        
        if (cuentasRes.error) console.error("Error en cuentas:", cuentasRes.error);
        else setCuentasContables(cuentasRes.data || []);
        
        if (tiposGastoRes.error) console.error("Error en tipos de gasto:", tiposGastoRes.error);
        else setTiposGasto(tiposGastoRes.data || []);
        
        if (movimientosRes.error) console.error("Error en movimientos:", movimientosRes.error);
        else setMovimientos(movimientosRes.data || []);
        
        if (ingresosRes.error) console.error("Error en ingresos:", ingresosRes.error);
        else setIngresos(ingresosRes.data || []);
        
        // Manejo especial para la configuración
        if (configRes.error) {
            console.error("No se encontró la fila de config, usando valores por defecto:", configRes.error);
            setAdminPassword('LCC25'); // Contraseña por defecto si no hay en la BD
        } else if (configRes.data) {
            setAdminPassword(configRes.data.admin_password);
            setFechaBloqueo(configRes.data.fecha_bloqueo);
        }

      } catch (error) {
        setAlertInfo({ isOpen: true, title: 'Error Crítico', message: `Hubo un error inesperado al cargar: ${error.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // --- PARTE 2: Cargar los scripts externos ---
    const scripts = [
      { id: 'xlsx', src: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" },
      { id: 'jspdf', src: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" },
      { id: 'html2canvas', src: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" }
    ];

    scripts.forEach(scriptInfo => {
      if (!document.getElementById(scriptInfo.id)) {
        const script = document.createElement('script');
        script.id = scriptInfo.id;
        script.src = scriptInfo.src;
        script.async = true;
        document.body.appendChild(script);
      }
    });

  }, []); // El array vacío [] se asegura de que todo esto se ejecute una sola vez al cargar la app.

  const handleLogin = (user) => { setCurrentUser(user); };
  const handleLogout = () => { setCurrentUser(null); setViewDate(new Date());};
  
  const handleEnviarSoporte = (movimientoId, file) => {
    if (!file) { setAlertInfo({isOpen: true, title: "Archivo no seleccionado", message: "Por favor, seleccione un archivo para adjuntar como soporte.", type: 'error'}); return; }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const fileUrl = reader.result;
        setMovimientos(movs => movs.map(mov => mov.id === movimientoId ? { ...mov, soporteEnviado: true } : mov));
        setSolicitudes(sols => sols.map(sol => sol.id_movimiento === movimientoId ? { ...sol, estado: 'enviado', url_foto: fileUrl, fileName: file.name, fileType: file.type } : sol));
    };
  };
  const handleSetFechaBloqueo = async (nuevaFecha) => {
  console.log("1. Intentando guardar la fecha de bloqueo. Fecha recibida:", nuevaFecha);

  const { error } = await supabase
    .from('config')
    .update({ fecha_bloqueo: nuevaFecha || null })
    .eq('id', 1);

  if (error) {
    console.error("2. ¡ERROR de Supabase al intentar actualizar!", error);
    setAlertInfo({ isOpen: true, title: 'Error al Guardar', message: `No se pudo guardar la fecha: ${error.message}`, type: 'error' });
  } else {
    console.log("3. ¡Éxito! La fecha se guardó en Supabase. Actualizando la vista.");
    setFechaBloqueo(nuevaFecha || null);
    setAlertInfo({ isOpen: true, title: 'Éxito', message: 'Fecha de bloqueo actualizada.', type: 'success' });
  }
};
  const handleSolicitarSoporte = (movimientoId) => {
    setMovimientos(movs => movs.map(mov => mov.id === movimientoId ? { ...mov, soporteRequerido: true } : mov));
    const existeSolicitud = solicitudes.some(s => s.id_movimiento === movimientoId);
    if (!existeSolicitud) {
        const nuevaSolicitud = {id: Date.now(), id_movimiento: movimientoId, estado: 'pendiente', url_foto: null};
        setSolicitudes(sols => [...sols, nuevaSolicitud]);
    }
  };

  const handleAnadirTercero = async (nuevoTercero) => {
  // Le quitamos el ID temporal que genera Date.now(), 
  // porque Supabase creará uno real y único.
  const { id, ...datosDelTercero } = nuevoTercero;

  // 1. Usamos Supabase para insertar el nuevo registro
  const { data, error } = await supabase
    .from('terceros')          // Elige la tabla correcta
    .insert(datosDelTercero)   // Inserta los datos sin el ID temporal
    .select()                  // Pide que te devuelva el registro recién creado
    .single();                 // Indica que solo esperas un resultado

  // 2. Manejamos el resultado
  if (error) {
    console.error('Error al añadir tercero:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // 3. Si todo va bien, actualizamos el estado local con el dato real de la BD
    setTerceros(prev => [...prev, data]);
  }
};
  const handleEditarTercero = async (terceroActualizado) => {
  // 1. Usamos Supabase para actualizar el registro
  const { data, error } = await supabase
    .from('terceros')                // Elige la tabla correcta
    .update(terceroActualizado)      // Pasa el objeto con los nuevos datos
    .eq('id', terceroActualizado.id) // Especifica CUÁL registro actualizar (el que tenga este ID)
    .select()                        // Pide que te devuelva el registro actualizado
    .single();

  // 2. Manejamos el resultado
  if (error) {
    console.error('Error al editar tercero:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // 3. Si todo va bien, actualizamos el estado local
    setTerceros(prev => prev.map(t => t.id === data.id ? data : t));
  }
};
  
  const handleAnadirMovimiento = async (mov) => {
  const sedeMovs = movimientos.filter(m => m.id_sede === mov.id_sede);
  const maxItem = sedeMovs.length > 0 ? Math.max(...sedeMovs.map(m => m.item_sede || 0)) : 0;

  const { data, error } = await supabase
    .from('movimientos')
    .insert({ ...mov, item_sede: maxItem + 1 })
    .select()
    .single();

  if (error) {
    console.error('Error al añadir movimiento:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setMovimientos(prev => [...prev, data]);
  }
};
  
  const handleEditarMovimiento = async (movimientoActualizado) => {
  // Separamos la propiedad 'type' que es solo para la UI
  const { type, ...datosParaActualizar } = movimientoActualizado;

  const { data, error } = await supabase
    .from('movimientos')
    .update(datosParaActualizar)
    .eq('id', datosParaActualizar.id)
    .select()
    .single();

  if (error) {
    console.error('Error al editar movimiento:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // Volvemos a añadir la propiedad 'type' para que la UI se actualice
    setMovimientos(prev => prev.map(m => m.id === data.id ? { ...data, type: 'gasto' } : m));
  }
};
  const handleEliminarMovimiento = async (movimientoId) => {
  const { error } = await supabase
    .from('movimientos')
    .delete()
    .eq('id', movimientoId);

  if (error) {
    console.error('Error al eliminar movimiento:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setMovimientos(prev => prev.filter(m => m.id !== movimientoId));
  }
};
const handleAnadirIngreso = async (ing) => {
  // 1. Usamos Supabase para insertar el nuevo ingreso
  const { data, error } = await supabase
    .from('ingresos') // Elige la tabla correcta
    .insert(ing)      // Inserta el nuevo ingreso
    .select()         // Pide que te devuelva el registro creado
    .single();

  // 2. Manejamos el resultado
  if (error) {
    console.error('Error al añadir ingreso:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // 3. Si todo va bien, actualizamos el estado local
    setIngresos(prev => [...prev, data]);
  }
};
  
  
const handleEditarIngreso = async (ingresoActualizado) => {
  // Solución: separamos la propiedad 'type' que es solo para la UI.
  const { type, ...datosParaActualizar } = ingresoActualizado;

  const { data, error } = await supabase
    .from('ingresos')
    .update(datosParaActualizar) // Solo enviamos los datos que existen en la tabla
    .eq('id', datosParaActualizar.id)
    .select()
    .single();

  if (error) {
    console.error('Error al editar ingreso:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // Volvemos a añadir la propiedad 'type' para que la UI se actualice correctamente
    setIngresos(prev => prev.map(i => i.id === data.id ? { ...data, type: 'ingreso' } : i));
  }
};
  const handleEliminarIngreso = async (ingresoId) => {
  const { error } = await supabase
    .from('ingresos')      // Elige la tabla
    .delete()              // Indica que quieres borrar
    .eq('id', ingresoId);  // Especifica CUÁL registro borrar

  if (error) {
    console.error('Error al eliminar ingreso:', error);
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    // Si todo va bien, quita el ingreso del estado local para actualizar la UI
    setIngresos(prev => prev.filter(i => i.id !== ingresoId));
  }
};
  
  const handleAnadirTipoGasto = async (nuevoTipo) => {
  // Nota: el ID lo genera Supabase, así que no necesitamos Date.now()
  const { data, error } = await supabase
    .from('tipos_gasto')
    .insert(nuevoTipo)
    .select()
    .single();

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setTiposGasto(prev => [...prev, data]);
  }
};
  
  const handleAnadirSede = (nuevaSede) => {
      setSedes(prev => [...prev, { ...nuevaSede, id: Date.now(), password: null, blocked: false }]);
  }

  const handleSeguridadSede = async (sedeId, action, value) => {
  let updateData = {};
  const sedeActual = sedes.find(s => s.id === sedeId);

  if (action === 'setPassword') {
    updateData.password = value;
  } else if (action === 'removePassword') {
    updateData.password = null;
  } else if (action === 'toggleBlock') {
    updateData.blocked = !sedeActual.blocked;
  }

  const { data, error } = await supabase
    .from('sedes')
    .update(updateData)
    .eq('id', sedeId)
    .select()
    .single();

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error de Seguridad', message: error.message, type: 'error'});
  } else {
    setSedes(prev => prev.map(s => s.id === sedeId ? data : s));
  }
};

  const handleCargaMasivaCuentas = async (jsonData) => {
  const nuevasCuentas = jsonData.map(item => ({
    numero: item.Numero_Cuenta,
    nombre: item.Nombre_Cuenta
  }));

  const { error } = await supabase.from('cuentas_contables').insert(nuevasCuentas);

  if (error) {
    setAlertInfo({ isOpen: true, title: 'Error de Carga Masiva', message: error.message, type: 'error' });
  } else {
    setAlertInfo({ isOpen: true, title: 'Éxito', message: 'Cuentas cargadas. Refrescando datos...', type: 'success' });
    // Volvemos a cargar los datos para ver los cambios
    const { data } = await supabase.from('cuentas_contables').select('*');
    if (data) setCuentasContables(data);
  }
};

  const handleCargaMasivaTerceros = async (jsonData) => {
  const nuevosTerceros = jsonData.map(item => ({
    id_sede_creacion: parseInt(item.ID_Sede),
    nit_cc: item.NIT_CC,
    nombre: item.Nombre,
    direccion: item.Direccion || '',
    telefono: item.Telefono || '',
    correo: item.Correo || ''
  }));

  const { error } = await supabase.from('terceros').insert(nuevosTerceros);

  if (error) {
    setAlertInfo({ isOpen: true, title: 'Error de Carga Masiva', message: error.message, type: 'error' });
  } else {
    setAlertInfo({ isOpen: true, title: 'Éxito', message: 'Terceros cargados. Refrescando datos...', type: 'success' });
    const { data } = await supabase.from('terceros').select('*');
    if (data) setTerceros(data);
  }
};

  const handleAnadirCuentaContable = async (nuevaCuenta) => {
  const { data, error } = await supabase
    .from('cuentas_contables')
    .insert(nuevaCuenta)
    .select()
    .single();

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setCuentasContables(prev => [...prev, data]);
  }
};
  
  const handleEditarCuentaContable = async (cuentaActualizada) => {
  const { data, error } = await supabase
    .from('cuentas_contables')
    .update(cuentaActualizada)
    .eq('id', cuentaActualizada.id)
    .select()
    .single();

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setCuentasContables(prev => prev.map(c => c.id === data.id ? data : c));
  }
};
const handleChangeAdminPassword = async (newPass) => {
  const { error } = await supabase
    .from('config')
    .update({ admin_password: newPass })
    .eq('id', 1); // Solo hay una fila de configuración

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setAdminPassword(newPass);
    setAlertInfo({isOpen: true, title: 'Éxito', message: 'Contraseña de administrador actualizada.', type: 'success'});
  }
};
  const handleEditarTipoGasto = async (tipoGastoActualizado) => {
  const { data, error } = await supabase
    .from('tipos_gasto')
    .update(tipoGastoActualizado)
    .eq('id', tipoGastoActualizado.id)
    .select()
    .single();

  if (error) {
    setAlertInfo({isOpen: true, title: 'Error', message: error.message, type: 'error'});
  } else {
    setTiposGasto(prev => prev.map(tg => tg.id === data.id ? data : tg));
  }
};

if (loading) {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex justify-center items-center text-xl">
      Cargando Datos...
    </div>
  );
}
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} sedes={sedes} adminPassword={adminPassword} />;
  }

  if (currentUser.id_usuario === 'ADMIN') {
      return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} movimientos={movimientos} ingresos={ingresos} solicitudes={solicitudes} handleSolicitarSoporte={handleSolicitarSoporte} viewDate={viewDate} setViewDate={setViewDate} terceros={terceros} tiposGasto={tiposGasto} cuentasContables={cuentasContables} handleAnadirTipoGasto={handleAnadirTipoGasto} sedes={sedes} handleSeguridadSede={handleSeguridadSede} adminPassword={adminPassword} handleChangeAdminPassword={handleChangeAdminPassword} handleAnadirSede={handleAnadirSede} handleCargaMasivaCuentas={handleCargaMasivaCuentas} handleCargaMasivaTerceros={handleCargaMasivaTerceros} setAlertInfo={setAlertInfo} handleEditarCuentaContable={handleEditarCuentaContable} handleEditarTipoGasto={handleEditarTipoGasto} fechaBloqueo={fechaBloqueo} handleSetFechaBloqueo={handleSetFechaBloqueo} handleAnadirCuentaContable={handleAnadirCuentaContable} />
  }

  return <SedeDashboard currentUser={currentUser} onLogout={handleLogout} movimientos={movimientos} ingresos={ingresos} solicitudes={solicitudes} handleEnviarSoporte={handleEnviarSoporte} viewDate={viewDate} setViewDate={setViewDate} terceros={terceros} handleAnadirTercero={handleAnadirTercero} handleEditarTercero={handleEditarTercero} handleAnadirMovimiento={handleAnadirMovimiento} handleAnadirIngreso={handleAnadirIngreso} tiposGasto={tiposGasto} cuentasContables={cuentasContables} sedes={sedes} handleEditarMovimiento={handleEditarMovimiento} handleEditarIngreso={handleEditarIngreso} fechaBloqueo={fechaBloqueo} handleEliminarMovimiento={handleEliminarMovimiento} handleEliminarIngreso={handleEliminarIngreso} setAlertInfo={setAlertInfo} />;
}
