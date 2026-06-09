// src/screens/JarTestScreen.tsx
import React, { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase, uid, type Lot, type JarResult } from '../lib/supabase'

const OPTIONS: { result: JarResult; icon: string; label: string; desc: string; color: string }[] = [
  { result: 'ESTAVEL',     icon: '✅', label: 'Estável',          desc: 'Calda homogênea, sem precipitados.',          color: '#4CAF50' },
  { result: 'SEPARACAO',   icon: '⚠️', label: 'Separação de fases', desc: 'Óleo ou produto separou da fase aquosa.', color: '#FF9800' },
  { result: 'SEDIMENTACAO',icon: '⚠️', label: 'Sedimentação',     desc: 'Precipitado no fundo — pode entupir bicos.', color: '#FF9800' },
  { result: 'ESPUMA',      icon: '⚠️', label: 'Espuma excessiva', desc: 'Espuma persistente após agitação.',           color: '#FF9800' },
  { result: 'GEL',         icon: '❌', label: 'Virou gel',        desc: 'Gelatinização — mistura inaplicável.',        color: '#F44336' },
]

export default function JarTestScreen() {
  const navigate = useNavigate()
  const { lotId } = useParams()
  const { state } = useLocation()
  const lot: Lot = state?.lot

  const [selected, setSelected] = useState<JarResult>('ESTAVEL')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const jarTest = { id: uid(), lot_id: lotId, result: selected, notes: notes.trim() || undefined, created_at: Date.now() }
    await supabase.from('jar_tests').insert(jarTest)
    await supabase.from('lots').update({ status: 'READY' }).eq('id', lotId)
    setSaving(false)
    navigate(`/detail/${lotId}`, { state: { lot: { ...lot, status: 'READY' } } })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
        <span className="text-white font-bold text-base">🧪 Jar Test</span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-3 space-y-3 pb-24">
        <div className="card border-l-4 border-secondary">
          <div className="font-bold text-secondary text-sm mb-2">Como realizar</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>1. Encha um pote de 500 mL com amostra da mistura</div>
            <div>2. Agite vigorosamente por 30 segundos</div>
            <div>3. Deixe em repouso por 3 minutos</div>
            <div>4. Observe precipitação, separação, espuma e consistência</div>
          </div>
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Resultado</div>
        {OPTIONS.map(opt => (
          <button
            key={opt.result}
            onClick={() => setSelected(opt.result)}
            className={`w-full text-left card flex items-center gap-3 border-2 transition-all ${selected === opt.result ? 'border-secondary bg-light' : 'border-transparent'}`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <div className="flex-1">
              <div className="font-bold text-sm text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </div>
            {selected === opt.result && <span className="text-secondary font-black">✓</span>}
          </button>
        ))}
        <div className="card">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Observações (opcional)</label>
          <textarea className="field-input resize-none" rows={3} placeholder="Anote observações sobre a calda..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : '💾 Salvar Jar Test'}
        </button>
      </div>
    </div>
  )
}
