import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase, type Lot } from '../lib/supabase'
import { parseRecipeForPrep, FORM_COLORS, FORM_LABELS, FORM_ICONS } from '../utils/recipeParser'

interface Step {
  kind: 'fixed' | 'product'
  icon: string; title: string; sub: string
  detail: string; color?: string; timer?: number | null
  dose?: string
}

function buildSteps(recipe: string): Step[] {
  const products = parseRecipeForPrep(recipe)
  const TIMERS: Record<string, number> = { WP_WG: 900, SC: 60, EC_EW: 90, SL: 60, ADJUVANT: 60, FERTILIZER: 60, PH_CORRECTOR: 60 }
  const TIPS: Record<string, string> = {
    PH_CORRECTOR: 'Adicione primeiro para ajustar o pH antes dos demais.',
    WP_WG: 'Pré-dissolva em pequena quantidade de água antes de adicionar ao tanque.',
    SC: 'Adicione com agitação constante. Aguarde 1 min de homogeneização.',
    EC_EW: 'Adicione lentamente em fio contínuo com agitação.',
    SL: 'Adicione diretamente. Miscível com água, agite por 30s.',
    ADJUVANT: 'Adicione por último, após todos os produtos ativos.',
    FERTILIZER: 'Adicione após produtos sólidos, antes dos óleos.',
  }
  const steps: Step[] = [
    { kind: 'fixed', icon: '💧', title: 'Encher o tanque a 50–75%', sub: 'Preparação',
      detail: 'Adicione água limpa até 50–75% do volume total. Ligue o agitador antes de qualquer produto.' },
  ]
  for (const p of products) {
    steps.push({
      kind: 'product', icon: FORM_ICONS[p.type] || '🔬',
      title: `Adicionar: ${p.name}`, dose: p.dose || '',
      sub: FORM_LABELS[p.type] || 'Produto',
      detail: TIPS[p.type] || 'Consulte a bula.',
      color: FORM_COLORS[p.type] || '#9E9E9E',
      timer: TIMERS[p.type] || 60,
    })
  }
  steps.push({ kind: 'fixed', icon: '🪣', title: 'Completar volume com água', sub: 'Finalização', detail: 'Adicione água até o volume total. Mantenha agitação constante.' })
  steps.push({ kind: 'fixed', icon: '🔍', title: 'Verificar aspecto final', sub: 'Finalização', detail: 'Observe cor, homogeneidade e ausência de grumos. Pronto para Jar Test.' })
  return steps
}

function fmtTime(s: number) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }

export default function PrepGuideScreen() {
  const navigate = useNavigate()
  const { lotId } = useParams()
  const { state } = useLocation()
  const lot: Lot = state?.lot

  const steps = buildSteps(lot?.recipe_text || '')
  const [current, setCurrent]   = useState(0)
  const [done, setDone]         = useState<Set<number>>(new Set())
  const [timerRem, setTimerRem] = useState(0)
  const [running, setRunning]   = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const s = steps[current]

  const startTimer = () => {
    const t = s.timer || 60
    setTimerRem(t); setRunning(true); setFinished(false)
    intervalRef.current = setInterval(() => {
      setTimerRem(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!); setRunning(false); setFinished(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopTimer = () => {
    clearInterval(intervalRef.current!); setRunning(false)
  }

  useEffect(() => { return () => clearInterval(intervalRef.current!) }, [])

  useEffect(() => {
    setTimerRem(s.timer || 0); setRunning(false); setFinished(false)
    clearInterval(intervalRef.current!)
  }, [current])

  const nextStep = async () => {
    setDone(prev => new Set([...prev, current]))
    if (current < steps.length - 1) { setCurrent(c => c + 1) }
    else {
      await supabase.from('lots').update({ status: 'JAR_TEST' }).eq('id', lotId)
      navigate(`/jartest/${lotId}`, { state: { lot } })
    }
  }

  const pct = Math.round(((current + 1) / steps.length) * 100)

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="bg-primary px-4 pt-3 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
          <span className="text-white font-bold text-base flex-1">Guia de Preparo</span>
          <span className="text-accent text-xs font-semibold">{current + 1}/{steps.length}</span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-1 mt-2 justify-center flex-wrap">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${done.has(i) ? 'bg-accent' : i === current ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 space-y-3 pb-28">
        {/* Step card */}
        <div className="card text-center">
          <div className="text-5xl mb-3">{s.icon}</div>
          <div className="text-lg font-black text-gray-900 mb-2">{s.title}</div>

          {s.kind === 'product' ? (
            <div className="text-left mt-3">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-white px-3 py-1 rounded-full mb-3" style={{ background: s.color }}>
                {s.sub}
              </div>
              {s.dose && (
                <div className="bg-primary/10 rounded-lg px-3 py-2 text-sm font-semibold text-primary mb-2">
                  📏 Dose: {s.dose}
                </div>
              )}
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{s.detail}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{s.detail}</div>
          )}

          {/* Timer */}
          {s.kind === 'product' && s.timer && (
            <div className="mt-4 bg-primary rounded-xl p-4">
              <div className="text-4xl font-black text-white font-mono mb-3">
                {running || finished ? fmtTime(timerRem) : fmtTime(s.timer)}
              </div>
              {!running && !finished && (
                <button onClick={startTimer} className="bg-white text-primary font-bold px-6 py-2 rounded-full text-sm">
                  ▶ Iniciar Timer
                </button>
              )}
              {running && (
                <button onClick={stopTimer} className="bg-white/20 text-white font-bold px-6 py-2 rounded-full text-sm">
                  ⏸ Pausar
                </button>
              )}
              {finished && (
                <div className="text-accent font-bold text-sm">✅ Tempo concluído!</div>
              )}
            </div>
          )}
        </div>

        {/* Next hint */}
        {current < steps.length - 1 && (
          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
            <span className="text-gray-400 text-xs font-semibold">A seguir →</span>
            <span className="text-lg">{steps[current + 1].icon}</span>
            <span className="text-sm font-semibold text-gray-700 flex-1">{steps[current + 1].title.replace('Adicionar: ', '')}</span>
          </div>
        )}

        {/* Checklist */}
        <div className="card">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Checklist ({done.size}/{steps.length})</div>
          <div className="space-y-1">
            {steps.map((st, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${i === current ? 'bg-primary/10' : ''}`}>
                <span>{done.has(i) ? '✅' : i === current ? '👉' : '⬜'}</span>
                <span className={done.has(i) ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}>
                  {st.title.replace('Adicionar: ', '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-2">
        <button className="btn-primary" onClick={nextStep}>
          {current === steps.length - 1 ? '✅ Concluir → Jar Test' : `Etapa ${current + 1} ✓ → Próxima`}
        </button>
        {current > 0 && (
          <button className="btn-ghost" onClick={() => setCurrent(c => c - 1)}>← Voltar</button>
        )}
      </div>
    </div>
  )
}
