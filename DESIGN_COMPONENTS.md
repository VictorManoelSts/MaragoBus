# MaragoBus — Design Components

> Estrutura dos componentes para Next.js + Tailwind CSS.
> Use sempre classes do tailwind.config.ts customizado — nunca valores hardcoded.
> Elementos HTML + Tailwind. Componentes base via shadcn/ui onde indicado.

---

## 1. Regras gerais de UI

- Fundo de todas as telas: `bg-background` (#eaf4fb)
- Cards e seções: `bg-surface` (#ffffff)
- Campos vazios: `bg-primary-light` / placeholder `text-text-disabled`
- Campos preenchidos: `bg-surface` / texto `text-text-primary`
- Bordas: `border-thin border-border` (0.5px) — exceto erro (1.5px) e métricas (3px)
- Hierarquia de texto: `text-text-primary` → `text-text-secondary` → `text-text-disabled`
- Ícones: @tabler/icons-react outline — `size={16}` padrão — nunca emojis
- Sem dark mode — apenas light mode

---

## 2. Logo bar

```tsx
// Presente no topo de todas as telas
<header className="bg-surface border-b border-thin border-border flex items-center
                   justify-center px-xxxl py-lg">

  {/* Tela de login — logo maior */}
  <div className="flex flex-col items-center gap-md">
    <img src="/logo-maragogi.png" alt="Prefeitura de Maragogi"
         className="w-logo-lg h-logo-lg object-contain" />
    <div className="text-center">
      <p className="text-display font-medium text-primary">MaragoBus</p>
      <p className="text-sm text-text-secondary">Transporte Universitário</p>
    </div>
  </div>

  {/* Demais telas — logo menor */}
  <img src="/logo-maragogi.png" alt="Prefeitura de Maragogi"
       className="w-logo-sm h-logo-sm object-contain" />
</header>
```

---

## 3. Nav bar

```tsx
<nav className="bg-surface border-t border-thin border-border
                flex items-center h-nav-bar fixed bottom-0 w-full">
  {/* Item inativo */}
  <button className="flex-1 flex flex-col items-center gap-[2px]
                     text-text-disabled text-xs">
    <IconTicket size={16} />
    <span>Reserva</span>
  </button>

  {/* Item ativo */}
  <button className="flex-1 flex flex-col items-center gap-[2px]
                     text-primary text-xs">
    <IconClipboardList size={16} />
    <span>Comprovante</span>
  </button>
</nav>
```

---

## 4. Sino de notificações

```tsx
<div className="relative">
  <button className="text-primary">
    <IconBell size={20} />
  </button>
  {/* Badge — apenas quando há pendências */}
  <span className="absolute -top-1 -right-1 w-badge-dot h-badge-dot
                   bg-badge rounded-full flex items-center justify-center
                   text-xs font-medium text-white">
    3
  </span>
</div>
```

---

## 5. Botões

```tsx
{/* Primário */}
<button className="w-full bg-primary text-white rounded-button
                   py-xl flex items-center justify-center gap-sm
                   text-sub font-medium">
  <IconCheck size={15} />
  Confirmar reserva
</button>

{/* Ghost padrão */}
<button className="w-full bg-transparent border-thick border-primary
                   text-primary rounded-button py-lg text-body font-medium">
  Cancelar reserva
</button>

{/* Ghost destrutivo */}
<button className="w-full bg-transparent border-thick border-danger-text
                   text-danger-text rounded-button py-lg
                   flex items-center justify-center gap-sm text-body font-medium">
  <IconTrash size={14} />
  Excluir cadastro
</button>

{/* Ghost atenção */}
<button className="border-thick border-warning-text text-warning-text
                   rounded-button py-lg flex items-center gap-sm
                   text-body font-medium">
  <IconAlertTriangle size={14} />
  Aplicar advertência
</button>

{/* Ghost sucesso (reativar) */}
<button className="border-thick border-success-strong text-success-strong
                   rounded-button py-lg flex items-center gap-sm
                   text-body font-medium">
  <IconCircleCheck size={14} />
  Reativar acesso
</button>

{/* Pequeno (ex: Sair) */}
<button className="bg-primary-medium border-thin border-border
                   text-text-secondary text-sm rounded-sm px-md py-[3px]">
  Sair
</button>
```

---

## 6. Campos de formulário

```tsx
{/* Label */}
<label className="flex items-center gap-xs text-md font-medium text-text-secondary">
  <IconUser size={10} />
  Nome completo
  <span className="text-required">*</span>
</label>

{/* Input vazio */}
<input className="w-full bg-primary-light border-thin border-border
                  rounded-input px-xl py-lg text-base text-text-disabled
                  placeholder:text-text-disabled focus:border-medium
                  focus:border-primary focus:bg-surface outline-none" />

{/* Input preenchido */}
<input className="w-full bg-surface border-thin border-border
                  rounded-input px-xl py-lg text-base text-text-primary
                  outline-none" />

{/* Input com erro */}
<input className="w-full bg-input-error border-thick border-danger-strong
                  rounded-input px-xl py-lg text-base text-text-primary
                  outline-none" />

{/* Mensagem de erro */}
<p className="flex items-center gap-xs mt-[2px] text-md text-danger-text">
  <IconAlertCircle size={12} />
  CPF inválido. Verifique e tente novamente
</p>

{/* Hint */}
<p className="flex items-center gap-xs mt-[2px] text-sm text-text-disabled">
  <IconInfoCircle size={9} />
  O aluno usará esta senha no primeiro acesso
</p>
```

---

## 7. Chips de seleção

```tsx
{/* Inativo */}
<button className="bg-primary-light border-thin border-border
                   rounded-pill px-lg py-xs text-sm font-medium
                   text-text-secondary">
  Presencial
</button>

{/* Ativo */}
<button className="bg-primary border-none rounded-pill
                   px-lg py-xs text-sm font-medium text-white">
  Presencial
</button>
```

---

## 8. Badges de status

```tsx
{/* Ativo */}
<span className="flex items-center gap-xs bg-success-bg text-success-text
                 rounded-pill px-xl py-[2px] text-xs font-medium">
  <IconCircleCheck size={11} /> Ativo
</span>

{/* Concluindo */}
<span className="flex items-center gap-xs bg-warning-bg text-warning-text
                 rounded-pill px-xl py-[2px] text-xs font-medium">
  <IconClock size={11} /> Concluindo
</span>

{/* Suspenso */}
<span className="flex items-center gap-xs bg-danger-bg text-danger-text
                 rounded-pill px-xl py-[2px] text-xs font-medium">
  <IconBan size={11} /> Suspenso
</span>
```

---

## 9. Avatar

```tsx
{/* Listas */}
<div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                flex items-center justify-center
                text-md font-medium text-white flex-shrink-0">
  LB
</div>

{/* Header azul */}
<div className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                border-thick border-header-border
                flex items-center justify-center
                text-body font-medium text-white flex-shrink-0">
  LB
</div>
```

---

## 10. Cards

```tsx
{/* Card padrão */}
<div className="bg-surface border-thin border-border rounded-card p-xl">
  {/* conteúdo */}
</div>

{/* Card com seção (formulário) */}
<div className="bg-surface border-thin border-border rounded-card overflow-hidden">
  <div className="flex items-center gap-sm px-xl pt-lg pb-md
                  border-b border-thin border-border-subtle">
    <IconUserCircle size={15} className="text-primary flex-shrink-0" />
    <h3 className="text-body font-medium text-text-primary">Dados pessoais</h3>
  </div>
  <div className="p-xl flex flex-col gap-lg">
    {/* campos */}
  </div>
</div>

{/* Card de status (inscrições) */}
<div className="bg-primary-medium border-thin border-border rounded-card
                p-xl flex items-center gap-lg">
  {/* Indicador aberto */}
  <div className="w-[11px] h-[11px] rounded-full bg-success-strong flex-shrink-0" />
  <div>
    <p className="text-base font-medium text-text-primary">Inscrições abertas</p>
    <p className="text-sm text-text-secondary">Disponíveis das 17h até 11h do dia seguinte</p>
  </div>
</div>
```

---

## 11. Cards de métricas (admin)

```tsx
<div className="flex-1 bg-surface border-thin border-border rounded-card overflow-hidden">
  {/* Barra colorida no topo */}
  <div className="h-metric-bar bg-metric-today" /> {/* ou metric-tomorrow, metric-total */}
  <div className="p-md flex flex-col items-center">
    <IconCalendarCheck size={16} className="text-metric-today" />
    <p className="text-heading font-medium text-text-primary">12</p>
    <p className="text-sm text-text-secondary">Hoje</p>
  </div>
</div>
```

---

## 12. Header azul

```tsx
<div className="bg-primary px-xl py-[14px] flex items-center gap-lg">
  {/* Avatar header */}
  <div className="w-avatar-md h-avatar-md rounded-full bg-header-overlay
                  border-thick border-header-border
                  flex items-center justify-center
                  text-body font-medium text-white flex-shrink-0">
    LB
  </div>
  <div>
    <p className="text-body font-medium text-white">Luana Beatriz</p>
    <p className="text-sm text-white/80">Direito · Uninassau</p>
    {/* Badge de confirmação */}
    <span className="inline-flex items-center gap-xs mt-[3px]
                     bg-header-overlay border-thin border-header-border
                     rounded-pill px-xl py-[2px] text-xs text-white">
      <IconCircleCheck size={9} /> Reserva confirmada
    </span>
  </div>
</div>
```

---

## 13. Linha de informação

```tsx
<div className="flex justify-between items-center py-xs
                border-b border-thin border-border-subtle last:border-0">
  <span className="flex items-center gap-xs text-sm text-text-secondary">
    <IconCalendar size={12} className="text-primary" />
    Data
  </span>
  <span className="text-sm font-medium text-text-primary text-right">
    2026-05-21
  </span>
</div>
```

---

## 14. Lista de pontos de embarque

```tsx
{/* Item não selecionado */}
<button className="w-full flex items-center gap-md p-lg
                   bg-surface border-thin border-border rounded-input">
  <div className="w-[14px] h-[14px] rounded-full border-thick border-border flex-shrink-0" />
  <IconMapPin size={12} className="text-text-disabled" />
  <span className="text-md text-text-secondary">Praça Central</span>
</button>

{/* Item selecionado */}
<button className="w-full flex items-center gap-md p-lg
                   bg-primary-light border-thin border-primary rounded-input">
  <div className="w-[14px] h-[14px] rounded-full bg-primary flex-shrink-0
                  flex items-center justify-center">
    <div className="w-[5px] h-[5px] rounded-full bg-white" />
  </div>
  <IconMapPin size={12} className="text-primary" />
  <span className="text-md font-medium text-text-primary">Praça Central</span>
</button>
```

---

## 15. Card de aluno (lista)

```tsx
<div className="bg-surface border-thin border-border rounded-card
                p-lg flex items-center gap-md">
  {/* Avatar */}
  <div className="w-avatar-sm h-avatar-sm rounded-full bg-primary
                  flex items-center justify-center
                  text-md font-medium text-white flex-shrink-0">
    LB
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-base font-medium text-text-primary">Luana Beatriz</p>
    <p className="text-sm text-text-secondary">Uninassau · Direito · 3º sem.</p>
  </div>
  {/* Badge de status — ver seção 8 */}
</div>
```

---

## 16. Barra de busca

```tsx
<div className="bg-surface border-thin border-border rounded-input
                px-lg py-sm flex items-center gap-sm">
  <IconSearch size={13} className="text-primary flex-shrink-0" />
  <input placeholder="Buscar por nome ou CPF..."
         className="flex-1 text-md text-text-disabled bg-transparent outline-none
                    placeholder:text-text-disabled" />
</div>
```

---

## 17. Tabs (Hoje / Amanhã)

```tsx
<div className="flex bg-primary-medium rounded-input p-[2px]">
  {/* Ativo */}
  <button className="flex-1 flex items-center justify-center gap-xs
                     bg-primary text-white rounded-sm py-xs text-sm font-medium">
    <IconCalendarCheck size={11} /> Hoje
  </button>
  {/* Inativo */}
  <button className="flex-1 flex items-center justify-center gap-xs
                     text-text-secondary py-xs text-sm font-medium">
    <IconCalendar size={11} /> Amanhã
  </button>
</div>
```

---

## 18. Padrões de estado

```tsx
{/* Empty state */}
<div className="flex flex-col items-center gap-md py-huge">
  <div className="w-avatar-lg h-avatar-lg rounded-full bg-empty-circle
                  flex items-center justify-center">
    <IconCalendarOff size={24} className="text-primary" />
  </div>
  <p className="text-body font-medium text-text-primary">Nenhuma reserva encontrada</p>
  <p className="text-md text-text-secondary text-center">
    Ainda não há reservas para o dia selecionado
  </p>
</div>

{/* Spinner */}
<div className="flex flex-col items-center justify-center gap-lg flex-1">
  <div className="w-spinner h-spinner rounded-full border-[3px]
                  border-spinner-track border-t-primary spinner-animation" />
  <p className="text-base text-text-secondary">Carregando...</p>
</div>
```

---

## 19. Modais e pop-ups

```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
  <div className="bg-surface rounded-modal p-huge w-[90%] max-w-sm
                  flex flex-col items-center gap-md">

    {/* Pop-up de confirmação — suspender */}
    <IconClock size={24} className="text-warning-text" />
    <h2 className="text-title font-medium text-warning-text">Suspender aluno?</h2>
    <p className="text-body text-text-secondary text-center">
      O aluno ficará suspenso por 3 dias úteis.
    </p>
    <div className="flex gap-md w-full">
      <button className="flex-1 bg-warning-text text-white rounded-button py-lg
                         text-body font-medium">
        Confirmar
      </button>
      <button className="flex-1 border-thick border-border text-text-secondary
                         rounded-button py-lg text-body font-medium">
        Cancelar
      </button>
    </div>

    {/* Pop-up de suspensão (aluno ao abrir o app) */}
    <IconBan size={28} className="text-danger-text" />
    <h2 className="text-title font-medium text-danger-text">Acesso suspenso</h2>
    <p className="text-base text-text-secondary">Reativação em: 25/05/2026</p>
    {/* Lista de motivos */}
    <div className="w-full flex flex-col gap-sm">
      {/* cada item: data + motivo */}
    </div>
    <button className="w-full bg-primary text-white rounded-button
                       py-xl text-sub font-medium">
      Entendido
    </button>
  </div>
</div>
```

---

## 20. Banner informativo

```tsx
<div className="bg-warning-bg border-thin border-warning-border
                rounded-input p-md flex items-center gap-md">
  <IconInfoCircle size={14} className="text-warning-text flex-shrink-0" />
  <p className="text-sm text-warning-text">
    O novo ponto será aplicado apenas nas próximas reservas.
  </p>
</div>
```

---

## 21. QR Code

```tsx
<div className="bg-surface border-thin border-border rounded-card p-xl
                flex flex-col items-center gap-sm">
  <p className="flex items-center gap-xs text-sm font-medium text-primary uppercase tracking-wider">
    <IconQrcode size={11} /> Comprovante de embarque
  </p>
  {/* QR code gerado via biblioteca (ex: qrcode.react) */}
  <QRCode value={reservaId} size={80}
          fgColor="#499bd0" bgColor="#ffffff"
          className="border-thick border-border rounded-input p-xs" />
  <p className="text-xs text-text-secondary">Apresente ao motorista no embarque</p>
</div>
```

---

## 22. Upload de foto

```tsx
<div className="bg-primary-light border-thin border-dashed border-border
                rounded-input p-lg flex items-center gap-lg">
  <div className="w-[36px] h-[36px] rounded-full bg-primary-medium
                  border-thick border-border
                  flex items-center justify-center flex-shrink-0">
    <IconUser size={18} className="text-border" />
  </div>
  <div className="flex-1">
    <p className="text-md font-medium text-text-primary">Adicionar foto</p>
    <p className="text-sm text-text-disabled mt-[1px]">JPG ou PNG · máx. 5MB</p>
  </div>
  <IconUpload size={14} className="text-primary ml-auto" />
</div>
```

---

## 23. Layout responsivo (estrutura global)

O layout segue a abordagem **mobile first**. A nav bar inferior existe apenas no mobile. A partir de `md` (768px), ela é substituída por uma sidebar lateral colapsável.

```tsx
// src/layouts/RootLayout.tsx
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar — oculta no mobile, visível a partir de md */}
      <aside className="hidden md:flex">
        <Sidebar />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Logo bar */}
        <LogoBar />

        {/* Área de conteúdo — centralizada com max-w em telas grandes */}
        <main className="flex-1 w-full max-w-content mx-auto px-xxxl py-lg">
          <Outlet />
        </main>

        {/* Nav bar inferior — apenas no mobile */}
        <nav className="md:hidden">
          <NavBar />
        </nav>

      </div>
    </div>
  )
}
```

---

## 24. Sidebar (tablet e desktop)

```tsx
// components/Sidebar.tsx
// Colapsável via useState — expandida (240px) ou recolhida (64px)

<aside className={cn(
  "flex flex-col bg-surface border-r border-thin border-border",
  "transition-all duration-200 h-screen sticky top-0",
  isExpanded ? "w-sidebar-expanded" : "w-sidebar-collapsed"
)}>

  {/* Logo no topo */}
  <div className="flex items-center justify-center p-xl border-b border-thin border-border h-logo-bar">
    {isExpanded
      ? <Image src="/logo-maragogi.png" width={120} height={40} className="object-contain" />
      : <Image src="/logo-maragogi.png" width={32} height={32} className="object-contain" />
    }
  </div>

  {/* Itens de navegação */}
  <nav className="flex flex-col gap-xs p-sm flex-1">

    {/* Item inativo */}
    <button className={cn(
      "flex items-center rounded-button px-md py-lg",
      "text-text-secondary hover:bg-primary-light transition-colors",
      isExpanded ? "gap-md" : "justify-center"
    )}>
      <IconChartBar size={18} className="flex-shrink-0" />
      {isExpanded && <span className="text-base font-medium">Reservas</span>}
    </button>

    {/* Item ativo */}
    <button className={cn(
      "flex items-center rounded-button px-md py-lg",
      "bg-primary-light text-primary",
      isExpanded ? "gap-md" : "justify-center"
    )}>
      <IconUsers size={18} className="flex-shrink-0" />
      {isExpanded && <span className="text-base font-medium">Alunos</span>}
    </button>

    {/* Sino de notificações / solicitações */}
    <button className={cn(
      "flex items-center rounded-button px-md py-lg relative",
      "text-text-secondary hover:bg-primary-light transition-colors",
      isExpanded ? "gap-md" : "justify-center"
    )}>
      <div className="relative flex-shrink-0">
        <IconBell size={18} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-badge-dot h-badge-dot
                           bg-badge rounded-full flex items-center justify-center
                           text-xs font-medium text-white">
            {pendingCount}
          </span>
        )}
      </div>
      {isExpanded && <span className="text-base font-medium">Solicitações</span>}
    </button>
  </nav>

  {/* Botão de colapsar — no rodapé da sidebar */}
  <div className="p-sm border-t border-thin border-border">
    <button onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center rounded-button
                       p-md text-text-secondary hover:bg-primary-light transition-colors">
      {isExpanded
        ? <><IconLayoutSidebarLeftCollapse size={16} />
            <span className="text-sm ml-sm">Recolher</span></>
        : <IconLayoutSidebarLeftExpand size={16} />
      }
    </button>
  </div>
</aside>
```

---

## 25. Breakpoints de comportamento

| Elemento | Mobile (padrão) | Tablet md (768px+) | Desktop lg (1024px+) |
|---|---|---|---|
| Nav bar inferior | ✅ visível | ❌ oculta | ❌ oculta |
| Sidebar | ❌ oculta | ✅ colapsada (64px) | ✅ expandida (240px) |
| Conteúdo | largura total | flex-1 ao lado da sidebar | max-w-content centralizado |
| Logo bar | logo pequena | logo pequena | logo pequena |
| Cards de métricas | 1 coluna | 3 colunas (grid) | 3 colunas (grid) |
| Lista de alunos | 1 coluna | 2 colunas | 2 colunas |
| Formulário de cadastro | 1 coluna | 2 colunas por seção | 2 colunas por seção |

```tsx
// Exemplos de classes responsivas

// Cards de métricas
<div className="grid grid-cols-1 md:grid-cols-3 gap-md">

// Lista de alunos
<div className="grid grid-cols-1 md:grid-cols-2 gap-md">

// Campos do formulário lado a lado em tablet+
<div className="grid grid-cols-1 md:grid-cols-2 gap-md">

// Sidebar colapsada por padrão no tablet, expandida no desktop
const [isExpanded, setIsExpanded] = useState(false)
// Em lg+: iniciar expandida via useEffect + window.innerWidth
```
