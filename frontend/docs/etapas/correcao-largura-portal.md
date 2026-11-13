# Correção — Portal com largura total

## Causa identificada

O PortalLayout aplicava `mx-auto max-w-5xl` em dois contêineres externos:

- O contêiner interno do cabeçalho, que posiciona o logotipo.
- O contêiner que reúne sidebar desktop e main.

`max-w-5xl` limita a largura a 64rem, equivalentes a 1024 px com fonte padrão de 16 px.
Em janelas maiores, `mx-auto` centralizava esses contêineres, deixando espaço entre a
borda da aplicação e a sidebar e impedindo o conteúdo de aproveitar a largura restante.
O AdminLayout já utiliza contêineres fluidos, sem essas restrições externas.

A investigação também encontrou limites internos legítimos: max-w-prose nas descrições,
max-width de 100% no BrandLogo e dimensão máxima do modal. Eles não são a causa e foram
preservados. O antigo BaseLayout tem um contêiner estreito, mas não é o layout utilizado
pelas rotas atuais de aluno e motorista; não foi modificado nesta correção.

## Arquivos modificados

| Arquivo | Alteração |
| --- | --- |
| `apps/portal/src/layouts/PortalLayout.vue` | Remoção de mx-auto/max-w-5xl dos dois contêineres externos e largura total explícita no shell |
| `apps/portal/src/components/PortalNavigation.vue` | Apenas a largura da apresentação desktop: w-48 para w-64 |
| `apps/portal/tests/layout.spec.ts` | Expectativa de cabeçalho atualizada e três casos novos de largura e integração nos dois perfis |
| `docs/etapas/correcao-largura-portal.md` | Relatório desta correção |

## Alterações realizadas

- Shell, cabeçalho e contêiner de sidebar/main utilizam a largura disponível, com w-full,
  sem centralização automática ou largura máxima externa.
- A sidebar é o primeiro elemento do contêiner fluido, sem espaço reservado à esquerda.
  Sua largura passou de 192 para 256 px no tamanho de fonte padrão, igual ao Admin.
- O main mantém flex-1/min-w-0, ocupando o restante após a sidebar, e preserva padding
  responsivo, quebra de texto, conteúdo por slot e elemento semântico main.
- O logotipo mantém as mesmas dimensões e padding horizontal: 16/24/32 px nos breakpoints
  existentes, alinhado à esquerda do cabeçalho fluido.
- As regras de áreas seguras dos dispositivos foram preservadas. Não foi aplicada largura
  100vw, que poderia incluir espaço de scrollbar; a estrutura usa a largura disponível do pai.
- A correção atende aluno e motorista porque ambos reutilizam PortalLayout e PortalNavigation.
- A navegação mobile mantém três ou cinco colunas conforme o perfil, a região sticky inferior,
  áreas de toque, ícones, links, rótulos, foco e indicação da página ativa.
- Limites internos de leitura e componentes foram preservados. Não houve exclusão genérica
  de max-width ou margin:auto de outros componentes.

Não foram alterados AdminLayout, navegações ou rotas administrativas, destinos do Portal,
conteúdo das páginas, componentes compartilhados, paleta, SVGs ou dependências.
A organização vertical e a rolagem existentes do Portal foram mantidas; esta correção
trata da largura externa, sem implementar funcionalidades adicionais.

## Testes e resultados

Comando executado: `npm test`.

**Resultado: 211 testes aprovados em 12 arquivos, sem falhas.**

Foram mantidos os 208 casos anteriores, com atualização da expectativa que exigia
max-w-5xl no cabeçalho. Os três novos casos verificam:

1. Shell, contêiner do cabeçalho e contêiner de sidebar/main com w-full, sem mx-auto,
   classe container ou max-w externo; main flexível e sem largura mínima imposta.
2. Integração da página do aluno em /reservas: sidebar como primeiro elemento da região
   fluida, largura w-64, main ao lado, cinco links preservados e barra mobile no fluxo.
3. A mesma integração em /motorista/reservas, preservando seus três destinos.

Os casos de integração também verificam a página ativa, um único main, visibilidade
complementar desktop/mobile e preservação de max-w-prose na descrição interna.
As demais suítes continuam cobrindo todas as páginas, redirects e navegações de aluno,
motorista e Admin, além dos componentes e da identidade visual.

## Builds e TypeScript

| Comando ou verificação | Resultado real |
| --- | --- |
| npm run typecheck | Aprovado para as duas aplicações e a suíte |
| npm test | 211/211 aprovados; 12 arquivos |
| npm run build:portal | Aprovado; saída em apps/portal/dist |
| npm run build:admin | Aprovado; saída em apps/admin/dist |
| npm run branding:verify | Quatro SHA-256 iguais aos originais |
| Comparação de isolamento | 59 arquivos com SHA-256 idêntico ao início da tarefa |
| HTTP Portal e Admin | HTML e main.ts responderam 200 nas duas aplicações |
| HTTP das páginas do Portal verificadas | /reservas, /motorista/reservas e /motorista/advertencias responderam 200 |

A comparação de isolamento inclui Admin, shared, paleta, configurações de rotas,
conteúdo das páginas, layouts de composição dos perfis e CSS do Portal. Nenhum desses
arquivos foi alterado. Não houve falhas nas verificações executadas.

## Estado dos servidores

Os processos existentes foram reutilizados e mantidos em execução. Nenhum servidor foi
reiniciado, encerrado ou duplicado, e as portas não foram alteradas.

| Aplicação | URL | PID observado | Estado |
| --- | --- | --- | --- |
| Portal | http://localhost:5173/ | 22992 | Ativo; HTML e main.ts HTTP 200 |
| Admin | http://localhost:5174/ | 20192 | Ativo; HTML e main.ts HTTP 200 |

Links para revisão manual:

- [Aluno — Início](http://localhost:5173/)
- [Aluno — Minhas reservas](http://localhost:5173/reservas)
- [Motorista — Reservas](http://localhost:5173/motorista/reservas)
- [Motorista — Solicitações de advertência](http://localhost:5173/motorista/advertencias)
- [Admin — comparação](http://localhost:5174/)

Se algum servidor parar posteriormente, na raiz frontend, inicie somente a aplicação ausente:

```powershell
$env:PATH = "$env:LOCALAPPDATA\MaragoBus\tools\node-v24.22.3-win-x64;" + $env:PATH
npm.cmd run dev:portal
# Ou, em outro terminal, para o Admin:
npm.cmd run dev:admin
```

## Pendências

- Aguardar a revisão visual manual pelo usuário em desktop, tablet e celular.
- Não foram geradas capturas ou executadas inspeções visuais automatizadas. Os testes
  em jsdom verificam estrutura e classes, não dimensões renderizadas ou overflow real.
- Não há falhas conhecidas de TypeScript, testes, builds ou acesso aos servidores.

Nenhum commit ou push foi realizado. A Etapa 04.2C não foi iniciada.
