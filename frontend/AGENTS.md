# Orientações do projeto MaragoBus

## Fluxo de desenvolvimento vigente
1. Cada prompt deve implementar uma ou poucas funcionalidades relacionadas; respeitar o escopo solicitado.
2. Cada implementação deve incluir testes automatizados relevantes, reutilizando a suíte existente quando apropriado.
3. Executar TypeScript, testes e builds apropriados; informar os comandos e resultados reais.
4. Gerar um relatório Markdown próprio em `docs/etapas/`, inclusive nas tarefas de manutenção.
5. Não gerar capturas de tela.
6. Não criar pastas de evidências visuais.
7. Não executar inspeções visuais automatizadas, salvo solicitação explícita do usuário.
8. Ao finalizar, manter os servidores de desenvolvimento do Portal e do Admin em execução, sempre que o ambiente permitir.
9. Reutilizar os servidores existentes. Antes de iniciar qualquer processo, verificar as portas 5173/5174 e as respostas locais. Não duplicar instâncias nem alterar as portas.
10. Informar as URLs de visualização: Portal em http://localhost:5173/ e Admin em http://localhost:5174/. Explicar qualquer limitação e fornecer o comando exato se algum servidor não puder permanecer ativo.
11. Não realizar commits ou pushes automaticamente.
12. Não avançar para a próxima funcionalidade sem autorização.

Essas regras substituem os procedimentos de capturas descritos nos relatórios históricos.
Resultados antigos de inspeções devem ser preservados como histórico, sem recriar imagens.
Os `metrics.json` e scripts históricos foram mantidos por não serem capturas; os scripts
de captura não integram o fluxo atual e não devem ser executados automaticamente.

## Relatórios por etapa
Toda etapa deve criar seu relatório próprio em `docs/etapas/NN-nome-da-etapa.md`.
Incluir: resumo, principais arquivos e responsabilidades, componentes ou funcionalidades,
decisões técnicas, comandos de validação com resultados realmente executados, pendências
e próxima etapa prevista. Apresentar também um resumo objetivo no terminal.
Nunca declarar testes aprovados sem executá-los.

## Escopo e preservação
Examinar a configuração existente antes de modificá-la. Preservar configurações funcionais.
Não modificar os SVGs oficiais de `packages/shared/src/assets/branding/`.
Conferir sua integridade com `npm run branding:verify`; não atualizar o manifesto para esconder alterações.
A paleta oficial foi aprovada na Etapa 04.1 e está centralizada em `tokens.css`:
azul-marinho #16466B, azul-oceano #2479A8, azul-água #48A9C5, azul névoa #EAF4F8 e branco #FFFFFF.
Não criar cores adicionais de marca; manter neutros e estados funcionais quando necessários à acessibilidade.
Não avançar automaticamente para etapas seguintes nem realizar commits ou pushes sem solicitação.
