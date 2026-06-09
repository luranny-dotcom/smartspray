import React, { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase, uid, type Lot } from '../lib/supabase'
import { evaluateWater } from '../utils/waterEvaluation'

export default function WaterEngineScreen() {
  const navigate = useNavigate()
  const { lotId } = useParams()
  const { state } = useLocation()
  const lot: Lot = state?.lot

  const [ph, setPh]     = useState('6.5')
  const [temp, setTemp] = useState('22')
  const [cond, setCond] = useState('')
  const [saving, setSaving] = useState(false)

  const phN    = parseFloat(ph)   || 0
  const tempN  = parseFloat(temp) || 0
  const condN  = parseFloat(cond) || undefined

  const result = evaluateWater({ ph: phN, temp_c: tempN, conductivity: condN })

  const badgeClass = result.overall === 'OK' ? 'badge-green' : result.overall === 'Atenção' ? 'badge-orange' : 'badge-red'
  const cardBorder = result.overall === 'OK' ? 'border-green-400' : result.overall === 'Atenção' ? 'border-orange-400' : 'border-red-400'
  const cardBg     = result.overall === 'OK' ? 'bg-green-50' : result.overall === 'Atenção' ? 'bg-orange-50' : 'bg-red-50'

  const handleSave = async () => {
    setSaving(true)
    const telemetry = {
      id: uid(), lot_id: lotId,
      ph: phN, temp_c: tempN,
      conductivity: condN,
      evaluation: result.overall,
      created_at: Date.now(),
    }
    await supabase.from('telemetry').insert(telemetry)
    await supabase.from('lots').update({ status: 'WATER_OK', last_ph: phN, last_temp_c: tempN }).eq('id', lotId)
    setSaving(false)
    navigate(`/prep/${lotId}`, { state: { lot: { ...lot, status: 'WATER_OK', last_ph: phN } } })
  }

  const EvalRow = ({ label, value, eval: ev }: { label: string; value: string; eval: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900">{value}</span>
        <span className={`badge ${ev === 'OK' ? 'badge-green' : ev === 'Atenção' ? 'badge-orange' : 'badge-red'}`}>{ev}</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
        <span className="text-white font-bold text-base">💧 Qualidade da Água</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-3 space-y-3 pb-24">
        {lot && (
          <div className="bg-primary/10 rounded-xl px-3 py-2 text-xs font-semibold text-primary">
            {lot.farm} — {lot.field} · {lot.volume_liters}L
          </div>
        )}

        <div className="card">
          <div className="text-primary font-bold text-sm mb-3">Medições da Água</div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">pH <span className="text-gray-400">(ideal: 5,5–6,5)</span></label>
            <input className="field-input" type="number" step="0.1" min="0" max="14" value={ph} onChange={e => setPh(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Temperatura <span className="text-gray-400">(°C, ideal: 10–25)</span></label>
            <input className="field-input" type="number" step="0.5" value={temp} onChange={e => setTemp(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Condutividade <span className="text-gray-400">(µS/cm, opcional)</span></label>
            <input className="field-input" type="number" placeholder="Ex: 155" value={cond} onChange={e => setCond(e.target.value)} />
          </div>
        </div>

        {/* Resultado */}
        <div className={`card border-l-4 ${cardBorder} ${cardBg}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-sm text-gray-800">Resultado da Análise</span>
            <span className={`badge ${badgeClass} text-sm`}>{result.overall}</span>
          </div>
          <EvalRow label="pH" value={phN.toFixed(1)} eval={result.ph} />
          <EvalRow label="Temperatura" value={`${tempN}°C`} eval={result.temp} />
          {condN !== undefined && <EvalRow label="Condutividade" value={`${condN} µS/cm`} eval={result.conductivity || 'OK'} />}
        </div>

        {/* Correção de pH */}
        {result.ph !== 'OK' && (
          <div className="card border-l-4 border-blue-400 bg-blue-50">
            <div className="font-bold text-blue-800 text-sm mb-2">💡 Sugestão de correção</div>
            {phN > 6.5 && (
              <div className="text-xs text-blue-700">
                <b>pH alto</b> — Adicione ácido cítrico: 0,5–1,0 g por 100L para cada unidade de pH a reduzir.<br />
                <span className="text-blue-500">Alternativa: pH Down comercial (1–5 mL/100L conforme bula)</span>
              </div>
            )}
            {phN < 5.5 && (
              <div className="text-xs text-blue-700">
                <b>pH baixo</b> — Adicione bicarbonato de sódio: 0,5–1,0 g/100L.<br />
                <span className="text-blue-500">Meça após adição antes de continuar.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Análise e Continuar →'}
        </button>
      </div>
    </div>
  )
}
