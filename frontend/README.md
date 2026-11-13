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

As instruções completas estão em [AGENTS.md](AGENTS.md). Para as próximas etapas:

1. Implementar uma ou poucas funcionalidades relacionadas por prompt, sem avançar além do escopo autorizado.
2. Incluir testes automatizados relevantes para cada implementação.
3. Executar TypeScript, testes e builds apropriados, registrando resultados reais.
4. Criar o relatório Markdown da etapa em `docs/etapas/`.
5. Não gerar capturas de tela.
6. Não criar pastas de evidências visuais.
7. Não executar inspeções visuais automatizadas sem solicitação explícita.
8. Manter os servidores de desenvolvimento do Portal e do Admin em execução ao finalizar, quando possível.
9. Reutilizar servidores existentes, verificando as portas e as respostas HTTP antes de iniciar processos; não duplicar instâncias nem trocar portas.
10. Informar os endereços locais de visualização e eventuais limitações do ambiente.
11. Não realizar commits ou pushes automaticamente.
12. Aguardar autorização antes da próxima funcionalidade.

Visualização manual: [Portal](http://localhost:5173/) e [Admin](http://localhost:5174/).
Se algum estiver parado, use `npm.cmd run dev:portal` ou `npm.cmd run dev:admin` em terminais
separados. Com ambos parados, `npm.cmd run dev` inicia os dois. Não execute esse último
comando se uma das portas já estiver ocupada: inicie apenas a aplicação ausente.
O ajuste de PATH para o Node portátil deste ambiente está documentado acima.

As capturas históricas foram removidas na manutenção do fluxo. Os relatórios e suas
verificações permanecem preservados; medições JSON e scripts antigos não foram removidos.
Procedimentos de captura descritos nos relatórios antigos não integram o fluxo atual.

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
      stores/             # futuros stores Pinia por domínio
      services/           # futura integração REST
      main.ts             # bootstrap e instância própria de Pinia
      App.vue
      styles.css          # Tailwind 4 e estilos compartilhados
packages/shared/
  src/
    assets/branding/      # SVGs oficiais, intactos
    components/           # BrandLogo
    styles/               # tokens semânticos e paleta oficial compartilhada
    types/                # tipos compartilhados
    utils/                # espaço para funções compartilhadas
scripts/                  # execução conjunta e integridade da marca
tsconfig.base.json        # opções TypeScript estritas comuns
```

Diretórios ainda sem implementação são mantidos com `.gitkeep`, sem criar lógica artificial.
As configurações Vite, os HTMLs de entrada e os arquivos TypeScript complementam a estrutura solicitada.

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
As páginas permanecem provisórias, sem tela de login ou funcionalidades de negócio.

## Integração REST futura

Cada aplicação tem sua própria pasta `services/`, `stores/` e `.env.example`.
Quando a API estiver disponível, copie o exemplo para `.env.local` na respectiva aplicação
e configure `VITE_API_BASE_URL`. A URL está disponível em `services/index.ts`.

Ainda não existem chamadas de rede, autenticação, persistência ou contratos de domínio inventados.
Tipos realmente comuns poderão ir para o shared; serviços e stores de cada aplicação
devem continuar independentes. Variáveis `VITE_*` ficam públicas no bundle e não devem conter segredos.

No deploy, publique cada `dist/` separadamente. Como o router usa history HTML5,
configure o servidor para retornar `index.html` nas rotas da aplicação.

## Validação desta etapa

- Builds de produção das duas aplicações, incluindo checagem estrita de tipos.
- SHA-256 dos quatro SVGs após a movimentação e do logo emitido em ambos os builds.
- Inicialização simultânea e HTTP 200 nas portas 5173/5174 para HTML, entradas, páginas, CSS e componente compartilhado.
- Dependências instaladas sem vulnerabilidades reportadas pelo npm.


## Etapa 02 — Design System

- Relatório completo: [docs/etapas/02-design-system.md](docs/etapas/02-design-system.md).
- Execute npm run dev e acesse /design-system no Portal (5173) ou Admin (5174).
- O catálogo é registrado apenas em desenvolvimento e excluído do JavaScript de produção.
- npm test executa 42 testes com Vitest e Vue Test Utils; npm run test:watch inicia o modo interativo.
- npm run typecheck verifica também os testes e a configuração Vitest.
- A fonte Inter é servida localmente. Os tokens ficam em packages/shared/src/styles/tokens.css; a paleta oficial foi aplicada na Etapa 04.1.
- Validação visual em navegador permanece pendente; há quatro avisos moderados em dependências de teste. Veja detalhes no relatório.

Cada etapa futura deve manter seu próprio relatório em docs/etapas/, com resultados reais de validação e pendências.

## Etapa 04.1 — Paleta oficial

Paleta centralizada em `packages/shared/src/styles/tokens.css`: azul-marinho `#16466B`,
azul-oceano `#2479A8`, azul-água `#48A9C5`, azul névoa `#EAF4F8` e branco `#FFFFFF`.
Os neutros e estados funcionais existentes foram preservados. Não há cores de marca adicionais.
Relatório: [docs/etapas/04.1-paleta-oficial.md](docs/etapas/04.1-paleta-oficial.md).
Visualização manual: http://localhost:5173/ e http://localhost:5174/.
