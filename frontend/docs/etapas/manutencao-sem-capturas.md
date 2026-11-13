# Manutenção — Remoção de capturas e atualização do fluxo

## Resumo

Removidas 23 capturas de tela usadas exclusivamente como evidências do desenvolvimento.
Os sete relatórios Markdown anteriores foram preservados; quatro receberam atualização
dos links e aviso de que as capturas foram excluídas. Os resultados históricos de testes,
medições e inspeções permanecem documentados.

O padrão das próximas etapas foi registrado em AGENTS.md e README.md, sem modificar
funcionalidades do Portal ou do Admin. Nenhuma nova captura ou inspeção visual automatizada
foi executada nesta manutenção.

## Arquivos e diretórios

| Diretório | Capturas PNG removidas | Arquivos preservados |
| --- | --- | --- |
| docs/etapas/evidencias/03.3/ | 6 | metrics.json |
| docs/etapas/evidencias/03.4/ | 3 | metrics.json |
| docs/etapas/evidencias/03.5A/ | 4 | metrics.json |
| docs/etapas/evidencias/03.5B/ | 10 | metrics.json |
| **Total** | **23** | **4 arquivos JSON** |

**Diretórios removidos: nenhum.** Todos os quatro diretórios continuam contendo seu
metrics.json, que não é uma captura e foi preservado conforme a restrição de não remover
outros arquivos. Nenhum diretório de evidências ficou vazio.

As exclusões usaram uma lista explícita de nomes, com verificação de que os caminhos
estavam dentro do workspace e da raiz de evidências, além da assinatura PNG dos arquivos.
Não foi feita exclusão recursiva de diretórios com conteúdo.

### Documentos atualizados

- AGENTS.md: padrão vigente de desenvolvimento, testes, relatórios, ausência de capturas
  e manutenção dos servidores existentes em execução.
- README.md: mesmo fluxo, URLs e comandos para iniciar apenas servidores ausentes.
- 03.3-navegacao-motorista.md.
- 03.4-layout-admin.md.
- 03.5A-sidebar-admin.md.
- 03.5B-navegacao-mobile-admin.md.

Nos quatro relatórios, os links para PNGs foram substituídos por indicações textuais de
captura removida, preservando os nomes e os tamanhos testados. Os comandos apresentados
como procedimentos futuros de reprodução foram substituídos por uma nota de procedimento
histórico descontinuado. As tabelas de comandos executados e seus resultados permanecem.
Os links para medições JSON continuam válidos.

Este relatório de manutenção foi criado em docs/etapas/. Os outros três relatórios anteriores
não precisaram de alteração. Scripts históricos de captura foram preservados por não serem
imagens; não integram o fluxo atual e não foram executados.

## Fluxo registrado para as próximas etapas

1. Implementar uma ou poucas funcionalidades relacionadas por prompt.
2. Incluir testes automatizados relevantes.
3. Executar TypeScript, testes e builds apropriados.
4. Gerar relatório Markdown próprio em docs/etapas/.
5. Não gerar capturas de tela.
6. Não criar pastas de evidências visuais.
7. Não executar inspeções visuais automatizadas sem solicitação explícita.
8. Manter Portal e Admin em execução ao finalizar, quando o ambiente permitir.
9. Reutilizar servidores existentes, sem duplicar processos ou alterar portas.
10. Informar os endereços locais, limitações e comandos manuais necessários.
11. Não realizar commits ou pushes automaticamente.
12. Não avançar para outra funcionalidade sem autorização.

## Validações executadas

| Verificação ou comando | Resultado real |
| --- | --- |
| Inventário de imagens em docs/ após a limpeza | Zero imagens de evidência restantes |
| Relatórios anteriores | Sete arquivos Markdown preservados |
| Links de evidências restantes nos relatórios | Nenhum destino ausente |
| Comparação SHA-256 dos fontes, configurações e scripts inventariados | 86 arquivos sem alteração |
| Comparação SHA-256 dos metrics.json | Quatro arquivos sem alteração |
| npm run typecheck | Aprovado |
| npm test | 152 testes aprovados em dez arquivos |
| npm run build | Builds de Portal e Admin aprovados |
| npm run branding:verify | Quatro SVGs com hashes iguais aos originais |
| HTTP de Portal e Admin | HTML e src/main.ts responderam 200 nas duas portas |

Nenhuma alteração funcional foi feita. Não foram criados testes novos para esta mudança
exclusivamente documental e de limpeza; a suíte existente foi executada para regressão.
Os SVGs oficiais, os assets das aplicações e o PNG logo-maragogi.png da raiz foram preservados.

## Servidores de desenvolvimento

Os dois servidores já estavam ativos e foram reutilizados, sem iniciar processos novos.
As verificações inicial e final encontraram os mesmos processos:

| Aplicação | URL | PID observado | Estado ao concluir |
| --- | --- | --- | --- |
| Portal | http://localhost:5173/ | 22992 | Em execução; HTML e main.ts HTTP 200 |
| Admin | http://localhost:5174/ | 20192 | Em execução; HTML e main.ts HTTP 200 |

Os processos foram mantidos em execução. Não foi identificada limitação do ambiente
impedindo sua continuidade nesta tarefa; a persistência depende de o ambiente permanecer ativo.

Se algum servidor parar futuramente, execute somente o correspondente na raiz frontend:

```powershell
$env:PATH = "$env:LOCALAPPDATA\MaragoBus\tools\node-v24.22.3-win-x64;" + $env:PATH
# Execute apenas o comando da aplicação parada, em seu próprio terminal:
npm.cmd run dev:portal
# Ou:
npm.cmd run dev:admin
```

Com ambos parados, npm.cmd run dev inicia os dois. Não use esse comando quando uma das
portas já estiver ocupada; reutilize a instância ativa e inicie somente a aplicação ausente.

## Pendências e próxima etapa

Não há pendências bloqueantes desta manutenção. Os quatro diretórios antigos permanecem
apenas para preservar medições não visuais, não para receber novas capturas.
Nenhuma outra funcionalidade foi iniciada. Não foram realizados commits ou pushes.
