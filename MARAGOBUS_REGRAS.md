# MaragoBus — Regras de Negócio

> Referência completa de regras de negócio para o Claude Code.
> Complementa o CLAUDE.md com domínio, fluxos e estrutura de dados.

---

## 1. Perfis de usuário

### Aluno
- Pré-cadastrado pelo admin — sem cadastro público
- Login: CPF + senha inicial (6 últimos dígitos do CPF)
- Troca de senha obrigatória no primeiro acesso (redirecionado para o perfil)
- Sem alteração de senha após o primeiro acesso
- Redefinição de senha: link "Esqueceu a senha?" abre o WhatsApp da secretaria
  - Número: (82) 99151-2687
  - Deep link: https://wa.me/5582991512687
- Acesso cancelado automaticamente após o ano de conclusão do curso

### Motorista
- Pré-cadastrado pelo admin
- Mesmo fluxo de login e primeiro acesso do aluno (senha: 6 últimos dígitos do CPF)
- Dados: nome, telefone (uso interno), login
- Visualiza reservas do dia atual sempre
- Visualiza reservas do dia seguinte apenas a partir das 5h da manhã
- Antes das 5h: exibir mensagem "Reservas de amanhã disponíveis a partir das 5h"

### Admin
- Criado diretamente no Firebase — sem tela de cadastro no app
- Múltiplos admins com o mesmo nível de acesso
- Pode editar todos os dados do aluno exceto o CPF (imutável — usado como login)

---

## 2. Reservas

### Janela de horário
- Abertura: 17h do dia atual
- Encerramento: 11h do dia seguinte
- Cancelamento disponível até: 16h do dia da viagem
- Sem limite de vagas — número de ônibus adapta-se à demanda

### Dias de funcionamento
- Viagens: segunda a sexta-feira
- Feriados: sem viagem — reservas migram para o próximo dia útil
- Fins de semana: reservas abertas, contabilizadas para o próximo dia útil
- Sexta às 17h: reservas para segunda (ou próximo dia útil disponível)
- Se segunda for feriado: reservas migram para terça (próximo dia útil)

### Ponto de embarque
- Cada aluno tem um ponto padrão definido no cadastro
- Na reserva, o ponto padrão é pré-selecionado automaticamente
- Aluno pode trocar o ponto apenas para aquela reserva (não altera o padrão)
- Ao editar o ponto padrão: reservas já confirmadas mantêm o ponto antigo
- Novo ponto padrão vale apenas para as próximas reservas
- Banner de aviso ao editar: "O novo ponto será aplicado apenas nas próximas reservas."

---

## 3. Feriados

| Tipo | Gestão |
|---|---|
| Nacionais | BrasilAPI automático · admin pode remover os que não se aplicam |
| Regionais/municipais | Cadastrados manualmente pelo admin (sem limite por ano) |
| Avulsos | Admin bloqueia pontualmente para imprevistos |

- Admin deve cadastrar feriados regionais com antecedência
- Sistema envia pop-up de aviso ao admin: 3 dias antes e 1 dia antes
- Reservas migram automaticamente para o próximo dia útil disponível

---

## 4. Advertências e Suspensão

### Fluxo de solicitação (motorista)
1. Motorista clica em botão de solicitar advertência direto no card do aluno
2. Modal abre com campo de justificativa obrigatório
3. Solicitação salva no Firestore com status "pendente"
4. Motorista não recebe retorno sobre confirmação ou rejeição

### Fluxo de decisão (admin)
1. Admin vê solicitações pendentes via ícone de sino no topo (com badge)
2. Confirma ou rejeita cada solicitação com justificativa obrigatória
3. Admin também pode aplicar advertência diretamente na tela de detalhe do aluno
4. Solicitações rejeitadas: descartadas sem registro
5. Solicitações confirmadas: mantidas até a suspensão ser aplicada

### Contagem e consequências
| Advertências confirmadas | Consequência |
|---|---|
| 1ª e 2ª | Registradas sem notificação ao aluno |
| 3ª | Suspensão automática de 3 dias úteis |

### Notificação ao aluno (apenas na 3ª)
- Resumo dos motivos das 3 advertências
- Explicação do admin para a decisão de suspensão

### Suspensão
- Duração: 3 dias úteis
- Aluno mantém acesso ao app mas reservas ficam bloqueadas
- Ao abrir o app: pop-up com motivos e data prevista de reativação
- Reativação automática após 3 dias úteis
- Reativação manual pelo admin:
  - Na tela de detalhe do aluno (botão dedicado)
  - Na lista de alunos (badge "Suspenso" clicável)
- Após suspensão: contador zerado + punição registrada no histórico (só admin vê)
- Histórico das 3 solicitações apagado após suspensão efetivada

### Visibilidade das advertências
| Quem | O que vê |
|---|---|
| Aluno | Lista simples com data e motivo das advertências confirmadas ativas |
| Admin | Histórico completo de advertências + histórico de punições |
| Motorista | Apenas suas próprias solicitações enviadas |

---

## 5. Notificações

| Notificação | Horário | Destinatários |
|---|---|---|
| Abertura das reservas | 17h | Todos os alunos ativos |
| Lembrete de encerramento | 10h | Apenas quem ainda não reservou |
| Suspensão confirmada | Imediato | Aluno suspenso |
| Aviso de feriado | 3 dias antes e 1 dia antes | Admins |

- Aluno tem histórico de notificações no app (ícone de sino no topo)
- Advertências confirmadas aparecem no histórico como notificação
- Lembretes de reserva também são comunicados pelos motoristas no WhatsApp

---

## 6. Navegação

### Aluno
- Nav bar: Reserva · Comprovante
- Sino no topo direito: histórico de notificações (inclui advertências)
- Badge no sino: contador de não lidas

### Motorista
- Tela única com filtros internos (faculdade e ponto de embarque)
- Sem nav bar com múltiplas abas

### Admin
- Nav bar: Reservas · Alunos · Cadastrar
- Sino no topo direito: solicitações de advertência (com badge de pendências)

---

## 7. Telas e conteúdo

### Aluno
| Tela | Conteúdo |
|---|---|
| Reserva | Status da janela · dados do aluno · seletor de ponto · confirmar/cancelar |
| Comprovante | Iniciais · nome · faculdade · data · ponto · QR code |
| Notificações | Histórico com advertências · aberturas · lembretes |

### Motorista
| Tela | Conteúdo |
|---|---|
| Lista de alunos | Filtros por faculdade e ponto · botão solicitar advertência por card |
| Detalhe do aluno | Nome · faculdade · curso · ponto do dia · telefone |

### Admin
| Tela | Conteúdo |
|---|---|
| Reservas | Métricas hoje/amanhã/total · lista por faculdade · tabs hoje/amanhã |
| Alunos | Busca · filtros (todos/suspensos/concluindo) · lista com badges |
| Detalhe do aluno | Header azul + dados pessoais + dados acadêmicos + histórico advertências + botões |
| Edição de aluno | Formulário completo (CPF bloqueado + banner ao editar ponto) |
| Cadastro de aluno | Formulário por seções com validação |
| Solicitações | Lista de pendentes com confirmar/rejeitar + justificativa |
| Feriados | Nacionais (BrasilAPI) + regionais + avulsos |
| Pontos | Lista com adicionar · editar · remover (bloqueado se houver alunos no ponto) |

---

## 8. Dados cadastrais

### Aluno
Nome completo · Foto · CPF (imutável) · Endereço · Telefone · Faculdade
Modalidade (Presencial/Semipresencial/Online) · Semestre atual · Curso
Ano de conclusão · Ponto de embarque padrão

### Motorista
Nome · Telefone (uso interno) · Login

---

## 9. Ações críticas (requerem confirmação)

| Ação | Pop-up | Ícone |
|---|---|---|
| Suspender | "O aluno ficará suspenso por 3 dias úteis." | ti-clock / âmbar |
| Excluir | "Todos os dados serão apagados permanentemente." | ti-trash / vermelho |
| Reativar | "O aluno voltará a ter acesso às reservas imediatamente." | ti-circle-check / verde |

- Exclusão apaga tudo: dados pessoais · acadêmicos · advertências · punições · reservas

---

## 10. Estrutura do Firestore

```
alunos/{alunoId}
  nome, cpf, telefone, endereco, foto
  faculdade, curso, modalidade, semestre, anoConclusao
  pontoEmbarquePadrao, status, dataSuspensao, dataReativacao
  primeiroAcesso (boolean)

motoristas/{motoristaId}
  nome, telefone, primeiroAcesso (boolean)

reservas/{reservaId}
  alunoId, data, pontoEscolhido, criadaEm

advertencias/{advertenciaId}
  alunoId, motivo, aplicadaPor, tipo (solicitacao | direta), data

solicitacoes/{solicitacaoId}
  alunoId, motoristaId, motivo, status (pendente | confirmada | rejeitada), data

punicoes/{punicaoId}
  alunoId, motivos[], explicacaoAdmin, dataInicio, dataFim

feriados/{feriadoId}
  data, nome, tipo (nacional | regional | avulso)

pontos/{pontoId}
  nome, ativo (boolean)
```

---

## 11. Regras de segurança do Firestore

- Aluno: lê e escreve apenas os próprios dados e reservas
- Motorista: lê reservas do dia e dados básicos dos alunos
- Admin: acesso total a todas as coleções
- Não autenticado: sem acesso a nada
