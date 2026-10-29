package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.solicitacaoadvertencia.CriacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.SolicitacaoAdvertenciaService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.EnumSource;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.RecusaSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.*;
import org.springframework.transaction.support.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import javax.sql.DataSource;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, SolicitacaoAdvertenciaIntegrationTest.RelogioTeste.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SolicitacaoAdvertenciaIntegrationTest {
    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioTeste {
        @Bean @Primary Clock clockSolicitacaoTeste() { return Clock.fixed(Instant.parse("2026-10-12T20:15:30Z"), ZoneOffset.UTC); }
    }
    @Autowired SolicitacaoAdvertenciaService service;
    @Autowired com.maragogi.maragobus.service.AnaliseSolicitacaoAdvertenciaService analise;
    @Autowired jakarta.persistence.EntityManagerFactory entityManagerFactory;
    @Autowired SolicitacaoAdvertenciaRepository solicitacoes;
    @Autowired AdvertenciaRepository advertencias;
    @Autowired SuspensaoRepository suspensoes;
    @Autowired UsuarioRepository usuarios;
    @Autowired PerfilAlunoRepository perfis;
    @Autowired ReservaRepository reservas;
    @Autowired CursoRepository cursos;
    @Autowired FaculdadeRepository faculdades;
    @Autowired CursoOfertadoRepository ofertas;
    @Autowired PontoEmbarqueRepository pontos;
    @Autowired PlatformTransactionManager manager;
    @Autowired DataSource dataSource;
    @Autowired PostgreSQLContainer postgres;
    @Autowired JdbcTemplate jdbc;
    private TransactionTemplate transacao;
    private UUID motoristaId;
    private UUID alunoId;

    @BeforeEach void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.executeWithoutResult(status -> {
            suspensoes.deleteAllInBatch(); advertencias.deleteAllInBatch(); solicitacoes.deleteAllInBatch();
            reservas.deleteAllInBatch(); perfis.deleteAllInBatch(); usuarios.deleteAllInBatch();
            ofertas.deleteAllInBatch(); pontos.deleteAllInBatch(); cursos.deleteAllInBatch(); faculdades.deleteAllInBatch();
            var motorista = usuarios.save(Usuario.builder().nome("Motorista").cpf("12345678901").telefone("82977777777")
                    .endereco("Rua Motorista").email("motorista@example.com").senha("hash-teste").tipoUsuario(TipoUsuario.MOTORISTA).build());
            var aluno = usuarios.save(Usuario.builder().nome("Aluno").cpf("52998224725").telefone("82999999999")
                    .endereco("Rua Aluno").email("aluno@example.com").senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var ponto = pontos.save(PontoEmbarque.builder().nome("Centro").build());
            var oferta = ofertas.save(CursoOfertado.builder().curso(cursos.save(Curso.builder().nome("Direito").build()))
                    .faculdade(faculdades.save(Faculdade.builder().nome("Faculdade").build())).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(oferta).semestreAtual(2).pontoEmbarquePadrao(ponto).build());
            reservas.save(Reserva.builder().aluno(aluno).pontoEmbarque(ponto).dataUtilizacao(LocalDate.of(2026, 10, 12))
                    .dataHoraReserva(LocalDateTime.parse("2026-10-09T17:00:00")).build());
            motoristaId = motorista.getId(); alunoId = aluno.getId();
        });
    }

    private List<Object> relacionados() {
        return transacao.execute(status -> List.of(jdbc.queryForList("select * from usuarios order by id"),
                jdbc.queryForList("select * from perfis_aluno order by id"), jdbc.queryForList("select * from reservas order by id")));
    }

    @Test void devePersistirSolicitacaoPendentePreservarVinculosENaoCriarAdvertenciaOuSuspensao() {
        var antes = relacionados();
        var resposta = service.solicitar(motoristaId, new CriacaoSolicitacaoAdvertenciaRequest(alunoId, "  Ocorrência relatada  "));
        transacao.executeWithoutResult(status -> {
            var persistida = solicitacoes.findById(resposta.id()).orElseThrow();
            assertEquals(motoristaId, persistida.getMotoristaSolicitante().getId());
            assertEquals(alunoId, persistida.getAluno().getId());
            assertEquals("Ocorrência relatada", persistida.getDescricao());
            assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), persistida.getDataHoraSolicitacao());
            assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, persistida.getStatus());
            assertNull(persistida.getAdministradorResponsavel()); assertNull(persistida.getDataHoraAnalise());
            assertNull(persistida.getObservacaoAnalise());
            assertEquals(1, solicitacoes.count()); assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count());
        });
        assertEquals(antes, relacionados());
    }

    @Test void devePermitirSolicitacoesRepetidasSemUnicidadeNova() {
        var dados = new CriacaoSolicitacaoAdvertenciaRequest(alunoId, "x".repeat(1000));
        var primeira = service.solicitar(motoristaId, dados); var segunda = service.solicitar(motoristaId, dados);
        assertNotEquals(primeira.id(), segunda.id());
        transacao.executeWithoutResult(status -> {
            assertEquals(2, solicitacoes.count());
            assertEquals(dados.descricao(), solicitacoes.findById(primeira.id()).orElseThrow().getDescricao());
            assertEquals(dados.descricao(), solicitacoes.findById(segunda.id()).orElseThrow().getDescricao());
            assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count());
        });
    }

    @Test void deveRejeitarAlunoInativoSemPersistirOuModificarRelacionados() {
        transacao.executeWithoutResult(status -> usuarios.findById(alunoId).orElseThrow().setAtivo(false));
        var antes = relacionados();
        assertThrows(RegraNegocioException.class, () -> service.solicitar(motoristaId,
                new CriacaoSolicitacaoAdvertenciaRequest(alunoId, "Motivo")));
        transacao.executeWithoutResult(status -> {
            assertEquals(0, solicitacoes.count()); assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count());
        });
        assertEquals(antes, relacionados());
    }

    @Test void deveFazerRollbackRealAposFalhaControladaNaInsercaoDaSolicitacao() {
        var existente = service.solicitar(motoristaId, new CriacaoSolicitacaoAdvertenciaRequest(alunoId, "Anterior"));
        var antes = relacionados();
        // Injeção temporária de falha apenas no PostgreSQL descartável, sem mock de transações.
        jdbc.execute("""
                create function falhar_solicitacao_teste() returns trigger language plpgsql as $$
                begin
                    update usuarios set nome = 'Alteração controlada para rollback' where id = new.aluno_id;
                    raise exception 'FALHA_CONTROLADA_SOLICITACAO' using errcode = '23514';
                    return new;
                end $$
                """);
        try {
            jdbc.execute("create trigger falhar_solicitacao_teste after insert on solicitacoes_advertencia for each row execute function falhar_solicitacao_teste()");
            var erro = assertThrows(DataIntegrityViolationException.class, () -> service.solicitar(motoristaId,
                    new CriacaoSolicitacaoAdvertenciaRequest(alunoId, "Falha controlada")));
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_SOLICITACAO"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_solicitacao_teste on solicitacoes_advertencia");
            jdbc.execute("drop function falhar_solicitacao_teste()");
        }
        transacao.executeWithoutResult(status -> {
            assertEquals(1, solicitacoes.count());
            assertEquals("Anterior", solicitacoes.findById(existente.id()).orElseThrow().getDescricao());
            assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, solicitacoes.findById(existente.id()).orElseThrow().getStatus());
            assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count());
        });
        assertEquals(antes, relacionados());
    }
    private UUID administrador() {
        return transacao.execute(status -> usuarios.save(Usuario.builder().nome("Administrador")
                .cpf("11144477735").telefone("82988888888").endereco("Rua Admin").email("admin@example.com")
                .senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build()).getId());
    }

    private UUID solicitacaoParaConsulta(StatusSolicitacaoAdvertencia estado, LocalDateTime horario) {
        return transacao.execute(status -> solicitacoes.save(SolicitacaoAdvertencia.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow()).motoristaSolicitante(usuarios.findById(motoristaId).orElseThrow())
                .descricao("  Descrição integral\nlinha 2  ").dataHoraSolicitacao(horario).status(estado).build()).getId());
    }

    private List<UUID> prepararPendentesEFinalizadas() {
        UUID antiga = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        UUID empateA = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2026-10-12T09:00:00"));
        UUID empateB = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2026-10-12T09:00:00"));
        UUID posterior = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2026-10-12T10:00:00"));
        UUID futura = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2030-01-01T09:00:00"));
        solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.APROVADA, LocalDateTime.parse("2019-01-01T09:00:00"));
        solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.RECUSADA, LocalDateTime.parse("2019-01-01T09:00:00"));
        transacao.executeWithoutResult(status -> {
            usuarios.findById(alunoId).orElseThrow().setAtivo(false);
            usuarios.findById(motoristaId).orElseThrow().setAtivo(false);
        });
        var empates = java.util.stream.Stream.of(empateA, empateB).sorted(Comparator.comparing(UUID::toString)).toList();
        return List.of(antiga, empates.get(0), empates.get(1), posterior, futura);
    }

    @ParameterizedTest @ValueSource(ints = {0, 1, 2, 3})
    void devePaginarPendentesMaisAntigasComUsuariosInativosSemModificarBanco(int pagina) {
        UUID admin = administrador(); var esperados = prepararPendentesEFinalizadas();
        var antes = relacionados();
        var solicitacoesAntes = transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id"));
        var resultado = analise.consultarPendentes(admin, pagina, 2);
        assertEquals(5, resultado.getTotalElements()); assertEquals(3, resultado.getTotalPages());
        assertEquals(pagina, resultado.getNumber()); assertEquals(2, resultado.getSize()); assertEquals(pagina < 2, resultado.hasNext());
        int inicio = Math.min(pagina * 2, esperados.size());
        assertEquals(esperados.subList(inicio, Math.min(inicio + 2, esperados.size())), resultado.getContent().stream().map(r -> r.id()).toList());
        resultado.forEach(r -> {
            assertEquals(alunoId, r.alunoId()); assertEquals("Aluno", r.alunoNome());
            assertEquals(motoristaId, r.motoristaSolicitanteId()); assertEquals("Motorista", r.motoristaSolicitanteNome());
            assertEquals("  Descrição integral\nlinha 2  ", r.descricao()); assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, r.status());
        });
        var todas = analise.consultarPendentes(admin, 0, null);
        assertEquals(10, todas.getSize()); assertEquals(esperados, todas.stream().map(r -> r.id()).toList());
        assertEquals(LocalDateTime.parse("2020-01-01T09:00:00"), todas.getContent().getFirst().dataHoraSolicitacao());
        assertEquals(LocalDateTime.parse("2030-01-01T09:00:00"), todas.getContent().getLast().dataHoraSolicitacao());
        assertEquals(antes, relacionados());
        assertEquals(solicitacoesAntes, transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id")));
        transacao.executeWithoutResult(status -> { assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count()); });
    }

    @Test void deveRetornarPaginaVaziaQuandoExistiremSomenteFinalizadas() {
        UUID admin = administrador();
        solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.APROVADA, LocalDateTime.parse("2026-10-12T09:00:00"));
        solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.RECUSADA, LocalDateTime.parse("2026-10-12T09:00:00"));
        var resultado = analise.consultarPendentes(admin, 0, 50);
        assertTrue(resultado.isEmpty()); assertEquals(0, resultado.getTotalElements()); assertEquals(0, resultado.getTotalPages());
        assertEquals(50, resultado.getSize()); assertFalse(resultado.hasNext());
        transacao.executeWithoutResult(status -> assertEquals(2, solicitacoes.count()));
    }

    @Test void deveProjetarPendentesSemNMaisUmOuCarregamentoDeEntidadesRelacionadas() {
        UUID admin = administrador(); prepararPendentesEFinalizadas();
        var estatisticas = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        boolean habilitado = estatisticas.isStatisticsEnabled(); estatisticas.setStatisticsEnabled(true); estatisticas.clear();
        try {
            var resultado = analise.consultarPendentes(admin, 0, 2);
            assertEquals(5, resultado.getTotalElements()); assertEquals(2, resultado.getNumberOfElements());
            // Administrador, projeção paginada e countQuery: não carrega solicitações, aluno ou motorista como entidades.
            assertEquals(3, estatisticas.getPrepareStatementCount()); assertEquals(1, estatisticas.getEntityLoadCount());
            assertEquals(0, estatisticas.getEntityFetchCount()); assertEquals(0, estatisticas.getEntityUpdateCount());
            assertEquals(0, estatisticas.getEntityInsertCount()); assertEquals(0, estatisticas.getEntityDeleteCount());
        } finally { estatisticas.setStatisticsEnabled(habilitado); }
    }
    private UUID outroAdministrador() {
        return transacao.execute(status -> usuarios.save(Usuario.builder().nome("Outro Administrador")
                .cpf("98765432100").telefone("82988888888").endereco("Rua Admin 2").email("admin2@example.com")
                .senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build()).getId());
    }

    private void conferirRecusa(UUID id, UUID admin, String observacao) {
        transacao.executeWithoutResult(status -> {
            var s = solicitacoes.findById(id).orElseThrow();
            assertEquals(id, s.getId()); assertEquals(StatusSolicitacaoAdvertencia.RECUSADA, s.getStatus());
            assertEquals(admin, s.getAdministradorResponsavel().getId());
            assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), s.getDataHoraAnalise());
            assertEquals(observacao, s.getObservacaoAnalise());
            assertEquals(alunoId, s.getAluno().getId()); assertEquals(motoristaId, s.getMotoristaSolicitante().getId());
            assertEquals("  Descrição integral\nlinha 2  ", s.getDescricao());
            assertEquals(LocalDateTime.parse("2020-01-01T09:00:00"), s.getDataHoraSolicitacao());
            assertEquals(1, solicitacoes.count()); assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count());
        });
    }

    @Test void devePersistirRecusaComUsuariosHistoricosInativosERemoverSomenteDaConsultaDePendentes() {
        UUID admin = administrador();
        UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        transacao.executeWithoutResult(status -> {
            usuarios.findById(alunoId).orElseThrow().setAtivo(false); usuarios.findById(motoristaId).orElseThrow().setAtivo(false);
        });
        var antes = relacionados(); assertEquals(1, analise.consultarPendentes(admin, 0, null).getTotalElements());
        var resposta = analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("  Justificativa da recusa  "));
        assertEquals(id, resposta.id()); assertEquals(StatusSolicitacaoAdvertencia.RECUSADA, resposta.status());
        assertEquals(admin, resposta.administradorResponsavelId());
        assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), resposta.dataHoraAnalise());
        assertEquals("Justificativa da recusa", resposta.observacaoAnalise());
        conferirRecusa(id, admin, "Justificativa da recusa");
        assertTrue(analise.consultarPendentes(admin, 0, null).isEmpty());
        assertThrows(RegraNegocioException.class, () -> analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Sobrescrita")));
        conferirRecusa(id, admin, "Justificativa da recusa"); assertEquals(antes, relacionados());
    }

    @ParameterizedTest @EnumSource(value = StatusSolicitacaoAdvertencia.class, names = {"APROVADA", "RECUSADA"})
    void devePreservarDecisoesAnterioresAoRejeitarRecusa(StatusSolicitacaoAdvertencia estado) {
        UUID admin = administrador(); UUID outro = outroAdministrador();
        UUID id = solicitacaoParaConsulta(estado, LocalDateTime.parse("2020-01-01T09:00:00"));
        transacao.executeWithoutResult(status -> {
            var s = solicitacoes.findById(id).orElseThrow(); s.setAdministradorResponsavel(usuarios.findById(outro).orElseThrow());
            s.setDataHoraAnalise(LocalDateTime.parse("2021-01-01T09:00:00")); s.setObservacaoAnalise("Decisão anterior");
        });
        var antes = transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id"));
        assertThrows(RegraNegocioException.class, () -> analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Nova decisão")));
        assertEquals(antes, transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id")));
    }

    @Test void deveSerializarDuasRecusasERejeitarSegundaSemSobrescreverPrimeira() throws Exception {
        UUID admin = administrador(); UUID outro = outroAdministrador();
        UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        var antes = relacionados(); var primeiraAplicada = new CountDownLatch(1); var liberarCommit = new CountDownLatch(1);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                var resposta = analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Primeira decisão"));
                solicitacoes.flush(); primeiraAplicada.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(primeiraAplicada.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> analise.recusar(outro, id, new RecusaSolicitacaoAdvertenciaRequest("Segunda decisão")));
                long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5); boolean bloqueada = false;
                while (System.nanoTime() < limite) {
                    bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                            select exists(select 1 from pg_stat_activity
                            where datname = current_database() and pid <> pg_backend_pid()
                            and wait_event_type = 'Lock' and query like '%solicitacoes_advertencia%')
                            """, Boolean.class));
                    if (bloqueada) break;
                    Thread.sleep(25);
                }
                assertTrue(bloqueada, "A segunda recusa deve aguardar o lock da solicitação.");
                liberarCommit.countDown(); assertNotNull(primeira.get(15, TimeUnit.SECONDS));
                var erro = assertThrows(ExecutionException.class, () -> segunda.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
                assertEquals("Somente solicitações pendentes podem ser recusadas.", erro.getCause().getMessage());
                conferirRecusa(id, admin, "Primeira decisão"); assertEquals(antes, relacionados());
            } finally { liberarCommit.countDown(); }
        }
    }

    @Test void deveFazerRollbackAtomicoDaRecusaEmFalhaRealDePersistencia() {
        UUID admin = administrador();
        UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        var relacionadosAntes = relacionados();
        var antes = transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id"));
        // Falha temporária no container descartável: não altera o esquema da aplicação.
        jdbc.execute("""
                create function falhar_recusa_teste() returns trigger language plpgsql as $$
                begin
                    update usuarios set nome = 'Alteração controlada para rollback' where id = new.aluno_id;
                    raise exception 'FALHA_CONTROLADA_RECUSA' using errcode = '23514';
                    return new;
                end $$
                """);
        try {
            jdbc.execute("create trigger falhar_recusa_teste after update on solicitacoes_advertencia for each row execute function falhar_recusa_teste()");
            var erro = assertThrows(DataIntegrityViolationException.class, () -> analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Recusa")));
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_RECUSA"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_recusa_teste on solicitacoes_advertencia");
            jdbc.execute("drop function falhar_recusa_teste()");
        }
        assertEquals(antes, transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id")));
        assertEquals(relacionadosAntes, relacionados());
        transacao.executeWithoutResult(status -> { assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count()); });
        assertEquals(1, analise.consultarPendentes(admin, 0, null).getTotalElements());
    }
    private void conferirAprovacao(UUID id, UUID admin, String observacao) {
        transacao.executeWithoutResult(status -> {
            var s = solicitacoes.findById(id).orElseThrow();
            assertEquals(StatusSolicitacaoAdvertencia.APROVADA, s.getStatus()); assertEquals(admin, s.getAdministradorResponsavel().getId());
            assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), s.getDataHoraAnalise()); assertEquals(observacao, s.getObservacaoAnalise());
            assertEquals(alunoId, s.getAluno().getId()); assertEquals(motoristaId, s.getMotoristaSolicitante().getId());
            assertEquals("  Descrição integral\nlinha 2  ", s.getDescricao());
            assertEquals(LocalDateTime.parse("2020-01-01T09:00:00"), s.getDataHoraSolicitacao());
            assertEquals(1, solicitacoes.count()); assertEquals(1, advertencias.count()); assertEquals(0, suspensoes.count());
            var a = advertencias.findAll().getFirst(); assertEquals(id, a.getSolicitacaoAdvertencia().getId());
            assertNotEquals(id, a.getId());
        });
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveAprovarECriarAdvertenciaAposCommitComObservacaoOpcional(boolean comObservacao) {
        UUID admin = administrador(); UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        transacao.executeWithoutResult(status -> {
            usuarios.findById(alunoId).orElseThrow().setAtivo(false); usuarios.findById(motoristaId).orElseThrow().setAtivo(false);
        });
        var antes = relacionados();
        var resposta = analise.aprovar(admin, id, new AprovacaoSolicitacaoAdvertenciaRequest(comObservacao ? "  Observação aprovada  " : null));
        String observacao = comObservacao ? "Observação aprovada" : null;
        assertEquals(id, resposta.id()); assertEquals(StatusSolicitacaoAdvertencia.APROVADA, resposta.status());
        assertEquals(admin, resposta.administradorResponsavelId()); assertEquals(observacao, resposta.observacaoAnalise());
        assertEquals(LocalDateTime.parse("2026-10-12T17:15:30"), resposta.dataHoraAnalise()); assertNotNull(resposta.advertenciaId());
        conferirAprovacao(id, admin, observacao);
        transacao.executeWithoutResult(status -> assertEquals(id, advertencias.findById(resposta.advertenciaId()).orElseThrow().getSolicitacaoAdvertencia().getId()));
        assertTrue(analise.consultarPendentes(admin, 0, null).isEmpty());
        assertThrows(RegraNegocioException.class, () -> analise.aprovar(admin, id, new AprovacaoSolicitacaoAdvertenciaRequest("Outra aprovação")));
        assertThrows(RegraNegocioException.class, () -> analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Recusa tardia")));
        conferirAprovacao(id, admin, observacao); assertEquals(antes, relacionados());
    }

    @ParameterizedTest @ValueSource(strings = {"advertencia", "solicitacao"})
    void deveFazerRollbackDeTodaAprovacaoQuandoPersistenciaFalhar(String etapa) {
        UUID admin = administrador(); UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        var relacionadosAntes = relacionados(); var antes = transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id"));
        if (etapa.equals("advertencia")) {
            jdbc.execute("""
                    create function falhar_aprovacao_teste() returns trigger language plpgsql as $$
                    begin
                        raise exception 'FALHA_CONTROLADA_APROVACAO_ADVERTENCIA' using errcode = '23514';
                        return new;
                    end $$
                    """);
        } else {
            jdbc.execute("""
                    create function falhar_aprovacao_teste() returns trigger language plpgsql as $$
                    begin
                        if not exists(select 1 from advertencias where solicitacao_advertencia_id = new.id) then
                            raise exception 'ADVERTENCIA_NAO_INSERIDA_NA_TRANSACAO';
                        end if;
                        raise exception 'FALHA_CONTROLADA_APROVACAO_SOLICITACAO' using errcode = '23514';
                        return new;
                    end $$
                    """);
        }
        // Injeção de falha somente no container descartável, sem substituir o gerenciador transacional.
        String tabela = etapa.equals("advertencia") ? "advertencias" : "solicitacoes_advertencia";
        try {
            jdbc.execute("create trigger falhar_aprovacao_teste after " + (etapa.equals("advertencia") ? "insert" : "update")
                    + " on " + tabela + " for each row execute function falhar_aprovacao_teste()");
            var erro = assertThrows(DataIntegrityViolationException.class, () -> analise.aprovar(admin, id, new AprovacaoSolicitacaoAdvertenciaRequest("Análise")));
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_APROVACAO"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_aprovacao_teste on " + tabela); jdbc.execute("drop function falhar_aprovacao_teste()");
        }
        assertEquals(antes, transacao.execute(status -> jdbc.queryForList("select * from solicitacoes_advertencia order by id")));
        assertEquals(relacionadosAntes, relacionados());
        transacao.executeWithoutResult(status -> { assertEquals(0, advertencias.count()); assertEquals(0, suspensoes.count()); });
        assertEquals(1, analise.consultarPendentes(admin, 0, null).getTotalElements());
    }

    @ParameterizedTest @ValueSource(strings = {"duasAprovacoes", "aprovacaoPrimeiro", "recusaPrimeiro"})
    void deveSerializarAprovacaoComAprovacaoOuRecusa(String caso) throws Exception {
        UUID admin = administrador(); UUID outro = outroAdministrador();
        UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        var antes = relacionados(); var primeiraAplicada = new CountDownLatch(1); var liberarCommit = new CountDownLatch(1);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                if (caso.equals("recusaPrimeiro")) analise.recusar(admin, id, new RecusaSolicitacaoAdvertenciaRequest("Primeira decisão"));
                else analise.aprovar(admin, id, new AprovacaoSolicitacaoAdvertenciaRequest("Primeira decisão"));
                solicitacoes.flush(); primeiraAplicada.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return id;
            }));
            try {
                assertTrue(primeiraAplicada.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> {
                    if (caso.equals("aprovacaoPrimeiro")) analise.recusar(outro, id, new RecusaSolicitacaoAdvertenciaRequest("Segunda decisão"));
                    else analise.aprovar(outro, id, new AprovacaoSolicitacaoAdvertenciaRequest("Segunda decisão"));
                    return id;
                });
                long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5); boolean bloqueada = false;
                while (System.nanoTime() < limite) {
                    bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                            select exists(select 1 from pg_stat_activity
                            where datname = current_database() and pid <> pg_backend_pid()
                            and wait_event_type = 'Lock' and query like '%solicitacoes_advertencia%')
                            """, Boolean.class));
                    if (bloqueada) break;
                    Thread.sleep(25);
                }
                assertTrue(bloqueada, "A segunda decisão deve aguardar o mesmo lock da solicitação.");
                liberarCommit.countDown(); assertEquals(id, primeira.get(15, TimeUnit.SECONDS));
                var erro = assertThrows(ExecutionException.class, () -> segunda.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
                assertEquals(caso.equals("aprovacaoPrimeiro") ? "Somente solicitações pendentes podem ser recusadas."
                        : "Somente solicitações pendentes podem ser aprovadas.", erro.getCause().getMessage());
                if (caso.equals("recusaPrimeiro")) conferirRecusa(id, admin, "Primeira decisão");
                else conferirAprovacao(id, admin, "Primeira decisão");
                assertEquals(antes, relacionados());
            } finally { liberarCommit.countDown(); }
        }
    }

    @Test void deveManterRestricaoUnicaContraAdvertenciaDuplicadaMesmoForaDoServico() {
        UUID admin = administrador(); UUID id = solicitacaoParaConsulta(StatusSolicitacaoAdvertencia.PENDENTE, LocalDateTime.parse("2020-01-01T09:00:00"));
        var resposta = analise.aprovar(admin, id, new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var erro = assertThrows(DataIntegrityViolationException.class, () -> transacao.executeWithoutResult(status ->
                advertencias.saveAndFlush(Advertencia.builder().solicitacaoAdvertencia(solicitacoes.findById(id).orElseThrow()).build())));
        assertEquals("23505", ((java.sql.SQLException) erro.getMostSpecificCause()).getSQLState());
        conferirAprovacao(id, admin, null);
        transacao.executeWithoutResult(status -> assertTrue(advertencias.findById(resposta.advertenciaId()).isPresent()));
    }
}
