import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Cargar .env manualmente si existe y no están las vars en process.env
const root = process.cwd()
const envPath = path.join(root, '.env')
if ((!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const l = line.trim()
    if (!l || l.startsWith('#')) return
    const idx = l.indexOf('=')
    if (idx === -1) return
    const key = l.slice(0, idx).trim()
    let val = l.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  })
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  console.error('Crea un archivo .env con dichas variables o expórtalas antes de ejecutar este script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const CATEGORIES = [
  { id: '0001', nombre: 'BANDEJAS' },
  { id: '0002', nombre: 'BOLSAS' },
  { id: '0003', nombre: 'CAJAS' },
  { id: '0004', nombre: 'CINTA' },
  { id: '0005', nombre: 'ESTUCHES' },
  { id: '0006', nombre: 'ETIQUETAS' },
  { id: '0007', nombre: 'MALLA ESPAÑOLA' },
  { id: '0008', nombre: 'VINIPEL' },
  { id: '0009', nombre: 'KIT EMPAQUE' }
]

async function ensureCategories() {
  const summary = { inserted: [], skipped: [], errors: [] }

  for (const cat of CATEGORIES) {
    try {
      const { data: exists, error: selError } = await supabase.from('categorias').select('id').eq('id', cat.id).limit(1).maybeSingle()
      if (selError) {
        summary.errors.push({ id: cat.id, message: selError.message })
        continue
      }

      if (exists) {
        summary.skipped.push(cat.id)
        continue
      }

      const { data, error } = await supabase.from('categorias').insert({ id: cat.id, nombre: cat.nombre }).select()
      if (error) {
        summary.errors.push({ id: cat.id, message: error.message })
      } else {
        summary.inserted.push(cat.id)
      }
    } catch (err) {
      summary.errors.push({ id: cat.id, message: String(err) })
    }
  }

  console.log('Seed categorias terminado:')
  console.log('Insertadas:', summary.inserted)
  console.log('Existentes (omitidas):', summary.skipped)
  if (summary.errors.length) {
    console.error('Errores:', summary.errors)
    process.exit(2)
  }
}

ensureCategories().then(() => process.exit(0)).catch(err => {
  console.error('Error ejecutando seed:', err)
  process.exit(3)
})
