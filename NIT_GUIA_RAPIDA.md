# ⚡ PASOS PARA GUARDAR NITs - LECTURA RÁPIDA

## 🔴 PASO 1: Ejecutar en Supabase (OBLIGATORIO)

1. Abre: https://app.supabase.com
2. Selecciona proyecto `qrlaxrafygkxwgfjmdpv`
3. Menú izquierdo → **SQL Editor**
4. Click en **New query**
5. **Copia EXACTAMENTE esto y pégalo:**

```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nit VARCHAR(9);
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_anon_select_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_insert_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_update_clientes ON public.clientes;
CREATE POLICY allow_anon_select_clientes ON public.clientes FOR SELECT TO anon USING (true);
CREATE POLICY allow_anon_insert_clientes ON public.clientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY allow_anon_update_clientes ON public.clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

6. Click **Run** (botón azul arriba)
7. **Espera a que aparezca ✅ "Done"**

---

## 🔵 PASO 2: Cerrar y Abrir App

1. Cierra la app completamente (F5 o recargar la página)
2. Abre nuevamente

---

## 🟢 PASO 3: Probar

1. Ve a **Maestro** → **Maestro de Clientes**
2. En la casilla "NIT (9 díg)", escribe un NIT (ej: 123456789)
3. Cierra la página completamente
4. Abre nuevamente
5. **El NIT debe estar ahí**

---

## ❌ Si NO funciona:

1. Abre la consola (F12 en el navegador)
2. Busca mensajes rojos (errores)
3. Copia el error completo
4. Envía el error

---

## ✅ Síntomas de que funcionó:

- Puedes escribir en el campo NIT
- Al cerrar y abrir, el NIT sigue ahí
- Al descargar Excel, aparece el NIT en la columna "NIT"
- En la consola (F12) ves: `"NIT guardado: {cli: 001, nit: 123456789}"`
