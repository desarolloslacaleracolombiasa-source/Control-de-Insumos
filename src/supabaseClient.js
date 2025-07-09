import { createClient } from '@supabase/supabase-js'

// Asegúrate de que solo la URL esté DENTRO de las comillas.
const supabaseUrl = 'https://dzujltbnwegekqjxtuqs.supabase.co';

// Asegúrate de que solo la clave esté DENTRO de las comillas.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6dWpsdGJud2VnZWtxanh0dXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc2MDQsImV4cCI6MjA2NzIyMzYwNH0.Wl4rbdUyOj-lVzbzzrzygydojgqWVYjDIUSd_stqBs4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);