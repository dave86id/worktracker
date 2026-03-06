import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Chybí VITE_SUPABASE_URL nebo VITE_SUPABASE_ANON_KEY v .env souboru')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Načte hodnotu z Supabase tabulky app_data
export async function loadData(key) {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', key)
    .single()
  if (error && error.code !== 'PGRST116') console.error('loadData error:', error)
  return data?.value ?? null
}

// Uloží hodnotu do Supabase tabulky app_data (upsert)
export async function saveData(key, value) {
  const { error } = await supabase
    .from('app_data')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) console.error('saveData error:', error)
}
