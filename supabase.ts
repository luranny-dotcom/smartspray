import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Types ────────────────────────────────────────────────────────────────────
export type LotStatus = 'REQUESTED' | 'WATER_OK' | 'PREPARING' | 'JAR_TEST' | 'READY' | 'APPLIED'
export type JarResult = 'ESTAVEL' | 'SEPARACAO' | 'SEDIMENTACAO' | 'ESPUMA' | 'GEL'

export interface Lot {
  id: string
  created_at: number
  farm: string
  field: string
  volume_liters: number
  area_ha?: number
  recipe_text: string
  status: LotStatus
  last_ph?: number
  last_temp_c?: number
}

export interface Telemetry {
  id: string
  lot_id: string
  ph: number
  temp_c: number
  conductivity?: number
  evaluation: 'OK' | 'Atenção' | 'Risco'
  created_at: number
}

export interface JarTest {
  id: string
  lot_id: string
  result: JarResult
  photo_url?: string
  notes?: string
  created_at: number
}

export interface Operator {
  name: string
  role: string
  company: string
  crea: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function statusLabel(s: LotStatus) {
  const map: Record<LotStatus, string> = {
    REQUESTED: 'Solicitada', WATER_OK: 'Água OK',
    PREPARING: 'Em Preparo', JAR_TEST: 'Jar Test',
    READY: 'Pronta', APPLIED: 'Aplicada',
  }
  return map[s] ?? s
}

export function statusColor(s: LotStatus) {
  if (s === 'APPLIED') return 'badge-gray'
  if (s === 'READY') return 'badge-green'
  if (s === 'JAR_TEST' || s === 'PREPARING') return 'badge-orange'
  if (s === 'WATER_OK') return 'badge-green'
  return 'badge-gray'
}
