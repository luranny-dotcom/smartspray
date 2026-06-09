import React, { useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useOperator } from '../context/OperatorContext'
import type { Lot, Telemetry, JarTest } from '../lib/supabase'

const JAR_LABEL: Record<string, string> = {
  ESTAVEL:'Estável ✅', SEPARACAO:'Separação de fases ⚠️',
  SEDIMENTACAO:'Sedimentação ⚠️', ESPUMA:'Espuma excessiva ⚠️', GEL:'Virou gel ❌',
}

export default function LaudoScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { operator } = useOperator()
  const lot: Lot         = state?.lot
  const telemetry: Telemetry = state?.telemetry
  const jarTest: JarTest  = state?.jarTest
  const laudoRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR')

  const handleDownload = async () => {
    const html2pdf = (await import('html2pdf.js')).default
    const el = laudoRef.current
    if (!el) return
    html2pdf().set({
      margin: 12,
      filename: `Laudo-FertigeoTech-${lot?.farm || 'calda'}-${dateStr.replace(/\//g,'-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(el).save()
  }

  const phEval = telemetry?.evaluation || '—'
  const phBg = phEval === 'OK' ? '#E0F7E9' : phEval === 'Atenção' ? '#FFF3E0' : '#FFEBEE'
  const phColor = phEval === 'OK' ? '#2E7D32' : phEval === 'Atenção' ? '#E65100' : '#C62828'

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary px-4 py-3 flex items-center gap-3 no-print">
        <button onClick={() => navigate(-1)} className="text-accent text-lg font-bold">‹</button>
        <span className="text-white font-bold text-base">📄 Laudo de Qualidade</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 pb-28">
        {/* Laudo HTML para PDF */}
        <div ref={laudoRef} className="bg-white rounded-2xl overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Cabeçalho */}
          <div style={{ background: '#00313C', padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>FertigeoTech</div>
            <div style={{ color: '#7EC8D8', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginTop: 2, textTransform: 'uppercase' }}>
              Laudo de Qualidade de Calda
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Número / data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEEEEE', paddingBottom: 12, marginBottom: 16, fontSize: 11, color: '#9E9E9E' }}>
              <span>Gerado em {dateStr} às {timeStr}</span>
              <span style={{ fontWeight: 700, color: '#00313C' }}>#{lot?.id?.slice(-6).toUpperCase()}</span>
            </div>

            {/* Dados da mistura */}
            <Section title="Dados da Mistura">
              <Grid>
                <Field label="Fazenda"   value={lot?.farm}  />
                <Field label="Talhão"    value={lot?.field} />
                <Field label="Volume"    value={`${lot?.volume_liters} L`} />
                {lot?.area_ha && <Field label="Área"   value={`${lot.area_ha} ha`} />}
              </Grid>
              {lot?.recipe_text && (
                <div style={{ marginTop: 10, background: '#F5F5F5', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Receita</div>
                  <div style={{ fontSize: 12, color: '#333' }}>{lot.recipe_text}</div>
                </div>
              )}
            </Section>

            {/* Responsável */}
            <Section title="Responsável Técnico">
              <Grid>
                <Field label="Nome"    value={operator?.name}    />
                <Field label="Função"  value={operator?.role}    />
                {operator?.company && <Field label="Empresa" value={operator.company} />}
                {operator?.crea    && <Field label="CREA/CFTA" value={operator.crea}  />}
              </Grid>
            </Section>

            {/* Qualidade da água */}
            {telemetry && (
              <Section title="Qualidade da Água">
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <MetricBox label="pH" value={telemetry.ph.toString()} />
                  <MetricBox label="Temperatura" value={`${telemetry.temp_c}°C`} />
                  {telemetry.conductivity && <MetricBox label="Condutividade" value={`${telemetry.conductivity} µS/cm`} />}
                </div>
                <div style={{ background: phBg, borderRadius: 8, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: phColor }}>Avaliação geral: {phEval}</span>
                </div>
              </Section>
            )}

            {/* Jar Test */}
            {jarTest && (
              <Section title="Resultado do Jar Test">
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>
                  {JAR_LABEL[jarTest.result] || jarTest.result}
                </div>
                {jarTest.notes && <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>{jarTest.notes}</div>}
              </Section>
            )}

            {/* Assinatura */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #EEEEEE' }}>
              <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8 }}>Assinatura do responsável técnico</div>
              <div style={{ borderBottom: '2px solid #333', width: 200, height: 40 }} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>{operator?.name} · {operator?.role}</div>
              {operator?.crea && <div style={{ fontSize: 10, color: '#9E9E9E' }}>CREA/CFTA: {operator.crea}</div>}
            </div>

            {/* Rodapé */}
            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: '#BDBDBD', borderTop: '1px solid #F0F0F0', paddingTop: 16 }}>
              Gerado em {dateStr}, {timeStr} — FertigeoTech · Fertigeo Inteligência Agrícola
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-2 no-print">
        <button className="btn-primary" onClick={handleDownload}>⬇️ Baixar PDF</button>
        <button className="btn-ghost" onClick={() => navigate(-1)}>Voltar</button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#00313C', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #E0F4F7' }}>{title}</div>
      {children}
    </div>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>
}
function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600 }}>{value || '—'}</div>
    </div>
  )
}
function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: '#F5F5F5', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#9E9E9E', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#00313C', marginTop: 2 }}>{value}</div>
    </div>
  )
}
