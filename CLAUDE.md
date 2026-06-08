# CLAUDE.md — Colibri Planejamento

## Visão Geral do Projeto

Aplicação web PWA para professoras da Creche & Escola Colibri (Três Rios, RJ) criarem e gerenciarem planejamentos mensais pedagógicos e compromissos pessoais/profissionais. Substitui o fluxo manual no Canva.

**Stack:**
- Frontend: HTML + CSS + JavaScript vanilla (sem framework)
- Hospedagem: GitHub Pages (repositório: `colibri-planejamento`)
- Banco de dados: Supabase (PostgreSQL) — mesma conta do projeto Quick Menu
- Auth: Supabase Auth (e-mail + senha)
- PDF: jsPDF (client-side, sem servidor)
- PWA: manifest.json + service worker para instalação no celular

**Usuárias:** até 10 professoras, estimativa real de 3 ativas. Sem painel de admin por enquanto — cadastro feito diretamente no Supabase.

---

## Regras de Trabalho

- **Uma tarefa por vez.** Nunca misturar features em um mesmo prompt.
- **Sempre fazer `git stash` antes de qualquer alteração.**
- **Rodar e testar localmente antes de qualquer commit.**
- **Nunca quebrar funcionalidade existente** sem reverter e reportar primeiro.
- **Commits em português**, descritivos: `feat: adiciona tela de agenda`, `fix: corrige salvamento de atividades`.
- **Cada prompt deve ter fases numeradas:** Investigação → Implementação → Validação.

---

## Estrutura de Arquivos

```
colibri-planejamento/
├── index.html          # App shell + todas as telas (SPA)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache offline)
├── css/
│   └── app.css         # Estilos globais
├── js/
│   ├── app.js          # Inicialização, roteamento de telas
│   ├── auth.js         # Login, logout, sessão Supabase
│   ├── planejamentos.js# CRUD de planejamentos e atividades
│   ├── agenda.js       # CRUD de eventos/compromissos
│   ├── calendario.js   # Renderização do calendário histórico
│   ├── pdf.js          # Geração de PDF com jsPDF
│   └── supabase.js     # Cliente Supabase + helpers
├── assets/
│   └── logo.png        # Logo do Colibri
└── CLAUDE.md
```

---

## Banco de Dados (Supabase)

### Tabelas

```sql
-- Turmas cadastradas na escola
CREATE TABLE turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,           -- Ex: "Pré 2", "Maternal 3"
  emoji text DEFAULT '🌟',
  cor text DEFAULT '#F97316',   -- hex da cor tema
  created_at timestamptz DEFAULT now()
);

-- Professoras (espelho do Supabase Auth)
CREATE TABLE professoras (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  nome text NOT NULL,
  initials text NOT NULL,       -- Ex: "JC"
  turma_id uuid REFERENCES turmas(id),
  created_at timestamptz DEFAULT now()
);

-- Planejamento mensal (cabeçalho)
CREATE TABLE planejamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professora_id uuid REFERENCES professoras(id),
  turma_id uuid REFERENCES turmas(id),
  mes integer NOT NULL,         -- 1-12
  ano integer NOT NULL,
  cor text DEFAULT '#F97316',
  status text DEFAULT 'rascunho', -- rascunho | concluido
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Semanas de cada planejamento
CREATE TABLE semanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id uuid REFERENCES planejamentos(id) ON DELETE CASCADE,
  numero integer NOT NULL,      -- 1, 2, 3, 4
  created_at timestamptz DEFAULT now()
);

-- Atividades por dia de cada semana
CREATE TABLE atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id uuid REFERENCES semanas(id) ON DELETE CASCADE,
  dia_semana text NOT NULL,     -- 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta'
  conteudo text,                -- texto livre com as atividades do dia
  updated_at timestamptz DEFAULT now()
);

-- Atividades fixas por turma (ex: "Rodinha e interação")
CREATE TABLE atividades_fixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid REFERENCES turmas(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer DEFAULT 0
);

-- Agenda de compromissos
CREATE TABLE eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professora_id uuid REFERENCES professoras(id),
  titulo text NOT NULL,
  categoria text NOT NULL,      -- 'reuniao' | 'formacao' | 'escola' | 'pessoal' | 'outro'
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  local text,
  observacao text,
  dia_todo boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Row Level Security (RLS)

Cada professora enxerga **apenas seus próprios dados**. Habilitar RLS em todas as tabelas com policy `professora_id = auth.uid()`.

---

## Design System

```css
--laranja: #F97316;   /* cor primária, CTAs */
--roxo:    #7C3AED;   /* categoria reunião, ação secundária */
--verde:   #10B981;   /* salvar, sucesso */
--azul:    #3B82F6;   /* categoria formação */
--rosa:    #EC4899;   /* categoria pessoal */
--bg:      #FFF8F0;   /* fundo global */
--text:    #1E1B18;
--muted:   #9CA3AF;
--border:  #E5E7EB;
```

**Fontes:** Fredoka One (títulos/logo) + Nunito (corpo)
**Border radius padrão:** 14–24px (visual arredondado, amigável)
**Bottom nav fixo** com 4 abas: Início, Histórico, Novo, Agenda

---

## Funcionalidades por Tela

### Login
- E-mail + senha via Supabase Auth
- Sessão persistente (não pede login toda vez)

### Início (Home)
- Saudação com nome da professora
- Cards de estatísticas: turmas, planos, PDFs
- Botão "Novo Planejamento"
- Lista dos planejamentos recentes

### Histórico (Calendário)
- Navegação por mês/ano (← →)
- Dias com planejamento ficam coloridos
- Dias com eventos da agenda ficam marcados com ponto
- Lista dos planos do mês abaixo do calendário

### Novo Planejamento
- Seleção de turma (chips visuais)
- Seleção de mês/ano
- Seleção de cor do tema
- Nome da professora pré-preenchido

### Editor de Planejamento
- Abas de semanas (Semana 1, 2, 3, 4)
- Card por dia (Seg–Sex)
- Atividades fixas da turma aparecem automaticamente como tags
- Textarea livre para atividades do dia
- Salvamento automático com debounce de 1.5s
- Botões: Salvar + Exportar PDF

### PDF
- Preview da grade completa
- Header com cor do tema, nome da turma e professora
- Mesmo visual do Canva (logo Colibri, tabela Seg–Sex, 4 semanas)
- Botão baixar + botão compartilhar

### Agenda
- Lista cronológica de compromissos futuros
- Agrupados por data
- FAB (+) para adicionar novo evento
- Modal bottom-sheet com: título, categoria, data, horário início/fim, local, observação
- Categorias: Reunião (roxo), Formação (azul), Escola (laranja), Pessoal (rosa), Outro (cinza)
- Botão lixeira para remover

---

## PWA

- `manifest.json` com nome "Colibri Planejamento", ícone laranja, `display: standalone`
- Service worker cacheando assets estáticos para funcionar offline
- Dados do Supabase cacheados localmente no IndexedDB para acesso offline
- Sincronização automática quando reconectar

---

## Convenções de Código

- Funções nomeadas em português: `salvarPlanejamento()`, `renderizarCalendario()`
- IDs de elementos HTML em kebab-case: `#screen-agenda`, `#btn-salvar`
- Comentários em português
- Sem dependências além de Supabase JS SDK e jsPDF (via CDN)
- Nenhum framework CSS — tudo vanilla CSS com variáveis

---

## Ambiente

- **Repositório:** github.com/[usuario]/colibri-planejamento
- **Deploy:** GitHub Pages (branch `main`, pasta `/`)
- **Supabase Project:** mesmo da conta Quick Menu (criar projeto separado: `colibri`)
- **URL produção:** https://[usuario].github.io/colibri-planejamento

---

## Roadmap de Fases

| Fase | O que cobre | Status |
|------|------------|--------|
| 1 | Setup repo, Supabase, Auth, PWA base | ⬜ Pendente |
| 2 | Editor de planejamentos + salvamento | ⬜ Pendente |
| 3 | Agenda de eventos | ⬜ Pendente |
| 4 | Geração de PDF | ⬜ Pendente |
| 5 | Offline (IndexedDB + sync) | ⬜ Pendente |
