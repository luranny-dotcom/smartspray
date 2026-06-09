// src/utils/waterEvaluation.ts
import type { WaterEvaluation, LotStatus, PhCorrectionProduct } from '../types';

export interface WaterParams {
  ph: number;
  temp_c: number;
  conductivity?: number | null;
  hardness?: number | null;
  turbidity?: number | null;
}

export interface ParamEval {
  label: string;
  value: string;
  evaluation: WaterEvaluation;
  note: string;
}

// ─── pH correction suggestion ─────────────────────────────────────────────────

export interface PhCorrectionSuggestion {
  direction: 'up' | 'down' | null;
  target: string;
  products: Array<{
    id: string;
    name: string;
    dose: string;
    unit: string;
    observation: string;
  }>;
  tip: string;
  fromStock: boolean; // true = produtos do estoque, false = fallback genérico
}

// Produtos de fallback quando não há nenhum cadastrado no estoque
const FALLBACK_DOWN = [
  { id: 'fb-1', name: 'Ácido cítrico', dose: '0,5–1,0 g/100 L por unidade de pH', unit: 'g/100L', observation: 'Dissolva antes de adicionar. Opção mais segura.' },
  { id: 'fb-2', name: 'pH Down comercial', dose: '1–5 mL/100 L (conforme bula)', unit: 'mL/100L', observation: 'Formulação pronta, prática para campo.' },
];
const FALLBACK_UP = [
  { id: 'fb-3', name: 'Bicarbonato de sódio', dose: '0,3–0,5 g/100 L por unidade de pH', unit: 'g/100L', observation: 'Dissolva antes de adicionar.' },
];

/**
 * Gera sugestão de correção de pH.
 * @param ph       valor medido
 * @param stock    produtos ativos do banco (já filtrados por direção)
 *                 Se null, usa fallback genérico.
 */
export function buildPhCorrectionSuggestion(
  ph: number,
  stockDown: PhCorrectionProduct[],
  stockUp: PhCorrectionProduct[]
): PhCorrectionSuggestion | null {
  if (ph >= 5.5 && ph <= 6.5) return null;

  if (ph < 5.5) {
    const fromStock = stockUp.length > 0;
    const products = fromStock
      ? stockUp.map((p) => ({ id: p.id, name: p.name, dose: p.dose, unit: p.unit, observation: p.observation }))
      : FALLBACK_UP;
    return {
      direction: 'up', target: '5,5–6,5', fromStock,
      products,
      tip: `pH ${ph.toFixed(1)} abaixo do ideal. Adicione o corretor antes dos produtos e aguarde 1 min de agitação.`,
    };
  }

  // ph > 6.5
  const fromStock = stockDown.length > 0;
  const products = fromStock
    ? stockDown.map((p) => ({ id: p.id, name: p.name, dose: p.dose, unit: p.unit, observation: p.observation }))
    : FALLBACK_DOWN;
  return {
    direction: 'down', target: '5,5–6,5', fromStock,
    products,
    tip: `pH ${ph.toFixed(1)} acima do ideal. Muitos princípios ativos degradam em pH alcalino — corrija antes de misturar.`,
  };
}

// ─── Per-parameter evaluation ─────────────────────────────────────────────────

function evalPH(ph: number): WaterEvaluation {
  if (ph >= 5.5 && ph <= 6.5) return 'OK';
  if ((ph >= 4.5 && ph < 5.5) || (ph > 6.5 && ph <= 7.0)) return 'Atenção';
  return 'Risco';
}
function evalTemp(t: number): WaterEvaluation {
  if (t >= 10 && t <= 25) return 'OK';
  if ((t >= 5 && t < 10) || (t > 25 && t <= 30)) return 'Atenção';
  return 'Risco';
}
function evalConductivity(c: number): WaterEvaluation {
  if (c < 200) return 'OK';
  if (c <= 500) return 'Atenção';
  return 'Risco';
}
function evalHardness(h: number): WaterEvaluation {
  if (h < 120) return 'OK';
  if (h <= 200) return 'Atenção';
  return 'Risco';
}
function evalTurbidity(t: number): WaterEvaluation {
  if (t < 5) return 'OK';
  if (t <= 15) return 'Atenção';
  return 'Risco';
}

const RANK: Record<WaterEvaluation, number> = { OK: 0, Atenção: 1, Risco: 2 };

export function evaluateWater(params: WaterParams): { overall: WaterEvaluation; details: ParamEval[] } {
  const details: ParamEval[] = [];

  const phE = evalPH(params.ph);
  details.push({ label: 'pH', value: params.ph.toFixed(1), evaluation: phE, note: phE === 'OK' ? 'Ideal 5,5–6,5' : phE === 'Atenção' ? 'Fora do ideal; monitore' : 'Altamente ácido ou alcalino' });

  const tE = evalTemp(params.temp_c);
  details.push({ label: 'Temperatura', value: `${params.temp_c.toFixed(1)} °C`, evaluation: tE, note: tE === 'OK' ? 'Ideal 10–25 °C' : tE === 'Atenção' ? 'Temperatura limítrofe' : 'Temperatura crítica' });

  if (params.conductivity != null) {
    const e = evalConductivity(params.conductivity);
    details.push({ label: 'Condutividade', value: `${params.conductivity} µS/cm`, evaluation: e, note: e === 'OK' ? 'Baixa salinidade' : e === 'Atenção' ? 'Salinidade moderada' : 'Alta salinidade — pode precipitar' });
  }
  if (params.hardness != null) {
    const e = evalHardness(params.hardness);
    details.push({ label: 'Dureza', value: `${params.hardness} mg/L`, evaluation: e, note: e === 'OK' ? 'Água mole/moderada' : e === 'Atenção' ? 'Dureza elevada' : 'Água muito dura — use amaciante' });
  }
  if (params.turbidity != null) {
    const e = evalTurbidity(params.turbidity);
    details.push({ label: 'Turbidez', value: `${params.turbidity} NTU`, evaluation: e, note: e === 'OK' ? 'Água limpa' : e === 'Atenção' ? 'Turbidez moderada' : 'Água turva — pode entupir bicos' });
  }

  const overall = details.reduce<WaterEvaluation>((acc, d) => RANK[d.evaluation] > RANK[acc] ? d.evaluation : acc, 'OK');
  return { overall, details };
}

// ─── Color / label helpers ────────────────────────────────────────────────────
export function evalColor(evaluation: WaterEvaluation): string {
  switch (evaluation) {
    case 'OK': return '#006E85';
    case 'Atenção': return '#FF9800';
    case 'Risco': return '#F44336';
  }
}
export function statusColor(status: LotStatus | string): string {
  switch (status) {
    case 'READY': return '#006E85';
    case 'PREPARING': return '#2196F3';
    case 'JAR_TEST': return '#9C27B0';
    case 'RISK': return '#F44336';
    case 'WATER_CHECK': return '#FF9800';
    case 'CLOSED': return '#78909C';
    default: return '#9E9E9E';
  }
}
export function statusLabel(status: LotStatus | string): string {
  switch (status) {
    case 'READY': return 'Pronta';
    case 'PREPARING': return 'Em preparo';
    case 'JAR_TEST': return 'Jar Test';
    case 'RISK': return 'Risco';
    case 'WATER_CHECK': return 'Análise água';
    case 'CLOSED': return 'Fechada';
    default: return 'Solicitada';
  }
}
export function jarTestLabel(result: string): string {
  const m: Record<string, string> = { ESTAVEL: '✅ Estável', SEPARACAO: '⚠️ Separação', SEDIMENTACAO: '⚠️ Sedimentação', ESPUMA: '⚠️ Espuma excessiva', GEL: '❌ Virou gel' };
  return m[result] ?? result;
}
export function eventLabel(eventType: string): string {
  const m: Record<string, string> = {
    LOT_CREATED: '📋 Mistura criada', STATUS_CHANGED: '🔄 Status alterado',
    TELEMETRY_RECORDED: '💧 Análise de água salva', PREP_STEP_TOGGLED: '☑️ Etapa do preparo',
    PREP_COMPLETED: '🏁 Preparo concluído', JAR_TEST_SAVED: '🧪 Jar Test realizado',
    RISK_OVERRIDE: '⚠️ Risco aceito c/ justificativa', SYNC_TRIGGERED: '☁️ Sincronização realizada',
  };
  return m[eventType] ?? eventType;
}
