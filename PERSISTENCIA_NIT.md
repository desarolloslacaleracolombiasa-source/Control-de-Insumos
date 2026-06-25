# Instrucciones: Persistencia de NITs en la Base de Datos

## Resumen del Problema
Los NITs de los clientes se capturaban pero solo se guardaban en localStorage. Cuando cerraba la página y la abría nuevamente, los NITs se perdían.

## Solución Implementada
Se han realizado los siguientes cambios para guardar los NITs permanentemente en la base de datos:

### 1. Cambios en la Base de Datos
✅ **Agregado**: Columna `nit` a la tabla `clientes`
- Tipo: `VARCHAR(9)` (almacena hasta 9 dígitos)
- Permite NULL (es opcional)

### 2. Cambios en el Código (App.jsx)
✅ **Guardar NIT al crear cliente** (línea ~2179)
- Ahora el NIT se incluye en la inserción a Supabase
- El NIT se guarda directamente en la BD

✅ **Guardar NIT al editar** (línea ~2089-2108)
- Cuando editas el NIT en el maestro de clientes, se guarda automáticamente en BD
- Se valida que solo contenga dígitos
- Se permite actualizar cuando está vacío (9 dígitos) o completo

✅ **Cargar NITs desde BD** (línea ~295-308)
- Los NITs se cargan directamente desde la columna `nit` de Supabase
- Ya no usa localStorage

## Pasos para Implementar

### Paso 1: Ejecutar la Migración en Supabase
1. Abre [https://app.supabase.com](https://app.supabase.com)
2. Ve a tu proyecto `qrlaxrafygkxwgfjmdpv`
3. Abre **SQL Editor** → **New query**
4. **Copia y pega este código completo:**

```sql
-- Agregar columna NIT
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS nit VARCHAR(9);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS allow_anon_select_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_insert_clientes ON public.clientes;
DROP POLICY IF EXISTS allow_anon_update_clientes ON public.clientes;

-- Crear políticas nuevas
CREATE POLICY allow_anon_select_clientes
  ON public.clientes FOR SELECT TO anon USING (true);

CREATE POLICY allow_anon_insert_clientes
  ON public.clientes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY allow_anon_update_clientes
  ON public.clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

5. Haz clic en **Run**
6. Deberías ver "Done" sin errores (si ves "already exists" es normal)

### Paso 2: Recargar la Aplicación
1. Recarga la página en el navegador (F5 o Ctrl+R)
2. Ve al módulo **Maestro** → **Maestro de Clientes**

### Paso 3: Verificar que Funciona
1. Edita un cliente existente y agrega/modifica su NIT
2. Cierra la página
3. Abre nuevamente
4. **El NIT debe permanecer guardado** ✅

## Características del NIT

- **Formato**: 9 dígitos (ej: `123456789`)
- **Validación**: Solo se acepta números, no letras ni caracteres especiales
- **Persistencia**: Se guarda en Supabase automáticamente
- **Reportes**: El NIT aparecerá en los reportes de historial (Excel y CSV)

## Troubleshooting

**Si ves error "UNIQUE constraint":**
- No pasa nada, es normal si ya existe el cliente

**Si ves error "permission denied":**
- Asegúrate de que la política RLS se creó correctamente
- Ejecuta solo esta línea:
```sql
DROP POLICY IF EXISTS allow_anon_update_clientes ON public.clientes;
CREATE POLICY allow_anon_update_clientes
  ON public.clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

**Si los NITs no se guardan:**
1. Abre la consola del navegador (F12)
2. Busca errores rojos
3. Asegúrate de que la migración se ejecutó sin errores

## Cambios de Archivos
- `schema.sql` - Agregada columna NIT
- `supabase/init.sql` - Actualizada definición de tabla clientes
- `supabase/migrations/add_nit_to_clientes.sql` - Nueva migración
- `src/App.jsx` - Actualizado código para guardar/cargar NITs desde BD
- `supabase/README_SUPABASE.md` - Actualizado con instrucciones
