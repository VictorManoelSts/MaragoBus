# MaragoBus — Orientações do Codex

## Project overview

O MaragoBus organiza o transporte universitário. O frontend usa Vue 3, TypeScript,
Vite, Pinia, Vue Router e Tailwind CSS 4 em um monorepo com npm workspaces.

- `apps/portal` atende alunos e motoristas.
- `apps/admin` atende a administração.
- `packages/shared` reúne o Design System e recursos compartilhados.

O desenvolvimento atual é incremental, com autenticação simulada e fluxo de
reservas do aluno em memória. Faça apenas as mudanças relacionadas ao pedido.

## Setup

Execute na raiz de `frontend`, com Node.js 22.12+ e npm 10+. No PowerShell, use `npm.cmd`.

| Comando | Uso |
| --- | --- |
| `npm.cmd ci` | Instalar dependências a partir do lockfile. |
| `npm.cmd run dev:portal` | Iniciar o Portal em http://localhost:5173/. |
| `npm.cmd run dev:admin` | Iniciar o Admin em http://localhost:5174/. |
| `npm.cmd run dev` | Iniciar os dois quando ambas as portas estiverem livres. |

Antes de iniciar, verifique as portas 5173 e 5174 e as respostas HTTP locais.
Reutilize os servidores ativos e inicie apenas os ausentes. Mantenha as portas fixas
e deixe ambos em execução ao concluir, quando possível. Informe as URLs e, se algum
servidor não puder ficar ativo, explique a limitação e informe o comando exato.

## Build and test

| Comando | Verificação |
| --- | --- |
| `npm.cmd run typecheck` | TypeScript dos workspaces e dos testes. |
| `npm.cmd test` | Suíte automatizada com Vitest. |
| `npm.cmd run build` | Builds do Portal e do Admin. |
| `npm.cmd run branding:verify` | SHA-256 dos quatro SVGs oficiais. |
| `git diff --check` | Problemas de espaços em branco no diff. |

Execute as verificações pertinentes. Na resposta final, resuma as mudanças,
os comandos executados, os resultados reais e as pendências relevantes.
Crie um relatório separado somente quando solicitado.

## Code style

- Use Vue 3 com Composition API e `<script setup lang="ts">` nos componentes novos.
- Mantenha a tipagem estrita e reutilize tipos e funções existentes.
- Organize código por responsabilidade. Separe regras de negócio, interface e acesso a dados.
- Use Pinia para estado compartilhado e consulte a store do domínio como fonte de verdade.
- Mantenha rotas e guardas no Vue Router da aplicação correspondente.
- Reutilize componentes acessíveis do Design System e combine Tailwind CSS 4 com os tokens existentes.
- Use apenas as cores de marca da paleta oficial. Preserve neutros e estados funcionais acessíveis.
- Cubra cada implementação com testes relevantes. Reaproveite a suíte existente.

## Boundaries

- Modifique o backend somente com autorização explícita.
- Preserve a identidade visual aprovada. Alterações exigem autorização explícita.
- Preserve os quatro SVGs oficiais de [branding](packages/shared/src/assets/branding/)
  e a referência original do [manifesto de hashes](scripts/branding-sha256.json).
- Examine a configuração existente antes de ajustá-la e preserve configurações funcionais.
- Evite alterações em arquivos alheios à tarefa e dependências desnecessárias.
- Mantenha credenciais reais fora do repositório e dos valores públicos `VITE_*`.
- Não faça commits ou pushes automaticamente e aguarde autorização para avançar de etapa.
- Não gere capturas nem pastas de evidências visuais. Faça inspeções visuais automatizadas
  somente mediante solicitação explícita. Preserve relatórios, métricas e scripts históricos
  sem recriar imagens. Deixe os scripts de captura fora do fluxo atual.
- Só declare testes aprovados depois de executá-los.

## Subagents

- O coordenador avalia a complexidade, planeja, integra e revisa o resultado final.
- `explorador` investiga e lê o código. `estilizador` faz ajustes visuais simples.
  `testador` executa e analisa testes e verificações.
- Delegue quando houver benefício. Resolva tarefas simples diretamente e paralelize
  frentes independentes sem atribuir o mesmo arquivo a mais de um agente.
- Aguarde os resultados antes de concluir. Arquitetura, regras de negócio,
  autenticação, segurança e mudanças complexas ficam com o coordenador.

## References and skills

- Antes de iniciar cada tarefa, verifique quais skills do Superpowers estão disponíveis e
  são pertinentes. Use as skills aplicáveis ao planejamento, à implementação, à depuração,
  aos testes e à revisão de código. Siga as instruções das skills efetivamente disponíveis,
  sem presumir que todas estejam instaladas.
- Consulte o [README](README.md) para instalação, arquitetura dos workspaces e comandos.
- Consulte o [Design System](docs/etapas/02-design-system.md), a
  [paleta oficial](docs/etapas/04.1-paleta-oficial.md) e os
  [tokens](packages/shared/src/styles/tokens.css) ao alterar a interface.
- Consulte [Layouts e navegação](README.md#layouts-e-navegação) ao alterar menus e layouts.
- Consulte [Autenticação do frontend](docs/autenticacao-frontend.md) para login, sessão e guards.
  Use a [auditoria histórica](docs/etapas/06.1-auditoria-autenticacao-backend.md) ao discutir a futura integração.
- Consulte [Reservas do aluno](docs/reservas.md) antes de alterar o calendário ou o fluxo de reservas.
- Consulte a [configuração do Codex](.codex/config.toml) e os [perfis](.codex/agents/)
  quando precisar revisar a delegação.
- Leia apenas as referências pertinentes à tarefa. Aplique skills disponíveis
  quando forem solicitadas ou relevantes, seguindo as instruções da skill selecionada.
