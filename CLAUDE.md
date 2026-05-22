# CLAUDE.md — MaragoBus

## 1. Contexto do projeto

PWA de reserva de vagas em transporte universitário da Prefeitura de Maragogi.
Três perfis: **aluno**, **motorista** e **admin**. Todos pré-cadastrados pelo admin.
Login via CPF + senha. Senha inicial: 6 últimos dígitos do CPF com troca obrigatória no primeiro acesso.
SPA 100% autenticada — sem páginas públicas exceto o login.
Distribuído como PWA — sem publicação em lojas. Hospedagem no Firebase Hosting.

---

## 2. Stack tecnológica

**Front-end**
- Vite + React 18
- TypeScript (strict mode)
- React Router v6 (roteamento manual via `src/routes/index.tsx`)
- Tailwind CSS (estilização via classes utilitárias)
- shadcn/ui (componentes base acessíveis)
- @tabler/icons-react (ícones outline — nunca filled, nunca emojis)
- vite-plugin-pwa (Service Worker + manifest)

**Back-end / Banco de dados**
- Firebase Authentication (CPF como identificador, perfis via custom claims)
- Cloud Firestore (banco principal)
- Firebase Storage (fotos dos alunos)
- Cloud Functions (automações e regras de negócio)
- Cloud Scheduler (gatilhos de horário)

**Notificações**
- Firebase Cloud Messaging (FCM) via PWA

**Feriados**
- BrasilAPI (`https://brasilapi.com.br/api/feriados/v1/{ano}`) — sem chave de API

**Testes**
- Jest + React Testing Library
- Firebase Emulator Suite (Auth, Firestore, Functions, Storage)

**Hospedagem**
- Firebase Hosting (deploy automático via GitHub Actions)

---

## 3. Convenções e regras

**Estrutura de pastas**
```
maragobus/
├── CLAUDE.md / MARAGOBUS_REGRAS.md / DESIGN_TOKENS.md / DESIGN_COMPONENTS.md
├── logo-maragogi.png
├── firebase.json / firestore.rules / .firebaserc
├── .env / .env.example
├── vite.config.ts / tailwind.config.ts / tsconfig.json / package.json
│
├── public/                 # assets estáticos (logo, manifest, ícones PWA)
│
└── src/
    ├── routes/
    │   └── index.tsx       # React Router — todas as rotas do app
    ├── layouts/
    │   ├── RootLayout.tsx  # Layout raiz (sidebar + logo bar + nav bar)
    │   ├── AlunoLayout.tsx
    │   ├── MotoristaLayout.tsx
    │   └── AdminLayout.tsx
    ├── pages/
    │   ├── auth/           # LoginPage · FirstAccessPage
    │   ├── aluno/          # ReservaPage · ComprovantePage · NotificacoesPage
    │   ├── motorista/      # ListaAlunosPage · DetalheAlunoPage
    │   └── admin/          # ReservasPage · AlunosPage · DetalheAlunoPage
    │                       # EdicaoAlunoPage · CadastroAlunoPage
    │                       # SolicitacoesPage · FeriadosPage · PontosPage
    ├── components/
    │   ├── ui/             # shadcn/ui customizados
    │   ├── LogoBar · Avatar · Badge · Button · Chip · InfoRow
    │   ├── MetricCard · StudentCard · EmptyState · Spinner
    │   ├── NavBar · NotificationBell · Sidebar
    │   └── modals/         # ConfirmModal · SuspensionModal
    │                       # HolidayModal · WarningRequestModal
    ├── hooks/              # useAuth · useReserva · useAlunos · useMotorista
    │                       # useAdmin · useNotificacoes · useFeriados
    ├── services/           # authService · reservaService · alunoService
    │                       # motoristaService · advertenciaService
    │                       # notificacaoService · feriadoService
    ├── functions/          # criarUsuario · suspenderAluno · reativarAluno
    │                       # expirarAcesso · abrirReservas · encerrarReservas
    │                       # migrarReservas · notificarFeriado
    ├── lib/
    │   ├── firebase.ts     # inicialização do Firebase
    │   ├── utils.ts        # helpers gerais
    │   └── constants/      # business.ts · icons.ts
    ├── types/              # aluno · motorista · reserva · advertencia
    │                       # notificacao · feriado
    ├── main.tsx            # entry point
    ├── App.tsx             # RouterProvider
    └── index.css           # Tailwind base + globals
```

**Nomenclatura**
- Páginas: PascalCase com sufixo Page (`ReservaPage.tsx`)
- Componentes: PascalCase (`ReservaCard.tsx`)
- Hooks: camelCase com prefixo `use` (`useReserva.ts`)
- Serviços: camelCase com sufixo `Service` (`reservaService.ts`)
- Testes: mesmo nome + `.test` (`reservaService.test.ts`)
- Variáveis de ambiente: prefixo `VITE_` (`VITE_FIREBASE_API_KEY`)

**TypeScript**
- Sem `any` — tipar tudo explicitamente
- Interfaces para objetos de domínio (`Aluno`, `Reserva`, `Advertencia`)
- Enums para status fixos (`StatusAluno`, `TipoNotificacao`)

**Responsividade (mobile first)**
- Base (0px+): nav bar inferior, layout de coluna única
- md (768px+): sidebar colapsada (64px), nav bar oculta, grid de 2 colunas
- lg (1024px+): sidebar expandida (240px), conteúdo centralizado max-w-[1200px]
- Sidebar colapsável via botão — ícones apenas quando recolhida, ícones + labels quando expandida

**Tailwind e estilização**
- Usar sempre classes do `tailwind.config.ts` customizado — nunca valores hardcoded
- Cores via classes semânticas: `bg-primary`, `text-text-primary`, `border-border`
- Componentes shadcn/ui como base — customizar via `className` com Tailwind

**Assets**
- Logo: `public/logo-maragogi.png`
- Usar via `<img src="/logo-maragogi.png" />` — sem next/image
- Nunca recriar a logo via SVG ou texto

**Docker**
- Dois containers: `app` (Vite + React) e `firebase` (Emulator Suite)
- Iniciar: `docker-compose up` · Parar: `docker-compose down`
- Nunca rodar `npm install` fora do container

**Hospedagem e deploy**
- Firebase Hosting
- Branch única: `main`
- Deploy manual via terminal:
  ```
  npm run build
  firebase deploy
  ```
- Sem GitHub Actions — deploy sob demanda e controlado
- `feat(auth): implement login screen`
- `fix(reserva): correct business day calculation`
- `test(admin): add suspension flow tests`
- `refactor(aluno): improve reservation screen`
- `chore(docker): update firebase emulator config`
- Nunca commitar: `.env`, `node_modules`, `google-services.json`

---

## 4. O que evitar

- **Nunca** escrever código de produção antes do teste (regra TDD)
- **Nunca** usar `any` no TypeScript
- **Nunca** hardcodar cores, tamanhos ou espaçamentos — usar classes Tailwind do config
- **Nunca** usar emojis como ícones — sempre @tabler/icons-react outline
- **Nunca** colocar lógica de negócio em páginas — usar hooks e services
- **Nunca** chamar Firebase diretamente em componentes — abstrair em services
- **Nunca** usar `console.log` em produção
- **Nunca** avançar sem o ciclo TDD completo (Red → Green → Refactor)
- **Nunca** usar `next/image` ou qualquer API do Next.js — o projeto usa Vite

---

## 5. Como testar (TDD)

Ciclo **Red → Green → Refactor** para toda nova funcionalidade.

**Prompt padrão:**
> Siga o ciclo TDD rigorosamente:
> 1. **Red:** escreva o teste para `[funcionalidade]`. Identifique se é unitário, de componente ou de integração. O teste deve falhar.
> 2. **Green:** implemente o mínimo para o teste passar.
> 3. **Refactor:** melhore o código mantendo os testes verdes. Explique o que foi alterado.

**Tipos de teste por camada**

| Camada | Ferramenta | Exemplo |
|---|---|---|
| Lógica (utils, hooks) | Jest | Cálculo de próximo dia útil |
| Componentes (UI) | React Testing Library | Renderização do botão de reserva |
| Serviços (Firebase) | Jest + Emulator | Criação de reserva no Firestore |
| Cloud Functions | Jest + Emulator | Suspensão automática |

**Cobertura obrigatória**
- Cálculo de próximo dia útil (feriados + fins de semana)
- Janela de reserva (17h–11h) e bloqueio fora dela
- Suspensão automática após 3 advertências
- Reativação após 3 dias úteis
- Migração de reservas em feriados
- Expiração de acesso por ano de conclusão
- Segmentação de notificações (lembrete apenas para quem não reservou)
