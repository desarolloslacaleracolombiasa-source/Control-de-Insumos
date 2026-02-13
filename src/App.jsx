import React, { useState, useEffect, useMemo } from 'react';
import logo from '../LOGO CAALERA.png';
import { 
  Package, 
  Truck, 
  ClipboardList, 
  History, 
  Settings, 
  Plus, 
  Search, 
  ArrowRightLeft, 
  LogOut,
  Save,
  Trash2,
  Box,
  ChevronDown,
  User,
  Factory,
  MapPin,
  ChevronRight,
  AlertTriangle,
  FileText,
  Edit2,
  Database,
  Check
} from 'lucide-react';
import { supabase } from './supabaseClient';

// --- CONFIGURACIÓN INICIAL ---
const BODEGAS = [
  { id: 1, nombre: 'Terrapuerto', principal: true },
  { id: 2, nombre: 'Bogota Plaza', principal: false },
  { id: 3, nombre: 'Medellin', principal: false },
  { id: 4, nombre: 'Barranquilla', principal: false }
];

const DEFAULT_CATEGORIES = [
  { id: '0001', nombre: 'BANDEJAS' },
  { id: '0002', nombre: 'BOLSAS' },
  { id: '0003', nombre: 'CAJAS' },
  { id: '0004', nombre: 'CINTA' },
  { id: '0005', nombre: 'ESTUCHES' },
  { id: '0006', nombre: 'ETIQUETAS' },
  { id: '0007', nombre: 'MALLA ESPAÑOLA' },
  { id: '0008', nombre: 'VINIPEL' },
  { id: '0009', nombre: 'KIT EMPAQUE' }
];

const App = () => {
  // --- ESTADOS DE NAVEGACIÓN DE SEDES ---
  const [selectedBodega, setSelectedBodega] = useState(null);
  const [activeTab, setActiveTab] = useState('insumos');

  // --- ESTADOS PRINCIPALES ---
  const [insumos, setInsumos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [stockPorBodega, setStockPorBodega] = useState({}); // { sku: { bodegaId: cantidad } }

  // --- ESTADO PARA KARDEX ---
  const [kardexSku, setKardexSku] = useState('');
  const [showGeneralKardex, setShowGeneralKardex] = useState(false);

  // --- MODALES Y FORMULARIOS ---
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentInsumo, setCurrentInsumo] = useState({
    proveedorId: '001', 
    categoriaId: '0001',
    insumoId: '', 
    nombre: '',
    referencia: '',
    unidadPrincipal: '',
    cantidadPrincipal: 1,
    unidadSecundaria: '',
    factorConversion: 1,
    stockInicial: 0,
    stockCantidad: 0,
    stockUnidad: '',
    stockMinimo: 0,
    bodegaInicial: 1,
    fecha: new Date().toISOString().slice(0,10)
  });

  // Autocompleta datos si el SKU ya existe (local o remoto)
  const handleInsumoIdChange = async (nuevoInsumoId) => {
    const cleaned = nuevoInsumoId;
    // Construir SKU usando el proveedor y categoría actuales
    const prov = currentInsumo.proveedorId || '001';
    const cat = currentInsumo.categoriaId || '0001';
    const sku = generarSKU(prov, cat, cleaned);

    // 1) Buscar localmente primero
    const insumoLocal = insumos.find(i => i.sku === sku);
    if (insumoLocal) {
      setCurrentInsumo(prev => ({
        ...prev,
        insumoId: cleaned,
        nombre: insumoLocal.nombre,
        unidadPrincipal: insumoLocal.unidadPrincipal,
        cantidadPrincipal: insumoLocal.cantidadPrincipal,
        unidadSecundaria: insumoLocal.unidadSecundaria,
        factorConversion: insumoLocal.factorConversion,
        stockMinimo: insumoLocal.stockMinimo
      }));
      return;
    }

    // 2) Si no está local, consultar la DB remota por SKU
    try {
      const { data: remote, error } = await supabase.from('insumos').select('*').eq('sku', sku).maybeSingle();
      if (error) {
        console.error('Error buscando insumo remoto:', error);
      }
      if (remote) {
        const mapped = {
          proveedorId: remote.proveedor_id,
          categoriaId: remote.categoria_id,
          insumoId: remote.insumo_id,
          nombre: remote.nombre,
          unidadPrincipal: remote.unidad_principal,
          cantidadPrincipal: remote.cantidad_principal,
          unidadSecundaria: remote.unidad_secundaria,
          factorConversion: remote.factor_conversion,
          stockMinimo: remote.stock_minimo,
          sku: remote.sku
        };
        setCurrentInsumo(prev => ({ ...prev, ...mapped }));
        // Añadir al listado local si no existe para acelerar futuras búsquedas
        setInsumos(prev => (prev.find(i => i.sku === mapped.sku) ? prev : [...prev, mapped]));
        return;
      }
    } catch (e) {
      console.error('Excepción buscando insumo remoto:', e);
    }

    // 3) Si no se encontró en ningún lado, limpiar/establecer valores por defecto
    setCurrentInsumo(prev => ({
      ...prev,
      insumoId: cleaned,
      nombre: '',
      unidadPrincipal: '',
      cantidadPrincipal: 1,
      unidadSecundaria: '',
      factorConversion: 1,
      stockMinimo: 0
    }));
  };

  const [formData, setFormData] = useState({
    bodegaOrigen: 1,
    bodegaDestino: 2,
    clienteDestino: '001', 
    fecha: new Date().toISOString().slice(0,10),
    items: [{ sku: '', cantidad: '', unidad: '' }],
    observaciones: '',
    notaSiigo: ''
  });

  // --- ESTADO EDICION NOTA TRASLADO EN HISTORIAL ---
  const [editingNotaId, setEditingNotaId] = useState(null);
  const [tempNotaValue, setTempNotaValue] = useState('');

  // --- LÓGICA DE NEGOCIO ---
  const generarSKU = (prov, cat, insumo) => `${prov}-${cat}-${insumo}`;

  // Formatea números con separador de miles como punto: 19000 -> 19.000
  const formatNumber = (val) => {
    if (val === null || val === undefined || val === '') return '0';
    const s = String(val).replace(/,/g, '').replace(/\s+/g, '');
    if (s === '') return '0';
    if (isNaN(Number(s))) return val;
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join('.');
  };

  const showError = (err, prefix = 'Error') => {
    try {
      console.error(prefix, err);
      let msg = '';
      if (!err) {
        msg = '(objeto de error vacío)';
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message + '\n' + (err.stack || '');
      } else if (err.message || err.error || err.details || err.hint) {
        msg = [err.message, err.error, err.details, err.hint].filter(Boolean).join(' | ');
      } else {
        try {
          const props = Object.getOwnPropertyNames(err);
          if (props.length) {
            msg = props.map(k => `${k}: ${JSON.stringify(err[k])}`).join(' ; ');
          } else {
            msg = JSON.stringify(err);
          }
        } catch (e) {
          msg = String(err);
        }
      }
      alert(`${prefix}: ${msg}`);
    } catch (e) {
      console.error('showError failed', e);
      alert(prefix + ': (error desconocido)');
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Insumos
      const { data: insumosData, error: insumosError } = await supabase.from('insumos').select('*');
      if (insumosError) console.error('Error fetching insumos:', insumosError);
      else setInsumos((insumosData || []).map(i => ({
        sku: i.sku,
        proveedorId: i.proveedor_id,
        categoriaId: i.categoria_id,
        insumoId: i.insumo_id,
        nombre: i.nombre,
        unidadPrincipal: i.unidad_principal,
        cantidadPrincipal: i.cantidad_principal,
        unidadSecundaria: i.unidad_secundaria,
        factorConversion: i.factor_conversion,
        stockMinimo: i.stock_minimo,
      })));

      // Fetch Stock
      const { data: stockData, error: stockError } = await supabase.from('stock').select('*');
      if (stockError) console.error('Error fetching stock:', stockError);
      else {
        const stockMap = {};
        (stockData || []).forEach(s => {
          if (!stockMap[s.insumo_sku]) stockMap[s.insumo_sku] = {};
          stockMap[s.insumo_sku][s.bodega_id] = s.cantidad;
        });
        setStockPorBodega(stockMap);
      }

      // Fetch Categorias, Proveedores, Clientes (con fallback local si la tabla no existe)
      const { data: categoriasData, error: categoriasError } = await supabase.from('categorias').select('*');
      if (categoriasError) {
        console.error('Error fetching categorias:', categoriasError);
        setCategorias(DEFAULT_CATEGORIES);
      } else {
        setCategorias((categoriasData && categoriasData.length > 0) ? categoriasData : DEFAULT_CATEGORIES);
      }

      const { data: proveedoresData, error: proveedoresError } = await supabase.from('proveedores').select('*');
      if (proveedoresError) {
        console.error('Error fetching proveedores:', proveedoresError);
        setProveedores([]);
      } else {
        setProveedores(proveedoresData || []);
      }

      const { data: clientesData, error: clientesError } = await supabase.from('clientes').select('*');
      if (clientesError) {
        console.error('Error fetching clientes:', clientesError);
        setClientes([]);
      } else {
        setClientes(clientesData || []);
      }

      // Fetch Transacciones
      const { data: transaccionesData, error: transaccionesError } = await supabase
        .from('transacciones')
        .select(`*, transaccion_items(*), bodega_origen:bodega_origen_id(nombre), bodega_destino:bodega_destino_id(nombre), cliente:cliente_id(nombre)`)
        .order('fecha', { ascending: false });

      if (transaccionesError) console.error('Error fetching transactions:', transaccionesError);
      else {
        setTransacciones((transaccionesData || []).map(t => ({
          id: t.id,
          fecha: t.fecha ? (typeof t.fecha === 'string' ? t.fecha.slice(0,10) : '') : '',
          tipo: t.tipo,
          detalle: t.detalle,
          items: (t.transaccion_items || []).map(ti => ({ sku: ti.insumo_sku, cantidad: ti.cantidad })),
          observaciones: t.observaciones,
          notaSiigo: t.nota_siigo,
          bodegaOrigenId: t.bodega_origen_id,
          bodegaDestinoId: t.bodega_destino_id,
          clienteNombre: t.cliente ? t.cliente.nombre : '',
        })));
      }
    };
    fetchData();
    // Autorefresh cada 10 segundos
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log('activeTab initial:', activeTab);
  }, []);

  useEffect(() => {
    console.log('activeTab changed =>', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const clickLogger = (e) => {
      // log a short summary to avoid huge output
      const tag = e.target && e.target.tagName ? e.target.tagName : String(e.target);
      const cls = e.target && e.target.className ? (typeof e.target.className === 'string' ? e.target.className.split(' ').slice(0,3).join(' ') : '') : '';
      console.log('DOM click on:', tag, cls);
    };
    window.addEventListener('click', clickLogger);
    return () => window.removeEventListener('click', clickLogger);
  }, []);

  const agregarTransaccion = async (tipo, data) => {
    // Asegura que el id del cliente se guarde correctamente en CONSUMO y exista en la tabla clientes
    let clienteId = null;
    if (tipo === 'CONSUMO') {
      // Forzar clienteDestino como string y comparar como string, sin padStart
      if (data.clienteDestino && String(data.clienteDestino).trim() !== '') {
        clienteId = String(data.clienteDestino).trim();
      } else if (formData && formData.clienteDestino && String(formData.clienteDestino).trim() !== '') {
        clienteId = String(formData.clienteDestino).trim();
      } else {
        clienteId = null;
      }
      // Validar que el cliente exista en la lista de clientes (aceptando coincidencia por string o número)
      if (
        clienteId &&
        !clientes.some(c =>
          String(c.id) === clienteId ||
          String(clienteId) === String(c.id) ||
          Number(c.id) === Number(clienteId)
        )
      ) {
        showError('El cliente seleccionado no existe en la base de datos. Por favor, verifique o cree el cliente en el maestro.', 'Cliente no válido');
        return false;
      }
    } else if (data.clienteDestino && String(data.clienteDestino).trim() !== '') {
      clienteId = String(data.clienteDestino).trim();
    }
    if (clienteId === '') clienteId = null;
    const insertObj = {
      tipo: tipo,
      detalle: data.detalle,
      observaciones: data.observaciones,
      nota_siigo: data.notaSiigo,
      bodega_origen_id: data.bodegaOrigenId,
      bodega_destino_id: data.bodegaDestinoId,
      // Guardar la fecha como string ISO con hora 00:00:00Z si viene en formato YYYY-MM-DD
      fecha: (data.fecha && typeof data.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) ? (data.fecha + 'T00:00:00.000Z') : data.fecha
    };
    // Solo agregar cliente_id si es CONSUMO y existe clienteId
    if (tipo === 'CONSUMO' && clienteId) {
      insertObj.cliente_id = isNaN(clienteId) ? clienteId : Number(clienteId);
    }
    const { data: transaccion, error } = await supabase
      .from('transacciones')
      .insert(insertObj)
      .select().single();

    if (error) {
      let msg = (error.message || '') + '\n' + (error.details || '') + '\n' + (error.hint || '') + '\n' + JSON.stringify(error);
      alert("Error al crear la transacción: " + msg);
      console.error("Error creating transaction: ", error);
      return false;
    }

    if(data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        transaccion_id: transaccion.id,
        insumo_sku: item.sku,
        cantidad: item.cantidad
      }));
      const { error: itemsError } = await supabase.from('transaccion_items').insert(itemsToInsert);
      if (itemsError) {
        let msg = itemsError.message || itemsError.details || JSON.stringify(itemsError);
        alert("Error al crear los items de la transacción: " + msg);
        console.error("Error creating transaction items: ", itemsError);
        return false;
      }
    }
    // Refresh transactions from DB
    const { data: transaccionesData } = await supabase
      .from('transacciones')
      .select(`*, transaccion_items(*), bodega_origen:bodega_origen_id(nombre), bodega_destino:bodega_destino_id(nombre), cliente:cliente_id(nombre)`)
      .order('fecha', { ascending: false });
    setTransacciones((transaccionesData || []).map(t => ({
        id: t.id,
        fecha: t.fecha ? (typeof t.fecha === 'string' ? t.fecha.slice(0,10) : '') : '',
        tipo: t.tipo,
        detalle: t.detalle,
        items: (t.transaccion_items || []).map(ti => ({ sku: ti.insumo_sku, cantidad: ti.cantidad })),
        observaciones: t.observaciones,
        notaSiigo: t.nota_siigo,
        bodegaOrigenId: t.bodega_origen_id,
        bodegaDestinoId: t.bodega_destino_id,
        clienteNombre: t.cliente ? t.cliente.nombre : '',
      })));
    return true;
  };

  const handleCreateInsumo = async (e) => {
    e.preventDefault();
    const sku = generarSKU(currentInsumo.proveedorId, currentInsumo.categoriaId, currentInsumo.insumoId);
    const qtyIngreso = convertirAPrincipal(currentInsumo.stockCantidad || currentInsumo.stockInicial || 0, currentInsumo.stockUnidad || currentInsumo.unidadPrincipal, currentInsumo);
    const bId = currentInsumo.bodegaInicial;

    if (isEditing) {
      // Update insumo master data
      const { error } = await supabase
        .from('insumos')
        .update({
          nombre: currentInsumo.nombre,
          unidad_principal: currentInsumo.unidadPrincipal,
          cantidad_principal: currentInsumo.cantidadPrincipal,
          unidad_secundaria: currentInsumo.unidadSecundaria,
          factor_conversion: currentInsumo.factorConversion,
          stock_minimo: currentInsumo.stockMinimo,
        })
        .eq('sku', currentInsumo.sku);

      if (error) {
        showError(error, 'Error actualizando el insumo');
        return;
      }
      setInsumos(prev => prev.map(ins => ins.sku === currentInsumo.sku ? { ...currentInsumo, sku } : ins));
      await agregarTransaccion('EDICIÓN', { sku, detalle: `Modificación de datos maestros del insumo`, fecha: currentInsumo.fecha.slice(0,10) });
      alert("Insumo actualizado correctamente");

    } else { // Creating new or adding stock
        const { data: insumoExistente, error: findError } = await supabase.from('insumos').select('sku').eq('sku', sku).maybeSingle();
      
        if (findError) {
          alert("Error al verificar insumo: " + (findError.message || JSON.stringify(findError)));
          return;
        }

      if (insumoExistente) { // Insumo exists, just add stock
        const { data: stockActual, error: stockError } = await supabase
          .from('stock')
          .select('cantidad')
          .eq('insumo_sku', sku)
          .eq('bodega_id', bId)
          .single();
        
        const nuevaCantidad = (stockActual ? stockActual.cantidad : 0) + qtyIngreso;
        
        const { error: updateError } = await supabase
          .from('stock')
          .upsert({ insumo_sku: sku, bodega_id: bId, cantidad: nuevaCantidad }, { onConflict: 'insumo_sku,bodega_id' });
        
        if(updateError) {
          showError(updateError, 'Error actualizando stock');
          return;
        }

        setStockPorBodega(prev => ({
            ...prev,
            [sku]: { ...(prev[sku] || {}), [bId]: nuevaCantidad }
        }));
        await agregarTransaccion('INGRESO', { sku, detalle: `Ingreso de stock en ${BODEGAS.find(b => b.id == bId).nombre}`, cantidad: qtyIngreso, bodegaDestinoId: bId, fecha: currentInsumo.fecha.slice(0,10) });
        alert("Stock incrementado correctamente para el código existente.");

      } else { // New insumo, create it and add initial stock
        // Ensure the referenced proveedor exists to avoid foreign-key violation 23503
        const provId = currentInsumo.proveedorId;
        if (provId) {
          const { data: provData, error: provError } = await supabase.from('proveedores').select('id').eq('id', provId).maybeSingle();
          if (provError) {
            showError(provError, 'Error verificando proveedor');
            return;
          }
          if (!provData) {
            // Insert a minimal proveedor record so FK constraint is satisfied.
            const { data: createdProv, error: createProvError } = await supabase.from('proveedores').insert({ id: provId, nombre: `Proveedor ${provId}` }).select().maybeSingle();
            if (createProvError) {
              showError(createProvError, 'Error creando proveedor automático');
              return;
            }
            setProveedores(prev => [...prev, createdProv]);
          }
        }

        // Use upsert to avoid race-condition duplicate-key (409) when two clients
        // try to create the same SKU at the same time. Return the created record.
        const { data: insertedInsumo, error: insumoError } = await supabase
          .from('insumos')
          .upsert({
            sku: sku,
            proveedor_id: currentInsumo.proveedorId,
            categoria_id: currentInsumo.categoriaId,
            insumo_id: currentInsumo.insumoId,
            nombre: currentInsumo.nombre,
            unidad_principal: currentInsumo.unidadPrincipal,
            cantidad_principal: currentInsumo.cantidadPrincipal,
            unidad_secundaria: currentInsumo.unidadSecundaria,
            factor_conversion: currentInsumo.factorConversion,
            stock_minimo: currentInsumo.stockMinimo,
          }, { onConflict: 'sku' })
          .select()
          .maybeSingle();

        if (insumoError) {
          showError(insumoError, 'Error creando el nuevo insumo');
          return;
        }
        
        // Use upsert for stock as well to avoid unique-constraint conflicts
        const { error: stockError } = await supabase
          .from('stock')
          .upsert({ insumo_sku: sku, bodega_id: bId, cantidad: qtyIngreso }, { onConflict: 'insumo_sku,bodega_id' });

        if (stockError) {
          showError(stockError, 'Error creando el stock inicial');
          return;
        }
        
        const nuevoInsumoDb = { ...currentInsumo, sku };
        setInsumos([...insumos, nuevoInsumoDb]);
        setStockPorBodega(prev => ({
          ...prev,
          [sku]: { ...(prev[sku] || {}), [bId]: qtyIngreso }
        }));
        const detalleCreacion = `Creación inicial en ${BODEGAS.find(b => b.id == bId).nombre}${currentInsumo.referencia ? ' | Ref: '+currentInsumo.referencia : ''}`;
        await agregarTransaccion('CREACIÓN', { sku, detalle: detalleCreacion, cantidad: qtyIngreso, bodegaDestinoId: bId, fecha: currentInsumo.fecha.slice(0,10) });
        alert("Nuevo insumo registrado con éxito.");
      }
    }

    setShowModal(false);
    setIsEditing(false);
    setCurrentInsumo({
      proveedorId: '001', categoriaId: '0001', insumoId: '', nombre: '', referencia: '',
      unidadPrincipal: '', cantidadPrincipal: 1, unidadSecundaria: '', factorConversion: 1,
      stockInicial: 0, stockCantidad: 0, stockUnidad: '', stockMinimo: 0, bodegaInicial: selectedBodega ? selectedBodega.id : 1, fecha: new Date().toISOString().slice(0,10)
    });
  };

  const openEditModal = (insumo) => {
    setCurrentInsumo(insumo);
    setIsEditing(true);
    setShowModal(true);
  };

  // ...dentro del render del modal de insumo, cambia el input de insumoId:
  // Busca el input de insumoId y reemplaza onChange por handleInsumoIdChange

  const procesarMovimiento = (tipo) => {
    if (formData.items.some(i => !i.sku || i.cantidad <= 0)) {
      alert("Verifique que todos los items tengan código y cantidad mayor a 0");
      return;
    }

    let itemsAProcesar = [];

    for (const item of formData.items) {
      const { sku, cantidad } = item;
      const qtyRaw = parseFloat(cantidad) || 0;
      const insumoData = insumos.find(i => i.sku === sku);
      const unidadItem = item.unidad || (insumoData ? insumoData.unidadPrincipal : '');
      const qty = convertirAPrincipal(qtyRaw, unidadItem, insumoData);
      const bOriId = formData.bodegaOrigen.toString();
      const stockActual = stockPorBodega[sku]?.[bOriId] || 0;
      const stockMinimo = parseFloat(insumoData?.stockMinimo || 0);

      if (stockActual < qty) {
        alert(`Stock insuficiente para ${sku} en la bodega seleccionada (Disponible: ${stockActual})`);
        return;
      }

      if (tipo === 'CONSUMO' && (stockActual - qty) < stockMinimo) {
        const confirmacion = window.confirm(`ALERTA: El stock resultante (${stockActual - qty}) para ${sku} quedará por debajo del mínimo (${stockMinimo}). ¿Desea continuar?`);
        if (!confirmacion) return;
      }

      itemsAProcesar.push({ sku, cantidad: qty });
    }

    // Calcular detalleHistorial antes de usarlo
    const clienteNombre = clientes.find(c => c.id === formData.clienteDestino)?.nombre || 'Desconocido';
    const bodegaOrigenNombre = BODEGAS.find(b => b.id == formData.bodegaOrigen)?.nombre || 'Desconocida';
    const bodegaDestinoNombre = BODEGAS.find(b => b.id == formData.bodegaDestino)?.nombre || 'Desconocida';

    let detalleHistorial = "";
    if (tipo === 'CONSUMO') {
      detalleHistorial = `CONSUMO: ${clienteNombre} (Sede: ${bodegaOrigenNombre})`;
    } else if (tipo === 'TRASLADO') {
      detalleHistorial = `TRASLADO: ${bodegaOrigenNombre} -> ${bodegaDestinoNombre}`;
    }

    // Solo descontar stock si la transacción fue exitosa
    agregarTransaccion(tipo, { 
      detalle: detalleHistorial,
      items: itemsAProcesar,
      observaciones: formData.observaciones,
      notaSiigo: '',
      bodegaOrigenId: formData.bodegaOrigen,
      bodegaDestinoId: tipo === 'TRASLADO' ? formData.bodegaDestino : null,
      fecha: formData.fecha.slice(0,10),
      clienteDestino: formData.clienteDestino
    }).then(success => {
      if (success) {
        setStockPorBodega(prevStock => {
          const nuevoStockGlobal = { ...prevStock };
          itemsAProcesar.forEach(item => {
            const { sku, cantidad } = item;
            const bOriId = formData.bodegaOrigen.toString();
            const bDestId = formData.bodegaDestino.toString();
            const stockActualInsumo = nuevoStockGlobal[sku] || {};
            const nuevoStockInsumo = { ...stockActualInsumo };
            const stockOrigen = parseFloat(nuevoStockInsumo[bOriId] || 0);
            const cantidadMovimiento = parseFloat(cantidad);
            nuevoStockInsumo[bOriId] = stockOrigen - cantidadMovimiento;
            if (tipo === 'TRASLADO') {
              const stockDestino = parseFloat(nuevoStockInsumo[bDestId] || 0);
              nuevoStockInsumo[bDestId] = stockDestino + cantidadMovimiento;
            }
            nuevoStockGlobal[sku] = nuevoStockInsumo;
          });
          return nuevoStockGlobal;
        });
        setFormData({ 
          bodegaOrigen: selectedBodega.id, 
          bodegaDestino: BODEGAS.find(b => b.id != selectedBodega.id)?.id || 2, 
          clienteDestino: '001',
          fecha: new Date().toISOString().slice(0,10),
          items: [{ sku: '', cantidad: 0, unidad: '' }], 
          observaciones: '',
        });
        alert("Movimiento procesado correctamente.");
      }
    });
  };

  const exportToCSV = (filename, rows, headers) => {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? '' : String(r[h]).replace(/"/g,'""');
      return `"${v}"`;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const convertirAPrincipal = (cantidad, unidad, insumo) => {
    if (!insumo) return parseFloat(cantidad) || 0;
    const val = parseFloat(cantidad) || 0;
    const unit = (unidad || '').toString().toLowerCase();
    const up = (insumo.unidadPrincipal || '').toString().toLowerCase();
    const us = (insumo.unidadSecundaria || '').toString().toLowerCase();
    if (unit === up) return val;
    if (unit === us && insumo.factorConversion) return val / (parseFloat(insumo.factorConversion) || 1);
    // conversiones comunes entre metros/centimetros
    if ((unit === 'cm' || unit === 'centimetros') && (up === 'm' || up === 'metros')) return val / 100;
    if ((unit === 'm' || unit === 'metros') && (up === 'cm' || up === 'centimetros')) return val * 100;
    // gramos <-> kilos
    if ((unit === 'g' || unit === 'gramos') && (up === 'kg' || up === 'kilogramos')) return val / 1000;
    if ((unit === 'kg' || unit === 'kilogramos') && (up === 'g' || up === 'gramos')) return val * 1000;
    return val;
  };

  const getReferenceForSku = (sku) => {
    // Try local insumo first
    const local = insumos.find(i => i.sku === sku);
    if (local && local.referencia) return local.referencia;
    // Otherwise check creation transactions for a 'Ref:' pattern
    for (const t of transacciones) {
      if ((t.tipo === 'CREACIÓN' || t.tipo === 'CREACION' || t.tipo === 'CREACIÓN') && t.items && t.items.some(it => it.sku === sku)) {
        const m = (t.detalle || '').match(/Ref:\s*([^|]+)/i);
        if (m && m[1]) return m[1].trim();
      }
    }
    return '';
  };

  const computeUnitsForTransaction = (t) => {
    let entrada = 0;
    let salida = 0;
    const actualSede = String(selectedBodega.id);
    const origenId = t.bodegaOrigenId ? String(t.bodegaOrigenId) : null;
    const destinoId = t.bodegaDestinoId ? String(t.bodegaDestinoId) : null;
    const items = t.items || [];
    for (const it of items) {
      const qty = parseFloat(it.cantidad) || 0;
      if (t.tipo === 'CONSUMO') {
        if (origenId === actualSede) salida += qty;
      } else if (t.tipo === 'TRASLADO') {
        if (origenId === actualSede) salida += qty;
        else if (destinoId === actualSede) entrada += qty;
      } else if (t.tipo === 'CREACIÓN' || t.tipo === 'CREACION' || t.tipo === 'INGRESO') {
        if (destinoId === actualSede || (t.sku && t.bodegaDestinoId == selectedBodega.id)) entrada += qty;
      }
    }
    if (entrada > 0 && salida === 0) return `+${formatNumber(entrada)}`;
    if (salida > 0 && entrada === 0) return `-${formatNumber(salida)}`;
    if (entrada > 0 && salida > 0) return `+${formatNumber(entrada)} / -${formatNumber(salida)}`;
    return '';
  };

  const exportHistoryCSV = () => {
    const rows = transacciones.map(t => ({
      Fecha: t.fecha,
      Tipo: t.tipo,
      Detalle: t.detalle,
      Items: (t.items || []).map(it => `${formatNumber(it.cantidad)} x ${it.sku}`).join(' | '),
      Nota: t.notaSiigo || '',
      Observaciones: t.observaciones || ''
    }));
    exportToCSV('historial.csv', rows, ['Fecha','Tipo','Detalle','Items','Nota','Observaciones']);
  };

  const exportKardexCSV = () => {
    // Helper para formatear fecha solo como DD/MM/YYYY
    const formatFecha = (f) => {
      if (!f) return '';
      let s = typeof f === 'string' ? f.slice(0,10) : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
      return s;
    };
    if (showGeneralKardex) {
      const rows = transacciones.flatMap(t => (t.items || []).map(it => ({
        Fecha: formatFecha(t.fecha),
        SKU: it.sku,
        Nombre: (insumos.find(i => i.sku === it.sku)?.nombre) || '',
        Tipo: t.tipo,
        Origen: BODEGAS.find(b => b.id == t.bodegaOrigenId)?.nombre || '',
        Destino: BODEGAS.find(b => b.id == t.bodegaDestinoId)?.nombre || '',
        Cliente: t.clienteNombre || '',
        Cantidad: formatNumber(it.cantidad)
      })));
      exportToCSV('kardex_general.csv', rows, ['Fecha','SKU','Nombre','Tipo','Origen','Destino','Cliente','Cantidad']);
    } else if (kardexSku) {
      const rows = transacciones.filter(t => t.sku === kardexSku || (t.items && t.items.some(it => it.sku === kardexSku))).map(t => {
        const it = (t.items || []).find(i => i.sku === kardexSku);
        const cantidad = it ? formatNumber(it.cantidad) : formatNumber(t.cantidad || '');
        return {
          Fecha: formatFecha(t.fecha),
          Tipo: t.tipo,
          Detalle: t.detalle,
          Cliente: t.clienteNombre || '',
          Cantidad: cantidad,
          Observaciones: t.observaciones || ''
        };
      });
      exportToCSV(`kardex_${kardexSku}.csv`, rows, ['Fecha','Tipo','Detalle','Cliente','Cantidad','Observaciones']);
    } else {
      alert('Seleccione un SKU o active Kardex General para exportar');
    }
  };

  const handleUpdateNotaSiigo = (id) => {
    setTransacciones(prev => prev.map(t => t.id === id ? { ...t, notaSiigo: tempNotaValue } : t));
    setEditingNotaId(null);
  };

  if (!selectedBodega) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <img src={logo} alt="Logo" className="w-48 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Sistema De Gestion De Insumos</h1>
            <p className="text-slate-400 text-lg">Seleccione la sede de operación para continuar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BODEGAS.map((bodega) => (
              <button
                key={bodega.id}
                onClick={() => setSelectedBodega(bodega)}
                className={`group rounded-lg p-6 border transition ${bodega.principal ? 'bg-emerald-600 border-emerald-400 hover:scale-[1.02] shadow-xl shadow-emerald-900/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${bodega.principal ? 'bg-white/20' : 'bg-slate-800'}`}>
                    <MapPin className={bodega.principal ? 'text-white' : 'text-emerald-400'} />
                  </div>
                  {bodega.principal && (
                    <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sede Principal</span>
                  )}
                </div>
                <h3 className={`text-2xl font-bold mb-1 ${bodega.principal ? 'text-white' : 'text-slate-200'}`}>{bodega.nombre}</h3>
                <p className={`text-sm ${bodega.principal ? 'text-emerald-100' : 'text-slate-500'}`}>Gestión de inventarios y logística</p>
                <div className="mt-6 flex items-center gap-2 font-bold text-sm">
                  <span className={bodega.principal ? 'text-white' : 'text-emerald-400'}>Ingresar al sistema</span>
                  <ChevronRight size={16} className={`transition-transform group-hover:translate-x-1 ${bodega.principal ? 'text-white' : 'text-emerald-400'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const Navbar = () => (
    <nav className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSelectedBodega(null)}
          className="hover:bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Cambiar Sede"
        >
          <ArrowRightLeft size={20} />
        </button>
        <div className="h-6 w-px bg-slate-700 mx-2"></div>
        <div className="flex items-center gap-2">
          <Package className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">Sistema De Gestion De Insumos</h1>
        </div>
        <div className="ml-4 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Sede: {selectedBodega.nombre}</span>
        </div>
      </div>
      <div className="flex gap-4">
        {[
          { id: 'insumos', icon: Box, label: 'Insumos' },
          { id: 'traslados', icon: ArrowRightLeft, label: 'Traslados' },
          { id: 'consumos', icon: LogOut, label: 'Consumos' },
          { id: 'kardex', icon: FileText, label: 'Kardex' },
          { id: 'historial', icon: History, label: 'Historial' },
          { id: 'maestro', icon: Settings, label: 'Maestro' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { console.log('cambiar-tab:', item.id); setActiveTab(item.id); }}
            className={`flex items-center gap-2 px-3 py-1 rounded-md transition-all ${activeTab === item.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <item.icon size={18} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  class ErrorBoundary extends React.Component {
    constructor(props){
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(error, info) {
      console.error('ErrorBoundary caught:', error, info);
    }
    render() {
      if (this.state.error) {
        return (
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-6">
              <h3 className="font-bold mb-2">Se produjo un error al renderizar este módulo</h3>
              <div className="text-sm whitespace-pre-wrap">{String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}</div>
              <details className="mt-2 text-xs text-slate-600">
                <summary>Stack</summary>
                <pre className="text-xs">{this.state.error && this.state.error.stack}</pre>
              </details>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <ErrorBoundary>
      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-4 p-3 rounded-lg bg-slate-100 border text-sm text-slate-700">
          <strong className="font-bold">DEBUG:</strong> activeTab = {activeTab} —
          {` insumos:${String(activeTab==='insumos')} traslados:${String(activeTab==='traslados')} consumos:${String(activeTab==='consumos')} kardex:${String(activeTab==='kardex')} historial:${String(activeTab==='historial')} maestro:${String(activeTab==='maestro')}`}
        </div>
        {activeTab === 'insumos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Inventario en {selectedBodega.nombre}</h2>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setCurrentInsumo({
                    proveedorId: '001', categoriaId: '0001', insumoId: '', nombre: '', referencia: '',
                    unidadPrincipal: '', cantidadPrincipal: 1, unidadSecundaria: '', factorConversion: 1,
                    stockInicial: 0, stockCantidad: 0, stockUnidad: '', stockMinimo: 0, bodegaInicial: selectedBodega.id, fecha: new Date().toISOString().slice(0,10)
                  });
                  setShowModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
              >
                <Plus size={20} /> Nuevo Insumo / Ingreso
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold text-sm">Código (SKU)</th>
                    <th className="p-4 font-semibold text-sm">Nombre Insumo</th>
                    <th className="p-4 font-semibold text-sm">Stock Mínimo</th>
                    <th className="p-4 font-semibold text-sm">Equivalencia</th>
                    <th className="p-4 font-semibold text-sm text-center">Stock Real (Sede)</th>
                    <th className="p-4 font-semibold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insumos.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No hay insumos registrados.</td></tr>
                  ) : insumos.map(insumo => {
                    const stockEnSede = stockPorBodega[insumo.sku]?.[selectedBodega.id] || 0;
                    const esCritico = stockEnSede <= parseFloat(insumo.stockMinimo);
                    return (
                      <tr key={insumo.sku} className={`hover:bg-slate-50 transition-colors ${esCritico ? 'bg-rose-50/50' : ''}`}>
                        <td className="p-4 font-mono text-xs font-bold text-emerald-700">
                          <div className="flex items-center gap-2">
                            {insumo.sku}
                            {esCritico && <AlertTriangle size={14} className="text-rose-500" title="Bajo Stock Mínimo" />}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium">{insumo.nombre}</td>
                        <td className="p-4 text-sm font-bold text-slate-600">{formatNumber(insumo.stockMinimo)}</td>
                        <td className="p-4 text-sm text-slate-500">
                          {insumo.factorConversion} {insumo.unidadSecundaria}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${esCritico ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                            {formatNumber(stockEnSede)}
                          </span>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => openEditModal(insumo)}
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Editar Insumo"
                          >
                            <Edit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'traslados' || activeTab === 'consumos') && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className={`p-6 text-white ${activeTab === 'traslados' ? 'bg-blue-600' : 'bg-rose-600'}`}>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {activeTab === 'traslados' ? <ArrowRightLeft /> : <LogOut />}
                Nueva Orden de {activeTab.toUpperCase()}
              </h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Bodega Origen</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border rounded-lg"
                    value={formData.bodegaOrigen}
                    onChange={e => setFormData({...formData, bodegaOrigen: e.target.value})}
                  >
                    {BODEGAS.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
                {activeTab === 'traslados' ? (
                  <div>
                    <label className="block text-sm font-bold mb-2">Bodega Destino</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border rounded-lg"
                      value={formData.bodegaDestino}
                      onChange={e => setFormData({...formData, bodegaDestino: e.target.value})}
                    >
                      {BODEGAS.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold mb-2">Cliente Destino</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border rounded-lg border-rose-200 focus:border-rose-500"
                      value={formData.clienteDestino}
                      onChange={e => setFormData({...formData, clienteDestino: e.target.value})}
                    >
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.id})</option>)}
                    </select>
                    <div className="mt-2">
                      <label className="block text-sm font-bold mb-1">Fecha</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border rounded" 
                        value={formData.fecha}
                        onChange={e => {
                          // Solo aceptar fechas válidas en formato YYYY-MM-DD
                          const val = e.target.value;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                            setFormData(f => ({...f, fecha: val}));
                          }
                        }}
                        onBlur={e => {
                          // Si la fecha no es válida, restaurar la anterior
                          if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                            setFormData(f => ({...f, fecha: new Date().toISOString().slice(0,10)}));
                          }
                        }}
                        min="2020-01-01"
                        max="2100-12-31"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold">Items a procesar</label>
                  <button 
                    onClick={() => setFormData(f => ({...f, items: [...f.items, { sku: '', cantidad: '', unidad: '' }]}))}
                    className="text-emerald-600 flex items-center gap-1 text-sm font-bold"
                  >
                    <Plus size={16} /> Añadir Item
                  </button>
                </div>
                {formData.items.map((item, index) => {
                  const insumoSel = insumos.find(i => i.sku === item.sku);
                  const saldoSede = (item.sku && stockPorBodega[item.sku]) ? (stockPorBodega[item.sku][formData.bodegaOrigen] || 0) : 0;
                  return (
                    <div key={index} className="space-y-2 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Insumo (SKU)</label>
                          <select 
                            className="w-full p-2 bg-white border rounded"
                            value={item.sku}
                            onChange={e => {
                              const newItems = [...formData.items];
                              newItems[index].sku = e.target.value;
                              const sel = insumos.find(i => i.sku === e.target.value);
                              newItems[index].unidad = sel ? sel.unidadPrincipal : '';
                              setFormData(f => ({...f, items: newItems}));
                            }}
                          >
                            <option value="">Seleccione...</option>
                            {insumos.map(i => (
                              <option key={i.sku} value={i.sku}>{i.sku} - {i.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-28 px-2 py-1 bg-white border rounded flex flex-col justify-center items-center shadow-inner h-[42px]">
                          <span className="text-[8px] uppercase font-black text-slate-400 leading-none mb-1 text-center">Saldo Actual</span>
                          <div className="flex items-center gap-1">
                            <Database size={10} className={saldoSede > 0 ? "text-emerald-500" : "text-slate-300"} />
                            <span className={`text-xs font-black ${saldoSede > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {formatNumber(saldoSede)}
                            </span>
                          </div>
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Cantidad</label>
                          <input 
                            type="text"
                            inputMode="numeric"
                            className="w-full p-2 bg-white border rounded"
                            placeholder="0.00"
                            defaultValue={item.cantidad == null ? '' : item.cantidad}
                            onBlur={e => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setFormData(f => {
                                const newItems = [...f.items];
                                newItems[index] = { ...newItems[index], cantidad: val };
                                return { ...f, items: newItems };
                              });
                            }}
                          />
                        </div>
                        <div className="w-36">
                          <label className="text-[10px] uppercase font-bold text-slate-400">Unidad</label>
                          <select className="w-full p-2 bg-white border rounded" value={item.unidad || ''} onChange={e => {
                            const newItems = [...formData.items];
                            newItems[index].unidad = e.target.value;
                            setFormData(f => ({...f, items: newItems}));
                          }}>
                            <option value="">Seleccione...</option>
                            {insumoSel && <option value={insumoSel.unidadPrincipal}>{insumoSel.unidadPrincipal}</option>}
                            {insumoSel && insumoSel.unidadSecundaria && <option value={insumoSel.unidadSecundaria}>{insumoSel.unidadSecundaria}</option>}
                            <option value="unidad">unidad</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="m">m</option>
                            <option value="cm">cm</option>
                          </select>
                        </div>
                        <button 
                          onClick={() => setFormData(f => ({...f, items: f.items.filter((_, i) => i !== index)}))}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      {insumoSel && (
                        <div className="grid grid-cols-2 gap-4 pt-1 animate-in slide-in-from-top-1 duration-200">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Medida 1 (Unidad)</label>
                            <div className="flex gap-1">
                              <div className="w-12 p-1.5 bg-slate-200/50 border rounded text-xs text-slate-600 text-center font-bold">
                                {insumoSel.cantidadPrincipal}
                              </div>
                              <div className="flex-1 p-1.5 bg-slate-200/50 border rounded text-xs text-slate-600 font-medium truncate">
                                {insumoSel.unidadPrincipal}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Equivalencia / Factor</label>
                            <div className="flex gap-1">
                              <div className="w-16 p-1.5 bg-slate-200/50 border rounded text-xs text-slate-600 text-center font-bold">
                                {insumoSel.factorConversion}
                              </div>
                              <div className="flex-1 p-1.5 bg-slate-200/50 border rounded text-xs text-slate-600 font-medium truncate">
                                {insumoSel.unidadSecundaria}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Observaciones</label>
                <textarea 
                  className="w-full p-3 bg-slate-50 border rounded-lg h-20"
                  placeholder="Detalles adicionales..."
                  value={formData.observaciones}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                />
              </div>
              <button
                onClick={() => procesarMovimiento(activeTab === 'traslados' ? 'TRASLADO' : 'CONSUMO')}
                className={`w-full mt-6 font-bold py-3 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 text-white ${activeTab === 'traslados' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                <Check size={20} /> Procesar {activeTab.slice(0, -1).toUpperCase()}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'kardex' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="text-indigo-600" /> Kardex por Producto</h2>
                <div className="flex gap-2 w-1/2">
                <Search size={20} className="text-slate-400 mt-2" />
                <select 
                  className="w-full p-2 bg-white border rounded-lg shadow-sm font-bold text-slate-700"
                  value={kardexSku}
                  onChange={e => { setKardexSku(e.target.value); setShowGeneralKardex(false); }}
                >
                  <option value="">Seleccione un insumo para consultar...</option>
                  {insumos.map(i => <option key={i.sku} value={i.sku}>{i.sku} | {i.nombre}</option>)}
                </select>
                <button
                  onClick={() => { setShowGeneralKardex(v => { const nv = !v; if(nv) setKardexSku(''); return nv; }); }}
                  className="ml-2 px-3 py-2 bg-slate-100 border rounded text-sm font-bold hover:bg-slate-200"
                >{showGeneralKardex ? 'Ver por Producto' : 'Ver Kardex General'}</button>
                <button onClick={exportKardexCSV} className="ml-2 px-3 py-2 bg-emerald-600 text-white rounded text-sm font-bold hover:bg-emerald-700">Exportar CSV</button>
              </div>
            </div>

            {showGeneralKardex ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insumos.map(p => {
                    const stockTotal = Object.values(stockPorBodega[p.sku] || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                    const stockSedeActual = stockPorBodega[p.sku]?.[selectedBodega.id] || 0;
                    const esCritico = stockSedeActual <= parseFloat(p.stockMinimo || 0);
                    const referencia = getReferenceForSku(p.sku);
                    return (
                      <div key={p.sku} className={`bg-white rounded-xl border p-4 shadow-sm ${esCritico ? 'ring-rose-50' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-[10px] uppercase font-black text-slate-400">SKU</div>
                            <div className="font-mono font-bold text-emerald-700">{p.sku}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-black text-slate-400">Stock Sede</div>
                            <div className={`text-lg font-black ${esCritico ? 'text-rose-600' : 'text-emerald-700'}`}>{formatNumber(stockSedeActual)}</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold mb-1">{p.nombre}</div>
                        {referencia && <div className="text-xs text-slate-500 mb-2">Ref: {referencia}</div>}
                        <div className="flex gap-2 text-xs text-slate-600 mb-2">
                          <div className="px-2 py-1 bg-slate-50 border rounded">Total: {formatNumber(stockTotal)}</div>
                          <div className="px-2 py-1 bg-slate-50 border rounded">Mín: {formatNumber(p.stockMinimo)}</div>
                          <div className="px-2 py-1 bg-slate-50 border rounded">{p.factorConversion} {p.unidadSecundaria}</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { setKardexSku(p.sku); setShowGeneralKardex(false); }} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Ver Kardex</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : kardexSku ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {(() => {
                  const p = insumos.find(i => i.sku === kardexSku);
                  if (!p) return null;
                  const stockTotal = Object.values(stockPorBodega[p.sku] || {}).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
                  const stockSedeActual = stockPorBodega[p.sku]?.[selectedBodega.id] || 0;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <span className="text-[10px] uppercase font-black text-indigo-400 block">SKU Seleccionado</span>
                        <span className="text-lg font-mono font-bold text-indigo-900">{p.sku}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border shadow-sm md:col-span-1">
                        <span className="text-[10px] uppercase font-black text-slate-400 block">Nombre</span>
                        <span className="text-sm font-bold text-slate-800 line-clamp-2">{p.nombre}</span>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <span className="text-[10px] uppercase font-black text-emerald-400 block">Stock en {selectedBodega.nombre}</span>
                        <span className="text-xl font-black text-emerald-700">{formatNumber(stockSedeActual)}</span>
                      </div>
                      <div className={`p-4 rounded-xl border shadow-sm ${stockTotal <= p.stockMinimo ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] uppercase font-black text-slate-400 block">Stock Total Global</span>
                        <span className={`text-xl font-black ${stockTotal <= p.stockMinimo ? 'text-rose-600' : 'text-slate-700'}`}>{formatNumber(stockTotal)}</span>
                        <span className="text-[10px] ml-2 text-slate-400 font-bold">(Mín: {formatNumber(p.stockMinimo)})</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500">Fecha</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500">Tipo</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500">Detalle Operación</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500">Cliente</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Salida</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">Entrada</th>
                        <th className="p-4 text-xs font-bold uppercase text-slate-500">Nota Siigo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transacciones
                        .filter(t => t.sku === kardexSku || (t.items && t.items.some(it => it.sku === kardexSku)))
                        .map(t => {
                          const itemEspecifico = t.items ? t.items.find(it => it.sku === kardexSku) : null;
                          const cantidad = itemEspecifico ? itemEspecifico.cantidad : t.cantidad;
                          
                          let esSalida = false;
                          let esEntrada = false;

                          const actualSedeId = String(selectedBodega.id);
                          const origenId = t.bodegaOrigenId ? String(t.bodegaOrigenId) : null;
                          const destinoId = t.bodegaDestinoId ? String(t.bodegaDestinoId) : null;

                          if (t.tipo === 'CONSUMO' && origenId === actualSedeId) {
                            esSalida = true;
                          } else if (t.tipo === 'TRASLADO') {
                            if (origenId === actualSedeId) {
                              esSalida = true;
                            } else if (destinoId === actualSedeId) {
                              esEntrada = true;
                            }
                          } else if ((t.tipo === 'CREACIÓN' || t.tipo === 'INGRESO') && (destinoId === actualSedeId || (t.sku === kardexSku && t.bodegaDestinoId == selectedBodega.id))) {
                            esEntrada = true;
                          }

                          return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              {/* Mostrar solo la fecha (DD/MM/YYYY) en el kardex */}
                              <td className="p-4 text-sm font-mono text-slate-500">{(() => {
                                let f = t.fecha && typeof t.fecha === 'string' ? t.fecha.slice(0,10) : '';
                                if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
                                  return f.split('-').reverse().join('/');
                                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
                                  return f;
                                } else {
                                  return f;
                                }
                              })()}</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-black ${
                                  t.tipo === 'CREACIÓN' || t.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : 
                                  t.tipo === 'EDICIÓN' ? 'bg-indigo-100 text-indigo-700' :
                                  t.tipo === 'CONSUMO' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {t.tipo}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="text-sm font-bold text-slate-800">
                                        {t.tipo}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">{(() => {
                                        if ((t.tipo === 'INGRESO' || t.tipo === 'CREACIÓN') && t.items && t.items.length) {
                                          return `${t.detalle || ''} — ${t.items.map(it => `${formatNumber(it.cantidad)} x ${insumos.find(i => i.sku === it.sku)?.nombre || it.sku}`).join(' | ')}`;
                                        }
                                        return t.detalle;
                                      })()}</div>
                                {t.observaciones && <div className="text-[10px] text-slate-400 italic mt-1">Obs: {t.observaciones}</div>}
                              </td>
                              <td className="p-4 text-sm font-bold text-indigo-700">{t.clienteNombre || '-'}</td>
                              <td className="p-4 text-center font-black">
                                {esSalida && (
                                  <span className="text-rose-600">-{formatNumber(cantidad)}</span>
                                )}
                              </td>
                              <td className="p-4 text-center font-black">
                                {esEntrada && (
                                  <span className="text-emerald-600">+{formatNumber(cantidad)}</span>
                                )}
                              </td>
                              <td className="p-4 text-sm font-bold text-slate-600">
                                {t.tipo === 'TRASLADO' ? (
                                  editingNotaId === t.id ? (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        className="p-1 border rounded text-xs w-24"
                                        value={tempNotaValue}
                                        onChange={e => setTempNotaValue(e.target.value)}
                                        autoFocus
                                      />
                                      <button onClick={() => handleUpdateNotaSiigo(t.id)} className="text-emerald-600"><Check size={14} /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group">
                                      {t.notaSiigo || '-'}
                                      <button 
                                        onClick={() => { setEditingNotaId(t.id); setTempNotaValue(t.notaSiigo || ''); }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Seleccione un producto para ver su historial (Kardex)</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Historial de Transacciones</h2>
              <button onClick={exportHistoryCSV} className="ml-2 px-3 py-2 bg-emerald-600 text-white rounded text-sm font-bold hover:bg-emerald-700">Exportar CSV</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-4 text-sm font-bold">Fecha</th>
                    <th className="p-4 text-sm font-bold">Tipo</th>
                    <th className="p-4 text-sm font-bold">Detalle</th>
                    <th className="p-4 text-sm font-bold">Cliente</th>
                    <th className="p-4 text-sm font-bold">Unidades</th>
                    <th className="p-4 text-sm font-bold">Referencia / SKU</th>
                    <th className="p-4 text-sm font-bold">Nota de Traslado o Consumo Siigo</th>
                    <th className="p-4 text-sm font-bold">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {transacciones.map(t => {
                    const unidades = computeUnitsForTransaction(t);
                    const referencia = (t.items || []).length ? (t.items.map(it => `${it.sku}${getReferenceForSku(it.sku) ? ' | Ref: '+getReferenceForSku(it.sku) : ''}`).join(' | ')) : (t.detalle || '');
                    // Mostrar solo la fecha (YYYY-MM-DD) en el historial
                    let fechaSolo = '';
                    if (t.fecha && typeof t.fecha === 'string') {
                      // Si ya viene en formato YYYY-MM-DD, úsalo directo
                      if (/^\d{4}-\d{2}-\d{2}$/.test(t.fecha)) fechaSolo = t.fecha;
                      else if (!isNaN(Date.parse(t.fecha))) fechaSolo = new Date(t.fecha).toISOString().slice(0,10);
                      else fechaSolo = t.fecha;
                    }
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        {/* Mostrar solo la fecha (DD/MM/YYYY) en el historial */}
                        <td className="p-4 text-slate-500 font-mono">{(() => {
                          let f = fechaSolo && typeof fechaSolo === 'string' ? fechaSolo.slice(0,10) : '';
                          if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
                            return f.split('-').reverse().join('/');
                          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
                            return f;
                          } else {
                            return f;
                          }
                        })()}</td>
                        {/* Tipo */}
                        <td className="p-4 text-sm font-bold text-indigo-700">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${
                            t.tipo === 'CREACIÓN' || t.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 
                            t.tipo === 'EDICIÓN' ? 'bg-indigo-100 text-indigo-700' :
                            t.tipo === 'CONSUMO' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {t.tipo === 'CREACIÓN' ? 'INGRESO' : t.tipo}
                          </span>
                        </td>
                        {/* Detalle */}
                        <td className="p-4">
                          <div className="font-medium">{(t.items && t.items.length) ? t.items.map(it => `${formatNumber(it.cantidad)} x ${it.sku}${insumos.find(i => i.sku === it.sku) ? ' - '+insumos.find(i => i.sku === it.sku).nombre : ''}`).join(' | ') : (t.detalle || '')}</div>
                        </td>
                        {/* Cliente */}
                        <td className="p-4 text-sm font-bold text-indigo-700">{t.clienteNombre || '-'}</td>
                        <td className="p-4 text-center font-black">{unidades || '-'}</td>
                        <td className="p-4 text-sm text-slate-600">{referencia || '-'}</td>
                        <td className="p-4 font-bold">
                          {(t.tipo === 'TRASLADO' || t.tipo === 'CONSUMO') ? (
                            editingNotaId === t.id ? (
                              <div className="flex items-center gap-1">
                                <input 
                                  className="p-1 border rounded text-xs w-28"
                                  value={tempNotaValue}
                                  onChange={e => setTempNotaValue(e.target.value)}
                                  autoFocus
                                />
                                <button onClick={() => handleUpdateNotaSiigo(t.id)} className="text-emerald-600 hover:scale-110"><Check size={16} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                {t.notaSiigo || '-'}
                                <button 
                                  onClick={() => { setEditingNotaId(t.id); setTempNotaValue(t.notaSiigo || ''); }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 italic text-slate-500">{t.observaciones || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maestro' && (
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-700">
                <Settings size={18}/> Categorías de Insumos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 bg-slate-50 rounded">
                {categorias.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                    <span className="font-mono text-emerald-600 font-bold text-xs">{cat.id}</span>
                    <span className="text-[11px] font-medium uppercase truncate ml-2">{cat.nombre}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input id="newCatId" placeholder="ID (4 Dígitos)" className="w-32 p-2 border rounded text-sm" maxLength={4} />
                <input id="newCatName" placeholder="Nombre Categoría" className="flex-1 p-2 border rounded text-sm" />
                <button 
                  onClick={async () => {
                    const id = document.getElementById('newCatId').value;
                    const name = document.getElementById('newCatName').value;
                    if (id.length === 4 && name) {
                      const { data, error } = await supabase.from('categorias').insert({ id, nombre: name.toUpperCase() }).select();
                      if (error) showError(error, 'Error creando categoría')
                      else {
                        setCategorias([...categorias, ...data]);
                        document.getElementById('newCatId').value = '';
                        document.getElementById('newCatName').value = '';
                      }
                    }
                  }}
                  className="bg-emerald-600 text-white p-2 rounded px-4 text-sm font-bold"
                >Añadir</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700">
                  <Factory size={18}/> Maestro de Proveedores
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {proveedores.map(prov => (
                    <div key={prov.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                      <span className="font-mono text-blue-600 font-bold">{prov.id}</span>
                      <span className="text-sm font-medium uppercase">{prov.nombre}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input id="newProvId" placeholder="ID (3 Díg)" className="w-24 p-2 border rounded text-sm" maxLength={3} />
                  <input id="newProvName" placeholder="Nombre Proveedor" className="flex-1 p-2 border rounded text-sm" />
                  <button 
                    onClick={async () => {
                      const id = document.getElementById('newProvId').value;
                      const name = document.getElementById('newProvName').value;
                      console.log('CREATE PROVEEDOR:', { id, name });
                      if (id.length === 3 && name) {
                        try {
                          const { data, error } = await supabase.from('proveedores').insert({ id, nombre: name.toUpperCase() }).select();
                          console.log('SUPABASE RESPONSE:', { data, error });
                          if (error) {
                            console.error('ERROR OBJECT:', error);
                            console.error('ERROR STATUS:', error.status);
                            console.error('ERROR MESSAGE:', error.message);
                            console.error('ERROR CODE:', error.code);
                            showError(error, 'Error creando proveedor');
                          } else {
                            setProveedores([...proveedores, ...data]);
                            document.getElementById('newProvId').value = '';
                            document.getElementById('newProvName').value = '';
                            alert('Proveedor creado correctamente');
                          }
                        } catch (e) {
                          console.error('EXCEPTION:', e);
                          showError(e, 'Excepción creando proveedor');
                        }
                      } else {
                        alert('ID debe tener 3 dígitos');
                      }
                    }}
                    className="bg-blue-600 text-white p-2 rounded px-4 text-sm font-bold"
                  >Crear</button>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
                  <User size={18}/> Maestro de Clientes
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {clientes.map(cli => (
                    <div key={cli.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                      <span className="font-mono text-indigo-600 font-bold">{cli.id}</span>
                      <span className="text-sm font-medium uppercase">{cli.nombre}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input id="newCliId" placeholder="ID (3 Díg)" className="w-24 p-2 border rounded text-sm" maxLength={3} />
                  <input id="newCliName" placeholder="Nombre Cliente" className="flex-1 p-2 border rounded text-sm" />
                  <button 
                    onClick={async () => {
                      const id = document.getElementById('newCliId').value;
                      const name = document.getElementById('newCliName').value;
                      console.log('CREATE CLIENTE:', { id, name });
                      if(id.length === 3 && name) {
                        try {
                          const { data, error } = await supabase.from('clientes').insert({ id, nombre: name.toUpperCase() }).select();
                          console.log('SUPABASE RESPONSE:', { data, error });
                          if(error) {
                            console.error('ERROR OBJECT:', error);
                            console.error('ERROR STATUS:', error.status);
                            console.error('ERROR MESSAGE:', error.message);
                            console.error('ERROR CODE:', error.code);
                            showError(error, 'Error creando cliente');
                          }
                          else {
                            setClientes([...clientes, ...data]);
                            document.getElementById('newCliId').value = '';
                            document.getElementById('newCliName').value = '';
                            alert('Cliente creado correctamente');
                          }
                        } catch (e) {
                          console.error('EXCEPTION:', e);
                          showError(e, 'Excepción creando cliente');
                        }
                      } else {
                        alert('ID debe tener 3 dígitos');
                      }
                    }}
                    className="bg-indigo-600 text-white p-2 rounded px-4 text-sm font-bold"
                  >Crear</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </ErrorBoundary>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`${isEditing ? 'bg-indigo-600' : 'bg-emerald-600'} p-6 text-white flex justify-between items-center`}>
              <h3 className="text-xl font-bold">{isEditing ? 'Editar Registro de Insumo' : 'Configuración de Nuevo Insumo / Ingreso'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                <Trash2 size={24} className="text-white" />
              </button>
            </div>
            <form onSubmit={handleCreateInsumo} className="p-8 grid grid-cols-2 gap-6">
              <div className="col-span-2 bg-slate-50 p-4 rounded-lg border flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">SKU resultante</label>
                  <p className="font-mono text-xl font-black text-slate-800">
                    {generarSKU(currentInsumo.proveedorId, currentInsumo.categoriaId, currentInsumo.insumoId || '______')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold uppercase">Proveedor - Cat - Item</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Proveedor Propietario</label>
                <select 
                  className="w-full p-2 border rounded border-blue-200 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  value={currentInsumo.proveedorId}
                  disabled={isEditing}
                  onChange={e => setCurrentInsumo({...currentInsumo, proveedorId: e.target.value})}
                >
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Categoría</label>
                <select 
                  className="w-full p-2 border rounded disabled:bg-slate-100 disabled:text-slate-400"
                  value={currentInsumo.categoriaId}
                  disabled={isEditing}
                  onChange={e => setCurrentInsumo({...currentInsumo, categoriaId: e.target.value})}
                >
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold mb-1">Código de Insumo (6 Dígitos)</label>
                <input 
                  type="text" maxLength={6} required
                  className="w-full p-2 border rounded font-mono disabled:bg-slate-100 disabled:text-slate-400"
                  placeholder="Ej: 000001"
                  value={currentInsumo.insumoId}
                  disabled={isEditing}
                  onChange={e => handleInsumoIdChange(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold mb-1">Nombre Descriptivo</label>
                <input 
                  type="text" required
                  className="w-full p-2 border rounded"
                  placeholder="Ej: Rollo Vinipel Transparente 500m"
                  value={currentInsumo.nombre}
                  onChange={e => setCurrentInsumo({...currentInsumo, nombre: e.target.value})}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold mb-1">Referencia (opcional)</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Ref interna / codigo proveedor"
                  value={currentInsumo.referencia}
                  onChange={e => setCurrentInsumo({...currentInsumo, referencia: e.target.value})}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold mb-1">Fecha</label>
                <input type="date" className="w-full p-2 border rounded" value={currentInsumo.fecha} onChange={e => setCurrentInsumo({...currentInsumo, fecha: e.target.value})} />
              </div>
              <div className="border-t border-slate-100 col-span-2 pt-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Medida 1 (Unidad)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" placeholder="1" className="w-16 p-2 border rounded" 
                      value={currentInsumo.cantidadPrincipal}
                      onChange={e => setCurrentInsumo({...currentInsumo, cantidadPrincipal: e.target.value})} 
                    />
                    <input 
                      type="text" placeholder="Rollo" className="flex-1 p-2 border rounded" 
                      value={currentInsumo.unidadPrincipal}
                      onChange={e => setCurrentInsumo({...currentInsumo, unidadPrincipal: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="flex items-end pb-2 text-slate-400 font-bold">=</div>
                <div className="flex-1">
                  <label className="block text-sm font-bold mb-1">Equivalencia / Factor</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" placeholder="100" className="w-20 p-2 border rounded" 
                      value={currentInsumo.factorConversion}
                      onChange={e => setCurrentInsumo({...currentInsumo, factorConversion: e.target.value})} 
                    />
                    <input 
                      type="text" placeholder="Centímetros" className="flex-1 p-2 border rounded" 
                      value={currentInsumo.unidadSecundaria}
                      onChange={e => setCurrentInsumo({...currentInsumo, unidadSecundaria: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold mb-1 underline decoration-rose-500">Stock Mínimo Alerta</label>
                <input 
                  type="number" className="w-full p-2 border rounded border-rose-200"
                  value={currentInsumo.stockMinimo}
                  onChange={e => setCurrentInsumo({...currentInsumo, stockMinimo: e.target.value})}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-bold mb-1">Cantidad a Ingresar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-1/2 p-2 border rounded border-emerald-300 focus:border-emerald-500"
                    placeholder="0.00"
                    value={currentInsumo.stockCantidad || ''}
                    onChange={e => setCurrentInsumo({...currentInsumo, stockCantidad: e.target.value.replace(/[^0-9.]/g,'')})}
                  />
                  <select className="w-1/2 p-2 border rounded" value={currentInsumo.stockUnidad || ''} onChange={e => setCurrentInsumo({...currentInsumo, stockUnidad: e.target.value})}>
                    <option value="">Seleccione unidad...</option>
                    {currentInsumo.unidadPrincipal && <option value={currentInsumo.unidadPrincipal}>{currentInsumo.unidadPrincipal}</option>}
                    {currentInsumo.unidadSecundaria && <option value={currentInsumo.unidadSecundaria}>{currentInsumo.unidadSecundaria}</option>}
                    <option value="unidad">unidad</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="m">m</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>
              <div className="col-span-2 pt-4">
                <button 
                  type="submit"
                  className={`w-full ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2`}
                >
                  <Save size={20} /> {isEditing ? 'Actualizar Información' : 'Procesar Ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;