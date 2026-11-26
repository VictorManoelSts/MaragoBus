# Reservas do aluno

O Portal oferece um fluxo demonstrativo em memória nas rotas `/` e `/reservas`. O endereço anterior `/reservar` redireciona para `/`. A [store Pinia](../apps/portal/src/stores/reservations.ts) é a fonte de verdade e consulta os registros pelo aluno autenticado. Recarregar a aplicação elimina as reservas. A simulação não envia dados à API.

## Calendário e disponibilidade

- Viagens regulares ocorrem de segunda a sexta. A janela abre às **17h inclusive** do dia regular anterior e fecha às **11h exclusive** do dia da viagem. A viagem de segunda abre na sexta às 17h e permanece disponível pelo fim de semana.
- A aplicação usa datas civis ISO `YYYY-MM-DD` e o fuso `America/Maceio` independentemente do dispositivo. O relógio compartilhado atualiza na virada do minuto e ao retornar à aba. A disponibilidade é revalidada no clique.
- Datas sem transporte são registradas no [mock de interrupções](../apps/portal/src/mocks/transport-closures.ts), com motivo e descrição opcionais. A data bloqueada fica indisponível. Se o dia normal de abertura estiver bloqueado, a janela afetada não é oferecida e a interface apresenta a próxima abertura conhecida. Interrupções em dias que já não eram regulares não deslocam a abertura.

## Confirmação

A confirmação exige sessão de aluno, janela aberta para a data revisada, faculdade preenchida e um ponto de embarque válido. A conta de teste usa apenas dados acadêmicos demonstrativos. A escolha é local ao formulário e não altera o ponto padrão, o perfil ou a sessão.

A store impede duplicidade por aluno e data, inclusive cliques repetidos e tentativas depois de um cancelamento. O registro inclui o identificador (UUID quando disponível), o aluno, a data, a faculdade, o identificador e o nome do ponto e a hora de confirmação. O resumo da reserva registrada permanece consultável. O status inicial é Confirmada.

## Página inicial e listagem

A página inicial usa o primeiro nome da sessão quando disponível. A reserva de hoje permanece no card principal até a meia-noite, inclusive com status Cancelada quando aplicável. A primeira reserva futura confirmada aparece em um cartão com a data e o horário de liberação do comprovante. O formulário fica disponível na página inicial durante uma janela aberta para alunos aptos a reservar. Notificações permanece destinada aos avisos administrativos.

Minhas reservas mostra as reservas de hoje primeiro, as futuras da mais próxima à mais distante e as anteriores da mais recente à mais antiga. O controle segmentado filtra por Todas, Confirmadas ou Canceladas. Uma data anterior preserva seu status registrado.

## Cancelamento

O aluno pode cancelar a própria reserva confirmada, inclusive futura, até **antes das 16h** do dia da viagem. Às 16h00 o prazo acaba, independentemente do fechamento da criação às 11h. O modal pede confirmação e a store revalida sessão, status e prazo na ação. A reserva permanece no histórico com os dados originais, o status Cancelada e o instante do cancelamento. Tentativas repetidas preservam esse instante. Não há reativação nem nova reserva para a mesma data.

## Comprovante

O comprovante está disponível apenas para uma reserva própria e confirmada entre **00h inclusive e a meia-noite seguinte exclusive**, no dia da viagem em Maceió. A abertura às 17h para outra data não oculta o comprovante atual. Para uma viagem futura, a interface informa a disponibilidade a partir das 00h do dia correspondente.

A página inicial e Minhas reservas encaminham para `/comprovante`. A página consulta a reserva do aluno autenticado e reavalia a disponibilidade ao cancelar, trocar de sessão ou mudar a data em Maceió. No dia da viagem, apresenta a marca, a data, o nome do aluno, a faculdade, o ponto de embarque e o status, com o aviso **Comprovante demonstrativo — sem validade para embarque**. Para reservas futuras, informa a data e o horário de liberação. Também apresenta estados de reserva cancelada e ausência de reservas.

## Consulta do motorista

Em `/motorista/reservas`, o motorista seleciona a data da viagem. A página apresenta os totais de reservas confirmadas e faculdades e agrupa os alunos por faculdade. Os grupos começam recolhidos ao abrir a página ou trocar a data. Ao expandir um grupo, os alunos aparecem em ordem alfabética com o ponto de embarque da reserva. A consulta acompanha as alterações da store de reservas.

O modal do aluno mostra nome, faculdade, telefone e ponto de embarque. Quando o telefone está ausente, a tela exibe **Não informado**. A ação **Solicitar advertência** abre o formulário existente, com motivo obrigatório e bloqueio de solicitações duplicadas. Ao voltar do formulário, o foco retorna à ação no modal do aluno. Ao fechar o modal do aluno, o foco retorna ao botão da lista. Após o envio, o foco vai para a confirmação, que dá acesso à página Advertências.

A seção **Organização de rotas** usa a data selecionada no cabeçalho. A partir das 11h do dia da viagem em `America/Maceio`, o motorista pode atribuir uma faculdade selecionando o motorista e acionando **Atribuir**. A primeira atribuição cria o rascunho. Nos cards dos motoristas, **Editar atribuição** permite transferir ou remover a faculdade. Os indicadores e os totais por motorista acompanham as atribuições e os cancelamentos. Distribuições publicadas e registros de datas anteriores ficam disponíveis para consulta.

### Cenário demonstrativo

Abra [o endereço de ativação da demonstração](http://localhost:5173/demo-motorista) pelo navegador ou pela navegação interna do Portal. O cenário é ativado e o Portal encaminha ao login ou ao destino da sessão corrente. O cenário funciona no Portal local em desenvolvimento. A ativação e a sessão do motorista demonstrativo valem para a aba e persistem ao recarregar. Se já houver uma sessão, saia pelo perfil para trocar de conta.

| Motorista | CPF fictício |
| --- | --- |
| Motorista Demo 1 | `900.000.004-18` |
| Motorista Demo 2 | `900.000.005-07` |
| Motorista Demo 3 | `900.000.006-80` |

A senha das três contas demonstrativas é `MotoristaDemo!24`. O Portal carrega em memória 30 reservas confirmadas para o dia civil de Maceió, distribuídas entre cinco faculdades e três pontos de embarque. Quinze alunos têm telefone fictício. As contas demonstrativas compartilham a organização de rotas entre si. As sessões comuns consultam apenas os registros do fluxo comum. Recarregar após a virada do dia gera o cenário para a nova data.

Abra [o login com a demonstração desativada](http://localhost:5173/login?demo-motorista=0) na mesma aba para encerrar a sessão demonstrativa e limpar suas reservas, distribuições e solicitações. A próxima ativação recria as reservas do dia em Maceió. A navegação interna preserva os registros das sessões comuns. Recarregar o Portal recria as stores em memória.

## Distribuição de faculdades

A [store de distribuição](../apps/portal/src/stores/college-distributions.ts) mantém um registro compartilhado por data civil de viagem, em memória na mesma instância de Pinia. Ao trocar de conta nessa instância, os motoristas consultam e editam o mesmo registro. Recarregar a aplicação elimina a distribuição e seu histórico.

- A criação e as alterações exigem sessão autenticada de motorista e ocorrem entre **11h inclusive e a meia-noite seguinte exclusive**, no dia da viagem em `America/Maceio`. Registros de dias anteriores continuam disponíveis para consulta.
- O registro começa em **RASCUNHO**. Qualquer motorista autenticado pode atribuir uma faculdade com reservas confirmadas, remover sua atribuição ou transferi-la a outro motorista. Cada faculdade, identificada pelo nome registrado na reserva, tem no máximo um motorista na data.
- A publicação muda o estado para **PUBLICADA** quando todas as faculdades com reservas confirmadas têm motorista. Sem reservas confirmadas, a publicação também pode ser confirmada sem rascunho. Nesse caso, o histórico registra a criação e a publicação na mesma operação. Para editar as atribuições após publicar, um motorista deve reabrir a distribuição na mesma janela, retornando-a a **RASCUNHO**.
- Os totais são derivados reativamente da store de reservas. O cancelamento reduz o total sem mudar o estado nem as atribuições. Quando a última reserva de uma faculdade atribuída é cancelada, a atribuição continua visível com zero alunos e pode ser removida ou transferida em rascunho.
- O histórico registra criação, atribuição, remoção, transferência, publicação e reabertura. Cada alteração efetiva guarda a identidade do motorista autor e o instante em ISO UTC. Alterações de atribuição registram a faculdade e os motoristas envolvidos.

## Pendências

A política definitiva de abertura após feriados e outras interrupções permanece pendente, inclusive para bloqueios consecutivos. Autorização, persistência e integração com o backend, bem como as regras para emissão e validação de um comprovante de embarque, ainda precisam ser definidas.
