# Reservas do aluno

O Portal oferece um fluxo demonstrativo em memória nas rotas `/`, `/reservar` e `/reservas`. A [store Pinia](../apps/portal/src/stores/reservations.ts) é a fonte de verdade e consulta os registros pelo aluno autenticado. Recarregar a aplicação elimina as reservas. A simulação não envia dados à API.

## Calendário e disponibilidade

- Viagens regulares ocorrem de segunda a sexta. A janela abre às **17h inclusive** do dia regular anterior e fecha às **11h exclusive** do dia da viagem. A viagem de segunda abre na sexta às 17h e permanece disponível pelo fim de semana.
- A aplicação usa datas civis ISO `YYYY-MM-DD` e o fuso `America/Maceio` independentemente do dispositivo. O relógio compartilhado atualiza na virada do minuto e ao retornar à aba. A disponibilidade é revalidada no clique.
- Datas sem transporte são registradas no [mock de interrupções](../apps/portal/src/mocks/transport-closures.ts), com motivo e descrição opcionais. A data bloqueada fica indisponível. Se o dia normal de abertura estiver bloqueado, a janela afetada não é oferecida e a interface apresenta a próxima abertura conhecida. Interrupções em dias que já não eram regulares não deslocam a abertura.

## Confirmação

A confirmação exige sessão de aluno, janela aberta para a data revisada, faculdade preenchida e um ponto de embarque válido. A conta de teste usa apenas dados acadêmicos demonstrativos. A escolha é local ao formulário e não altera o ponto padrão, o perfil ou a sessão.

A store impede duplicidade por aluno e data, inclusive cliques repetidos e tentativas depois de um cancelamento. O registro inclui o identificador (UUID quando disponível), o aluno, a data, a faculdade, o identificador e o nome do ponto e a hora de confirmação. O resumo da reserva registrada permanece consultável. O status inicial é Confirmada.

## Página inicial e listagem

A página inicial usa o primeiro nome da sessão quando disponível. A reserva de hoje permanece no card principal até a meia-noite, inclusive com status Cancelada quando aplicável. A primeira reserva futura confirmada aparece em aviso abaixo do card, sem substituir a de hoje. A ausência de reservas não gera registros fictícios. O estado vazio oferece acesso a Fazer reserva. Notificações permanece destinada aos avisos administrativos.

Minhas reservas mostra as reservas de hoje primeiro, as futuras da mais próxima à mais distante e as anteriores da mais recente à mais antiga. Os filtros cobrem período e os estados Confirmada e Cancelada. Uma data anterior preserva seu status registrado.

## Cancelamento

O aluno pode cancelar a própria reserva confirmada, inclusive futura, até **antes das 16h** do dia da viagem. Às 16h00 o prazo acaba, independentemente do fechamento da criação às 11h. O modal pede confirmação e a store revalida sessão, status e prazo na ação. A reserva permanece no histórico com os dados originais, o status Cancelada e o instante do cancelamento. Tentativas repetidas preservam esse instante. Não há reativação nem nova reserva para a mesma data.

## Comprovante

O comprovante está disponível apenas para uma reserva própria e confirmada entre **00h inclusive e a meia-noite seguinte exclusive**, no dia da viagem em Maceió. A abertura às 17h para outra data não oculta o comprovante atual. Para uma viagem futura, a interface informa a disponibilidade a partir das 00h do dia correspondente.

O modal da página inicial e de Minhas reservas revalida sessão, status e data ao abrir. Fecha ao perder a elegibilidade por virada de dia, cancelamento ou troca de sessão. Usa a marca, a data, a faculdade, o ponto, o identificador, o status e o nome disponível da sessão. Exibe **Comprovante demonstrativo — sem validade para embarque** e não gera PDF, QR Code ou código de validação.

## Pendências

A política definitiva de abertura após feriados e outras interrupções permanece pendente, inclusive para bloqueios consecutivos. Autorização, persistência e integração com o backend, bem como as regras para emissão e validação de um comprovante de embarque, ainda precisam ser definidas.
