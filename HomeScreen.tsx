import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, statusLabel, statusColor, type Lot } from '../lib/supabase'
import { useOperator } from '../context/OperatorContext'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { operator, clearOperator } = useOperator()
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lots').select('*').order('created_at', { ascending: false }).limit(20)
    setLots(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const today = new Date().toDateString()
  const todayLots  = lots.filter(l => new Date(l.created_at).toDateString() === today)
  const pendentes  = lots.filter(l => !['READY','APPLIED'].includes(l.status))
  const riscos     = lots.filter(l => l.last_ph && (l.last_ph < 5 || l.last_ph > 7))
  const phMedia    = lots.filter(l => l.last_ph).map(l => l.last_ph!)
  const phAvg      = phMedia.length ? (phMedia.reduce((a, b) => a + b, 0) / phMedia.length).toFixed(1) : '—'
  const recent     = lots.slice(0, 6)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-primary px-4 pt-4 pb-5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-white font-black text-xl">FertigeoTech</div>
            <div className="text-accent text-xs font-semibold tracking-wider uppercase">Qualidade de Calda</div>
          </div>
          <button onClick={clearOperator} className="text-white/50 text-xs font-semibold px-2 py-1 bg-white/10 rounded-lg">
            Sair
          </button>
        </div>
        <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
          <div className="text-white font-semibold text-sm">{operator?.name}</div>
          <div className="text-accent text-xs">{operator?.role}{operator?.company ? ` · ${operator.company}` : ''}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 space-y-4 pb-24">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📋', label: 'Hoje', value: todayLots.length, color: 'text-secondary' },
            { icon: '⏳', label: 'Pendentes', value: pendentes.length, color: 'text-orange-600' },
            { icon: '🧪', label: 'pH médio', value: phAvg, color: 'text-secondary' },
            { icon: '⚠️', label: 'Riscos', value: riscos.length, color: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="card text-center">
              <div className="text-2xl mb-1">{k.icon}</div>
              <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-500 font-semibold">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Recentes */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-700">Misturas recentes</span>
            <button className="text-xs text-secondary font-semibold" onClick={() => navigate('/lots')}>Ver todas →</button>
          </div>
          {loading && <div className="text-center text-gray-400 py-6">Carregando...</div>}
          {!loading && recent.length === 0 && (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
              <div className="text-4xl mb-2">⚗️</div>
              <div className="text-gray-500 text-sm">Nenhuma mistura ainda</div>
              <button className="mt-3 text-secondary font-bold text-sm" onClick={() => navigate('/new')}>+ Criar primeira mistura</button>
            </div>
          )}
          <div className="space-y-2">
            {recent.map(lot => (
              <button key={lot.id} className="w-full text-left card flex items-center gap-3 hover:border-secondary border-2 border-transparent transition-all"
                onClick={() => navigate(`/detail/${lot.id}`, { state: { lot } })}>
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-900">{lot.farm}</div>
                  <div className="text-xs text-gray-500">{lot.field} · {lot.volume_liters}L</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${statusColor(lot.status)}`}>{statusLabel(lot.status)}</span>
                  <span className="text-xs text-gray-400">{new Date(lot.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => navigate('/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-bold z-10">
        +
      </button>
    </div>
  )
}
