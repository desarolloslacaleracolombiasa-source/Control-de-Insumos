import { createClient } from '@supabase/supabase-js'

// Force the Supabase project URL and anon key to the user's project.
// This ensures the running dev server always connects to the intended Supabase instance.
const SUPABASE_URL = 'https://qrlaxrafygkxwgfjmdpv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybGF4cmFmeWdreHdnZmptZHB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDY5MzgsImV4cCI6MjA4NjMyMjkzOH0.nVK1q6vwkTcNkg0g3WyIhcVLsCr885ccc-WuOm32-iM';

// Log the URL (but avoid printing the full anon key to keep console output cleaner)
console.log('Supabase client configured for URL:', SUPABASE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);