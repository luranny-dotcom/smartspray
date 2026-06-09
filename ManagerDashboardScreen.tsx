import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, statusLabel, statusColor, type Lot, type LotStatus } from '../lib/supabase'

const TIMELINE_STEPS: { status: LotStatus; icon: string }[] = [
  { status: 'WATER_OK', icon: '💧' }, { status: 'PREPARING', icon: '⚗️' },
  { status: 'JAR_TEST', icon: '🧪' }, { status: 'READY', icon: '✅' }, { status: 'APPLIED', icon: '🚜' },
]
const STATUS_ORDER: LotStatus[] = ['REQUESTED','WATER_OK','PREPARING','JAR_TEST','READY','APPLIED']

export default function ManagerDashboardScreen() {
  const navigate = useNavigate()
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('lots').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setLots(data || [])
      setLoading(false)
    })
  }, [])

  const today = new Date().toDateString()
  const todayLots   = lots.filter(l => new Date(l.created_at).toDateString() === today)
  const prontas     = lots.filter(l => l.status === 'READY')
  const andamento   = lots.filter(l => !['READY','APPLIED','REQUESTED'].includes(l.status))
  const riscos      = lots.filter(l => l.last_ph && (l.last_ph < 5 || l.last_ph > 7))

  const active = lots.filter(l => !['APPLIED'].includes(l.status))

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3">
        <div className="text-white font-bold text-base">📊 Painel do Gestor</div>
        <div className="text-accent text-xs mt-0.5">Visão geral de operações</div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 space-y-4 pb-24">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Hoje', value: todayLots.length, icon: '📋', color: 'text-secondary' },
            { label: 'Prontas', value: prontas.length, icon: '✅', color: 'text-green-600' },
            { label: 'Em andamento', value: andamento.length, icon: '⚗️', color: 'text-orange-500' },
            { label: 'Riscos', value: riscos.length, icon: '⚠️', color: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="card text-center">
              <div className="text-2xl mb-1">{k.icon}</div>
              <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-500 font-semibold">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {riscos.length > 0 && (
          <div className="card border-l-4 border-red-500 bg-red-50">
            <div className="font-bold text-red-700 text-sm mb-2">⚠️ Atenção — pH fora do ideal</div>
            {riscos.map(l => (
              <div key={l.id} className="text-xs text-red-600 mb-1">• {l.farm} / {l.field} — pH {l.last_ph?.toFixed(1)}</div>
            ))}
          </div>
        )}

        {/* Operações ativas */}
        <div>
          <div className="text-sm font-bold text-gray-700 mb-2">Operações em andamento</div>
          {loading && <div className="text-gray-400 text-sm py-4 text-center">Carregando...</div>}
          {!loading && active.length === 0 && <div className="text-gray-400 text-sm text-center py-6">Nenhuma operação ativa</div>}
          <div className="space-y-2">
            {active.map(lot => {
              const li = STATUS_ORDER.indexOf(lot.status)
              return (
                <button key={lot.id} className="w-full text-left card" onClick={() => navigate(`/detail/${lot.id}`, { state: { lot } })}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{lot.farm}</div>
                      <div className="text-xs text-gray-500">{lot.field} · {lot.volume_liters}L</div>
                    </div>
                    <span className={`badge ${statusColor(lot.status)}`}>{statusLabel(lot.status)}</span>
                  </div>
                  {/* Mini timeline */}
                  <div className="flex items-center gap-1">
                    {TIMELINE_STEPS.map((step, i) => {
                      const si = STATUS_ORDER.indexOf(step.status)
                      const done = li > si
                      const active = li === si
                      return (
                        <React.Fragment key={step.status}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0
                            ${done ? 'bg-secondary text-white' : active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {done ? '✓' : step.icon}
                          </div>
                          {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 ${done ? 'bg-secondary' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* pH table */}
        {lots.filter(l => l.last_ph).length > 0 && (
          <div className="card">
            <div className="text-sm font-bold text-gray-700 mb-3">pH por talhão (recentes)</div>
            <div className="space-y-2">
              {lots.filter(l => l.last_ph).slice(0, 8).map(l => {
                const ph = l.last_ph!
                const cls = ph >= 5.5 && ph <= 6.5 ? 'badge-green' : ph >= 4.5 && ph <= 7 ? 'badge-orange' : 'badge-red'
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <div><span className="font-semibold text-gray-800">{l.farm}</span> <span className="text-gray-500">— {l.field}</span></div>
                    <span className={`badge ${cls}`}>pH {ph.toFixed(1)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
