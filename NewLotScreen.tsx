import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, uid, type Lot } from '../lib/supabase'
import { parseRecipeForPrep, FORM_COLORS, FORM_LABELS } from '../utils/recipeParser'
import { detectIncompatibilities } from '../utils/incompatibilityEngine'

function calcDoseTotal(dose: string, area: number): string | null {
  const m = dose.replace(',', '.').match(/^([\d.]+)\s*(L|mL|ml|kg|g)\s*\/\s*ha\b/i)
  if (!m) return null
  let val = parseFloat(m[1]) * area
  let unit = m[2].toLowerCase()
  if (unit === 'ml' && val >= 1000) { val /= 1000; unit = 'L' }
  if (unit === 'g'  && val >= 1000) { val /= 1000; unit = 'kg' }
  const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(n < 10 ? 2 : 1)
  return `${fmt(val)} ${unit}`
}

export default function NewLotScreen() {
  const navigate = useNavigate()
  const [farm, setFarm]     = useState('')
  const [field, setField]   = useState('')
  const [volume, setVolume] = useState('')
  const [area, setArea]     = useState('')
  const [recipe, setRecipe] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const parsedProducts = recipe.trim() ? parseRecipeForPrep(recipe) : []
  const incompats = recipe.trim() ? detectIncompatibilities(parsedProducts.map(p => p.name)) : []
  const areaNum = parseFloat(area) || 0

  const handleSave = async () => {
    if (!farm.trim()) { setError('Informe a fazenda'); return }
    if (!field.trim()) { setError('Informe o talhão'); return }
    if (!volume) { setError('Informe o volume'); return }
    setSaving(true)
    const lot: Lot = {
      id: uid(), created_at: Date.now(),
      farm: farm.trim(), field: field.trim(),
      volume_liters: parseFloat(volume),
      area_ha: areaNum || undefined,
      recipe_text: recipe.trim(),
      status: 'REQUESTED',
    }
    const { error: err } = await supabase.from('lots').insert(lot)
    setSaving(false)
    if (err) { setError(err.message); return }
    navigate(`/water/${lot.id}`, { state: { lot } })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
        <span className="text-white font-bold text-base">Nova Mistura</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-3 space-y-3 pb-24">
        {/* Identificação */}
        <div className="card">
          <div className="text-primary font-bold text-sm mb-3">📍 Identificação</div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Fazenda *</label>
            <input className="field-input" placeholder="Ex: Fazenda São João" value={farm} onChange={e => setFarm(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Talhão *</label>
            <input className="field-input" placeholder="Ex: Talhão 5 – Soja" value={field} onChange={e => setField(e.target.value)} />
          </div>
        </div>

        {/* Calda */}
        <div className="card">
          <div className="text-primary font-bold text-sm mb-3">⚗️ Calda</div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Volume Total * <span className="text-gray-400">(litros)</span></label>
            <input className="field-input" type="number" placeholder="Ex: 4000" value={volume} onChange={e => setVolume(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Área a aplicar <span className="text-gray-400">(ha)</span></label>
            <input className="field-input" type="number" placeholder="Ex: 50 (opcional)" value={area} onChange={e => setArea(e.target.value)} />
          </div>
          {areaNum > 0 && (
            <div className="bg-light rounded-lg px-3 py-2 text-xs font-semibold text-primary border-l-2 border-secondary mb-3">
              📐 {areaNum.toLocaleString('pt-BR')} ha — totais calculados automaticamente abaixo
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Receita / Plano de Aplicação</label>
            <textarea
              className="field-input resize-none"
              rows={4}
              placeholder="Ex: Priori Xtra 0,4 L/ha + Nimbus 0,5 L/vc"
              value={recipe}
              onChange={e => setRecipe(e.target.value)}
            />
            <div className="text-xs text-gray-400 mt-1">Separe produtos com <b>+</b> · Inclua dose e unidade</div>
          </div>
        </div>

        {/* Produtos classificados */}
        {parsedProducts.length > 0 && (
          <div className="card">
            <div className="text-primary font-bold text-sm mb-3">🧴 Produtos detectados</div>
            <div className="space-y-2">
              {parsedProducts.map((p, i) => {
                const total = areaNum > 0 && p.dose ? calcDoseTotal(p.dose, areaNum) : null
                return (
                  <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                      {p.dose && <div className="text-xs text-gray-500 mt-0.5">{p.dose}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: FORM_COLORS[p.type] || '#9E9E9E' }}
                      >
                        {FORM_LABELS[p.type] || 'Desconhecido'}
                      </span>
                      {total && (
                        <span className="text-xs font-bold text-primary bg-light px-2 py-0.5 rounded-full">
                          = {total}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Incompatibilidades */}
        {incompats.length > 0 && (
          <div className="card border-l-4 border-red-500">
            <div className="font-bold text-red-700 text-sm mb-2">⚠️ Alertas de incompatibilidade</div>
            {incompats.map((inc, i) => (
              <div key={i} className="text-xs text-red-600 mb-1">• {inc.message}</div>
            ))}
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 text-sm font-semibold rounded-lg px-3 py-2">⚠️ {error}</div>}
      </div>

      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-2">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar e Analisar Água →'}
        </button>
        <button className="btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
      </div>
    </div>
  )
}
