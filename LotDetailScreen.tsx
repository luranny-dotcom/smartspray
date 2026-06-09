import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase, statusLabel, statusColor, type Lot, type Telemetry, type JarTest, type LotStatus } from '../lib/supabase'

const TIMELINE_STEPS: { status: LotStatus; icon: string; label: string }[] = [
  { status: 'WATER_OK',  icon: '💧', label: 'Água'    },
  { status: 'PREPARING', icon: '⚗️', label: 'Preparo' },
  { status: 'JAR_TEST',  icon: '🧪', label: 'Jar Test'},
  { status: 'READY',     icon: '✅', label: 'Pronta'  },
  { status: 'APPLIED',   icon: '🚜', label: 'Aplicada'},
]
const STATUS_ORDER: LotStatus[] = ['REQUESTED','WATER_OK','PREPARING','JAR_TEST','READY','APPLIED']

function stepState(lotStatus: LotStatus, stepStatus: LotStatus) {
  const li = STATUS_ORDER.indexOf(lotStatus)
  const si = STATUS_ORDER.indexOf(stepStatus)
  if (li > si) return 'done'
  if (li === si) return 'active'
  return 'pending'
}

export default function LotDetailScreen() {
  const navigate = useNavigate()
  const { lotId } = useParams()
  const { state } = useLocation()
  const [lot, setLot]           = useState<Lot>(state?.lot)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [jarTest, setJarTest]   = useState<JarTest | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    supabase.from('lots').select('*').eq('id', lotId).single().then(({ data }) => { if (data) setLot(data) })
    supabase.from('telemetry').select('*').eq('lot_id', lotId).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => { if (data) setTelemetry(data) })
    supabase.from('jar_tests').select('*').eq('lot_id', lotId).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => { if (data) setJarTest(data) })
  }, [lotId])

  const handleApply = async () => {
    setApplying(true)
    await supabase.from('lots').update({ status: 'APPLIED' }).eq('id', lotId)
    setLot(l => ({ ...l, status: 'APPLIED' }))
    setApplying(false)
  }

  if (!lot) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-500">Carregando...</div></div>

  const jarIcon: Record<string, string> = { ESTAVEL: '✅', SEPARACAO: '⚠️', SEDIMENTACAO: '⚠️', ESPUMA: '⚠️', GEL: '❌' }
  const jarLabel: Record<string, string> = { ESTAVEL: 'Estável', SEPARACAO: 'Separação de fases', SEDIMENTACAO: 'Sedimentação', ESPUMA: 'Espuma excessiva', GEL: 'Virou gel' }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
        <span className="text-white font-bold text-base">Detalhe da Mistura</span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-3 space-y-3 pb-6">
        {/* Header card */}
        <div className="card border-t-4 border-secondary">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-lg font-black text-gray-900">{lot.farm}</div>
              <div className="text-sm text-gray-500 mt-0.5">{lot.field}</div>
            </div>
            <span className={`badge ${statusColor(lot.status)}`}>{statusLabel(lot.status)}</span>
          </div>
          <div className="flex border-t border-gray-100 pt-3">
            {[['Volume', `${lot.volume_liters}L`], ['Área', lot.area_ha ? `${lot.area_ha}ha` : '—'], ['pH', lot.last_ph?.toFixed(1) || '—']].map(([l, v]) => (
              <div key={l} className="flex-1 text-center">
                <div className="font-bold text-sm text-gray-900">{v}</div>
                <div className="text-xs text-gray-500">{l}</div>
              </div>
            ))}
          </div>
          {lot.recipe_text && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 mt-3">
              <div className="text-xs font-bold text-gray-500 mb-1">📝 Receita</div>
              <div className="text-xs text-gray-700">{lot.recipe_text}</div>
            </div>
          )}

          {/* Process Timeline */}
          <div className="flex items-center mt-4 pt-4 border-t border-gray-100">
            {TIMELINE_STEPS.map((step, i) => {
              const st = stepState(lot.status, step.status)
              return (
                <React.Fragment key={step.status}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${st === 'done' ? 'bg-secondary text-white' : st === 'active' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {st === 'done' ? '✓' : step.icon}
                    </div>
                    <div className={`text-xs font-bold mt-1 text-center leading-tight
                      ${st === 'done' ? 'text-secondary' : st === 'active' ? 'text-orange-500' : 'text-gray-400'}`}>
                      {step.label}
                    </div>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${st === 'done' ? 'bg-secondary' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Water quality */}
        {telemetry && (
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm text-gray-700">💧 Qualidade da Água</span>
              <span className={`badge ${telemetry.evaluation === 'OK' ? 'badge-green' : telemetry.evaluation === 'Atenção' ? 'badge-orange' : 'badge-red'}`}>{telemetry.evaluation}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="font-bold text-sm">{telemetry.ph}</div><div className="text-xs text-gray-500">pH</div></div>
              <div><div className="font-bold text-sm">{telemetry.temp_c}°C</div><div className="text-xs text-gray-500">Temperatura</div></div>
              {telemetry.conductivity && <div><div className="font-bold text-sm">{telemetry.conductivity}</div><div className="text-xs text-gray-500">µS/cm</div></div>}
            </div>
          </div>
        )}

        {/* Jar test */}
        {jarTest && (
          <div className="card">
            <div className="font-bold text-sm text-gray-700 mb-2">🧪 Jar Test</div>
            <div className="text-lg font-bold">{jarIcon[jarTest.result]} {jarLabel[jarTest.result]}</div>
            {jarTest.notes && <div className="text-xs text-gray-500 mt-1 italic">{jarTest.notes}</div>}
          </div>
        )}

        {/* Apply button */}
        {lot.status === 'READY' && (
          <button className="btn-primary bg-green-700" onClick={handleApply} disabled={applying}>
            {applying ? 'Registrando...' : '🚜 Registrar Aplicação em Campo'}
          </button>
        )}
        {lot.status === 'APPLIED' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center font-bold text-green-700">
            ✅ Calda aplicada em campo
          </div>
        )}

        <button
          className="btn-primary"
          onClick={() => navigate(`/laudo/${lotId}`, { state: { lot, telemetry, jarTest } })}
        >
          📄 Gerar Laudo de Qualidade
        </button>
      </div>
    </div>
  )
}
