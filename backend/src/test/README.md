# Testes com PostgreSQL isolado

Requisitos: Java 21, Docker disponível e acesso às imagens `postgres:15-alpine`
e ao container auxiliar de limpeza do Testcontainers na primeira execução.
As versões das duas dependências de teste são gerenciadas pelo Spring Boot.

Na pasta `backend`, execute no PowerShell:

```powershell
.\mvnw.cmd test
```

Para executar somente os três testes de persistência:

```powershell
.\mvnw.cmd '-Dtest=PersistenciaAlunoIntegrationTest' test
```

`PostgresTestConfiguration` declara um PostgreSQL descartável, sem volume,
sem reutilização e com porta aleatória. O Spring controla seu ciclo de vida
e fornece a conexão por `@ServiceConnection`. O teste de contexto também
importa essa configuração. Se o Docker falhar, os testes falham; não há
alternativa que use o banco de desenvolvimento nem descarte silencioso dos testes.

O `application.properties` do classpath de testes substitui o arquivo principal,
não importa o `.env` e usa `create-drop` apenas no banco isolado. A URL padrão
de testes aponta para uma porta inválida para impedir o uso acidental da URL
principal quando faltar a configuração do container. A aplicação principal
continua com `ddl-auto=update`.

Os testes de persistência não possuem `@Transactional` envolvendo o teste.
Preparação, limpeza e verificações usam `REQUIRES_NEW`; cada chamada de serviço
real termina sua própria transação antes das verificações. Antes da limpeza,
o teste confere a URL JDBC e o catálogo contra o container esperado. Dados são
limpos entre casos exclusivamente nesse banco e descartados junto com o container.

Casos cobertos:

- Commit do cadastro: usuário e perfil são relidos após a chamada do serviço.
- Rollback: um trigger temporário rejeita o INSERT do perfil apenas para o aluno
  do cenário de falha. O trigger confirma que o usuário já está presente na mesma
  transação e inclui seu UUID na exceção PostgreSQL (`23514`). Uma nova transação
  comprova a ausência desse usuário e perfil, mantendo um cadastro já confirmado.
  O trigger e sua função são removidos em `finally`.
- Dirty checking: oferta, semestre e ponto são atualizados pelo serviço existente,
  sem `save()` adicional. Uma nova transação relê os campos persistidos e confirma
  os mesmos IDs de perfil e usuário e a ausência de registros adicionais.
