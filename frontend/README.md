# MaragoBus — Front-end

Monorepositório inicializado na etapa 01, com duas aplicações Vue independentes:
- **Portal**: alunos e motoristas, em http://localhost:5173.
- **Admin**: administração, em http://localhost:5174.

## Requisitos e instalação

Node.js LTS 24 recomendado (mínimo 22.12) e npm 10 ou superior.

```sh
npm ci
```

Execute os comandos na raiz deste diretório `frontend/`. Ele já é a raiz do monorepositório; não foi criada uma pasta adicional `maragobus-frontend/`.

Neste ambiente, Node/npm não estavam instalados no PATH. Uma cópia portátil oficial, com download conferido por SHA-256, foi usada em:
`%LOCALAPPDATA%\MaragoBus\tools\node-v24.22.3-win-x64`.
Para usá-la em uma sessão PowerShell:

```powershell
$env:PATH = "$env:LOCALAPPDATA\MaragoBus\tools\node-v24.22.3-win-x64;" + $env:PATH
```

Essa ferramenta fica fora do repositório. Em outras máquinas basta instalar Node.js normalmente.

## Fluxo de desenvolvimento vigente

O [AGENTS.md](AGENTS.md) reúne as regras de escopo, validação e delegação.
A resposta final do Codex registra as mudanças, as verificações executadas e as pendências.
Consulte [Autenticação do frontend](docs/autenticacao-frontend.md) ou
[Reservas do aluno](docs/reservas.md) conforme o domínio afetado.

Visualização manual: [Portal](http://localhost:5173/) e [Admin](http://localhost:5174/).
Se algum estiver parado, use `npm.cmd run dev:portal` ou `npm.cmd run dev:admin` em terminais
separados. Com ambos parados, `npm.cmd run dev` inicia os dois. Não execute esse último
comando se uma das portas já estiver ocupada: inicie apenas a aplicação ausente.
O ajuste de PATH para o Node portátil deste ambiente está documentado acima.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev:portal` | Portal na porta 5173 |
| `npm run dev:admin` | Admin na porta 5174 |
| `npm run dev` | Ambos simultaneamente |
| `npm run build:portal` | Checagem de tipos e build do Portal |
| `npm run build:admin` | Checagem de tipos e build do Admin |
| `npm run build` | Build completo, interrompido em caso de falha |
| `npm run typecheck` | Checagem TypeScript de ambas as aplicações |
| `npm test` | Testes automatizados com Vitest e Vue Test Utils |
| `npm run branding:verify` | Comparação dos quatro SVGs com os hashes originais |

As duas configurações usam `strictPort: true`: portas ocupadas geram erro.
O script `scripts/dev.mjs` usa a API do próprio Vite, sem biblioteca adicional de concorrência.
Ctrl+C encerra os dois servidores; falha ao iniciar um deles fecha os servidores já iniciados.

Saídas independentes: `apps/portal/dist/` e `apps/admin/dist/`.
Para inspecionar o build: `npm run preview -w @maragobus/portal` ou
`npm run preview -w @maragobus/admin`.

## Estrutura e responsabilidades

```text
apps/
  portal/
  admin/
    src/                  # mesma organização nas duas aplicações
      components/         # componentes exclusivos da aplicação
      layouts/            # estrutura das páginas
      pages/              # páginas associadas às rotas
      router/             # Vue Router independente
      stores/             # stores Pinia por domínio quando necessárias
      services/           # futura integração REST
      main.ts             # bootstrap e instância própria de Pinia
      App.vue
      styles.css          # Tailwind 4 e estilos compartilhados
packages/shared/
  src/
    assets/branding/      # SVGs oficiais, intactos
    auth/                 # contratos, sessão e proteção de rotas
    components/           # Design System e BrandLogo
    styles/               # tokens semânticos e paleta oficial compartilhada
    types/                # tipos compartilhados
    utils/                # espaço para funções compartilhadas
scripts/                  # execução conjunta e integridade da marca
tsconfig.base.json        # opções TypeScript estritas comuns
```

Diretórios ainda sem implementação são mantidos com `.gitkeep`, sem criar lógica artificial.
As configurações Vite, os HTMLs de entrada e os arquivos TypeScript complementam a estrutura solicitada.

## Layouts e navegação

- O Portal usa `PortalLayout` como base dos layouts de aluno e motorista. Cabeçalho e área de conteúdo são fluidos. Preserve o espaço restante do `main` com `min-w-0` e limite a largura apenas onde fizer sentido, como em descrições com `max-w-prose`.
- As duas navegações do Portal compartilham o mesmo breakpoint `lg` (1024 px). A sidebar aparece no desktop. A barra inferior mobile permanece no fluxo com `sticky`, quatro destinos para aluno e três para motorista. Cada conjunto deriva de sua configuração de rotas. Mantenha rótulos visíveis, foco e `aria-current="page"`.
- O Admin usa `AdminShell` para compor `AdminLayout`, sidebar desktop e drawer mobile. Sidebar e drawer compartilham os grupos Principal e Gerenciamento complementar de `adminNavigationGroups`, que também fornece os itens do roteador.
- O drawer usa diálogo nativo e rolagem interna, bloqueia a rolagem do fundo e contém Tab/Shift+Tab. Fecha pelo botão, Escape, backdrop, seleção ou mudança de rota e ao atingir o breakpoint desktop. O fechamento manual devolve o foco ao acionador quando presente. Após navegar, o foco segue para o `main`.
- Preserve o atalho **Ir para o conteúdo principal**, o `main` focável e um título principal por página. Use links nativos do Vue Router para navegação.

| Área | Destinos |
| --- | --- |
| Aluno | `/`, `/comprovante`, `/reservas`, `/perfil` |
| Motorista | `/motorista/reservas`, `/motorista/advertencias`, `/motorista/perfil` |
| Admin | Principal: visão geral, alunos, motoristas, faculdades, pontos de embarque, solicitações de advertência e perfil. Complementar: cursos, cursos ofertados e reservas. |

No Portal do aluno, o sino no cabeçalho exibe a contagem de avisos não lidos e
leva a `/notificacoes`. O formulário de reserva fica na página inicial.

No Portal, `/reservar` redireciona para `/`, `/historico` redireciona para `/reservas`, `/avisos` para
`/notificacoes`. O Portal também redireciona `/motorista`, `/motorista/faculdades`,
`/motorista/passageiros` e `/motorista/resumo`
para `/motorista/reservas`. Os guards avaliam o destino final. Os redirecionamentos
de compatibilidade autorizados preservam query e hash.

O motorista entra diretamente em Reservas após o login. Veja o [fluxo de consulta e advertências](docs/reservas.md#consulta-do-motorista).

## Pacote compartilhado

`@maragobus/shared` é um workspace privado, vinculado pelo npm.
Seus exports apontam para os fontes; cada Vite compila o Vue/TypeScript e empacota os assets
durante seu próprio build. Não há Module Federation nem necessidade de build separado do shared.

```ts
import { BrandLogo } from '@maragobus/shared'
import type { ApplicationId } from '@maragobus/shared'
import iconUrl from '@maragobus/shared/branding/icone-azul.svg?url'
```

Cada aplicação configura `@tailwindcss/vite`, importa Tailwind CSS 4 e os estilos comuns.
O `@source` explícito inclui componentes de `packages/shared/src` na detecção de classes,
inclusive quando importados pelo link do workspace.

## Dependências

Versões instaladas e reproduzíveis pelo `package-lock.json`:
Vue 3.5.45, Vue Router 4.6.4, Pinia 3.0.4, Vite 8.3.8, Tailwind CSS 4.3.5,
TypeScript 6.0.3, vue-tsc 3.3.14, plugin Vue 6.0.11 e Lucide Vue 1.72.0.

TypeScript permanece na linha 6 porque o vue-tsc/Volar instalado exige TypeScript anterior à versão 7.
Lucide usa `@lucide/vue`, nome oficial atual que substituiu `lucide-vue-next`:
https://lucide.dev/guide/version-1.
Importe apenas os ícones necessários, por exemplo `import { Search } from '@lucide/vue'`.
Os componentes compartilhados usam Lucide para ícones funcionais. O catálogo inclui exemplos de uso.

Dependências de execução são declaradas em cada aplicação; ferramentas de build ficam na raiz.
Vue é peer dependency do shared.

## Identidade visual

Os quatro arquivos foram movidos sem edição, conversão ou otimização.
O arquivo presente na origem se chama `logo-com-subititulo.svg`, e esse nome foi preservado,
apesar de o pedido mencionar `logo-com-subtitulo.svg`.

Os hashes foram calculados antes e depois da movimentação e coincidiram.
Os valores originais estão em `scripts/branding-sha256.json`; execute
`npm run branding:verify` para conferir novamente.

As duas páginas usam o logo horizontal oficial por URL.
O SVG emitido em ambos os builds também teve SHA-256 idêntico ao original.
O PNG `logo-maragogi.png`, já existente, foi mantido na raiz.

A interface utiliza a paleta oficial aprovada na Etapa 04.1, centralizada nos tokens semânticos.
Consulte o [Design System](docs/etapas/02-design-system.md) e a
[paleta oficial](docs/etapas/04.1-paleta-oficial.md) para componentes, tokens e contraste.
O catálogo `/design-system` fica disponível no Portal e no Admin apenas em desenvolvimento.

## Integração REST futura

Cada aplicação tem sua própria pasta `services/`, `stores/` e `.env.example`.
Quando a API estiver disponível, copie o exemplo para `.env.local` na respectiva aplicação
e configure `VITE_API_BASE_URL`. A URL está disponível em `services/index.ts`.

A sessão atual é simulada e as reservas ficam em memória. A
[auditoria histórica de autenticação](docs/etapas/06.1-auditoria-autenticacao-backend.md)
registra propostas ainda não implementadas. Serviços e instâncias Pinia de cada aplicação
continuam independentes. Variáveis `VITE_*` ficam públicas no bundle e não devem conter segredos.

No deploy, publique cada `dist/` separadamente. Como o router usa history HTML5,
configure o servidor para retornar `index.html` nas rotas da aplicação.

As [métricas históricas](docs/etapas/evidencias/) e os scripts de captura associados
permanecem preservados. Os scripts de captura estão fora do fluxo de validação atual.
