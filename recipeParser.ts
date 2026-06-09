// src/utils/recipeParser.ts
//
// Classifica ingredientes de uma receita e retorna a ordem correta de adição
// ao tanque, de acordo com o protocolo CIPAC/ABNT de mistura em tanque.
//
// Extensível: adicione entradas ao PRODUCT_DB para substituir a detecção
// automática por dados precisos (importação de lista futura).

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type FormulationType =
  | 'PH_CORRECTOR'    // Corretores de pH e sequestrantes de cátions
  | 'WP_WG'           // Pós molháveis / grânulos dispersíveis (pré-hidratar)
  | 'SC'              // Suspensões concentradas
  | 'EC_EW'           // Emulsões concentradas
  | 'SL'              // Soluções concentradas / líquidos solúveis
  | 'ADJUVANT'        // Adjuvantes, espalhantes, óleos
  | 'FERTILIZER'      // Fertilizantes foliares
  | 'UNKNOWN';        // Não identificado — entra no final (seguro)

export interface ParsedIngredient {
  raw: string;                  // texto original
  name: string;                 // nome do produto
  dose: string;                 // dose extraída
  formulationType: FormulationType;
  mixOrder: number;             // 1–8 (menor = primeiro a entrar)
  timerSeconds: number | null;  // aguardo mínimo após adição (null = sem timer)
  icon: string;
  tipText: string;
  confidence: 'high' | 'medium' | 'low';  // confiança da classificação
}

// ─── Base de produtos conhecidos (extensível) ─────────────────────────────────
// chave: substring do nome em minúsculas (case-insensitive)
// Adicione aqui ou substitua pela importação de JSON/CSV no futuro.
const PRODUCT_DB: Record<string, { type: FormulationType; confidence: 'high' }> = {
  // ── Corretores de pH ──────────────────────────────────
  'ácido cítrico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'acido citrico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'citric acid': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ph down': { type: 'PH_CORRECTOR', confidence: 'high' },
  'phdown': { type: 'PH_CORRECTOR', confidence: 'high' },
  'phdowner': { type: 'PH_CORRECTOR', confidence: 'high' },
  'redutor de ph': { type: 'PH_CORRECTOR', confidence: 'high' },
  'regulador de ph': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ácido fosfórico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'acido fosforico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ácido acético': { type: 'PH_CORRECTOR', confidence: 'high' },
  'acido acetico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ácido nítrico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ácido clorídrico': { type: 'PH_CORRECTOR', confidence: 'high' },
  'bicarbonato de sódio': { type: 'PH_CORRECTOR', confidence: 'high' },
  'bicarbonato sodio': { type: 'PH_CORRECTOR', confidence: 'high' },
  'hidróxido de cálcio': { type: 'PH_CORRECTOR', confidence: 'high' },
  'cal hidratada': { type: 'PH_CORRECTOR', confidence: 'high' },
  'hidróxido de sódio': { type: 'PH_CORRECTOR', confidence: 'high' },
  'soda cáustica': { type: 'PH_CORRECTOR', confidence: 'high' },
  'carbonato de cálcio': { type: 'PH_CORRECTOR', confidence: 'high' },
  'calcário': { type: 'PH_CORRECTOR', confidence: 'high' },
  'buffer': { type: 'PH_CORRECTOR', confidence: 'high' },
  'tampão': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ph buffer': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ph plus': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ph minus': { type: 'PH_CORRECTOR', confidence: 'high' },
  'ph up': { type: 'PH_CORRECTOR', confidence: 'high' },
  'aquafix': { type: 'PH_CORRECTOR', confidence: 'high' },
  'sequestran': { type: 'PH_CORRECTOR', confidence: 'high' },
  'water conditioner': { type: 'PH_CORRECTOR', confidence: 'high' },
  'condicionador de água': { type: 'PH_CORRECTOR', confidence: 'high' },
  // ── Pós Molháveis / Granulados (WP/WG) ────────────────
  'mancozebe': { type: 'WP_WG', confidence: 'high' },
  'mancozeb': { type: 'WP_WG', confidence: 'high' },
  'dithane': { type: 'WP_WG', confidence: 'high' },
  'manzate': { type: 'WP_WG', confidence: 'high' },
  'unizeb': { type: 'WP_WG', confidence: 'high' },
  'persist': { type: 'WP_WG', confidence: 'high' },
  'maneb': { type: 'WP_WG', confidence: 'high' },
  'zineb': { type: 'WP_WG', confidence: 'high' },
  'metiram': { type: 'WP_WG', confidence: 'high' },
  'propinebe': { type: 'WP_WG', confidence: 'high' },
  'polyram': { type: 'WP_WG', confidence: 'high' },
  'tiram': { type: 'WP_WG', confidence: 'high' },
  'thiram': { type: 'WP_WG', confidence: 'high' },
  'captan': { type: 'WP_WG', confidence: 'high' },
  'captana': { type: 'WP_WG', confidence: 'high' },
  'orthocide': { type: 'WP_WG', confidence: 'high' },
  'folpete': { type: 'WP_WG', confidence: 'high' },
  'folpan': { type: 'WP_WG', confidence: 'high' },
  'oxicloreto de cobre': { type: 'WP_WG', confidence: 'high' },
  'oxicloreto': { type: 'WP_WG', confidence: 'high' },
  'cuproxat': { type: 'WP_WG', confidence: 'high' },
  'curzate': { type: 'WP_WG', confidence: 'high' },
  'cupravi': { type: 'WP_WG', confidence: 'high' },
  'kocide': { type: 'WP_WG', confidence: 'high' },
  'champion': { type: 'WP_WG', confidence: 'high' },
  'calda bordalesa': { type: 'WP_WG', confidence: 'high' },
  'hidróxido de cobre': { type: 'WP_WG', confidence: 'high' },
  'cobox': { type: 'WP_WG', confidence: 'high' },
  'cuprogarb': { type: 'WP_WG', confidence: 'high' },
  'cuprozeb': { type: 'WP_WG', confidence: 'high' },
  'mancopper': { type: 'WP_WG', confidence: 'high' },
  'kumulus': { type: 'WP_WG', confidence: 'high' },
  'thiovit': { type: 'WP_WG', confidence: 'high' },
  'microthiol': { type: 'WP_WG', confidence: 'high' },
  'cosavet': { type: 'WP_WG', confidence: 'high' },
  'enxofre molhável': { type: 'WP_WG', confidence: 'high' },
  'heliosoufre': { type: 'WP_WG', confidence: 'high' },
  'microsulfan': { type: 'WP_WG', confidence: 'high' },
  'cercobin': { type: 'WP_WG', confidence: 'high' },
  'tiofanato': { type: 'WP_WG', confidence: 'high' },
  'tiofanato metílico': { type: 'WP_WG', confidence: 'high' },
  'carbendazim': { type: 'WP_WG', confidence: 'high' },
  'benomil': { type: 'WP_WG', confidence: 'high' },
  'derosal pm': { type: 'WP_WG', confidence: 'high' },
  'iprodiona': { type: 'WP_WG', confidence: 'high' },
  'iprodione': { type: 'WP_WG', confidence: 'high' },
  'rovral': { type: 'WP_WG', confidence: 'high' },
  'procimidona': { type: 'WP_WG', confidence: 'high' },
  'sumilex': { type: 'WP_WG', confidence: 'high' },
  'sialex': { type: 'WP_WG', confidence: 'high' },
  'clorotalonil': { type: 'WP_WG', confidence: 'high' },
  'chlorothalonil': { type: 'WP_WG', confidence: 'high' },
  'daconil': { type: 'WP_WG', confidence: 'high' },
  'bravonil': { type: 'WP_WG', confidence: 'high' },
  'cymoxanil': { type: 'WP_WG', confidence: 'high' },
  'famoxadona': { type: 'WP_WG', confidence: 'high' },
  'curzate m': { type: 'WP_WG', confidence: 'high' },
  'metalaxil wg': { type: 'WP_WG', confidence: 'high' },
  'ridomil gold wg': { type: 'WP_WG', confidence: 'high' },
  'fosetil': { type: 'WP_WG', confidence: 'high' },
  'aliette': { type: 'WP_WG', confidence: 'high' },
  'mikal': { type: 'WP_WG', confidence: 'high' },
  'iminoctadina': { type: 'WP_WG', confidence: 'high' },
  'bellkute': { type: 'WP_WG', confidence: 'high' },
  'befran': { type: 'WP_WG', confidence: 'high' },
  'atrazina wg': { type: 'WP_WG', confidence: 'high' },
  'metribuzim': { type: 'WP_WG', confidence: 'high' },
  'metribuzin': { type: 'WP_WG', confidence: 'high' },
  'sencor': { type: 'WP_WG', confidence: 'high' },
  'lexone': { type: 'WP_WG', confidence: 'high' },
  'diuron pm': { type: 'WP_WG', confidence: 'high' },
  'karmex': { type: 'WP_WG', confidence: 'high' },
  'hexazinona': { type: 'WP_WG', confidence: 'high' },
  'velpar': { type: 'WP_WG', confidence: 'high' },
  'tebuthiuron': { type: 'WP_WG', confidence: 'high' },
  'clorsulfurom': { type: 'WP_WG', confidence: 'high' },
  'glean': { type: 'WP_WG', confidence: 'high' },
  'metsulfurom wg': { type: 'WP_WG', confidence: 'high' },
  'ally wg': { type: 'WP_WG', confidence: 'high' },
  'trifloxissulfurom': { type: 'WP_WG', confidence: 'high' },
  'envoke': { type: 'WP_WG', confidence: 'high' },
  'pirimicarbe': { type: 'WP_WG', confidence: 'high' },
  'pirimor': { type: 'WP_WG', confidence: 'high' },
  // ── Suspensão Concentrada (SC) ────────────────────────
  'azoxistrobina': { type: 'SC', confidence: 'high' },
  'azoxystrobin': { type: 'SC', confidence: 'high' },
  'amistar': { type: 'SC', confidence: 'high' },
  'priori': { type: 'SC', confidence: 'high' },
  'quadris': { type: 'SC', confidence: 'high' },
  'piraclostrobina': { type: 'SC', confidence: 'high' },
  'pyraclostrobin': { type: 'SC', confidence: 'high' },
  'comet': { type: 'SC', confidence: 'high' },
  'trifloxistrobina': { type: 'SC', confidence: 'high' },
  'trifloxystrobin': { type: 'SC', confidence: 'high' },
  'flint': { type: 'SC', confidence: 'high' },
  'sphere': { type: 'SC', confidence: 'high' },
  'picoxistrobina': { type: 'SC', confidence: 'high' },
  'picoxystrobin': { type: 'SC', confidence: 'high' },
  'aproach': { type: 'SC', confidence: 'high' },
  'fluxapiroxade': { type: 'SC', confidence: 'high' },
  'fluxapyroxad': { type: 'SC', confidence: 'high' },
  'merivon': { type: 'SC', confidence: 'high' },
  'xemium': { type: 'SC', confidence: 'high' },
  'boscalida': { type: 'SC', confidence: 'high' },
  'boscalid': { type: 'SC', confidence: 'high' },
  'cantus': { type: 'SC', confidence: 'high' },
  'bellis': { type: 'SC', confidence: 'high' },
  'benzovindiflupir': { type: 'SC', confidence: 'high' },
  'solatenol': { type: 'SC', confidence: 'high' },
  'elatus': { type: 'SC', confidence: 'high' },
  'isopyrazam': { type: 'SC', confidence: 'high' },
  'seguris': { type: 'SC', confidence: 'high' },
  'sedaxane': { type: 'SC', confidence: 'high' },
  'vibrance': { type: 'SC', confidence: 'high' },
  'fluopyram': { type: 'SC', confidence: 'high' },
  'luna': { type: 'SC', confidence: 'high' },
  'verango': { type: 'SC', confidence: 'high' },
  'penthiopyrad': { type: 'SC', confidence: 'high' },
  'fontelis': { type: 'SC', confidence: 'high' },
  'pydiflumetofen': { type: 'SC', confidence: 'high' },
  'miravis': { type: 'SC', confidence: 'high' },
  'tebuconazol': { type: 'SC', confidence: 'high' },
  'tebuconazole': { type: 'SC', confidence: 'high' },
  'folicur': { type: 'SC', confidence: 'high' },
  'orius': { type: 'SC', confidence: 'high' },
  'trevo': { type: 'SC', confidence: 'high' },
  'propiconazol': { type: 'SC', confidence: 'high' },
  'propiconazole': { type: 'SC', confidence: 'high' },
  'tilt': { type: 'SC', confidence: 'high' },
  'bumper': { type: 'SC', confidence: 'high' },
  'epoxiconazol': { type: 'SC', confidence: 'high' },
  'epoxiconazole': { type: 'SC', confidence: 'high' },
  'opus': { type: 'SC', confidence: 'high' },
  'ciproconazol': { type: 'SC', confidence: 'high' },
  'cyproconazole': { type: 'SC', confidence: 'high' },
  'alto': { type: 'SC', confidence: 'high' },
  'artea': { type: 'SC', confidence: 'high' },
  'difenoconazol': { type: 'SC', confidence: 'high' },
  'difenoconazole': { type: 'SC', confidence: 'high' },
  'score': { type: 'SC', confidence: 'high' },
  'dividend': { type: 'SC', confidence: 'high' },
  'metconazol': { type: 'SC', confidence: 'high' },
  'metconazole': { type: 'SC', confidence: 'high' },
  'caramba': { type: 'SC', confidence: 'high' },
  'protioconazol': { type: 'SC', confidence: 'high' },
  'prothioconazole': { type: 'SC', confidence: 'high' },
  'proline': { type: 'SC', confidence: 'high' },
  'prosaro': { type: 'SC', confidence: 'high' },
  'ipconazol': { type: 'SC', confidence: 'high' },
  'rancona': { type: 'SC', confidence: 'high' },
  'flutriafol': { type: 'SC', confidence: 'high' },
  'impact': { type: 'SC', confidence: 'high' },
  'hexaconazol': { type: 'SC', confidence: 'high' },
  'hexaconazole': { type: 'SC', confidence: 'high' },
  'anvil': { type: 'SC', confidence: 'high' },
  'mefentrifluconazol': { type: 'SC', confidence: 'high' },
  'revysol': { type: 'SC', confidence: 'high' },
  'revystar': { type: 'SC', confidence: 'high' },
  'bromuconazol': { type: 'SC', confidence: 'high' },
  'vectra': { type: 'SC', confidence: 'high' },
  'tetraconazol': { type: 'SC', confidence: 'high' },
  'domark': { type: 'SC', confidence: 'high' },
  'eminent': { type: 'SC', confidence: 'high' },
  'ciprodinil': { type: 'SC', confidence: 'high' },
  'cyprodinil': { type: 'SC', confidence: 'high' },
  'switch': { type: 'SC', confidence: 'high' },
  'unix': { type: 'SC', confidence: 'high' },
  'pirimetanil': { type: 'SC', confidence: 'high' },
  'scala': { type: 'SC', confidence: 'high' },
  'mythos': { type: 'SC', confidence: 'high' },
  'fludioxonil': { type: 'SC', confidence: 'high' },
  'maxim': { type: 'SC', confidence: 'high' },
  'celest': { type: 'SC', confidence: 'high' },
  'dimetomorfe': { type: 'SC', confidence: 'high' },
  'dimetomorph': { type: 'SC', confidence: 'high' },
  'acrobat': { type: 'SC', confidence: 'high' },
  'forum': { type: 'SC', confidence: 'high' },
  'mandipropamid': { type: 'SC', confidence: 'high' },
  'revus': { type: 'SC', confidence: 'high' },
  'pergado': { type: 'SC', confidence: 'high' },
  'fluazinam': { type: 'SC', confidence: 'high' },
  'shirlan': { type: 'SC', confidence: 'high' },
  'isofetamid': { type: 'SC', confidence: 'high' },
  'kenja': { type: 'SC', confidence: 'high' },
  'fluopiram': { type: 'SC', confidence: 'high' },
  'velum': { type: 'SC', confidence: 'high' },
  'abamectina': { type: 'SC', confidence: 'high' },
  'abamectin': { type: 'SC', confidence: 'high' },
  'vertimec': { type: 'SC', confidence: 'high' },
  'kraft': { type: 'SC', confidence: 'high' },
  'abamax': { type: 'SC', confidence: 'high' },
  'emamectina': { type: 'SC', confidence: 'high' },
  'proclaim': { type: 'SC', confidence: 'high' },
  'espinosade': { type: 'SC', confidence: 'high' },
  'spinosad': { type: 'SC', confidence: 'high' },
  'tracer': { type: 'SC', confidence: 'high' },
  'success': { type: 'SC', confidence: 'high' },
  'espinetoran': { type: 'SC', confidence: 'high' },
  'spinetoram': { type: 'SC', confidence: 'high' },
  'delegate': { type: 'SC', confidence: 'high' },
  'radiant': { type: 'SC', confidence: 'high' },
  'clorantraniliprole': { type: 'SC', confidence: 'high' },
  'chlorantraniliprole': { type: 'SC', confidence: 'high' },
  'coragen': { type: 'SC', confidence: 'high' },
  'altacor': { type: 'SC', confidence: 'high' },
  'ciantraniliprole': { type: 'SC', confidence: 'high' },
  'cyantraniliprole': { type: 'SC', confidence: 'high' },
  'exirel': { type: 'SC', confidence: 'high' },
  'benevia': { type: 'SC', confidence: 'high' },
  'flubendiamida': { type: 'SC', confidence: 'high' },
  'fame': { type: 'SC', confidence: 'high' },
  'belt': { type: 'SC', confidence: 'high' },
  'imidacloprido': { type: 'SC', confidence: 'high' },
  'imidacloprid': { type: 'SC', confidence: 'high' },
  'confidor': { type: 'SC', confidence: 'high' },
  'merit': { type: 'SC', confidence: 'high' },
  'tiametoxam': { type: 'SC', confidence: 'high' },
  'thiamethoxam': { type: 'SC', confidence: 'high' },
  'actara': { type: 'SC', confidence: 'high' },
  'engeo': { type: 'SC', confidence: 'high' },
  'cruiser': { type: 'SC', confidence: 'high' },
  'acetamiprido': { type: 'SC', confidence: 'high' },
  'acetamiprid': { type: 'SC', confidence: 'high' },
  'mospilan': { type: 'SC', confidence: 'high' },
  'clotianidina': { type: 'SC', confidence: 'high' },
  'clothianidin': { type: 'SC', confidence: 'high' },
  'poncho': { type: 'SC', confidence: 'high' },
  'dinotefurano': { type: 'SC', confidence: 'high' },
  'safari': { type: 'SC', confidence: 'high' },
  'clorfenapir': { type: 'SC', confidence: 'high' },
  'chlorfenapyr': { type: 'SC', confidence: 'high' },
  'pirate': { type: 'SC', confidence: 'high' },
  'etoxazol': { type: 'SC', confidence: 'high' },
  'borneo': { type: 'SC', confidence: 'high' },
  'baroque': { type: 'SC', confidence: 'high' },
  'espiromesifeno': { type: 'SC', confidence: 'high' },
  'spiromesifen': { type: 'SC', confidence: 'high' },
  'oberon': { type: 'SC', confidence: 'high' },
  'spirodiclofen': { type: 'SC', confidence: 'high' },
  'envidor': { type: 'SC', confidence: 'high' },
  'spirotetramat': { type: 'SC', confidence: 'high' },
  'movento': { type: 'SC', confidence: 'high' },
  'bifenazato': { type: 'SC', confidence: 'high' },
  'bifenazate': { type: 'SC', confidence: 'high' },
  'floramite': { type: 'SC', confidence: 'high' },
  'acramite': { type: 'SC', confidence: 'high' },
  'hexitiazox': { type: 'SC', confidence: 'high' },
  'savey': { type: 'SC', confidence: 'high' },
  'nissorun': { type: 'SC', confidence: 'high' },
  'clofentezina': { type: 'SC', confidence: 'high' },
  'apollo': { type: 'SC', confidence: 'high' },
  'acequinocil': { type: 'SC', confidence: 'high' },
  'kanemite': { type: 'SC', confidence: 'high' },
  'lufenurom': { type: 'SC', confidence: 'high' },
  'match': { type: 'SC', confidence: 'high' },
  'teflubenzurom': { type: 'SC', confidence: 'high' },
  'nomolt': { type: 'SC', confidence: 'high' },
  'diflubenzurom': { type: 'SC', confidence: 'high' },
  'dimilin': { type: 'SC', confidence: 'high' },
  'buprofezina': { type: 'SC', confidence: 'high' },
  'applaud': { type: 'SC', confidence: 'high' },
  'piriproxifeno': { type: 'SC', confidence: 'high' },
  'esteem': { type: 'SC', confidence: 'high' },
  'mesotriona': { type: 'SC', confidence: 'high' },
  'mesotrione': { type: 'SC', confidence: 'high' },
  'callisto': { type: 'SC', confidence: 'high' },
  'tembotriona': { type: 'SC', confidence: 'high' },
  'tembotrione': { type: 'SC', confidence: 'high' },
  'laudis': { type: 'SC', confidence: 'high' },
  'bicyclopyrone': { type: 'SC', confidence: 'high' },
  'zetone': { type: 'SC', confidence: 'high' },
  'isoxaflutole': { type: 'SC', confidence: 'high' },
  'balance': { type: 'SC', confidence: 'high' },
  'priori xtra': { type: 'SC', confidence: 'high' },
  'orkestra': { type: 'SC', confidence: 'high' },
  'opera': { type: 'SC', confidence: 'high' },
  'nativo': { type: 'SC', confidence: 'high' },
  'abacus': { type: 'SC', confidence: 'high' },
  'aproach prima': { type: 'SC', confidence: 'high' },
  'sphere max': { type: 'SC', confidence: 'high' },
  'elatus arc': { type: 'SC', confidence: 'high' },
  'miravis duo': { type: 'SC', confidence: 'high' },
  'revystar xl': { type: 'SC', confidence: 'high' },
  'luna experience': { type: 'SC', confidence: 'high' },
  'luna privilege': { type: 'SC', confidence: 'high' },
  'velum prime': { type: 'SC', confidence: 'high' },
  'certero': { type: 'SC', confidence: 'high' },
  'ampligo': { type: 'SC', confidence: 'high' },
  'karate zeon': { type: 'SC', confidence: 'high' },
  'engeo pleno': { type: 'SC', confidence: 'high' },
  'lannate': { type: 'SC', confidence: 'high' },
  // ── Emulsão Concentrada (EC/EW) ───────────────────────
  'clorpirifós': { type: 'EC_EW', confidence: 'high' },
  'chlorpyrifos': { type: 'EC_EW', confidence: 'high' },
  'lorsban': { type: 'EC_EW', confidence: 'high' },
  'vexter': { type: 'EC_EW', confidence: 'high' },
  'profenofós': { type: 'EC_EW', confidence: 'high' },
  'profenofos': { type: 'EC_EW', confidence: 'high' },
  'curacron': { type: 'EC_EW', confidence: 'high' },
  'malationa': { type: 'EC_EW', confidence: 'high' },
  'malathion': { type: 'EC_EW', confidence: 'high' },
  'malatol': { type: 'EC_EW', confidence: 'high' },
  'fyfanon': { type: 'EC_EW', confidence: 'high' },
  'dimetoato': { type: 'EC_EW', confidence: 'high' },
  'dimethoate': { type: 'EC_EW', confidence: 'high' },
  'dimex': { type: 'EC_EW', confidence: 'high' },
  'roxion': { type: 'EC_EW', confidence: 'high' },
  'metamidofós': { type: 'EC_EW', confidence: 'high' },
  'diclorvós': { type: 'EC_EW', confidence: 'high' },
  'nuvan': { type: 'EC_EW', confidence: 'high' },
  'fenitrotiona': { type: 'EC_EW', confidence: 'high' },
  'fenitrothion': { type: 'EC_EW', confidence: 'high' },
  'sumithion': { type: 'EC_EW', confidence: 'high' },
  'metidationa': { type: 'EC_EW', confidence: 'high' },
  'methidathion': { type: 'EC_EW', confidence: 'high' },
  'suprathion': { type: 'EC_EW', confidence: 'high' },
  'acefato': { type: 'EC_EW', confidence: 'high' },
  'acephate': { type: 'EC_EW', confidence: 'high' },
  'orthene': { type: 'EC_EW', confidence: 'high' },
  'ometoato': { type: 'EC_EW', confidence: 'high' },
  'omethoate': { type: 'EC_EW', confidence: 'high' },
  'folimat': { type: 'EC_EW', confidence: 'high' },
  'quinalphos': { type: 'EC_EW', confidence: 'high' },
  'ekalux': { type: 'EC_EW', confidence: 'high' },
  'deltametrina': { type: 'EC_EW', confidence: 'high' },
  'deltamethrin': { type: 'EC_EW', confidence: 'high' },
  'decis': { type: 'EC_EW', confidence: 'high' },
  'deltanil': { type: 'EC_EW', confidence: 'high' },
  'cipermetrina': { type: 'EC_EW', confidence: 'high' },
  'cypermethrin': { type: 'EC_EW', confidence: 'high' },
  'galgotrin': { type: 'EC_EW', confidence: 'high' },
  'arrivo': { type: 'EC_EW', confidence: 'high' },
  'alfa-cipermetrina': { type: 'EC_EW', confidence: 'high' },
  'alpha-cypermethrin': { type: 'EC_EW', confidence: 'high' },
  'fastac': { type: 'EC_EW', confidence: 'high' },
  'concord': { type: 'EC_EW', confidence: 'high' },
  'lambda-cialotrina': { type: 'EC_EW', confidence: 'high' },
  'lambda-cyhalothrin': { type: 'EC_EW', confidence: 'high' },
  'karate': { type: 'EC_EW', confidence: 'high' },
  'juvinal': { type: 'EC_EW', confidence: 'high' },
  'beta-ciflutrina': { type: 'EC_EW', confidence: 'high' },
  'beta-cyfluthrin': { type: 'EC_EW', confidence: 'high' },
  'baytroid': { type: 'EC_EW', confidence: 'high' },
  'permetrina': { type: 'EC_EW', confidence: 'high' },
  'permethrin': { type: 'EC_EW', confidence: 'high' },
  'ambush': { type: 'EC_EW', confidence: 'high' },
  'pounce': { type: 'EC_EW', confidence: 'high' },
  'bifentrina': { type: 'EC_EW', confidence: 'high' },
  'bifenthrin': { type: 'EC_EW', confidence: 'high' },
  'talstar': { type: 'EC_EW', confidence: 'high' },
  'capture': { type: 'EC_EW', confidence: 'high' },
  'esfenvalerato': { type: 'EC_EW', confidence: 'high' },
  'esfenvalerate': { type: 'EC_EW', confidence: 'high' },
  'sumidan': { type: 'EC_EW', confidence: 'high' },
  'sumi-alpha': { type: 'EC_EW', confidence: 'high' },
  'fenvalerato': { type: 'EC_EW', confidence: 'high' },
  'fenvalerate': { type: 'EC_EW', confidence: 'high' },
  'sumicidin': { type: 'EC_EW', confidence: 'high' },
  'ectrin': { type: 'EC_EW', confidence: 'high' },
  'zeta-cipermetrina': { type: 'EC_EW', confidence: 'high' },
  'mustang': { type: 'EC_EW', confidence: 'high' },
  'ciflutrina': { type: 'EC_EW', confidence: 'high' },
  'cyfluthrin': { type: 'EC_EW', confidence: 'high' },
  'baythroid': { type: 'EC_EW', confidence: 'high' },
  'tau-fluvalinato': { type: 'EC_EW', confidence: 'high' },
  'mavrik': { type: 'EC_EW', confidence: 'high' },
  'klartan': { type: 'EC_EW', confidence: 'high' },
  'teflutrina': { type: 'EC_EW', confidence: 'high' },
  'tefluthrin': { type: 'EC_EW', confidence: 'high' },
  'force': { type: 'EC_EW', confidence: 'high' },
  'tolfenpirabe': { type: 'EC_EW', confidence: 'high' },
  'danitol': { type: 'EC_EW', confidence: 'high' },
  'imazalil': { type: 'EC_EW', confidence: 'high' },
  'fungaflor': { type: 'EC_EW', confidence: 'high' },
  'magnate': { type: 'EC_EW', confidence: 'high' },
  'fluazifope': { type: 'EC_EW', confidence: 'high' },
  'fluazifop': { type: 'EC_EW', confidence: 'high' },
  'fusilade': { type: 'EC_EW', confidence: 'high' },
  'hoelon': { type: 'EC_EW', confidence: 'high' },
  'haloxifope': { type: 'EC_EW', confidence: 'high' },
  'haloxyfop': { type: 'EC_EW', confidence: 'high' },
  'verdict': { type: 'EC_EW', confidence: 'high' },
  'gallant': { type: 'EC_EW', confidence: 'high' },
  'cletodim': { type: 'EC_EW', confidence: 'high' },
  'clethodim': { type: 'EC_EW', confidence: 'high' },
  'select': { type: 'EC_EW', confidence: 'high' },
  'centurion': { type: 'EC_EW', confidence: 'high' },
  'setoxidim': { type: 'EC_EW', confidence: 'high' },
  'sethoxydim': { type: 'EC_EW', confidence: 'high' },
  'poast': { type: 'EC_EW', confidence: 'high' },
  'nabu': { type: 'EC_EW', confidence: 'high' },
  'fenoxaprop': { type: 'EC_EW', confidence: 'high' },
  'furore': { type: 'EC_EW', confidence: 'high' },
  'puma': { type: 'EC_EW', confidence: 'high' },
  'trifluralin': { type: 'EC_EW', confidence: 'high' },
  'treflan': { type: 'EC_EW', confidence: 'high' },
  'pendimetalina': { type: 'EC_EW', confidence: 'high' },
  'pendimethalin': { type: 'EC_EW', confidence: 'high' },
  'herbadox': { type: 'EC_EW', confidence: 'high' },
  'prowl': { type: 'EC_EW', confidence: 'high' },
  'stomp': { type: 'EC_EW', confidence: 'high' },
  'etofumesato': { type: 'EC_EW', confidence: 'high' },
  'nortron': { type: 'EC_EW', confidence: 'high' },
  // ── Concentrado Solúvel (SL) ──────────────────────────
  'glifosato': { type: 'SL', confidence: 'high' },
  'glyphosate': { type: 'SL', confidence: 'high' },
  'glifosate': { type: 'SL', confidence: 'high' },
  'roundup': { type: 'SL', confidence: 'high' },
  'gliz': { type: 'SL', confidence: 'high' },
  'zapp': { type: 'SL', confidence: 'high' },
  'trop': { type: 'SL', confidence: 'high' },
  'radar': { type: 'SL', confidence: 'high' },
  'roundup original': { type: 'SL', confidence: 'high' },
  'roundup wmax': { type: 'SL', confidence: 'high' },
  'roundup ready': { type: 'SL', confidence: 'high' },
  'touchdown': { type: 'SL', confidence: 'high' },
  'sulfossato': { type: 'SL', confidence: 'high' },
  'sulfosate': { type: 'SL', confidence: 'high' },
  '2,4-d': { type: 'SL', confidence: 'high' },
  'ácido 2,4-d': { type: 'SL', confidence: 'high' },
  'tordon': { type: 'SL', confidence: 'high' },
  'banvel': { type: 'SL', confidence: 'high' },
  'dicamba': { type: 'SL', confidence: 'high' },
  'banlen': { type: 'SL', confidence: 'high' },
  'master': { type: 'SL', confidence: 'high' },
  'picloram': { type: 'SL', confidence: 'high' },
  'triclopir': { type: 'SL', confidence: 'high' },
  'trichlopyr': { type: 'SL', confidence: 'high' },
  'garlon': { type: 'SL', confidence: 'high' },
  'grazon': { type: 'SL', confidence: 'high' },
  'fluroxipir': { type: 'SL', confidence: 'high' },
  'fluroxypyr': { type: 'SL', confidence: 'high' },
  'starane': { type: 'SL', confidence: 'high' },
  'hurler': { type: 'SL', confidence: 'high' },
  'clopiralida': { type: 'SL', confidence: 'high' },
  'clopyralid': { type: 'SL', confidence: 'high' },
  'lontrel': { type: 'SL', confidence: 'high' },
  'stinger': { type: 'SL', confidence: 'high' },
  'aminopiralida': { type: 'SL', confidence: 'high' },
  'aminopyralid': { type: 'SL', confidence: 'high' },
  'milestone': { type: 'SL', confidence: 'high' },
  'paraquat': { type: 'SL', confidence: 'high' },
  'gramoxone': { type: 'SL', confidence: 'high' },
  'reglon': { type: 'SL', confidence: 'high' },
  'herboxone': { type: 'SL', confidence: 'high' },
  'diquat': { type: 'SL', confidence: 'high' },
  'reglone': { type: 'SL', confidence: 'high' },
  'aquacide': { type: 'SL', confidence: 'high' },
  'glufosinato': { type: 'SL', confidence: 'high' },
  'glufosinate': { type: 'SL', confidence: 'high' },
  'finale': { type: 'SL', confidence: 'high' },
  'basta': { type: 'SL', confidence: 'high' },
  'liberty': { type: 'SL', confidence: 'high' },
  'imazapir': { type: 'SL', confidence: 'high' },
  'imazapyr': { type: 'SL', confidence: 'high' },
  'arsenal': { type: 'SL', confidence: 'high' },
  'chopper': { type: 'SL', confidence: 'high' },
  'habitat': { type: 'SL', confidence: 'high' },
  'imazapique': { type: 'SL', confidence: 'high' },
  'imazapic': { type: 'SL', confidence: 'high' },
  'plateau': { type: 'SL', confidence: 'high' },
  'cadre': { type: 'SL', confidence: 'high' },
  'metilsulfurom': { type: 'SL', confidence: 'high' },
  'metsulfuron': { type: 'SL', confidence: 'high' },
  'ally': { type: 'SL', confidence: 'high' },
  'allie': { type: 'SL', confidence: 'high' },
  'tiabendazol': { type: 'SL', confidence: 'high' },
  'thiabendazole': { type: 'SL', confidence: 'high' },
  'tecto': { type: 'SL', confidence: 'high' },
  'flonicamida': { type: 'SL', confidence: 'high' },
  'teppeki': { type: 'SL', confidence: 'high' },
  'pimetrozina': { type: 'SL', confidence: 'high' },
  'chess': { type: 'SL', confidence: 'high' },
  'plenum': { type: 'SL', confidence: 'high' },
  // ── Adjuvantes / Óleos / Surfactantes ─────────────────
  'nimbus': { type: 'ADJUVANT', confidence: 'high' },
  'assist': { type: 'ADJUVANT', confidence: 'high' },
  'áureo': { type: 'ADJUVANT', confidence: 'high' },
  'aureo': { type: 'ADJUVANT', confidence: 'high' },
  'energic': { type: 'ADJUVANT', confidence: 'high' },
  'haiten': { type: 'ADJUVANT', confidence: 'high' },
  'spray aide': { type: 'ADJUVANT', confidence: 'high' },
  'dash': { type: 'ADJUVANT', confidence: 'high' },
  'agral': { type: 'ADJUVANT', confidence: 'high' },
  'silwet': { type: 'ADJUVANT', confidence: 'high' },
  'break thru': { type: 'ADJUVANT', confidence: 'high' },
  'break-thru': { type: 'ADJUVANT', confidence: 'high' },
  'natur l oil': { type: 'ADJUVANT', confidence: 'high' },
  'eco oil': { type: 'ADJUVANT', confidence: 'high' },
  'cropol': { type: 'ADJUVANT', confidence: 'high' },
  'veget oil': { type: 'ADJUVANT', confidence: 'high' },
  'siltek': { type: 'ADJUVANT', confidence: 'high' },
  'siltac': { type: 'ADJUVANT', confidence: 'high' },
  'sonata oil': { type: 'ADJUVANT', confidence: 'high' },
  'stylet oil': { type: 'ADJUVANT', confidence: 'high' },
  'sunspray': { type: 'ADJUVANT', confidence: 'high' },
  'óleo de soja': { type: 'ADJUVANT', confidence: 'high' },
  'oleo de soja': { type: 'ADJUVANT', confidence: 'high' },
  'éster metílico': { type: 'ADJUVANT', confidence: 'high' },
  'óleo vegetal': { type: 'ADJUVANT', confidence: 'high' },
  'oleo vegetal': { type: 'ADJUVANT', confidence: 'high' },
  'óleo mineral': { type: 'ADJUVANT', confidence: 'high' },
  'oleo mineral': { type: 'ADJUVANT', confidence: 'high' },
  'biodyne': { type: 'ADJUVANT', confidence: 'high' },
  'dyon': { type: 'ADJUVANT', confidence: 'high' },
  'agrotin': { type: 'ADJUVANT', confidence: 'high' },
  'move': { type: 'ADJUVANT', confidence: 'high' },
  'ecoil': { type: 'ADJUVANT', confidence: 'high' },
  'kinetic': { type: 'ADJUVANT', confidence: 'high' },
  'li 700': { type: 'ADJUVANT', confidence: 'high' },
  'lisofort': { type: 'ADJUVANT', confidence: 'high' },
  'bond': { type: 'ADJUVANT', confidence: 'high' },
  'extravon': { type: 'ADJUVANT', confidence: 'high' },
  'atplus': { type: 'ADJUVANT', confidence: 'high' },
  'codacide': { type: 'ADJUVANT', confidence: 'high' },
  'preference': { type: 'ADJUVANT', confidence: 'high' },
  'induce': { type: 'ADJUVANT', confidence: 'high' },
  'activator': { type: 'ADJUVANT', confidence: 'high' },
  'in-place': { type: 'ADJUVANT', confidence: 'high' },
  'lec-tech': { type: 'ADJUVANT', confidence: 'high' },
  'spreadmax': { type: 'ADJUVANT', confidence: 'high' },
  'penetrant': { type: 'ADJUVANT', confidence: 'high' },
  'iharol': { type: 'ADJUVANT', confidence: 'high' },
  'arma': { type: 'ADJUVANT', confidence: 'high' },
  'agrosil': { type: 'ADJUVANT', confidence: 'high' },
  'silmax': { type: 'ADJUVANT', confidence: 'high' },
  'interfix': { type: 'ADJUVANT', confidence: 'high' },
  'supersil': { type: 'ADJUVANT', confidence: 'high' },
  'span 80': { type: 'ADJUVANT', confidence: 'high' },
  'triton': { type: 'ADJUVANT', confidence: 'high' },
  'espalhante adesivo': { type: 'ADJUVANT', confidence: 'high' },
  'surfactante': { type: 'ADJUVANT', confidence: 'high' },
  // ── Fertilizantes Foliares ────────────────────────────
  'uréia': { type: 'FERTILIZER', confidence: 'high' },
  'ureia': { type: 'FERTILIZER', confidence: 'high' },
  'urea': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato de amônio': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato amônio': { type: 'FERTILIZER', confidence: 'high' },
  'nitrato de amônio': { type: 'FERTILIZER', confidence: 'high' },
  'nitrato de cálcio': { type: 'FERTILIZER', confidence: 'high' },
  'nitrato de potássio': { type: 'FERTILIZER', confidence: 'high' },
  'nitrato de magnésio': { type: 'FERTILIZER', confidence: 'high' },
  'npk': { type: 'FERTILIZER', confidence: 'high' },
  'uran': { type: 'FERTILIZER', confidence: 'high' },
  'uan': { type: 'FERTILIZER', confidence: 'high' },
  'fosfato de mono amônio': { type: 'FERTILIZER', confidence: 'high' },
  'map': { type: 'FERTILIZER', confidence: 'high' },
  'fosfato de diâmônio': { type: 'FERTILIZER', confidence: 'high' },
  'dap': { type: 'FERTILIZER', confidence: 'high' },
  'fosfato monopotássico': { type: 'FERTILIZER', confidence: 'high' },
  'mkp': { type: 'FERTILIZER', confidence: 'high' },
  'fosfito': { type: 'FERTILIZER', confidence: 'high' },
  'phosfito': { type: 'FERTILIZER', confidence: 'high' },
  'fosway': { type: 'FERTILIZER', confidence: 'high' },
  'fosfito de potássio': { type: 'FERTILIZER', confidence: 'high' },
  'phytogard': { type: 'FERTILIZER', confidence: 'high' },
  'boro': { type: 'FERTILIZER', confidence: 'high' },
  'boron': { type: 'FERTILIZER', confidence: 'high' },
  'borax': { type: 'FERTILIZER', confidence: 'high' },
  'ácido bórico': { type: 'FERTILIZER', confidence: 'high' },
  'acido borico': { type: 'FERTILIZER', confidence: 'high' },
  'solubor': { type: 'FERTILIZER', confidence: 'high' },
  'zinco': { type: 'FERTILIZER', confidence: 'high' },
  'zinc': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato de zinco': { type: 'FERTILIZER', confidence: 'high' },
  'zincor': { type: 'FERTILIZER', confidence: 'high' },
  'manganês': { type: 'FERTILIZER', confidence: 'high' },
  'manganese': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato de manganês': { type: 'FERTILIZER', confidence: 'high' },
  'ferro': { type: 'FERTILIZER', confidence: 'high' },
  'iron': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato ferroso': { type: 'FERTILIZER', confidence: 'high' },
  'cobre solúvel': { type: 'FERTILIZER', confidence: 'high' },
  'cobre foliar': { type: 'FERTILIZER', confidence: 'high' },
  'cobre quelatado': { type: 'FERTILIZER', confidence: 'high' },
  'molibdênio': { type: 'FERTILIZER', confidence: 'high' },
  'molybdenum': { type: 'FERTILIZER', confidence: 'high' },
  'molibdato': { type: 'FERTILIZER', confidence: 'high' },
  'cálcio foliar': { type: 'FERTILIZER', confidence: 'high' },
  'calcio foliar': { type: 'FERTILIZER', confidence: 'high' },
  'calciplex': { type: 'FERTILIZER', confidence: 'high' },
  'magnésio': { type: 'FERTILIZER', confidence: 'high' },
  'magnesio': { type: 'FERTILIZER', confidence: 'high' },
  'sulfato de magnésio': { type: 'FERTILIZER', confidence: 'high' },
  'silício': { type: 'FERTILIZER', confidence: 'high' },
  'silicon': { type: 'FERTILIZER', confidence: 'high' },
  'sifert': { type: 'FERTILIZER', confidence: 'high' },
  'aminoácido': { type: 'FERTILIZER', confidence: 'high' },
  'amino ácido': { type: 'FERTILIZER', confidence: 'high' },
  'aminonat': { type: 'FERTILIZER', confidence: 'high' },
  'ácido húmico': { type: 'FERTILIZER', confidence: 'high' },
  'acido humico': { type: 'FERTILIZER', confidence: 'high' },
  'humifert': { type: 'FERTILIZER', confidence: 'high' },
  'ácido fúlvico': { type: 'FERTILIZER', confidence: 'high' },
  'acido fulvico': { type: 'FERTILIZER', confidence: 'high' },
  'extrato de alga': { type: 'FERTILIZER', confidence: 'high' },
  'seaweed': { type: 'FERTILIZER', confidence: 'high' },
  'ascophyllum': { type: 'FERTILIZER', confidence: 'high' },
  'bioestimulante': { type: 'FERTILIZER', confidence: 'high' },
  'biostimulant': { type: 'FERTILIZER', confidence: 'high' },
  'stimulate': { type: 'FERTILIZER', confidence: 'high' },
  'agrivert': { type: 'FERTILIZER', confidence: 'high' },
  'atonik': { type: 'FERTILIZER', confidence: 'high' },
  'aminofert': { type: 'FERTILIZER', confidence: 'high' },
  'crop-set': { type: 'FERTILIZER', confidence: 'high' },
  'fertileader': { type: 'FERTILIZER', confidence: 'high' },
  'wuxal': { type: 'FERTILIZER', confidence: 'high' },
  'haifa': { type: 'FERTILIZER', confidence: 'high' },
  'nutriphite': { type: 'FERTILIZER', confidence: 'high' },
  'top eight': { type: 'FERTILIZER', confidence: 'high' },
  'speedfol': { type: 'FERTILIZER', confidence: 'high' },
  'librel': { type: 'FERTILIZER', confidence: 'high' },
};

// ─── Detecção por abreviatura de formulação ───────────────────────────────────
// Procura "(WP)", "WP ", " SC " etc. no nome do produto
const FORMULATION_ABBR: Array<{ pattern: RegExp; type: FormulationType }> = [
  { pattern: /\b(WP|PM|PH|WPG)\b/i,             type: 'WP_WG' },
  { pattern: /\b(WG|WDG|DF|DG|SG|GD)\b/i,       type: 'WP_WG' },
  { pattern: /\b(SC|FS|CS|WS|SE|ZC)\b/i,         type: 'SC' },
  { pattern: /\b(EC|EW|ME|EO|OD)\b/i,            type: 'EC_EW' },
  { pattern: /\b(SL|AS|WSC|SP|LSC|DC)\b/i,       type: 'SL' },
];

// ─── Detecção por palavras-chave no nome ──────────────────────────────────────
const KEYWORD_RULES: Array<{ keywords: string[]; type: FormulationType }> = [
  { keywords: ['espalhante', 'adjuvante', 'adjuvant', 'óleo', 'oleo', 'silicone', 'surfactante', 'surfactant'], type: 'ADJUVANT' },
  { keywords: ['buffer', 'ph ', 'corretor', 'sequestrante', 'citric', 'fosfórico', 'fosforico'], type: 'PH_CORRECTOR' },
  { keywords: ['boro', 'zinco', 'cálcio calcio', 'magnésio', 'foliar', 'nutri', 'npk', 'manganês', 'cobre', 'ferro', 'micronutriente', 'quelato', 'edta'], type: 'FERTILIZER' },
];

// ─── Metadados por tipo ───────────────────────────────────────────────────────
const TYPE_META: Record<FormulationType, {
  order: number;
  icon: string;
  timer: number | null;
  tip: (name: string) => string;
}> = {
  PH_CORRECTOR: {
    order: 1, icon: '⚗️', timer: 60,
    tip: (n) => `Adicione ${n} e meça o pH após 1 min de agitação antes de continuar.`,
  },
  WP_WG: {
    order: 2, icon: '🫙', timer: 900,
    tip: (n) => `Pré-hidrate ${n} em ≈2 L de água por 15 min antes de adicionar ao tanque. Agite vigorosamente.`,
  },
  SC: {
    order: 3, icon: '🧫', timer: 60,
    tip: (n) => `Adicione ${n} lentamente com agitação constante. Aguarde homogeneização.`,
  },
  EC_EW: {
    order: 4, icon: '🫗', timer: 90,
    tip: (n) => `Adicione ${n} pela lateral do tanque em fio contínuo — evita grumos. Mantenha agitação.`,
  },
  SL: {
    order: 5, icon: '💧', timer: 60,
    tip: (n) => `Adicione ${n} com agitação contínua. Aguarde 1 min de homogeneização antes de avançar.`,
  },
  ADJUVANT: {
    order: 6, icon: '🛢️', timer: 60,
    tip: (n) => `Adicione ${n} por último entre os ativos. Agite por 1 min. Óleos EC geralmente dispensam adjuvante adicional — verifique a bula.`,
  },
  FERTILIZER: {
    order: 7, icon: '🌱', timer: 60,
    tip: (n) => `Adicione ${n} após todos os produtos ativos. Agite 1 min para reduzir risco de "salting out".`,
  },
  UNKNOWN: {
    order: 8, icon: '📦', timer: 60,
    tip: (n) => `Adicione ${n}. Tipo de formulação não identificado — agite por 1 min e consulte a bula para a posição correta.`,
  },
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

/** Extrai dose de um fragmento de texto: "0,4 L/ha", "200 g/ha", "0,5% v.c." */
function extractDose(text: string): { name: string; dose: string } {
  // Padrão: número (vírgula ou ponto decimal) + unidade
  const doseRegex = /(\d+[.,]?\d*)\s*(L|ml|mL|g|kg|%)\s*(\/\s*(ha|v\.?c\.?|100\s*L|t\.?a\.?|vaso))?/i;
  const m = text.match(doseRegex);
  if (m) {
    const dose = m[0].replace(/\s+/, ' ').trim();
    const name = text.replace(doseRegex, '').replace(/^\s*[-–]\s*/, '').trim();
    return { name: name || text.trim(), dose };
  }
  return { name: text.trim(), dose: '' };
}

/** Detecta o tipo de formulação de um produto */
function classifyProduct(name: string): { type: FormulationType; confidence: 'high' | 'medium' | 'low' } {
  const lower = name.toLowerCase();

  // 1) Base de dados de produtos conhecidos (maior prioridade)
  for (const [key, val] of Object.entries(PRODUCT_DB)) {
    if (lower.includes(key)) return { type: val.type, confidence: val.confidence };
  }

  // 2) Abreviatura de formulação no nome do produto
  for (const rule of FORMULATION_ABBR) {
    if (rule.pattern.test(name)) return { type: rule.type, confidence: 'medium' };
  }

  // 3) Palavras-chave genéricas
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { type: rule.type, confidence: 'medium' };
    }
  }

  return { type: 'UNKNOWN', confidence: 'low' };
}

/** Quebra o texto da receita em fragmentos de ingredientes */
function splitIngredients(recipe: string): string[] {
  // Separa por +, ; ou nova linha, remove fragmentos vazios
  return recipe
    .split(/[+;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Parseia a receita e retorna os ingredientes ordenados pela sequência
 * correta de adição ao tanque.
 */
export function parseRecipe(recipeText: string): ParsedIngredient[] {
  if (!recipeText?.trim()) return [];

  const fragments = splitIngredients(recipeText);
  const ingredients: ParsedIngredient[] = fragments.map((raw) => {
    const { name, dose } = extractDose(raw);
    const { type, confidence } = classifyProduct(name);
    const meta = TYPE_META[type];
    return {
      raw,
      name,
      dose,
      formulationType: type,
      mixOrder: meta.order,
      timerSeconds: meta.timer,
      icon: meta.icon,
      tipText: meta.tip(name),
      confidence,
    };
  });

  // Ordena pela sequência de adição; empate mantém ordem original
  ingredients.sort((a, b) => a.mixOrder - b.mixOrder);

  return ingredients;
}

/** Rótulo amigável do tipo de formulação */
export function formulationLabel(type: FormulationType): string {
  const labels: Record<FormulationType, string> = {
    PH_CORRECTOR: 'Corretor de pH',
    WP_WG:        'Pó/Grânulo (WP/WG)',
    SC:           'Suspensão (SC)',
    EC_EW:        'Emulsão (EC/EW)',
    SL:           'Solução (SL)',
    ADJUVANT:     'Adjuvante/Óleo',
    FERTILIZER:   'Fertilizante Foliar',
    UNKNOWN:      'Tipo desconhecido',
  };
  return labels[type];
}

export function formulationColor(type: FormulationType): string {
  const colors: Record<FormulationType, string> = {
    PH_CORRECTOR: '#1565C0',
    WP_WG:        '#6A1B9A',
    SC:           '#00838F',
    EC_EW:        '#E65100',
    SL:           '#00313C',
    ADJUVANT:     '#795548',
    FERTILIZER:   '#004D5E',
    UNKNOWN:      '#9E9E9E',
  };
  return colors[type];
}

/**
 * Lista de nomes de produtos conhecidos (chaves do PRODUCT_DB).
 * Exportada para o autocomplete do campo de receita.
 */
export const KNOWN_PRODUCTS: string[] = Object.keys(PRODUCT_DB).map(
  (key) => key.charAt(0).toUpperCase() + key.slice(1)
);

// ─── Cálculo de dose total por área ──────────────────────────────────────────

export interface DoseTotal {
  value: number;
  unit: string;          // L, mL, kg, g
  displayUnit: string;   // já convertido (ex: 10000 mL → 10 L)
  displayValue: number;
  text: string;          // ex: "100 L total"
}

/**
 * Calcula o total de produto para uma área dada.
 * Entende: "2 L/ha", "200 mL/ha", "1 kg/ha", "500 g/ha"
 * Retorna null se a dose não for por hectare ou não for parseable.
 */
export function calculateTotalDose(doseStr: string, area_ha: number): DoseTotal | null {
  if (!doseStr || area_ha <= 0) return null;

  // Extrai valor numérico, unidade e referência (/ha obrigatório)
  const m = doseStr
    .replace(',', '.')
    .match(/^([\d.]+)\s*(L|mL|ml|kg|g)\s*\/\s*ha\b/i);

  if (!m) return null;

  const rawValue = parseFloat(m[1]);
  const rawUnit  = m[2].toLowerCase();
  if (isNaN(rawValue) || rawValue <= 0) return null;

  const total = rawValue * area_ha;

  // Conversão para unidade mais legível
  let displayValue = total;
  let displayUnit  = rawUnit;

  if (rawUnit === 'ml' && total >= 1000) {
    displayValue = total / 1000;
    displayUnit  = 'L';
  } else if (rawUnit === 'g' && total >= 1000) {
    displayValue = total / 1000;
    displayUnit  = 'kg';
  }

  // Formata o número: sem casas decimais se inteiro
  const fmt = (n: number) =>
    Number.isInteger(n) ? n.toString() : n.toFixed(n < 10 ? 2 : 1);

  return {
    value:        total,
    unit:         rawUnit,
    displayValue,
    displayUnit,
    text: `${fmt(displayValue)} ${displayUnit} total`,
  };
}
