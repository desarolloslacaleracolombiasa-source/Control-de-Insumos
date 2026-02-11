**Pasos rápidos — Ejecutar en Supabase y probar la app**

- Abre: https://app.supabase.com → selecciona tu proyecto (`qrlaxrafygkxwgfjmdpv`).
- Ve a **SQL Editor** → **New query**.
- Opción A (pegar): abre `supabase/init.sql` en tu editor local, copia todo y pégalo en el SQL Editor.
- Opción B (subir): en SQL Editor usa **Upload** y sube `supabase/init.sql`.
- Ejecuta (Run). Debe completar sin errores; verás "Done".

Si aparece error sobre políticas RLS/`WITH CHECK`, pega el mensaje aquí y lo ajusto.

Después de ejecutar el SQL:

1) En tu proyecto Supabase → Settings → API → copia la `anon` key y la URL.
2) Asegúrate de que en el archivo `.env` de este repo tienes:

VITE_SUPABASE_URL=https://qrlaxrafygkxwgfjmdpv.supabase.co
VITE_SUPABASE_ANON_KEY=<PEGA_AQUI_LA_ANON_KEY>

3) Reinicia el servidor dev local (en la carpeta del proyecto):
```bash
npm run dev
```

4) Probar crear un proveedor/cliente desde la app (Maestro).

Si falla, usa este curl para probar directamente (reemplaza ID y NOMBRE):

```bash
curl -i -X POST 'https://qrlaxrafygkxwgfjmdpv.supabase.co/rest/v1/proveedores' \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '[{"id":"002","nombre":"PRUEBA S.A."}]'
```

- Respuesta esperada: 201 Created y JSON con el registro.
- Si obtienes 401/403 o 4xx con mensaje, pega la respuesta completa aquí.

Nota de seguridad: Las políticas RLS creadas son permisivas para facilitar pruebas locales. En producción debes endurecerlas.
