import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, statusLabel, statusColor, type Lot, type LotStatus } from '../lib/supabase'

const ALL_STATUSES: LotStatus[] = ['REQUESTED','WATER_OK','PREPARING','JAR_TEST','READY','APPLIED']

export default function LotsScreen() {
  const navigate = useNavigate()
  const [lots, setLots]     = useState<Lot[]>([])
  const [filter, setFilter] = useState<LotStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lots').select('*').order('created_at', { ascending: false })
    setLots(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = lots.filter(l => {
    if (filter !== 'ALL' && l.status !== filter) return false
    if (search && !l.farm.toLowerCase().includes(search.toLowerCase()) && !l.field.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3">
        <div className="text-white font-bold text-base mb-3">⚗️ Misturas</div>
        <input
          className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 text-white placeholder-white/50 border border-white/20 outline-none"
          placeholder="Buscar fazenda ou talhão..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scroll-hide bg-white border-b border-gray-100">
        <button onClick={() => setFilter('ALL')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === 'ALL' ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}>
          Todas
        </button>
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === s ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600'}`}>
            {statusLabel(s)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-3 space-y-2 pb-24">
        {loading && <div className="text-center text-gray-400 py-8">Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">⚗️</div>
            <div className="font-semibold">Nenhuma mistura encontrada</div>
          </div>
        )}
        {filtered.map(lot => (
          <button
            key={lot.id}
            className="w-full text-left card hover:border-secondary border-2 border-transparent transition-all"
            onClick={() => navigate(`/detail/${lot.id}`, { state: { lot } })}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-gray-900">{lot.farm}</div>
                <div className="text-sm text-gray-500 mt-0.5">{lot.field}</div>
              </div>
              <span className={`badge ${statusColor(lot.status)}`}>{statusLabel(lot.status)}</span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>💧 {lot.volume_liters}L</span>
              {lot.area_ha && <span>📐 {lot.area_ha}ha</span>}
              {lot.last_ph && <span>pH {lot.last_ph.toFixed(1)}</span>}
              <span className="ml-auto">{new Date(lot.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-bold z-10"
      >
        +
      </button>
    </div>
  )
}
