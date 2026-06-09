import { LOGO_BASE64 } from './logoBase64';
// src/utils/laudoGenerator.ts
//
// Gera o HTML completo do Laudo de Qualidade de Calda.
// O HTML é passado para expo-print que converte em PDF.
//
// Seções do laudo:
//   1. Cabeçalho  — identificação, data, número do laudo
//   2. Calda       — fazenda, talhão, volume, receita
//   3. Água        — parâmetros medidos + avaliação
//   4. Incompatibilidades — alertas detectados (se houver)
//   5. Preparo     — lista de produtos na ordem correta
//   6. Jar Test    — resultado + foto (se houver)
//   7. Eventos     — linha do tempo auditável
//   8. Rodapé      — assinatura, disclaimer, ID de rastreabilidade

import type { Lot, Telemetry, JarTest, AppEvent, RiskOverride } from '../types';
import { parseRecipe, formulationLabel, formulationColor } from './recipeParser';
import { detectIncompatibilities, severityColor, typeLabel } from './incompatibilityEngine';
import { statusLabel, evalColor, jarTestLabel } from './waterEvaluation';

export interface LaudoData {
  lot: Lot;
  telemetry: Telemetry | null;
  jarTest: JarTest | null;
  events: AppEvent[];
  overrides: RiskOverride[];
  operatorName?: string;
  companyName?: string;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function evalBadgeStyle(evaluation: string): string {
  const colors: Record<string, string> = {
    'OK': '#006E85', 'Atenção': '#FF9800', 'Risco': '#F44336',
  };
  return `background:${colors[evaluation] ?? '#9E9E9E'};color:#fff;
    border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;display:inline-block`;
}

function jarTestBadge(result: string): string {
  const colors: Record<string, string> = {
    ESTAVEL: '#006E85', SEPARACAO: '#FF9800', SEDIMENTACAO: '#FF9800',
    ESPUMA: '#FF9800', GEL: '#F44336',
  };
  const labels: Record<string, string> = {
    ESTAVEL: '✅ Estável', SEPARACAO: '⚠️ Separação de fases',
    SEDIMENTACAO: '⚠️ Sedimentação', ESPUMA: '⚠️ Espuma excessiva', GEL: '❌ Virou gel',
  };
  const c = colors[result] ?? '#9E9E9E';
  return `<span style="background:${c};color:#fff;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700">${labels[result] ?? result}</span>`;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    READY: '#006E85', PREPARING: '#2196F3', JAR_TEST: '#9C27B0',
    RISK: '#F44336', WATER_CHECK: '#FF9800', CLOSED: '#78909C', REQUESTED: '#9E9E9E',
  };
  return `<span style="background:${colors[status] ?? '#9E9E9E'};color:#fff;
    border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">${statusLabel(status)}</span>`;
}

export function generateLaudoHtml(data: LaudoData): string {
  const { lot, telemetry, jarTest, events, overrides, operatorName, companyName } = data;

  // Laudo ID
  const laudoId = `FGT-${lot.id.slice(-8).toUpperCase()}`;
  const ingredients = parseRecipe(lot.recipe_text);
  const alerts = detectIncompatibilities(lot.recipe_text);

  // ── SEÇÃO 3: Água ────────────────────────────────────────────────────────
  const waterSection = telemetry ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">💧</span>
        <span class="section-title">Análise da Água</span>
        <span style="${evalBadgeStyle(telemetry.evaluation)}">${telemetry.evaluation}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Parâmetro</th><th>Valor</th><th>Resultado</th><th>Referência</th></tr></thead>
        <tbody>
          <tr>
            <td>pH</td>
            <td><strong>${telemetry.ph.toFixed(1)}</strong></td>
            <td><span style="${evalBadgeStyle(telemetry.ph >= 5.5 && telemetry.ph <= 6.5 ? 'OK' : telemetry.ph >= 4.5 ? 'Atenção' : 'Risco')}">
              ${telemetry.ph >= 5.5 && telemetry.ph <= 6.5 ? 'OK' : telemetry.ph >= 4.5 ? 'Atenção' : 'Risco'}
            </span></td>
            <td>5,5 – 6,5</td>
          </tr>
          <tr>
            <td>Temperatura</td>
            <td><strong>${telemetry.temp_c.toFixed(1)} °C</strong></td>
            <td><span style="${evalBadgeStyle(telemetry.temp_c >= 10 && telemetry.temp_c <= 25 ? 'OK' : telemetry.temp_c >= 5 ? 'Atenção' : 'Risco')}">
              ${telemetry.temp_c >= 10 && telemetry.temp_c <= 25 ? 'OK' : telemetry.temp_c >= 5 ? 'Atenção' : 'Risco'}
            </span></td>
            <td>10 – 25 °C</td>
          </tr>
          ${telemetry.conductivity != null ? `
          <tr>
            <td>Condutividade</td>
            <td><strong>${telemetry.conductivity} µS/cm</strong></td>
            <td><span style="${evalBadgeStyle(telemetry.conductivity < 200 ? 'OK' : telemetry.conductivity <= 500 ? 'Atenção' : 'Risco')}">
              ${telemetry.conductivity < 200 ? 'OK' : telemetry.conductivity <= 500 ? 'Atenção' : 'Risco'}
            </span></td>
            <td>&lt; 200 µS/cm</td>
          </tr>` : ''}
          ${telemetry.hardness != null ? `
          <tr>
            <td>Dureza</td>
            <td><strong>${telemetry.hardness} mg/L</strong></td>
            <td><span style="${evalBadgeStyle(telemetry.hardness < 120 ? 'OK' : telemetry.hardness <= 200 ? 'Atenção' : 'Risco')}">
              ${telemetry.hardness < 120 ? 'OK' : telemetry.hardness <= 200 ? 'Atenção' : 'Risco'}
            </span></td>
            <td>&lt; 120 mg/L CaCO<sub>3</sub></td>
          </tr>` : ''}
          ${telemetry.turbidity != null ? `
          <tr>
            <td>Turbidez</td>
            <td><strong>${telemetry.turbidity} NTU</strong></td>
            <td><span style="${evalBadgeStyle(telemetry.turbidity < 5 ? 'OK' : telemetry.turbidity <= 15 ? 'Atenção' : 'Risco')}">
              ${telemetry.turbidity < 5 ? 'OK' : telemetry.turbidity <= 15 ? 'Atenção' : 'Risco'}
            </span></td>
            <td>&lt; 5 NTU</td>
          </tr>` : ''}
        </tbody>
      </table>
      <p class="timestamp">Registrado em: ${fmtDate(telemetry.created_at)}</p>
    </div>
  ` : `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">💧</span>
        <span class="section-title">Análise da Água</span>
      </div>
      <p class="empty-note">Análise de água não registrada.</p>
    </div>
  `;

  // ── SEÇÃO 4: Incompatibilidades ──────────────────────────────────────────
  const incompatSection = alerts.length > 0 ? `
    <div class="section incompat-section">
      <div class="section-header">
        <span class="section-icon">⚗️</span>
        <span class="section-title">Alertas de Incompatibilidade</span>
        <span style="background:#E65100;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">
          ${alerts.length} alerta${alerts.length > 1 ? 's' : ''}
        </span>
      </div>
      ${alerts.map(a => `
        <div class="incompat-card" style="border-left-color:${severityColor(a.rule.severity)}">
          <div class="incompat-title" style="color:${severityColor(a.rule.severity)}">
            ${a.rule.severity === 'danger' ? '⛔' : a.rule.severity === 'warning' ? '⚠️' : 'ℹ️'}
            ${a.rule.title}
            <span class="type-chip" style="background:${a.rule.type === 'chemical' ? '#6A1B9A' : a.rule.type === 'physical' ? '#00838F' : a.rule.type === 'biological' ? '#00313C' : '#1565C0'}">
              ${typeLabel(a.rule.type)}
            </span>
          </div>
          <div class="incompat-products">Produtos: <strong>${a.matchedProducts.join(' + ')}</strong></div>
          <div class="incompat-msg">${a.rule.message}</div>
          <div class="incompat-rec"><strong>💡 Recomendação:</strong> ${a.rule.recommendation}</div>
          ${a.rule.source ? `<div class="incompat-source">📚 ${a.rule.source}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  // ── SEÇÃO 5: Preparo / Receita ───────────────────────────────────────────
  const typeColors: Record<string, string> = {
    PH_CORRECTOR: '#1565C0', WP_WG: '#6A1B9A', SC: '#00838F',
    EC_EW: '#E65100', SL: '#00313C', ADJUVANT: '#795548',
    FERTILIZER: '#004D5E', UNKNOWN: '#9E9E9E',
  };

  const prepSection = `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">⚗️</span>
        <span class="section-title">Receita e Ordem de Preparo</span>
      </div>
      ${ingredients.length > 0 ? `
        <p class="order-note">🧠 Ordem corrigida automaticamente pelo protocolo de mistura em tanque.</p>
        <table class="data-table">
          <thead><tr><th>#</th><th>Produto</th><th>Dose</th><th>Formulação</th><th>Instrução</th></tr></thead>
          <tbody>
            ${ingredients.map((ing, i) => `
              <tr>
                <td style="color:#999;font-size:11px">${i + 1}</td>
                <td><strong>${ing.name}</strong></td>
                <td>${ing.dose || '—'}</td>
                <td>
                  <span style="background:${typeColors[ing.formulationType] ?? '#9E9E9E'};color:#fff;
                    border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">
                    ${formulationLabel(ing.formulationType)}
                  </span>
                  ${ing.confidence === 'low' ? '<span style="color:#FF9800;font-size:10px"> ⚠️</span>' : ''}
                </td>
                <td style="font-size:11px;color:#555">${ing.tipText || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${ingredients.some(i => i.confidence === 'low') ? `
          <p style="font-size:11px;color:#FF9800;margin-top:6px">⚠️ Tipo estimado automaticamente — verifique a bula dos produtos marcados.</p>
        ` : ''}
      ` : `<p class="empty-note">Receita não informada.</p>`}
    </div>
  `;

  // ── SEÇÃO 6: Jar Test ────────────────────────────────────────────────────
  const jarSection = jarTest ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">🧪</span>
        <span class="section-title">Jar Test</span>
        ${jarTestBadge(jarTest.result)}
      </div>
      ${jarTest.notes ? `<p class="jar-notes">"${jarTest.notes}"</p>` : ''}
      ${jarTest.photo_uri ? `
        <div class="photo-placeholder">📷 Foto registrada</div>
      ` : '<p class="empty-note" style="margin-top:8px">Sem foto registrada.</p>'}
      <p class="timestamp">Realizado em: ${fmtDate(jarTest.created_at)}</p>
    </div>
  ` : `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">🧪</span>
        <span class="section-title">Jar Test</span>
      </div>
      <p class="empty-note">Jar Test não realizado.</p>
    </div>
  `;

  // ── SEÇÃO 7: Overrides / Riscos aceitos ──────────────────────────────────
  const overrideSection = overrides.length > 0 ? `
    <div class="section risk-section">
      <div class="section-header">
        <span class="section-icon">⚠️</span>
        <span class="section-title">Riscos Aceitos com Justificativa</span>
      </div>
      ${overrides.map(o => `
        <div class="override-card">
          <div class="override-row">
            <span class="override-type">${o.override_type === 'water_engine' ? '💧 Água' : o.override_type === 'prep' ? '⚗️ Preparo' : '🧪 Jar Test'}</span>
            <span style="${evalBadgeStyle(o.severity)}">${o.severity}</span>
            <span class="override-ts">${fmtDate(o.created_at)}</span>
          </div>
          <div class="override-reason">Motivo: <strong>${o.reason_code}</strong>${o.reason_text ? ` — "${o.reason_text}"` : ''}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // ── SEÇÃO 8: Linha do Tempo ──────────────────────────────────────────────
  const timelineSection = events.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">📋</span>
        <span class="section-title">Linha do Tempo (Auditoria)</span>
      </div>
      <div class="timeline">
        ${events.map(ev => {
          let payload: any = {};
          try { payload = JSON.parse(ev.payload); } catch {}
          return `
            <div class="tl-item">
              <div class="tl-dot"></div>
              <div class="tl-content">
                <div class="tl-label">${ev.event_type.replace(/_/g, ' ')}</div>
                <div class="tl-time">${fmtDate(ev.created_at)}</div>
                ${payload.status ? `<div class="tl-detail">Status: ${statusLabel(payload.status)}</div>` : ''}
                ${payload.evaluation ? `<div class="tl-detail">Avaliação: ${payload.evaluation}</div>` : ''}
                ${payload.result ? `<div class="tl-detail">Resultado: ${payload.result}</div>` : ''}
                ${ev.pending ? '<div class="tl-pending">☁️ Pendente sincronização</div>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  // ── HTML COMPLETO ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laudo ${laudoId}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px; color: #1A1A1A; background: #fff; padding: 0; }

  /* ── CABEÇALHO ── */
  .report-header { background: linear-gradient(135deg, #00313C 0%, #00313C 100%);
    padding: 24px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { color: #fff; }
  .brand-name { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .brand-sub  { font-size: 11px; color: #7EC8D8; margin-top: 2px; }
  .report-meta { text-align: right; color: #fff; }
  .report-id  { font-size: 18px; font-weight: 700; color: #7EC8D8; }
  .report-date{ font-size: 11px; color: rgba(255,255,255,.7); margin-top: 4px; }
  .doc-title  { font-size: 12px; color: rgba(255,255,255,.85); margin-top: 2px; font-weight: 600; }

  /* ── STATUS BAR ── */
  .status-bar { background: #F0F4F0; border-bottom: 2px solid #B2DDE6;
    padding: 10px 32px; display: flex; gap: 24px; align-items: center; }
  .status-item { display: flex; flex-direction: column; }
  .status-label{ font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 2px; }
  .status-value{ font-size: 13px; font-weight: 700; color: #1A1A1A; }

  /* ── CORPO ── */
  .body { padding: 24px 32px; }

  /* ── SEÇÕES ── */
  .section { margin-bottom: 24px; border: 1px solid #E0E0E0;
    border-radius: 10px; overflow: hidden; }
  .section-header { background: #F5F5F5; padding: 12px 16px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #E0E0E0; }
  .section-icon  { font-size: 16px; }
  .section-title { font-size: 14px; font-weight: 700; color: #00313C; flex: 1; }
  .section-content{ padding: 16px; }

  /* ID box */
  .id-box { background: #E0F4F7; border-radius: 8px; padding: 12px 16px;
    margin: 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .id-field { display: flex; flex-direction: column; }
  .id-label { font-size: 10px; color: #888; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 3px; }
  .id-value { font-size: 14px; font-weight: 700; color: #1A1A1A; }

  /* Recipe note */
  .order-note { background: #E0F4F7; border-radius: 6px; padding: 8px 12px;
    font-size: 11px; color: #00313C; margin: 12px 16px 8px; font-weight: 600; }

  /* Tables */
  .data-table { width: 100%; border-collapse: collapse; margin: 0 0 8px; font-size: 12px; }
  .data-table th { background: #F5F5F5; padding: 8px 12px; text-align: left;
    font-size: 11px; font-weight: 700; color: #555; border-bottom: 1px solid #E0E0E0; }
  .data-table td { padding: 9px 12px; border-bottom: 1px solid #F5F5F5; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: #FAFAFA; }

  /* Incompat section */
  .incompat-section .section-header { background: #FFF3E0; border-bottom-color: #FFE0B2; }
  .incompat-card { margin: 12px 16px; padding: 12px 14px; border-left: 4px solid;
    border-radius: 6px; background: #FAFAFA; }
  .incompat-title { font-size: 13px; font-weight: 800; margin-bottom: 4px;
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .type-chip { border-radius: 20px; padding: 2px 7px; font-size: 10px; font-weight: 700; color: #fff; }
  .incompat-products { font-size: 12px; color: #555; margin-bottom: 4px; }
  .incompat-msg { font-size: 12px; color: #333; line-height: 1.6; margin-bottom: 6px; }
  .incompat-rec { font-size: 12px; color: #00313C; line-height: 1.6; padding: 6px 10px;
    background: rgba(27,94,32,.06); border-radius: 4px; margin-bottom: 4px; }
  .incompat-source { font-size: 10px; color: #888; font-style: italic; }

  /* Risk section */
  .risk-section .section-header { background: #FFEBEE; border-bottom-color: #FFCDD2; }
  .override-card { margin: 10px 16px; padding: 10px; background: #FAFAFA;
    border-radius: 6px; border-left: 3px solid #F44336; }
  .override-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
  .override-type { font-size: 12px; font-weight: 700; }
  .override-ts { font-size: 11px; color: #888; margin-left: auto; }
  .override-reason { font-size: 12px; color: #555; }

  /* Timeline */
  .timeline { padding: 12px 16px; }
  .tl-item { display: flex; gap: 12px; padding: 6px 0; }
  .tl-dot { width: 10px; height: 10px; border-radius: 50%; background: #00313C;
    flex-shrink: 0; margin-top: 4px; }
  .tl-label { font-size: 12px; font-weight: 600; color: #1A1A1A; }
  .tl-time  { font-size: 11px; color: #888; }
  .tl-detail{ font-size: 11px; color: #555; }
  .tl-pending{ font-size: 10px; color: #FF9800; font-weight: 600; }

  /* Misc */
  .timestamp  { font-size: 11px; color: #888; padding: 4px 16px 12px; }
  .empty-note { font-size: 12px; color: #888; padding: 12px 16px; font-style: italic; }
  .jar-notes  { font-size: 13px; color: #444; font-style: italic; padding: 8px 16px; }
  .photo-placeholder { background: #F5F5F5; border-radius: 8px; padding: 14px;
    text-align: center; color: #888; font-size: 12px; margin: 8px 16px; }

  /* ── ASSINATURA ── */
  .signature-section { display: flex; gap: 32px; margin-top: 8px; padding: 20px 32px;
    border-top: 2px solid #E0E0E0; }
  .sig-box { flex: 1; }
  .sig-line { border-top: 1.5px solid #333; margin-top: 32px; padding-top: 6px; }
  .sig-label{ font-size: 11px; color: #555; }

  /* ── RODAPÉ ── */
  .report-footer { background: #00313C; padding: 12px 32px;
    display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { color: #7EC8D8; font-size: 12px; font-weight: 700; }
  .footer-id    { color: rgba(255,255,255,.6); font-size: 11px; }
  .footer-disc  { color: rgba(255,255,255,.5); font-size: 10px; max-width: 300px; text-align: right; line-height: 1.4; }

  /* Print tweaks */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- CABEÇALHO -->
<div class="report-header">
  <div class="brand">
    <img src="${LOGO_BASE64}" style="height:44px;max-width:220px;object-fit:contain;margin-bottom:6px;filter:brightness(0) invert(1);" alt="SmartSpray" />
    <div class="brand-sub">Qualidade da Calda</div>
    ${companyName ? `<div style="color:rgba(255,255,255,.8);font-size:12px;margin-top:4px">${companyName}</div>` : ''}
  </div>
  <div class="report-meta">
    <div class="doc-title">LAUDO DE QUALIDADE DE CALDA</div>
    <div class="report-id">${laudoId}</div>
    <div class="report-date">Emitido em ${fmtDate(Date.now())}</div>
    <div style="margin-top:8px">${statusBadge(lot.status)}</div>
  </div>
</div>

<!-- STATUS BAR -->
<div class="status-bar">
  <div class="status-item">
    <span class="status-label">Fazenda</span>
    <span class="status-value">${lot.farm}</span>
  </div>
  <div class="status-item">
    <span class="status-label">Talhão</span>
    <span class="status-value">${lot.field}</span>
  </div>
  <div class="status-item">
    <span class="status-label">Volume</span>
    <span class="status-value">${lot.volume_liters.toLocaleString('pt-BR')} L</span>
  </div>
  <div class="status-item">
    <span class="status-label">Data</span>
    <span class="status-value">${fmtDateShort(lot.created_at)}</span>
  </div>
  <div class="status-item">
    <span class="status-label">pH final</span>
    <span class="status-value">${telemetry ? telemetry.ph.toFixed(1) : '—'}</span>
  </div>
  ${alerts.length > 0 ? `
  <div class="status-item">
    <span class="status-label">Incompatibilidades</span>
    <span class="status-value" style="color:#E65100">${alerts.length} alerta${alerts.length > 1 ? 's' : ''}</span>
  </div>` : ''}
</div>

<!-- CORPO -->
<div class="body">

  <!-- 1. IDENTIFICAÇÃO -->
  <div class="section">
    <div class="section-header">
      <span class="section-icon">📍</span>
      <span class="section-title">Identificação da Mistura</span>
    </div>
    <div class="id-box">
      <div class="id-field"><span class="id-label">ID Mistura</span><span class="id-value">${lot.id}</span></div>
      <div class="id-field"><span class="id-label">Fazenda</span><span class="id-value">${lot.farm}</span></div>
      <div class="id-field"><span class="id-label">Talhão</span><span class="id-value">${lot.field}</span></div>
      <div class="id-field"><span class="id-label">Volume</span><span class="id-value">${lot.volume_liters.toLocaleString('pt-BR')} L</span></div>
      <div class="id-field"><span class="id-label">Status</span><span class="id-value">${statusLabel(lot.status)}</span></div>
      <div class="id-field"><span class="id-label">Criado em</span><span class="id-value">${fmtDate(lot.created_at)}</span></div>
    </div>
  </div>

  <!-- 2. ÁGUA -->
  ${waterSection}

  <!-- 3. INCOMPATIBILIDADES -->
  ${incompatSection}

  <!-- 4. PREPARO -->
  ${prepSection}

  <!-- 5. JAR TEST -->
  ${jarSection}

  <!-- 6. RISCOS ACEITOS -->
  ${overrideSection}

  <!-- 7. LINHA DO TEMPO -->
  ${timelineSection}

</div>

<!-- ASSINATURA -->
<div class="signature-section">
  <div class="sig-box">
    <div class="sig-line">
      <div class="sig-label">Operador Responsável: ${operatorName ?? '________________________________'}</div>
    </div>
  </div>
  <div class="sig-box">
    <div class="sig-line">
      <div class="sig-label">Data / Hora da Aplicação: ______________________</div>
    </div>
  </div>
  <div class="sig-box">
    <div class="sig-line">
      <div class="sig-label">Assinatura</div>
    </div>
  </div>
</div>

<!-- RODAPÉ -->
<div class="report-footer">
  <div class="footer-brand">SmartSpray · ${laudoId}</div>
  <div class="footer-disc">
    Laudo gerado automaticamente. Confirme sempre com as bulas dos produtos. 
    Este documento é para uso interno e de rastreabilidade agronômica.
  </div>
</div>

</body>
</html>`;
}
