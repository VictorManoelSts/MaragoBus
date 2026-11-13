# Etapa 02 — Design System e componentes compartilhados

## Resumo

Implementada uma base visual reutilizável para Portal e Admin: tokens semânticos neutros,
Inter local, sete componentes de interface e exibição das quatro marcas oficiais por `BrandLogo`.
O catálogo temporário `/design-system` é compartilhado e registrado somente em desenvolvimento.
Não foram implementados login, autenticação, integração REST, cadastros, reservas ou layouts definitivos.

## Estrutura examinada antes das alterações

O projeto já utilizava npm workspaces, Vue 3.5, TypeScript 6, Vite 8, Pinia e Vue Router
independentes por aplicação, Tailwind CSS 4 via `@tailwindcss/vite` e `@source` para o shared.
As portas 5173/5174 e `strictPort` foram preservadas. O pacote shared continua exportando fontes,
compilados pelos builds de cada aplicação, sem Module Federation ou build próprio.
Não foi localizada uma nova paleta explicitamente aprovada.
Os quatro SVGs passaram na verificação de hashes antes das modificações.

## Arquivos criados e modificados

| Arquivo ou grupo | Responsabilidade |
| --- | --- |
| `packages/shared/src/styles/tokens.css` | CSS variables semânticas e mapeamento `@theme inline` do Tailwind 4 |
| `packages/shared/src/styles/base.css` | Base tipográfica, estilos centralizados dos componentes, foco, responsividade e movimento reduzido |
| `packages/shared/src/styles/index.css` | Entrada dos estilos e declaração local da Inter variável latina |
| `packages/shared/src/components/Base*.vue` | Os sete componentes solicitados |
| `packages/shared/src/components/BrandLogo.vue` | Seleção de SVG por variante, texto alternativo e proporções preservadas |
| `packages/shared/src/types/design-system.ts` | Variantes, tamanhos, opções tipadas e tipos públicos |
| `packages/shared/src/utils/modal-scroll.ts` | Bloqueio de rolagem com restauração e contagem de modais |
| `packages/shared/src/demo/DesignSystemPage.vue` | Catálogo único com exemplos interativos |
| `packages/shared/src/index.ts` | Exportações públicas dos componentes e tipos |
| `packages/shared/package.json` | Subpath `./demo`, fonte local e Lucide como dependências próprias |
| `apps/{portal,admin}/src/router/index.ts` | Registro condicional da rota de desenvolvimento |
| `vitest.config.ts`, `tsconfig.tests.json` | Testes em jsdom e checagem de tipos de testes/configuração |
| `packages/shared/tests/` | Testes dos componentes, modal e dublês da API dialog |
| `package.json`, `package-lock.json` | Scripts e dependências reproduzíveis de testes |
| `README.md`, `AGENTS.md` | Acesso ao catálogo e padrão de documentação para próximas etapas |

As configurações Vite, os bootstraps, as instâncias Pinia, as páginas iniciais, os serviços e os
arquivos SVG não foram substituídos. Os CSS de entrada das aplicações já importavam os estilos
compartilhados e já incluíam seus fontes na detecção do Tailwind.

## Componentes implementados

Todos são importados de `@maragobus/shared`.

| Componente | API principal e utilização |
| --- | --- |
| `BaseButton` | `variant: primary/secondary/outline/ghost`, `size: sm/md/lg`, `type`, `loading`, `disabled`, `icon`; slot padrão para o rótulo e slot `icon`; evento `click` bloqueado quando indisponível |
| `BaseInput` | `label` obrigatório; `id`, `type`, `placeholder`, `help`, `error`, `disabled`; `v-model` string/número com `.number` e `.trim`; atributos nativos são enviados ao input |
| `BaseSelect` | `label`, `options: readonly SelectOption[]`, `v-model`, `placeholder`, `id`, `help`, `error`, `disabled`; valores string/número preservados; opções podem ser desabilitadas |
| `BaseCard` | Slots `header`, padrão e `footer`; regiões opcionais aparecem somente quando fornecidas |
| `BaseBadge` | `variant: neutral/success/warning/danger/info`, `size: sm/md`; slot para texto explícito do estado |
| `BaseAlert` | `variant: success/warning/danger/info`, `title`, `showIcon`, `role`; slot para conteúdo; papel padrão `alert` em danger e `status` nos demais |
| `BaseModal` | `v-model` booleano, `title` obrigatório, conteúdo padrão e slot `footer`; fechamento controlado, botão acessível, Escape, foco contido e restaurado |
| `BrandLogo` | `variant: horizontal/with-subtitle/icon-blue/icon-dark`, `alt`; imagem oficial por URL, altura automática e largura máxima responsiva |

Exemplo:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { BaseButton, BaseInput, BaseModal, BaseSelect } from '@maragobus/shared'
import type { SelectOption } from '@maragobus/shared'

const name = ref('')
const choice = ref<string | number>('')
const open = ref(false)
const options: SelectOption[] = [{ value: 1, label: 'Opção de exemplo' }]
</script>

<template>
  <BaseInput v-model.trim="name" label="Nome" help="Texto auxiliar" />
  <BaseSelect v-model="choice" label="Opção" :options="options" />
  <BaseButton @click="open = true">Abrir exemplo</BaseButton>
  <BaseModal v-model="open" title="Exemplo">
    Conteúdo do diálogo.
    <template #footer>
      <BaseButton @click="open = false">Fechar</BaseButton>
    </template>
  </BaseModal>
</template>
```

Inputs sem modificador numérico emitem o valor textual do controle. Para números, use `v-model.number`.
Não utilize string vazia como valor de uma opção: ela está reservada ao placeholder.
Botões com apenas ícone precisam receber um `aria-label` descritivo.
Badges e alertas devem conter texto que comunique seu significado, sem depender de cor.

## Decisões técnicas

- **Tokens:** valores centralizados em `--mb-*`; `@theme inline` oferece utilitários como
  `bg-primary`, `text-content`, `text-muted`, `bg-app`, `bg-surface`, `border-line`,
  `text-page`, `text-section`, `text-subtitle`, `text-body`, `text-helper`,
  `text-label` e `text-validation`.
- **Paleta:** primária, secundária, estados, hover, foco e disabled são provisórios e neutros.
  Sucesso, aviso, erro e informação têm tokens independentes, mas inicialmente os mesmos neutros.
  Texto, iconografia e borda de erro mais espessa oferecem sinais adicionais.
  As cores dos logotipos não foram tomadas como paleta do sistema.
- **Tipografia:** Inter variável normal, pesos 100–900, subset latino local via
  `@fontsource-variable/inter@5.3.0`, `font-display: swap` e fallback de sistema.
  O WOFF2 emitido tem cerca de 48 kB, sem requisições ao Google Fonts. A licença OFL acompanha
  o pacote da fonte em `node_modules/@fontsource-variable/inter/LICENSE`.
- **Dimensões:** unidade de espaçamento de 4 px; controles de no mínimo 44/48/56 px;
  raios de 8/12 px; sombras discretas; transições de 150 ms. A regra de movimento reduzido
  remove transições dos controles e a animação do loading.
- **Acessibilidade:** labels visíveis, IDs gerados por `useId`, descrições externas preservadas
  em `aria-describedby`, erros associados e anunciados, ícones decorativos ocultos de leitores de tela,
  foco visível e select nativo com navegação de teclado.
- **Modal:** `dialog.showModal()` usa a top layer e torna o fundo inerte no navegador.
  Tab/Shift+Tab são contidos, Escape solicita alteração do `v-model`, e o foco retorna ao
  acionador se ele ainda existir. Rolagem e recursos são restaurados ao fechar ou desmontar.
  O estado é controlado: o pai deve aceitar `update:modelValue`.
  Não há fechamento implícito ao clicar no backdrop.
- **Compartilhamento:** componentes e seus estilos existem somente no shared.
  Lucide é declarado pelo próprio pacote que o importa. As dependências existentes das aplicações
  foram preservadas. Nenhuma biblioteca completa de componentes foi adicionada.
- **Catálogo:** subpath separado `@maragobus/shared/demo`, import dinâmico dentro de
  `if (import.meta.env.DEV)`. Em produção, a rota e o JavaScript do catálogo são removidos.
  O CSS compartilhado é processado normalmente em ambas as aplicações.
- **Ferramentas de teste:** Vitest 5.1.0, Vue Test Utils 2.4.11, jsdom 31.0.0 e tipos Node 24.
  Vue Test Utils foi fixado em 2.4.11, compatível com a suíte; a versão 2.5.1 consultada tinha
  um aviso de auditoria adicional. Não foram forçadas versões incompatíveis de dependências transitivas.

Referências técnicas consultadas:
[Tailwind CSS variables e theme](https://tailwindcss.com/docs/colors),
[Vitest environments](https://vitest.dev/config/environment),
[dialog e showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).

## Demonstração

```sh
npm run dev
```

- Portal: http://localhost:5173/design-system
- Admin: http://localhost:5174/design-system

O catálogo apresenta as quatro marcas, hierarquia tipográfica, variantes e tamanhos de botões,
ícones, loading, disabled, inputs/selects com ajuda e erro, cards com slots,
badges, alertas e modal interativo. Os exemplos são locais e não enviam dados.

## Testes e validações

Resultados executados nesta etapa:

| Comando ou verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Aprovado: Portal, Admin, shared importado, testes e configuração Vitest |
| `npm test` | **42 testes aprovados**, 2 arquivos: 31 de componentes e 11 do modal |
| `npm run build:portal` | Aprovado, saída em `apps/portal/dist` |
| `npm run build:admin` | Aprovado, saída em `apps/admin/dist` |
| `npm run branding:verify` | Quatro SHA-256 iguais aos valores originais, antes e depois da etapa |
| `npm ls --depth=0` | Workspaces e dependências resolvidos sem erro |
| HTTP nas portas 5173 e 5174 | 200 em `/design-system`, router, componente de demonstração e CSS |
| Inspeção dos JS de produção | Rota `/design-system` e textos/módulo do catálogo ausentes em ambos os builds |
| Inspeção do CSS emitido | Tokens, componentes, Inter e reduced-motion presentes nos dois builds |
| `npm audit --omit=dev` | Nenhuma vulnerabilidade de produção reportada |
| `npm audit` / `npm audit fix` | Quatro avisos moderados transitivos de desenvolvimento permanecem |

A suíte cobre renderização, variantes, tamanhos, ícones, slots, cliques, v-model textual/numérico,
estados indisponíveis, associação acessível dos campos, controle do modal, cancelamento,
fechamento nativo, ciclo de foco, restauração e limpeza, inclusive bloqueios simultâneos.

**Limite dos testes:** jsdom não implementa `showModal/close`; a suíte usa dublês restritos
ao ciclo de abertura/fechamento. Eles não provam o bloqueio nativo do fundo, renderização,
contraste calculado ou comportamento de tecnologias assistivas em navegador real.
A tentativa de inspeção visual encontrou a ferramenta de controle do computador indisponível
(“Computer Use native pipe is unavailable”) e nenhum navegador conectado.
Portanto, não foi declarada validação visual de desktop/tablet/celular ou teste real de leitor de tela.

## Pendências

1. Aprovar a paleta oficial: primária, secundária, superfícies, texto, bordas, estados,
   hover, foco e disabled. Atualizar os tokens e revisar os contrastes no navegador.
2. Realizar inspeção visual nos tamanhos de celular, tablet e desktop, além de validar
   teclado, zoom, foco/inércia nativa do modal e tecnologias assistivas em navegador real.
3. Acompanhar os quatro avisos moderados da cadeia de teste
   `@vue/test-utils → js-beautify → glob/editorconfig → minimatch`.
   `npm audit fix` não os resolveu; não se aplicaram overrides de versões principais.
   São dependências de desenvolvimento, não incluídas no bundle de produção.
4. O asset com subtítulo continua com o nome real `logo-com-subititulo.svg`.
   Nenhum arquivo foi renomeado, recriado ou alterado.
5. Nesta etapa não foram definidos tema escuro, catálogo de todas as línguas da fonte
   ou testes automatizados em navegador. Não são requisitos implementados nesta entrega.

## Padrão de documentação

Cada próxima etapa deve gerar seu próprio relatório em `docs/etapas/`, incluindo resumo,
arquivos, componentes/funcionalidades, decisões, comandos e resultados reais, pendências e próxima etapa.
Esse padrão também está registrado em `AGENTS.md`.

## Próxima etapa

A fase prevista é a **Etapa 03: layouts e navegação**. Ela não foi iniciada.
Não foram feitos commits ou pushes.
