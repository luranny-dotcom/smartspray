# SmartSpray Web — Como importar no Lovable

## Passo a passo

### 1. Novo projeto no Lovable
- Acesse lovable.dev → New Project
- Escolha "Import from GitHub" ou "Upload files"

### 2. Conectar Supabase
- No Lovable, clique em "Supabase" → Connect
- Escolha "Lovable Cloud" (cria automaticamente)
- Execute o SQL abaixo no editor do Supabase:

```sql
CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  created_at BIGINT NOT NULL,
  farm TEXT NOT NULL,
  field TEXT NOT NULL,
  volume_liters REAL NOT NULL,
  area_ha REAL,
  recipe_text TEXT DEFAULT '',
  status TEXT DEFAULT 'REQUESTED',
  last_ph REAL,
  last_temp_c REAL
);

CREATE TABLE telemetry (
  id TEXT PRIMARY KEY,
  lot_id TEXT REFERENCES lots(id),
  ph REAL NOT NULL,
  temp_c REAL NOT NULL,
  conductivity REAL,
  evaluation TEXT DEFAULT 'OK',
  created_at BIGINT NOT NULL
);

CREATE TABLE jar_tests (
  id TEXT PRIMARY KEY,
  lot_id TEXT REFERENCES lots(id),
  result TEXT DEFAULT 'ESTAVEL',
  photo_url TEXT,
  notes TEXT,
  created_at BIGINT NOT NULL
);
```

### 3. Variáveis de ambiente
Renomeie `.env.example` para `.env` e preencha com as credenciais do Supabase.

### 4. Instalar e rodar localmente (opcional)
```bash
npm install
npm run dev
```

## Estrutura do projeto
```
src/
├── screens/          # 9 telas do app
├── utils/            # lógica de negócio (recipeParser, incompatibilityEngine, waterEvaluation)
├── context/          # OperatorContext (login persistido em localStorage)
├── lib/              # supabase client + tipos
└── App.tsx           # roteamento + shell mobile
```

## Funcionalidades implementadas
- ✅ Login com 4 funções + persistência em localStorage
- ✅ Nova mistura com cálculo automático de dose por área
- ✅ Classificação automática de produtos (SC, EC, WP, SL, Adjuvante...)
- ✅ Alertas de incompatibilidade (cobre+enxofre, mancozebe+óleo, etc)
- ✅ Análise de água com avaliação em tempo real + sugestão de correção de pH
- ✅ Guia de preparo com ordem correta e timers
- ✅ Jar Test com 5 opções de resultado
- ✅ Detalhe com timeline de processo visual
- ✅ Laudo PDF com html2pdf.js
- ✅ Painel do Gestor com KPIs e mini-timelines
- ✅ Navegação bottom tab mobile-first
