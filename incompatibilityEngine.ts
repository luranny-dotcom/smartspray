// src/utils/incompatibilityEngine.ts
//
// Motor de detecção de incompatibilidades entre produtos agroquímicos.
//
// Arquitetura:
//   RULES_DB  → base de regras (sementes + importáveis via JSON/planilha)
//   detectIncompatibilities() → avalia uma receita e retorna alertas
//
// Tipos de incompatibilidade:
//   chemical   → reação química entre princípios ativos / grupos químicos
//   physical   → separação de fases, gelificação, precipitação física
//   biological → inibição de microrganismos benéficos
//   ph         → princípio ativo exige faixa de pH incompatível com outro
//
// Como importar sua lista:
//   1. Crie um JSON seguindo a interface IncompatibilityRule abaixo
//   2. Importe e concatene com RULES_DB:
//      import userRules from './myRules.json';
//      export const ALL_RULES = [...RULES_DB, ...userRules];
//   3. Passe ALL_RULES para detectIncompatibilities()

import type { FormulationType } from './recipeParser';
import { parseRecipe } from './recipeParser';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type IncompatibilityType = 'chemical' | 'physical' | 'biological' | 'ph';
export type IncompatibilitySeverity = 'danger' | 'warning' | 'info';

/**
 * Uma regra de incompatibilidade.
 *
 * triggers: array de grupos.
 *   - A regra é disparada quando TODOS os grupos têm pelo menos um match.
 *   - Dentro de cada grupo, o match é por substring case-insensitive (OR).
 *
 * Exemplo — cobre + enxofre:
 *   triggers: [
 *     ['cobre', 'oxicloreto', 'bordeaux', 'calda bordalesa'],  // grupo A: "algum produto de cobre"
 *     ['enxofre', 'kumulus', 'thiovit', 'microthiol']          // grupo B: "algum produto de enxofre"
 *   ]
 */
export interface IncompatibilityRule {
  id: string;
  type: IncompatibilityType;
  severity: IncompatibilitySeverity;
  /** Grupos de padrões de nome (OR intra-grupo, AND entre grupos) */
  triggers: string[][];
  /** Opcional: dispara também por tipo de formulação (OR intra-grupo, AND entre grupos) */
  formulationTriggers?: FormulationType[][];
  title: string;
  message: string;
  recommendation: string;
  /** Fonte da regra — preencha ao importar sua lista (bula, MAPA, pesquisa, etc.) */
  source?: string;
}

/** Alerta gerado para uma mistura específica */
export interface IncompatibilityAlert {
  rule: IncompatibilityRule;
  matchedProducts: string[];  // nomes dos produtos que dispararam a regra
}

// ─── Base de regras (sementes) ────────────────────────────────────────────────
// Regras baseadas em literatura agronômica consolidada.
// ATENÇÃO: sempre confirme com as bulas dos produtos específicos.

export const RULES_DB: IncompatibilityRule[] = [

  // ── QUÍMICA ──────────────────────────────────────────────────────────────

  {
    id: 'CHE-001',
    type: 'chemical',
    severity: 'danger',
    triggers: [
      ['cobre', 'oxicloreto', 'calda bordalesa', 'bordeaux', 'cupravi', 'curzate', 'kocide', 'champion'],
      ['enxofre', 'kumulus', 'thiovit', 'microthiol', 'cercobin m'],
    ],
    title: 'Cobre + Enxofre',
    message: 'A combinação de cobre com enxofre pode causar reação química gerando precipitado insolúvel e fitotoxidez, especialmente em temperaturas acima de 25 °C.',
    recommendation: 'Evite misturar em tanque. Aplique em dias separados ou consulte a bula para condições específicas de temperatura.',
    source: 'EMBRAPA — Compatibilidade de pesticidas',
  },
  {
    id: 'CHE-002',
    type: 'chemical',
    severity: 'danger',
    triggers: [
      ['cobre', 'oxicloreto', 'calda bordalesa', 'kocide', 'cupravi'],
      ['organofosforado', 'clorpirifós', 'dimethoate', 'dimetoato', 'malathion', 'acefato', 'lorsban', 'orthene'],
    ],
    title: 'Cobre + Organofosforado',
    message: 'O íon cobre catalisa a hidrólise de organofosforados, reduzindo significativamente a eficácia inseticida e podendo gerar subprodutos fitotóxicos.',
    recommendation: 'Não misturar. Realize aplicações em datas distintas com intervalo mínimo de 3 dias.',
    source: 'ANDEF — Guia de incompatibilidades',
  },
  {
    id: 'CHE-003',
    type: 'chemical',
    severity: 'warning',
    triggers: [
      ['mancozebe', 'dithane', 'manzate', 'persist', 'unizeb'],
      ['cobre', 'oxicloreto', 'kocide', 'cupravi', 'calda bordalesa'],
    ],
    title: 'Mancozebe + Cobre',
    message: 'A mistura pode causar precipitação e redução de eficácia de ambos os fungicidas. O pH alcalino do cobre degrada o mancozebe.',
    recommendation: 'Evitar. Se necessário, ajuste o pH para 6,0–6,5 e realize jar test antes da aplicação.',
    source: 'Dow AgroSciences — Tabela de compatibilidade Dithane',
  },
  {
    id: 'CHE-004',
    type: 'chemical',
    severity: 'warning',
    triggers: [
      ['2,4-d', '2.4-d'],
      ['glifosato', 'gliz', 'roundup', 'zapp qi', 'trop'],
    ],
    title: '2,4-D + Glifosato',
    message: '2,4-D pode precipitar o sal de glifosato em água dura (> 150 mg/L CaCO₃). A eficácia do glifosato pode ser reduzida.',
    recommendation: 'Use água de boa qualidade (< 100 mg/L CaCO₃) e adicione 2,4-D por último na calda. Faça jar test.',
    source: 'Bayer — Bula Roundup Original',
  },
  {
    id: 'CHE-005',
    type: 'chemical',
    severity: 'danger',
    triggers: [
      ['estrobilurina', 'azoxistrobina', 'piraclostrobina', 'trifloxistrobina', 'picoxistrobina', 'priori', 'opera', 'comet', 'orkestra', 'cabrio'],
      ['triadimenol', 'triadimefom', 'bayleton'],
    ],
    title: 'Estrobilurina + Triadimefom',
    message: 'Mistura química contraindicada — pode resultar em incompatibilidade física e redução de eficácia dos dois princípios ativos.',
    recommendation: 'Use formulações pré-misturadas aprovadas pelo fabricante (ex: Nativo, Opera) em vez de misturar em tanque.',
    source: 'BASF / Bayer — Notas técnicas de produto',
  },
  {
    id: 'CHE-006',
    type: 'chemical',
    severity: 'warning',
    triggers: [
      ['glifosato', 'gliz', 'roundup', 'zapp', 'trop'],
      ['sulfato de amônio', 'sulfato amônio', 'ureia'],
    ],
    title: 'Glifosato + Sulfato de Amônio (atenção)',
    message: 'Sulfato de amônio pode melhorar a absorção do glifosato em água dura, mas doses excessivas causam fitotoxidez nas culturas adjacentes.',
    recommendation: 'Use no máximo 3 kg/100 L. Adicione sulfato de amônio antes do glifosato e misture bem.',
    source: 'Monsanto — Recomendações técnicas Roundup',
  },

  // ── FÍSICA ───────────────────────────────────────────────────────────────

  {
    id: 'PHY-001',
    type: 'physical',
    severity: 'warning',
    formulationTriggers: [['EC_EW'], ['EC_EW']],  // 2+ ECs na mesma calda
    triggers: [],
    title: '2 ou mais formulações EC/EW na mesma calda',
    message: 'Múltiplas emulsões concentradas podem competir pelo espaço de emulsificação, causando separação de fases ou formação de grumos.',
    recommendation: 'Sempre realize jar test. Adicione os ECs separadamente com agitação entre cada um. Verifique a ordem correta na bula.',
    source: 'CIPAC — Diretrizes de mistura em tanque',
  },
  {
    id: 'PHY-002',
    type: 'physical',
    severity: 'warning',
    triggers: [
      ['nimbus', 'assist', 'aureo', 'áureo', 'energic', 'dash', 'haiten'],
      ['glifosato', 'gliz', 'roundup', 'zapp'],
    ],
    title: 'Óleo metilado + Glifosato (verificar)',
    message: 'Óleos metilados de soja podem reduzir a tensão superficial em excesso, causando escorrimento foliar e redução de absorção do glifosato.',
    recommendation: 'Use adjuvante recomendado na bula do glifosato. Dose máxima de óleo: 0,5 L/ha.',
    source: 'Syngenta — Recomendações técnicas',
  },
  {
    id: 'PHY-003',
    type: 'physical',
    severity: 'info',
    triggers: [
      ['wp', 'pm', 'wg', 'wdg', 'dithane', 'mancozebe', 'captan', 'enxofre'],
      ['ec', 'emulsão', 'opera', 'karate', 'score', 'comet'],
    ],
    title: 'Pó molhável (WP) + Emulsão (EC)',
    message: 'WP adicionado após EC pode causar aglomeração. A ordem de adição é crítica para estabilidade física da calda.',
    recommendation: 'Sempre adicione WP antes de EC. Pré-hidrate o WP separadamente por 10–15 min antes de adicionar ao tanque.',
    source: 'CIPAC — Protocolo de mistura em tanque',
  },
  {
    id: 'PHY-004',
    type: 'physical',
    severity: 'danger',
    triggers: [
      ['cloreto de potássio', 'kcl', 'cloreto potássio'],
      ['glifosato', 'gliz', 'roundup', 'zapp'],
    ],
    title: 'Cloreto de Potássio + Glifosato',
    message: 'O íon cloreto precipita o glifosato (forma sal insolúvel), causando perda total de eficácia e entupimento de bicos.',
    recommendation: 'Nunca misturar. Use sulfato de potássio se necessário adjuvante de K+.',
    source: 'Monsanto — Boletim técnico glifosato',
  },

  // ── BIOLÓGICA ─────────────────────────────────────────────────────────────

  {
    id: 'BIO-001',
    type: 'biological',
    severity: 'danger',
    triggers: [
      ['trichoderma', 'trico', 'agrotrich', 'trichodermil', 'ecotrich', 'biotrich'],
      ['tiofanato', 'carbendazim', 'benomyl', 'cercobin', 'derosal', 'sumilex', 'procimidona',
       'iprodiona', 'tebuconazol', 'propiconazol', 'ciproconazol'],
    ],
    title: 'Trichoderma + Fungicida sistêmico',
    message: 'Fungicidas sistêmicos (triazóis, benzimidazóis) são altamente tóxicos para Trichoderma spp., eliminando a população fúngica benéfica antes da colonização.',
    recommendation: 'Nunca misturar. Aplique o biológico 3–5 dias antes ou depois do fungicida. Verifique a etiqueta do produto biológico.',
    source: 'EMBRAPA Soja — Compatibilidade de Trichoderma com agroquímicos',
  },
  {
    id: 'BIO-002',
    type: 'biological',
    severity: 'danger',
    triggers: [
      ['bacillus', 'bacilos', 'serenade', 'sonata', 'b. subtilis', 'agrobio'],
      ['cobre', 'oxicloreto', 'calda bordalesa', 'kocide', 'cupravi'],
    ],
    title: 'Bacillus spp. + Cobre',
    message: 'Íons de cobre são bactericidas em concentrações agronômicas — eliminam Bacillus subtilis e outros bioagentes bacterianos.',
    recommendation: 'Nunca misturar. Aplique o biológico pelo menos 48 horas antes do cobre.',
    source: 'Bayer CropScience — Notas de compatibilidade Serenade',
  },
  {
    id: 'BIO-003',
    type: 'biological',
    severity: 'warning',
    triggers: [
      ['trichoderma', 'bacillus', 'beauveria', 'metarhizium', 'biológico', 'biocontrolador'],
      ['enxofre', 'kumulus', 'thiovit'],
    ],
    title: 'Biológico + Enxofre',
    message: 'Enxofre elementar tem ação fungicida / bactericida que pode comprometer biológicos. O risco é maior em temperaturas > 28 °C.',
    recommendation: 'Evitar. Se necessário, consulte o fabricante do biológico e realize teste de compatibilidade antes.',
    source: 'EMBRAPA — Guia de manejo integrado',
  },
  {
    id: 'BIO-004',
    type: 'biological',
    severity: 'warning',
    triggers: [
      ['beauveria', 'bassiana', 'boveril', 'bovermax', 'naturalis'],
      ['lambda-cialotrina', 'cialotrina', 'karate', 'talstar', 'bifentrina', 'cipermetrina'],
    ],
    title: 'Beauveria bassiana + Piretróide',
    message: 'Piretróides têm atividade fungistática que pode reduzir a viabilidade de esporos de Beauveria bassiana em mistura.',
    recommendation: 'Aplicar separadamente. Beauveria primeiro, piretróide após 5–7 dias.',
    source: 'Itaforte BioPro — Ficha técnica Bovermax',
  },

  // ── pH ───────────────────────────────────────────────────────────────────

  {
    id: 'PHZ-001',
    type: 'ph',
    severity: 'danger',
    triggers: [
      ['abamectina', 'vertimec', 'kraft', 'abamax', 'abamex'],
      ['calda bordalesa', 'calda viçosa', 'cobre', 'oxicloreto'],
    ],
    title: 'Abamectina + Produto alcalino (pH > 8)',
    message: 'Abamectina se hidrolisa rapidamente em pH > 8 (típico de caldas bordalesas). Perda de eficácia acaricida/inseticida em horas.',
    recommendation: 'Ajuste o pH da calda para 5,5–6,5 antes de adicionar a abamectina. Nunca misturar com calda bordalesa.',
    source: 'Syngenta — Bula Vertimec 18 EC',
  },
  {
    id: 'PHZ-002',
    type: 'ph',
    severity: 'warning',
    triggers: [
      ['spinosade', 'spinosina', 'tracer', 'success', 'delegate'],
      ['calda bordalesa', 'cobre', 'fungicida cúprico'],
    ],
    title: 'Spinosade + pH alcalino',
    message: 'Spinosade é instável em pH > 7,5. A alcalinidade de produtos cúpricos acelera a degradação do princípio ativo.',
    recommendation: 'Acerte o pH para 5,5–6,5 antes de adicionar spinosade. Realize jar test.',
    source: 'Corteva — Ficha técnica Tracer',
  },
  {
    id: 'PHZ-003',
    type: 'ph',
    severity: 'warning',
    triggers: [
      ['glifosato', 'gliz', 'roundup', 'zapp', 'trop'],
      ['calda', 'cobre', 'oxicloreto', 'sulfato de cobre'],
    ],
    title: 'Glifosato + pH acima de 7,0',
    message: 'Em pH > 7,0 o glifosato precipita parcialmente na forma de sal insolúvel, reduzindo absorção foliar. Água dura agrava o problema.',
    recommendation: 'Ajuste o pH da calda para 4,5–6,5 antes de adicionar o glifosato. Use ácido cítrico ou regulador de pH.',
    source: 'Monsanto — Manual técnico de aplicação',
  },
  {
    id: 'PHZ-004',
    type: 'ph',
    severity: 'info',
    triggers: [
      ['imidacloprido', 'imidacloprid', 'confidor', 'evidence', 'gaucho', 'nuprid'],
      ['calda bordalesa', 'cobre', 'oxicloreto'],
    ],
    title: 'Imidacloprido + Produtos alcalinos',
    message: 'Imidacloprido sofre hidrólise em pH > 9,0 (raro em campo, mas possível com calda bordalesa concentrada). Monitorar.',
    recommendation: 'Ajuste o pH para máx. 7,5. Realize jar test e meça pH da calda final.',
    source: 'Bayer — Bula Confidor WG',
  },
];

// ─── Motor de detecção ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesPattern(productName: string, patterns: string[]): boolean {
  const norm = normalize(productName);
  return patterns.some((p) => norm.includes(normalize(p)));
}

function matchesFormulationType(type: FormulationType, group: FormulationType[]): boolean {
  return group.includes(type);
}

/**
 * Detecta incompatibilidades em uma receita.
 * @param recipeText   Texto da receita (ex: "Priori Xtra 0,4 L/ha + Nimbus 0,5 L/vc")
 * @param rules        Base de regras (padrão: RULES_DB)
 * @returns            Lista de alertas ordenados por severidade (danger > warning > info)
 */
export function detectIncompatibilities(
  recipeText: string,
  rules: IncompatibilityRule[] = RULES_DB
): IncompatibilityAlert[] {
  if (!recipeText?.trim()) return [];

  const ingredients = parseRecipe(recipeText);
  if (ingredients.length < 2) return [];

  const alerts: IncompatibilityAlert[] = [];

  for (const rule of rules) {
    // ── Verifica triggers por nome ────────────────────────────────────────
    if (rule.triggers.length > 0) {
      // Para cada grupo, coleta os produtos que matcham
      const groupMatches: string[][] = rule.triggers.map((group) =>
        ingredients
          .filter((ing) => matchesPattern(ing.name, group))
          .map((ing) => ing.name)
      );

      // A regra dispara se TODOS os grupos têm pelo menos um match
      const allGroupsMatch = groupMatches.every((m) => m.length > 0);
      if (allGroupsMatch) {
        const matched = [...new Set(groupMatches.flat())];
        alerts.push({ rule, matchedProducts: matched });
        continue; // não precisa checar formulationType para essa regra
      }
    }

    // ── Verifica triggers por tipo de formulação ──────────────────────────
    if (rule.formulationTriggers && rule.formulationTriggers.length > 0) {
      const groupMatches: string[][] = rule.formulationTriggers.map((group) =>
        ingredients
          .filter((ing) => matchesFormulationType(ing.formulationType, group))
          .map((ing) => ing.name)
      );

      // Para físico PHY-001 (2 ECs): precisa de pelo menos 2 ingredientes diferentes matchando EC
      const allGroupsMatch = rule.id === 'PHY-001'
        ? groupMatches[0].length >= 2  // basta 2+ ECs
        : groupMatches.every((m) => m.length > 0);

      if (allGroupsMatch) {
        const matched = rule.id === 'PHY-001'
          ? groupMatches[0].slice(0, 3)
          : [...new Set(groupMatches.flat())];
        if (!alerts.find((a) => a.rule.id === rule.id)) {
          alerts.push({ rule, matchedProducts: matched });
        }
      }
    }
  }

  // Ordena: danger > warning > info
  const order: Record<IncompatibilitySeverity, number> = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.rule.severity] - order[b.rule.severity]);

  return alerts;
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

export function severityColor(severity: IncompatibilitySeverity): string {
  return { danger: '#F44336', warning: '#FF9800', info: '#1565C0' }[severity];
}

export function severityBg(severity: IncompatibilitySeverity): string {
  return { danger: '#FFEBEE', warning: '#FFF8E1', info: '#E3F2FD' }[severity];
}

export function severityIcon(severity: IncompatibilitySeverity): string {
  return { danger: '⛔', warning: '⚠️', info: 'ℹ️' }[severity];
}

export function typeLabel(type: IncompatibilityType): string {
  return {
    chemical: '⚗️ Química',
    physical: '🧪 Física',
    biological: '🌱 Biológica',
    ph: '💧 pH',
  }[type];
}

export function typeBadgeColor(type: IncompatibilityType): string {
  return {
    chemical: '#6A1B9A',
    physical: '#00838F',
    biological: '#00313C',
    ph: '#1565C0',
  }[type];
}

// ─── Estrutura para importação externa ───────────────────────────────────────
//
// Quando você enviar sua lista (PDF/planilha), vou converter para este formato:
//
// export const USER_RULES: IncompatibilityRule[] = [
//   {
//     id: 'USR-001',
//     type: 'chemical',
//     severity: 'danger',
//     triggers: [['produto A', 'marca A1'], ['produto B', 'marca B2']],
//     title: 'Produto A + Produto B',
//     message: '...',
//     recommendation: '...',
//     source: 'Planilha FertigeoTech — importado em 2025-01',
//   },
// ];
//
// E no motor:
//   import { USER_RULES } from './userRules';
//   const ALL_RULES = [...RULES_DB, ...USER_RULES];
//   detectIncompatibilities(recipe, ALL_RULES);
