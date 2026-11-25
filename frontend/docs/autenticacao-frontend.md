# Autenticação do frontend

## Login

O login único fica no Portal em `/login`, inclusive quando o acesso começou pelo Admin. O formulário mantém apenas os 11 dígitos do CPF e aplica a máscara na apresentação. A edição e a colagem preservam o cursor pela posição relativa aos dígitos. Backspace e Delete junto aos separadores operam sobre o dígito adjacente. A validação local diferencia campo obrigatório, quantidade incorreta e CPF inválido, rejeitando sequências repetidas e verificando os dígitos verificadores.

A senha exige conteúdo e segue para o serviço sem transformação, inclusive sem remover espaços. O formulário mantém a opção de exibir a senha, usa mensagens associadas aos campos e leva o foco ao primeiro campo inválido. No envio válido, o estado pendente evita duplicidade. Falhas de credenciais usam uma mensagem genérica, preservam os campos e levam o foco ao alerta. O sucesso limpa a senha e encaminha ao destino do perfil.

## Sessão simulada

- O adaptador mock só funciona em desenvolvimento, no host `localhost`. Os três perfis usam contas sintéticas definidas no [adaptador](../packages/shared/src/auth/mock.ts). O build de produção recusa o mock e as rotas protegidas continuam fechadas na ausência de autenticação real.
- Portal e Admin têm instâncias Pinia independentes. O cookie de sessão `maragobus_mock_session` contém apenas o identificador fictício, com `Path=/` e `SameSite=Lax`. Cookies do mesmo host são compartilhados entre portas. Use `localhost` nas duas aplicações.
- A store expõe a identidade pública (`id`, `name`, `role`) e os estados de autenticação, prontidão e envio. Deduplica restaurações e usa revisões para evitar que respostas antigas sobrescrevam um logout. CPF e senha não pertencem à sessão.
- O logout limpa a sessão local e o cookie e volta ao login. As aplicações sincronizam em foco, mudança de visibilidade e a cada segundo no mock. Identificadores desconhecidos são descartados. O conteúdo protegido é ocultado quando uma mudança de sessão revoga o acesso.

## Proteção de rotas

Os guards compartilhados usam os metadados de acesso da rota e restauram a sessão antes da decisão. A montagem inicial aguarda o roteador concluir a navegação. O acesso anônimo às áreas protegidas leva ao login. Um perfil autenticado que acessa o login ou tenta entrar em outra área é encaminhado ao próprio destino.

| Perfil | Área permitida | Destino inicial |
| --- | --- | --- |
| Aluno (`student`) | Rotas do aluno no Portal | `/` no Portal |
| Motorista (`driver`) | Rotas do motorista no Portal | `/motorista` no Portal |
| Administrador (`admin`) | Rotas do Admin | `/` no Admin |

O catálogo `/design-system` é público em desenvolvimento. Os redirects de compatibilidade passam pelo guard do destino final.

## Limites e integração futura

O cookie mock é editável pelo cliente. Os guards organizam a navegação, enquanto uma futura API precisará autenticar e autorizar cada operação, inclusive o acesso a dados de outro usuário. Não reutilize o cookie simulado nem a consulta a cada segundo na integração real.

A [auditoria histórica](etapas/06.1-auditoria-autenticacao-backend.md) registra as incompatibilidades de contratos e uma proposta de arquitetura. Sessão de servidor, endpoints, política de expiração, revogação, CSRF, CORS e topologia de produção dependem de aprovação e verificação do backend. O fluxo documental vigente está no [AGENTS.md](../AGENTS.md).
