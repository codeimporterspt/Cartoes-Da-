# Cartões Dá — Fluxos Detalhados de Ecrãs

> Plataforma interna Caetano Automotive Portugal - Distribution  
> Gestão de cartões de recompensa e prémios para colaboradores das marcas representadas.

---

## Índice

1. [Autenticação](#1-autenticação)
   - 1.1 Login
   - 1.2 Registo
   - 1.3 Registo Submetido
2. [Seleção de Marca](#2-seleção-de-marca-driveevents)
3. [Layout Principal (Sidebar)](#3-layout-principal--sidebar)
4. [Área do Utilizador — Prémios](#4-área-do-utilizador--prémios)
5. [Área do Utilizador — Consulta Cartões](#5-área-do-utilizador--consulta-cartões)
   - 5.1 Lista de cartões
   - 5.2 Gestão do Cartão (detalhe + histórico)
   - 5.3 Criar Cartão (modal)
   - 5.4 Template Declaração (modal)
   - 5.5 Atualizar Saldo (modal)
   - 5.6 Inativar / Reativar Cartão
   - 5.7 Transferir Cartão (ADMIN)
6. [BackOffice — Validação Prémios](#6-backoffice--validação-prémios)
   - 6.1 Lista de prémios pendentes
   - 6.2 Validar / Rejeitar (individual e em massa)
7. [BackOffice — Saldo Cartão](#7-backoffice--saldo-cartão)
8. [BackOffice — Origens](#8-backoffice--origens)
9. [BackOffice — Cartões (Admin)](#9-backoffice--cartões-admin)
   - 9.1 Aprovar cartão
   - 9.2 Rejeitar cartão
10. [BackOffice — Importações](#10-backoffice--importações)
11. [BackOffice — Histórico de Carregamentos](#11-backoffice--histórico-de-carregamentos)
12. [BackOffice — Concessões](#12-backoffice--concessões)
13. [Gestão de Utilizadores](#13-gestão-de-utilizadores)
14. [Diagrama de Fluxos Completo](#14-diagrama-de-fluxos-completo)
15. [Permissões por Papel](#15-permissões-por-papel)

---

## 1. Autenticação

### 1.1 Login  `/login`

```
┌─────────────────────────────────────────────┐
│                                             │
│              Cartões Dá                     │  ← título principal (bold, grande)
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Entrar na plataforma               │    │
│  │                                     │    │
│  │  Email                              │    │
│  │  ┌───────────────────────────────┐  │    │
│  │  │  email@empresa.pt          ▾  │  │    │  ← autocomplete com emails recentes
│  │  └───────────────────────────────┘  │    │
│  │                                     │    │
│  │  Password                           │    │
│  │  ┌──────────────────────────────┬─┐ │    │
│  │  │  ••••••••                    │👁│ │    │  ← botão mostrar/ocultar password
│  │  └──────────────────────────────┴─┘ │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐    │    │
│  │  │         Entrar              │    │    │  ← btn azul escuro (bg-blue-900)
│  │  └─────────────────────────────┘    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│     Ainda não tens conta? Criar conta       │  ← link para /register
│                                             │
│  © 2025 Caetano Automotive Portugal -       │
│  Distribution. Uso interno exclusivo.       │
└─────────────────────────────────────────────┘
```

**Comportamentos:**
- Campo email usa `<datalist>` com os últimos 5 emails usados (localStorage).
- Ao submeter com sucesso → guarda token JWT → navega para `/driveevents`.
- Em caso de erro → toast vermelho: `"Credenciais inválidas. Verifique o email e a password."`.
- Botão desativado enquanto `loading = true` → mostra `"A autenticar..."`.

---

### 1.2 Registo  `/register`

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          Cartões Dá                              │
│   Caetano Automotive Portugal - Distribution     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Criar conta                               │  │
│  │  Preenche os teus dados para solicitar...  │  │
│  │                                            │  │
│  │  Nome completo *                           │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  João Silva                          │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  Email profissional *                      │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  joao.silva@empresa.pt               │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  Password *          Confirmar password *  │  │
│  │  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │  ••••••••   👁 │  │  ••••••••     👁 │  │  │
│  │  └────────────────┘  └──────────────────┘  │  │
│  │                                            │  │
│  │  NIF                                       │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  123456789                           │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                            │  │
│  │  Marcas para as quais solicita acesso *    │  │
│  │  ┌────────────────────────────────────┐    │  │
│  │  │ ☑ BYD      ☑ Dongfeng  ☐ Farizon  │    │  │
│  │  │ ☐ Geely    ☑ Honda     ☐ Hyundai  │    │  │
│  │  │ ☐ Nissan   ☐ Xpeng    ☐ Zeekr    │    │  │
│  │  └────────────────────────────────────┘    │  │
│  │                                            │  │
│  │  Concessão por marca *                     │  │
│  │  BYD    ┌──────────────────────────────┐   │  │
│  │         │ Selecionar concessão...    ▾ │   │  │
│  │         └──────────────────────────────┘   │  │
│  │  Honda  ┌──────────────────────────────┐   │  │
│  │         │ Honda Lisboa — HC001       ▾ │   │  │
│  │         └──────────────────────────────┘   │  │
│  │                                            │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │         Solicitar acesso             │  │  │  ← desativado se validações falham
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│         Já tens conta? Entrar                    │
└──────────────────────────────────────────────────┘
```

**Validações:**
- Mínimo 1 marca selecionada.
- Cada marca selecionada precisa de concessão → aviso âmbar.
- Password ≥ 6 caracteres; confirmação deve coincidir → borda vermelha em tempo real.
- Botão desativado se qualquer validação falhar.

---

### 1.3 Registo Submetido (Aguarda Aprovação)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │              🕐                        │  │  ← ícone relógio (gray-600)
│  │                                        │  │
│  │    Registo aguarda aprovação           │  │
│  │                                        │  │
│  │  O teu registo foi recebido com        │  │
│  │  sucesso. Um administrador irá         │  │
│  │  analisar e aprovar a tua conta        │  │
│  │  em breve.                             │  │
│  │                                        │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │       Voltar ao login            │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 2. Seleção de Marca  `/driveevents`

Ecrã intermediário após login. O utilizador escolhe a marca antes de entrar na plataforma.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                    [A]           │  ← avatar com inicial do nome
│                                                                  │
│                       CARTÕES DÁ                                 │  ← Orbitron font, neon glow
│              SELECIONE A MARCA PARA ACEDER                       │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │            │  │            │  │            │  │            │ │
│  │  [BYD]     │  │ [DONGFENG] │  │  [GEELY]   │  │  [HONDA]   │ │  ← logos brancos sobre fundo escuro
│  │            │  │            │  │            │  │            │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │            │  │            │  │            │  │            │ │
│  │ [HYUNDAI]  │  │  [NISSAN]  │  │  [XPENG]   │  │  [ZEEKR]   │ │
│  │            │  │            │  │            │  │            │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                                                                  │
│            ┌──────────────────────┐  ┌──────────────────┐       │
│            │ Gestão de Utilizad.  │  │ Terminar Sessão  │       │  ← só ADMIN/IMPORTADOR vê o 1º botão
│            └──────────────────────┘  └──────────────────┘       │
│                      [badge vermelho com nº se há pendentes]     │
│                                                                  │
│      © 2025 Cartões Dá — Caetano Automotive Portugal             │
└──────────────────────────────────────────────────────────────────┘
```

**Comportamentos:**
- Fundo: gradiente escuro (deep navy/black) com glow roxo.
- Cards de marca: hover → escala 1.055, borda índigo, sombra.
- Cards entram com animação staggered (delay incremental).
- Só as marcas a que o utilizador tem acesso são mostradas (ADMIN vê todas).
- Avatar (canto superior direito) → dropdown com nome, papel e "Alterar Password".
- Se há utilizadores pendentes de aprovação → badge vermelho no botão "Gestão de Utilizadores".

**Modal "Alterar Password"** (overlay dark, card escuro):
```
┌────────────────────────────────┐
│  ALTERAR PASSWORD              │
│                                │
│  PASSWORD ATUAL                │
│  ┌────────────────────────┐    │
│  │  ••••••••              │    │
│  └────────────────────────┘    │
│  NOVA PASSWORD                 │
│  ┌────────────────────────┐    │
│  │  ••••••••              │    │
│  └────────────────────────┘    │
│  CONFIRMAR NOVA PASSWORD       │
│  ┌────────────────────────┐    │
│  │  ••••••••              │    │
│  └────────────────────────┘    │
│                                │
│  ┌──────────┐  ┌────────────┐  │
│  │ Cancelar │  │  Guardar   │  │
│  └──────────┘  └────────────┘  │
└────────────────────────────────┘
```

---

## 3. Layout Principal — Sidebar

Após selecionar a marca, a navegação usa um layout de duas colunas (sidebar fixa + conteúdo).

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR (w-64, bg=brand-primary)  │  CONTEÚDO                    │
│                                   │                              │
│  Cartões Dá                       │                              │
│  Hyundai Portugal                 │   [Página activa aqui]       │
│  ← Menu principal                 │                              │
│  ─────────────────────            │                              │
│  MENU PRINCIPAL                   │                              │
│    Prémios                        │                              │
│    Consulta Cartões               │                              │
│                                   │                              │
│  BACKOFFICE (só ADMIN/IMPORTADOR) │                              │
│    Validação Prémios              │                              │
│    Saldo Cartão                   │                              │
│    Origens                        │                              │
│    Cartões                        │                              │
│    Importações                    │                              │
│    Histórico Carregamentos        │                              │
│    Concessões                     │                              │
│                                   │                              │
│  ─────────────────────            │                              │
│  [A] Ana Silva                    │                              │
│      Administrador                │                              │
│  Terminar Sessão                  │                              │
└──────────────────────────────────────────────────────────────────┘
```

- Cor da sidebar = `var(--brand-primary)` (muda conforme a marca).
- Item ativo: `bg-white/20 text-white`; inativo: `text-white/70`.
- "← Menu principal" volta ao BrandSelector (`/driveevents`).
- VALIDADOR só vê "Validação Prémios" no backoffice.

---

## 4. Área do Utilizador — Prémios  `/premios`

```
┌──────────────────────────────────────────────────────────────────┐
│  Prémios                                   [Exportar Excel]      │
│  42 resultado(s)                                                 │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS                                              [Limpar]   │
│  Pesquisa    Concessão      Ano         Mês                      │
│  ┌────────┐  ┌──────────┐  ┌────────┐  ┌──────────────────────┐ │
│  │        │  │ Todas  ▾ │  │ Todos▾ │  │ Todos               ▾│ │
│  └────────┘  └──────────┘  └────────┘  └──────────────────────┘ │
│  [se ADMIN também aparece filtro "Utilizador"]                   │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Concessão │ Área │ Origem │ Matrí. │ Modelo │ Valor │ Período│ │
│  │           │      │        │        │        │       │        │ │
│  │ Honda     │ V    │ VN     │ AA-001 │ Civic  │250,00€│ 2025-03│ │  ← PENDENTE badge amarelo
│  │ Honda     │ V    │ VN     │ AB-002 │ HR-V   │180,00€│ 2025-03│ │  ← VALIDADO badge verde
│  │ Hyundai   │ PS   │ AV     │ AC-003 │ Tucson │320,00€│ 2025-02│ │  ← CARREGADO badge azul
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  42 prémio(s)                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Colunas (USER):** Concessão · Área · Origem · Matrícula · Modelo · Valor · Período · Estado · Data Importação · Data Validação · Data Pagamento

**Colunas adicionais (ADMIN):** + Utilizador · Email (primeiras colunas)

**Badges de estado:**
| Estado | Cor |
|--------|-----|
| PENDENTE | âmbar/amarelo |
| VALIDADO | verde |
| CARREGADO | azul |
| REJEITADO | vermelho |
| ANULADO | cinzento |

---

## 5. Área do Utilizador — Consulta Cartões  `/cartoes`

### 5.1 Lista de Cartões

```
┌──────────────────────────────────────────────────────────────────┐
│  Consulta Cartões                          [+ Criar Cartão]      │
│  3 cartão(ões)                                                   │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS                                              [Limpar]   │
│  Pesquisa    Estado       Concessão                              │
│  ┌────────┐  ┌──────────┐  ┌───────────────────────────────────┐ │
│  │        │  │ Todos  ▾ │  │ Todas                           ▾ │ │
│  └────────┘  └──────────┘  └───────────────────────────────────┘ │
│  [ADMIN: + filtro "Utilizador"]                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Concessão  │ Nº Cartão         │ Nº Série   │ Saldo  │ Est. │ │
│  │            │                   │            │        │      │ │
│  │ Honda Lx   │ 1234567890123456789│ 0987654321 │250,00€ │ATIVO │ │  ← [Ver] [Inativar]
│  │ Hyundai Pt │ 9876543210987654321│ 1234567890 │  0,00€ │PEND. │ │  ← [Ver]
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  3 cartão(ões)                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Ações por linha:**
- `[Ver]` → seleciona cartão e mostra secção "Gestão do Cartão" acima
- `[Inativar]` → abre modal de confirmação (se ACTIVE)
- `[Reativar]` → direto (se INACTIVE)
- `[Transferir]` → abre modal (só ADMIN)

---

### 5.2 Secção "Gestão do Cartão" (detalhe + histórico)

Aparece quando há pelo menos 1 cartão. O utilizador seleciona o cartão num dropdown.

```
┌──────────────────────────────────────────────────────────────────┐
│  Gestão do Cartão                                                │
│                                                                  │
│  Cartão:  ┌──────────────────────────────────────────┐          │
│           │ 1234567890123456789 — Honda Lx (ACTIVE) ▾│          │
│           └──────────────────────────────────────────┘          │
│                                                                  │
│  ┌────────────────┐  ┌──────────┐  ┌──────────────┐  ┌────────┐ │
│  │ Saldo Atual    │  │ Estado   │  │ Nº Cartão    │  │ Nº Série│ │
│  │ 250,00 €       │  │ ATIVO    │  │123456789...  │  │0987654.│ │
│  └────────────────┘  └──────────┘  └──────────────┘  └────────┘ │
│                                                                  │
│  [Atualizar Saldo]  [Inativar]                                   │
│  (só se ACTIVE)     (só se ACTIVE)                               │
│  [Reativar] (se INACTIVE)    [Transferir] (só ADMIN)             │
│                                                                  │
│  Histórico de Saldo                                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Valor Movimento │ Saldo   │ Atualizado por │ Data │ Notas   │ │
│  │ +250,00 €       │ 250,00€ │ João (ADMIN)   │01/03 │ Topup   │ │
│  │ -50,00 €        │ 200,00€ │ Ana (USER)     │15/03 │ —       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 5.3 Modal "Criar Cartão"

```
┌──────────────────────────────────────────────────┐
│  Criar Cartão                               [×]  │
│                                                  │
│  [se ADMIN] Utilizador                           │
│  ┌──────────────────────────────────────────┐    │
│  │ Próprio utilizador                     ▾ │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Concessão *                                     │
│  ┌──────────────────────────────────────────┐    │
│  │ Selecionar...                          ▾ │    │
│  └──────────────────────────────────────────┘    │
│  [Se user tem só 1 concessão → campo disabled]   │
│                                                  │
│  Número do Cartão *                              │
│  ┌──────────────────────────────────────────┐    │
│  │ 19 dígitos                               │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Número de Série *                               │
│  ┌──────────────────────────────────────────┐    │
│  │ 10 dígitos                               │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Declaração assinada (PDF/DOC)                   │
│  ┌──────────────────────────────────────────┐    │
│  │ Escolher ficheiro...                     │    │
│  └──────────────────────────────────────────┘    │
│  ↓ Download template declaração                  │  ← link azul para abrir modal de preenchimento
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ ℹ Após submissão, o cartão ficará         │    │
│  │   pendente de validação pela equipa      │    │
│  │   financeira.                             │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐              ┌──────────────────┐  │
│  │ Cancelar │              │    Submeter      │  │  ← desativado se campos inválidos
│  └──────────┘              └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Validações:**
- Nº Cartão: exactamente 19 dígitos numéricos.
- Nº Série: exactamente 10 dígitos numéricos.
- Concessão obrigatória.

---

### 5.4 Modal "Preencher Declaração" (template RTF)

```
┌──────────────────────────────────────────────────┐
│  Preencher Declaração                       [×]  │
│                                                  │
│  Preencha os campos para gerar a declaração      │
│  pré-preenchida. Pode editar antes de imprimir.  │
│                                                  │
│  Nome completo *                                 │
│  ┌──────────────────────────────────────────┐    │
│  │ Nome como consta no doc. de identidade   │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  NIF *                                           │
│  ┌──────────────────────────────────────────┐    │
│  │ 123456789                                │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Nº Cartão *                                     │
│  ┌──────────────────────────────────────────┐    │
│  │ 19 dígitos                               │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Nº Série *                                      │
│  ┌──────────────────────────────────────────┐    │
│  │ 10 dígitos                               │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐      ┌──────────────────────────┐  │
│  │ Cancelar │      │   Download Declaração    │  │
│  └──────────┘      └──────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Comportamento:** O frontend substitui os placeholders no ficheiro RTF em memória (client-side) e dispara download direto sem passar pelo servidor.

---

### 5.5 Modal "Atualizar Saldo"

```
┌──────────────────────────────────────────────────┐
│  Atualizar Saldo                            [×]  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Cartão: 1234567890123456789              │    │
│  │ Saldo atual: 250,00 €                    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Valor do Movimento (€) *                        │
│  ┌──────────────────────────────────────────┐    │
│  │ ex: 250.00                               │    │  ← pode ser negativo
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Notas                                           │
│  ┌──────────────────────────────────────────┐    │
│  │ Opcional                                 │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │   Atualizar Saldo    │    │
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

### 5.6 Modal "Inativar Cartão" (ConfirmModal)

```
┌──────────────────────────────────────────────────┐
│  Inativar Cartão                                 │
│                                                  │
│  Tem a certeza que pretende inativar o cartão    │
│   1234567890123456789? Esta ação impedirá         │
│  futuras atualizações de saldo.                  │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │      Inativar        │    │  ← btn vermelho
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

### 5.7 Modal "Transferir Cartão" (só ADMIN)

```
┌──────────────────────────────────────────────────┐
│  Transferir Cartão                          [×]  │
│                                                  │
│  Transferir cartão 1234567890123456789 para       │
│  outro utilizador.                               │
│                                                  │
│  Utilizador destino *                            │
│  ┌──────────────────────────────────────────┐    │
│  │ Selecionar...                          ▾ │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │     Transferir       │    │
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 6. BackOffice — Validação Prémios  `/backoffice/validacao`

Acessível a ADMIN, IMPORTADOR e VALIDADOR.

### 6.1 Lista de Prémios Pendentes

```
┌──────────────────────────────────────────────────────────────────┐
│  Validação Prémios                            [Exportar]         │
│  18 prémio(s) pendente(s)                                        │
├──────────────────────────────────────────────────────────────────┤
│  [banner azul se filtros activos]                                │
│  Total filtrado: 4.320,00 € (18 prémios)                         │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS                                              [Limpar]   │
│  Pesquisa │ Utilizador │ Concessão │ Área │ Origem               │
│  ┌──────┐  ┌─────────┐  ┌────────┐  ┌───┐  ┌───────────────┐   │
│  │      │  │ Todos ▾ │  │Todas ▾ │  │   │  │ Todas       ▾ │   │
│  └──────┘  └─────────┘  └────────┘  └───┘  └───────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │☐│ Utilizador │Concessão│ Área │Origem│Matrí│Model│ Valor │...│ │
│  ├─┼────────────┼─────────┼──────┼──────┼─────┼─────┼───────┼──┤ │
│  │☐│ João Silva │Honda Lx │ V    │ VN   │AA-01│Civic│250,00€│  │ │  ← [Validar][Rejeitar][Eliminar]
│  │☐│ Maria Stos │Hyundai  │ PS   │ AV   │AB-02│Tucs.│320,00€│  │ │
│  │☐│ ...                                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  18 prémio(s)                              Total: 4.320,00 €     │
└──────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════ BARRA FIXA NO RODAPÉ (quando há seleção) ══
│ 5 prémio(s) selecionado(s)   [Validar em massa (5)]   [Rejeitar em massa (5)]  [Limpar] │
══════════════════════════════════════════════════════════════════════════════════════════
```

**Checkbox de selecionar todos** → seleciona/limpa toda a página.

---

### 6.2 Modal "Validar Prémios" (ConfirmModal)

```
┌──────────────────────────────────────────────────┐
│  Validar Prémios                                 │
│                                                  │
│  Confirma a aprovação de 5 prémio(s)?            │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │       Validar        │    │  ← btn verde
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### Modal "Rejeitar Prémios"

```
┌──────────────────────────────────────────────────┐
│  Rejeitar Prémios                           [×]  │
│                                                  │
│  Vai rejeitar 5 prémio(s). Por favor indique     │
│  o motivo.                                       │
│                                                  │
│  Motivo de rejeição *                            │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │  Descreva o motivo...                    │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │      Rejeitar        │    │  ← btn vermelho, desativado se motivo vazio
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 7. BackOffice — Saldo Cartão  `/backoffice/saldo-cartao`

```
┌──────────────────────────────────────────────────────────────────┐
│  Saldo Cartão                              [Exportar Excel]      │
│  25 cartão(ões)                                                  │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS: Pesquisa │ Utilizador │ Concessão │ Estado   [Limpar]  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Util. │ Email │ NIF │ Cód.Deal│Concess│ Nº Cartão │Série │   │ │
│  │       │       │     │        │       │           │      │   │ │
│  │ Saldo Atual │ Estado │ Data Atualiz. Util. │ Data Atualiz. Imp│ │
│  │─────────────────────────────────────────────────────────────│ │
│  │ João Silva │ joao@.. │ 12345.. │ HC001 │Honda Lx│ 123456..   │ │
│  │            250,00€   │ ATIVO   │ 15/03/2025 │ 01/03/2025    │ │
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  25 cartão(ões)                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Nota:** "Data Atualiz. Importador" = data mais recente entre movimentos manuais (ADMIN/IMPORTADOR) e carregamentos via topup.

---

## 8. BackOffice — Origens  `/backoffice/origens`

```
┌──────────────────────────────────────────────────────────────────┐
│  Origens                         [+ Nova Origem] [Exportar Excel]│
│  12 origem(ns)                                                   │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS: Pesquisa │ Área │ Estado   [Limpar]                    │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Nome │ Área │ Matricula? │ Modelo? │ Estado │ Ações       │    │
│  │ VN   │ V    │ Sim        │ Não     │ ACTIVO │ [Editar] [Desativar]│
│  │ AV   │ PS   │ Não        │ Sim     │ ACTIVO │ [Editar] [Desativar]│
│  │ ...                                                       │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. BackOffice — Cartões (Admin)  `/backoffice/cartoes`

### 9.1 Lista com aprovação/rejeição

```
┌──────────────────────────────────────────────────────────────────┐
│  Cartões                               [Exportar Excel]          │
│  8 cartão(ões)                                                   │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS: Pesquisa │ Utilizador │ Concessão │ Estado   [Limpar]  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Utilizador │ Email │ Concessão │ Nº Cartão │ Estado │ Decl.  │ │
│  │            │       │           │           │        │        │ │
│  │ João Silva │joao@.│ Honda Lx  │12345...  │PENDENTE│Ver doc.│ │  ← [Aprovar][Rejeitar]
│  │ Ana Costa  │ana@. │ Hyundai   │98765...  │ATIVO   │Ver doc.│ │  ← sem ações
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

Só linhas em estado `PENDING` têm botões de ação.

### 9.2 Modal "Aprovar Cartão" (ConfirmModal)

```
┌──────────────────────────────────────────────────┐
│  Aprovar Cartão                                  │
│                                                  │
│  Confirma a aprovação do cartão                  │
│  1234567890123456789 de João Silva?              │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │       Aprovar        │    │  ← btn verde
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 9.3 Modal "Rejeitar Cartão"

```
┌──────────────────────────────────────────────────┐
│  Rejeitar Cartão                            [×]  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Utilizador: João Silva                   │    │
│  │ Email: joao.silva@honda.pt               │    │
│  │ Cartão: 1234567890123456789              │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Motivo de rejeição *                            │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │  ← será enviado por email ao utilizador
│  │  Este motivo será enviado por email...   │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│  O utilizador receberá um email com este coment. │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │      Rejeitar        │    │
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 10. BackOffice — Importações  `/backoffice/importacoes`

```
┌──────────────────────────────────────────────────────────────────┐
│  Importações                                                     │
│  Gerir importações de prémios, saldos, origens e concessões      │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐
│  │ Importar     │ │ Importar     │ │Carregamento│ │Parametriz. │ │ Importar   │
│  │ Prémios      │ │ Prémios      │ │  Saldo   │ │ Origens    │ │ Concessões │
│  │ Vendas       │ │ Após-Venda   │ │          │ │            │ │            │
│  │              │ │              │ │          │ │            │ │            │
│  │ Importar     │ │ Importar     │ │ Importar │ │ Importar   │ │ Importar   │
│  │ Ficheiro     │ │ Ficheiro     │ │ Ficheiro │ │ Ficheiro   │ │ Ficheiro   │
│  │ Descarregar  │ │ Descarregar  │ │Descarregar│ │Descarregar │ │Descarregar │
│  │  Template    │ │  Template    │ │ Template │ │  Template  │ │  Template  │
│  │ Último fich. │ │ Último fich. │ │Último fich│ │Último fich.│ │Último fich.│
│  │  carregado   │ │  carregado   │ │ carregado│ │  carregado │ │  carregado │
│  └──────────────┘ └──────────────┘ └──────────┘ └────────────┘ └────────────┘
├──────────────────────────────────────────────────────────────────┤
│  [Secção de upload aparece ao clicar num card]                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Importar Prémios Vendas                                 │    │
│  │  Ficheiro Excel (.xlsx)         [Importar]  [Cancelar]   │    │
│  │  ┌──────────────────────────┐                            │    │
│  │  │ Escolher ficheiro...     │                            │    │
│  │  └──────────────────────────┘                            │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│  [Se "Concessões" selecionado → tabela com concessões actuais]   │
├──────────────────────────────────────────────────────────────────┤
│  Histórico de Importações de Prémios                             │
│  De [____] Até [____]  [Limpar]                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Importado por │ Data │ Tipo │ Estado │ Prémios │ Erros       │ │
│  │ João Silva    │01/03 │Vendas│  OK    │   42    │ —           │ │
│  │ Ana Costa     │28/02 │AV    │ ERRO   │    0    │ NIF inválido│ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Comportamentos especiais:**
- Clicar em "Importar Ficheiro" num card abre directamente o seletor de ficheiro (sem abrir secção).
- Clicar no card (área geral) abre a secção de upload expandida abaixo dos cards.
- "Último ficheiro carregado" descarrega o último Excel que foi importado nessa categoria.

**Templates de importação (colunas Excel):**

| Tipo | Col A | Col B | Col C | Col D | Col E | Col F |
|------|-------|-------|-------|-------|-------|-------|
| Prémios Vendas | ID Origem | VIN | Matrícula | Dealer Code | NIF | Valor |
| Prémios Após-Venda | ID Origem | Matrícula | Dealer Code | NIF | Valor | Modelo |
| Topup (saldo) | NIF | Série | Nº Cartão | Valor | — | — |
| Origens | ID | Área | Origem | Estado | Matrícula | Modelo |
| Concessões | Nome | Dealer Code | — | — | — | — |

---

## 11. BackOffice — Histórico de Carregamentos  `/backoffice/historico`

```
┌──────────────────────────────────────────────────────────────────┐
│  Histórico de Carregamentos            [Exportar Excel]          │
│  156 registo(s)                                                  │
├──────────────────────────────────────────────────────────────────┤
│  FILTROS: Pesquisa │ Utilizador │ Origem │ Data Início │ Data Fim │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Utilizador│Concessão│Origem│Login  │NIF  │Nº Cartão│Movim.  │ │
│  │           │         │      │       │     │         │Saldo   │ │
│  │           │         │      │       │     │         │Data    │ │
│  │───────────────────────────────────────────────────────────  │ │
│  │ João Silva│Honda Lx │ VN   │joao@..│12345│1234567..│+250,00€│ │  ← verde
│  │           │         │      │       │     │         │250,00€ │ │
│  │           │         │      │       │     │         │01/03/25│ │
│  │ Ana Costa │Hyundai  │ AV   │ana@.. │98765│9876543..│+180,00€│ │
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  156 registo(s)           Total carregado: 42.500,00 €           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. BackOffice — Concessões  `/backoffice/concessoes`

```
┌──────────────────────────────────────────────────────────────────┐
│  Concessões                                                      │
│  (geridas via importação Excel na página Importações)            │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Nome da Instalação          │ Dealer Code                 │    │
│  │ Honda Lisboa                │ HC001                       │    │
│  │ Honda Porto                 │ HC002                       │    │
│  │ Hyundai Lisboa              │ HY001                       │    │
│  │ ...                                                       │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 13. Gestão de Utilizadores  `/utilizadores`

Layout diferente (UsersLayout, sem sidebar de marca). Acesso: ADMIN e IMPORTADOR.

```
┌──────────────────────────────────────────────────────────────────┐
│  [Cartões Dá]   [← Voltar]                           [A] logout │
├──────────────────────────────────────────────────────────────────┤
│  Utilizadores                         [+ Novo Utilizador]        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  [Ativos (12)]  [Pendentes (3)]  [Inativos (2)]          │    │  ← 3 tabs
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  FILTROS: Pesquisa │ Papel │ Marca │ Concessão       [Limpar]    │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Nome │ Email │ NIF │ Papel │ Marcas │ Concessão │ Ações      │ │
│  │ João │joao@.│12345│ USER  │hyundai │Honda Lx   │[Edit][Del] │ │
│  │ Ana  │ana@. │98765│ ADMIN │ todas  │ —         │[Edit][Del] │ │
│  │ ...                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Tab "Pendentes"

Utilizadores que registaram e aguardam aprovação de marca(s).

```
│ Nome │ Email │ NIF │ Marcas Pendentes │ Ações                     │
│ Rui  │rui@.. │33333│ honda, nissan    │[Aprovar][Aprovar c/ Edit][Rejeitar]│
```

### Modal "Novo / Editar Utilizador"

```
┌──────────────────────────────────────────────────────────────────┐
│  Novo Utilizador / Editar Utilizador                       [×]   │
│                                                                  │
│  Nome completo *      Email *                                    │
│  ┌────────────────┐   ┌──────────────────────────────────────┐   │
│  │                │   │                                      │   │
│  └────────────────┘   └──────────────────────────────────────┘   │
│                                                                  │
│  Password (vazio = manter)  NIF                                  │
│  ┌────────────────────────┐  ┌─────────────────────────────┐     │
│  │                        │  │                             │     │
│  └────────────────────────┘  └─────────────────────────────┘     │
│                                                                  │
│  Papel *                                                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ USER / IMPORTADOR / VALIDADOR / ADMIN                  ▾ │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Marcas *                                                        │
│  ☑ BYD  ☐ Dongfeng  ☐ Farizon  ☑ Honda  ☐ Hyundai  ...         │
│                                                                  │
│  Concessão por marca *          [só se USER ou IMPORTADOR]       │
│  Honda  ┌────────────────────────────────────────────────┐       │
│         │ Honda Lisboa — HC001                         ▾ │       │
│         └────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────┐                          ┌──────────────────────┐  │
│  │ Cancelar │                          │       Guardar        │  │
│  └──────────┘                          └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Modal "Resetar Password" (ADMIN)

```
┌──────────────────────────────────────────────────┐
│  Resetar Password                           [×]  │
│                                                  │
│  Nova Password para João Silva:                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Nova password (mín. 6 caracteres)        │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────┐        ┌──────────────────────┐    │
│  │ Cancelar │        │  Resetar Password    │    │
│  └──────────┘        └──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

---

## 14. Diagrama de Fluxos Completo

```
                          ┌─────────────────┐
                          │   /login         │
                          └────────┬────────┘
                    ┌──────────────┴──────────────┐
                    │ sucesso                      │ erro
                    ▼                              │
          ┌──────────────────┐             toast erro
          │  /driveevents    │
          │  Brand Selector  │
          └────────┬─────────┘
                   │
        ┌──────────┴───────────┐
        │ clica numa marca     │
        ▼                      │
  ┌──────────────┐       ┌─────┴──────────────────┐
  │ /premios     │       │ /utilizadores           │
  │ (USER/ADMIN) │       │ (ADMIN/IMPORTADOR)      │
  └──────┬───────┘       └─────────────────────────┘
         │
  ┌──────┴────────────────────────────────────────────┐
  │ Sidebar Navigation                                │
  │                                                   │
  │  USER:                                            │
  │  /premios ────────────────────────────────────────┤
  │  /cartoes ────────────────────────────────────────┤
  │                                                   │
  │  ADMIN/IMPORTADOR (BackOffice):                   │
  │  /backoffice/validacao ───────────────────────────┤
  │  /backoffice/saldo-cartao ────────────────────────┤
  │  /backoffice/origens ─────────────────────────────┤
  │  /backoffice/cartoes ─────────────────────────────┤
  │  /backoffice/importacoes ─────────────────────────┤
  │  /backoffice/historico ───────────────────────────┤
  │  /backoffice/concessoes ──────────────────────────┤
  │                                                   │
  │  VALIDADOR (apenas):                              │
  │  /backoffice/validacao ───────────────────────────┘
  └───────────────────────────────────────────────────
```

### Fluxo de Vida de um Prémio

```
Excel importado           Validador analisa      Importador carrega saldo
       │                         │                         │
       ▼                         ▼                         ▼
  PENDENTE ──── Aprovar ──► VALIDADO ──── Topup import ─► CARREGADO
       │
       └─── Rejeitar ──► REJEITADO
       │
       └─── Anular  ──► ANULADO
```

### Fluxo de Vida de um Cartão

```
Utilizador submete           Admin valida              Admin/User gere
       │                         │                         │
       ▼                         ├─ Aprovar ──► ACTIVE ────┤
   PENDING ───────────────────────               │         │
                                 │               ├── Inativar ──► INACTIVE ──► Reativar ──► ACTIVE
                                 └─ Rejeitar ──► REJECTED  │
                                                            └── Transferir (ADMIN)
```

### Fluxo de Registo de Novo Utilizador

```
/register                  Admin em /utilizadores
    │                              │
    ▼                              │
Formulário ──► submete ──► estado PENDING (pendingBrands)
                                   │
                      ┌────────────┴────────────┐
                      │ Aprovar                 │ Rejeitar
                      ▼                         ▼
                 brands activas           email notificação
                 email notificação        conta removida
```

---

## 15. Permissões por Papel

| Página / Ação | USER | VALIDADOR | IMPORTADOR | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Ver os próprios prémios | ✓ | — | ✓ | ✓ |
| Ver todos os prémios | — | — | ✓ | ✓ |
| Exportar prémios | ✓ | — | ✓ | ✓ |
| Consultar próprios cartões | ✓ | — | ✓ | ✓ |
| Criar cartão | ✓ | — | ✓ | ✓ |
| Inativar/Reativar cartão próprio | ✓ | — | ✓ | ✓ |
| Transferir cartão | — | — | — | ✓ |
| Validar prémios | — | ✓ | — | ✓ |
| Rejeitar prémios | — | ✓ | — | ✓ |
| Aprovar/Rejeitar cartões | — | — | ✓ | ✓ |
| Ver saldo cartões (todos) | — | — | ✓ | ✓ |
| Importar Excel | — | — | ✓ | ✓ |
| Gerir origens | — | — | ✓ | ✓ |
| Ver histórico carregamentos | — | — | ✓ | ✓ |
| Gerir utilizadores | — | — | — | ✓ |
| Resetar password de utilizador | — | — | — | ✓ |
| Aprovar registos pendentes | — | — | — | ✓ |

---

## Notas Técnicas de UI

| Elemento | Detalhe |
|---|---|
| Cor primária sidebar | `var(--brand-primary)` — muda conforme marca selecionada |
| Valores monetários | `fmtMoney()` → formato `250,00 €` (vírgula decimal PT) |
| Datas | `dd/MM/yyyy` (listagens) · `dd/MM/yyyy HH:mm` (histórico) |
| Toast de sucesso | Verde (react-hot-toast) |
| Toast de erro | Vermelho (react-hot-toast) |
| Estado vazio | Componente `EmptyState` com mensagem e ação opcional |
| Tabelas | Scroll horizontal em ecrãs pequenos (`table-container`) |
| Modais | Overlay cinzento semitransparente, `rounded-xl`, sombra |
| Formulários lazy | TanStack Query v5, invalidação após mutação |
