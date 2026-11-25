package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.dto.faculdade.AtualizacaoFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.CadastroFaculdadeRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.ReservaService;
import com.maragogi.maragobus.service.FaculdadeService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, ReservaIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservaIntegrationTest {
    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean @Primary RelogioControlado clockReservaTeste() {
            return new RelogioControlado();
        }
    }
    static class RelogioControlado extends Clock {
        private final java.util.concurrent.atomic.AtomicReference<Instant> instante;
        private final ZoneId zona;
        RelogioControlado() { this(new java.util.concurrent.atomic.AtomicReference<>(Instant.parse("2026-10-09T20:00:00Z")), ZoneOffset.UTC); }
        private RelogioControlado(java.util.concurrent.atomic.AtomicReference<Instant> instante, ZoneId zona) {
            this.instante = instante; this.zona = zona;
        }
        void definir(String local) { instante.set(LocalDateTime.parse(local).atZone(ZoneId.of("America/Maceio")).toInstant()); }
        @Override public ZoneId getZone() { return zona; }
        @Override public Clock withZone(ZoneId zone) { return new RelogioControlado(instante, zone); }
        @Override public Instant instant() { return instante.get(); }
    }
    @Autowired RelogioControlado relogio;
    @Autowired ReservaService service;
    @Autowired FaculdadeService faculdadeService;
    @Autowired com.maragogi.maragobus.service.ConsultaReservasMotoristaService consultaMotorista;
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
    private UUID alunoId;
    private UUID pontoId;
    private final LocalDate data = LocalDate.of(2026, 10, 12);

    @BeforeEach
    void preparar() throws Exception {
        relogio.definir("2026-10-09T17:00:00");
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            reservas.deleteAllInBatch(); perfis.deleteAllInBatch(); usuarios.deleteAllInBatch();
            ofertas.deleteAllInBatch(); pontos.deleteAllInBatch(); cursos.deleteAllInBatch(); faculdades.deleteAllInBatch();
            var curso = cursos.save(Curso.builder().nome("Direito").build());
            var faculdade = faculdades.save(Faculdade.builder().nome("Faculdade").build());
            var oferta = ofertas.save(CursoOfertado.builder().curso(curso).faculdade(faculdade)
                    .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            var ponto = pontos.save(PontoEmbarque.builder().nome("Centro").build());
            var aluno = usuarios.save(Usuario.builder().nome("Aluno Teste").cpf("52998224725")
                    .telefone("82999999999").endereco("Rua Teste").email("aluno@example.com")
                    .senha("hash-de-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(oferta).semestreAtual(2)
                    .pontoEmbarquePadrao(ponto).build());
            alunoId = aluno.getId(); pontoId = ponto.getId();
        });
    }

    @Test
    void preservaReservaConfirmadaESeusSnapshotsAoRenomearEDesativarFaculdade() {
        var confirmada = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        UUID faculdadeId = faculdades.findByNome("Faculdade").orElseThrow().getId();
        var ativa = faculdadeService.cadastrar(new CadastroFaculdadeRequest("Faculdade Z"));

        faculdadeService.atualizarDados(faculdadeId, new AtualizacaoFaculdadeRequest("Faculdade A"));
        faculdadeService.desativar(faculdadeId);

        var pagina = PageRequest.of(0, 1, Sort.by("nome", "id"));
        var todas = faculdadeService.listar(pagina, false);
        assertEquals(2, todas.getTotalElements());
        assertEquals(faculdadeId, todas.getContent().getFirst().id());
        assertFalse(todas.getContent().getFirst().ativo());
        assertEquals(ativa, faculdadeService.listar(pagina.next(), false).getContent().getFirst());
        var ativas = faculdadeService.listar(pagina, true);
        assertEquals(1, ativas.getTotalElements());
        assertEquals(ativa, ativas.getContent().getFirst());

        transacao.executeWithoutResult(status -> {
            var reserva = reservas.findById(confirmada.id()).orElseThrow();
            var oferta = perfis.findAll().getFirst().getCursoOfertado();
            assertAll(() -> assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva()),
                    () -> assertNull(reserva.getDataHoraCancelamento()),
                    () -> assertEquals(faculdadeId, reserva.getFaculdadeIdSnapshot()),
                    () -> assertEquals("Faculdade", reserva.getFaculdadeNomeSnapshot()),
                    () -> assertEquals("Direito", reserva.getCursoNomeSnapshot()),
                    () -> assertEquals("Centro", reserva.getPontoEmbarqueNomeSnapshot()),
                    () -> assertEquals(faculdadeId, oferta.getFaculdade().getId()),
                    () -> assertTrue(oferta.isAtivo()));
        });

        faculdadeService.reativar(faculdadeId);
        assertTrue(faculdadeService.buscarPorId(faculdadeId).ativo());
    }

    @Test
    void postgresMantemNomeDaFaculdadeUnicoMesmoQuandoInativa() {
        UUID faculdadeId = faculdades.findByNome("Faculdade").orElseThrow().getId();
        faculdadeService.desativar(faculdadeId);

        var erro = assertThrows(DataIntegrityViolationException.class,
                () -> faculdades.saveAndFlush(Faculdade.builder().nome("Faculdade").build()));
        var causa = assertInstanceOf(SQLException.class, erro.getMostSpecificCause());
        assertEquals("23505", causa.getSQLState());
    }

    @Test
    void devePersistirReservaERejeitarSegundaConfirmadaAposCommit() {
        var resposta = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        transacao.executeWithoutResult(status -> {
            var reserva = reservas.findById(resposta.id()).orElseThrow();
            assertAll(() -> assertEquals(alunoId, reserva.getAluno().getId()),
                    () -> assertEquals(pontoId, reserva.getPontoEmbarque().getId()),
                    () -> assertEquals(data, reserva.getDataUtilizacao()),
                    () -> assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), reserva.getDataHoraReserva()),
                    () -> assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva()),
                    () -> assertNull(reserva.getDataHoraCancelamento()));
        });
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(alunoId, new CriacaoReservaRequest(data)));
        transacao.executeWithoutResult(status -> assertEquals(1, reservas.count()));
    }

    @ParameterizedTest
    @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void devePermitirNovaConfirmadaMantendoCanceladaNoPostgres(StatusReserva cancelada) {
        // Fixture histórica; não implementa um fluxo de cancelamento.
        UUID historicaId = transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow()).pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(data).dataHoraReserva(LocalDateTime.parse("2026-10-09T17:00:00"))
                .statusReserva(cancelada).dataHoraCancelamento(LocalDateTime.parse("2026-10-09T17:00:00")).build()).getId());
        var resposta = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        transacao.executeWithoutResult(status -> {
            assertNotEquals(historicaId, resposta.id());
            assertEquals(2, reservas.count());
            assertEquals(cancelada, reservas.findById(historicaId).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(resposta.id()).orElseThrow().getStatusReserva());
        });
    }

    @Test
    void deveSerializarSolicitacoesConcorrentesNoPostgres() throws Exception {
        var primeiraInserida = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                var resposta = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
                reservas.flush();
                primeiraInserida.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(primeiraInserida.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> service.cadastrar(alunoId, new CriacaoReservaRequest(data)));
                // Comprova espera por lock real no banco, antes de liberar o primeiro commit.
                long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean bloqueada = false;
                while (System.nanoTime() < limite) {
                    bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                            select exists(select 1 from pg_stat_activity
                            where datname = current_database() and pid <> pg_backend_pid()
                            and wait_event_type = 'Lock' and query like '%usuarios%')
                            """, Boolean.class));
                    if (bloqueada) break;
                    Thread.sleep(25);
                }
                assertTrue(bloqueada, "A segunda solicitação deve aguardar o lock do aluno.");
                liberarCommit.countDown();
                assertNotNull(primeira.get(15, TimeUnit.SECONDS));
                var erro = assertThrows(ExecutionException.class, () -> segunda.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
                transacao.executeWithoutResult(status -> assertEquals(1, reservas.count()));
            } finally {
                liberarCommit.countDown();
            }
        }
    }

    @Test
    void devePersistirCancelamentoPreservarHistoricoEPermitirNovaReserva() {
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        var cancelada = service.cancelar(alunoId, original.id());
        assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, cancelada.statusReserva());
        assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), cancelada.dataHoraCancelamento());
        transacao.executeWithoutResult(status -> {
            var persistida = reservas.findById(original.id()).orElseThrow();
            assertAll(() -> assertEquals(original.id(), persistida.getId()),
                    () -> assertEquals(alunoId, persistida.getAluno().getId()),
                    () -> assertEquals(pontoId, persistida.getPontoEmbarque().getId()),
                    () -> assertEquals(data, persistida.getDataUtilizacao()),
                    () -> assertEquals(original.dataHoraReserva(), persistida.getDataHoraReserva()),
                    () -> assertEquals(cancelada.dataHoraCancelamento(), persistida.getDataHoraCancelamento()),
                    () -> assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, persistida.getStatusReserva()),
                    () -> assertEquals(1, reservas.count()));
        });
        var nova = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        transacao.executeWithoutResult(status -> {
            assertEquals(2, reservas.count());
            assertNotEquals(original.id(), nova.id());
            assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, reservas.findById(original.id()).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(nova.id()).orElseThrow().getStatusReserva());
        });
        assertEquals(cancelada, service.cancelar(alunoId, original.id()));
        transacao.executeWithoutResult(status -> assertEquals(cancelada.dataHoraCancelamento(),
                reservas.findById(original.id()).orElseThrow().getDataHoraCancelamento()));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void deveSerializarCancelamentoComOutroCancelamentoOuNovaCriacao(boolean segundaCriacao) throws Exception {
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        var cancelamentoAplicado = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                var resposta = service.cancelar(alunoId, original.id());
                reservas.flush();
                cancelamentoAplicado.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(cancelamentoAplicado.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> segundaCriacao
                        ? service.cadastrar(alunoId, new CriacaoReservaRequest(data))
                        : service.cancelar(alunoId, original.id()));
                long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean bloqueada = false;
                while (System.nanoTime() < limite) {
                    bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                            select exists(select 1 from pg_stat_activity
                            where datname = current_database() and pid <> pg_backend_pid()
                            and wait_event_type = 'Lock' and query like '%usuarios%')
                            """, Boolean.class));
                    if (bloqueada) break;
                    Thread.sleep(25);
                }
                assertTrue(bloqueada, "A segunda operação deve aguardar o mesmo lock do aluno.");
                liberarCommit.countDown();
                var cancelada = primeira.get(15, TimeUnit.SECONDS);
                assertNotNull(cancelada);
                if (segundaCriacao) {
                    var nova = segunda.get(15, TimeUnit.SECONDS);
                    assertNotEquals(original.id(), nova.id());
                    assertEquals(StatusReserva.CONFIRMADA, nova.statusReserva());
                } else {
                    assertEquals(cancelada, segunda.get(15, TimeUnit.SECONDS));
                }
                transacao.executeWithoutResult(status -> {
                    var persistida = reservas.findById(original.id()).orElseThrow();
                    assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, persistida.getStatusReserva());
                    assertEquals(cancelada.dataHoraCancelamento(), persistida.getDataHoraCancelamento());
                    assertEquals(original.dataHoraReserva(), persistida.getDataHoraReserva());
                    assertEquals(data, persistida.getDataUtilizacao());
                    assertEquals(alunoId, persistida.getAluno().getId());
                    assertEquals(pontoId, persistida.getPontoEmbarque().getId());
                    assertEquals(segundaCriacao ? 2 : 1, reservas.count());
                });
            } finally {
                liberarCommit.countDown();
            }
        }
    }

    @Test
    void devePersistirNovoPontoAposCommitPreservandoPerfilEOutraReserva() {
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        UUID novoPonto = novoPonto("Praça");
        UUID outraId = transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow()).pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(data.plusDays(1)).dataHoraReserva(original.dataHoraReserva()).build()).getId());
        var resposta = service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(novoPonto));
        assertEquals(novoPonto, resposta.pontoEmbarqueId());
        assertEquals("Praça", resposta.pontoEmbarqueNome());
        assertEquals(resposta, service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(novoPonto)));
        transacao.executeWithoutResult(status -> {
            var atual = reservas.findById(original.id()).orElseThrow();
            assertEquals(novoPonto, atual.getPontoEmbarque().getId());
            assertEquals(original.id(), atual.getId());
            assertEquals(alunoId, atual.getAluno().getId());
            assertEquals(data, atual.getDataUtilizacao());
            assertEquals(original.dataHoraReserva(), atual.getDataHoraReserva());
            assertEquals(StatusReserva.CONFIRMADA, atual.getStatusReserva());
            assertNull(atual.getDataHoraCancelamento());
            assertEquals(pontoId, perfis.findByUsuarioId(alunoId).orElseThrow().getPontoEmbarquePadrao().getId());
            var outra = reservas.findById(outraId).orElseThrow();
            assertEquals(pontoId, outra.getPontoEmbarque().getId());
            assertEquals(data.plusDays(1), outra.getDataUtilizacao());
            assertEquals(original.dataHoraReserva(), outra.getDataHoraReserva());
            assertEquals(StatusReserva.CONFIRMADA, outra.getStatusReserva());
            assertNull(outra.getDataHoraCancelamento());
            assertEquals(2, reservas.count());
        });
    }

    private UUID novoPonto(String nome) {
        return transacao.execute(status -> pontos.save(PontoEmbarque.builder().nome(nome).build()).getId());
    }

    @ParameterizedTest
    @ValueSource(strings = {"duasAlteracoes", "cancelamentoPrimeiro", "alteracaoPrimeiro"})
    void deveSerializarAlteracoesEntreSiEComCancelamento(String caso) throws Exception {
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        UUID pontoA = novoPonto("Praça A"), pontoB = novoPonto("Praça B");
        var primeiraAplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                var resposta = caso.equals("cancelamentoPrimeiro") ? service.cancelar(alunoId, original.id())
                        : service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(pontoA));
                reservas.flush();
                primeiraAplicada.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(primeiraAplicada.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> caso.equals("alteracaoPrimeiro") ? service.cancelar(alunoId, original.id())
                        : service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(pontoB)));
                long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean bloqueada = false;
                while (System.nanoTime() < limite) {
                    bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                            select exists(select 1 from pg_stat_activity
                            where datname = current_database() and pid <> pg_backend_pid()
                            and wait_event_type = 'Lock' and query like '%usuarios%')
                            """, Boolean.class));
                    if (bloqueada) break;
                    Thread.sleep(25);
                }
                assertTrue(bloqueada, "A segunda operação deve aguardar o lock do aluno antes de carregar a reserva.");
                liberarCommit.countDown();
                assertNotNull(primeira.get(15, TimeUnit.SECONDS));
                if (caso.equals("cancelamentoPrimeiro")) {
                    var erro = assertThrows(ExecutionException.class, () -> segunda.get(15, TimeUnit.SECONDS));
                    assertInstanceOf(RegraNegocioException.class, erro.getCause());
                    assertEquals("Somente reservas confirmadas podem ter o ponto de embarque alterado.", erro.getCause().getMessage());
                } else {
                    assertNotNull(segunda.get(15, TimeUnit.SECONDS));
                }
                transacao.executeWithoutResult(status -> {
                    var atual = reservas.findById(original.id()).orElseThrow();
                    assertEquals(caso.equals("duasAlteracoes") ? pontoB : caso.equals("cancelamentoPrimeiro") ? pontoId : pontoA,
                            atual.getPontoEmbarque().getId());
                    assertEquals(caso.equals("duasAlteracoes") ? StatusReserva.CONFIRMADA : StatusReserva.CANCELADA_PELO_ALUNO,
                            atual.getStatusReserva());
                    assertEquals(caso.equals("duasAlteracoes") ? null : original.dataHoraReserva(), atual.getDataHoraCancelamento());
                    assertEquals(original.dataHoraReserva(), atual.getDataHoraReserva());
                    assertEquals(data, atual.getDataUtilizacao());
                    assertEquals(alunoId, atual.getAluno().getId());
                    assertEquals(pontoId, perfis.findByUsuarioId(alunoId).orElseThrow().getPontoEmbarquePadrao().getId());
                    assertEquals(1, reservas.count());
                });
            } finally { liberarCommit.countDown(); }
        }
    }

    private UUID persistirReservaParaPainel(LocalDate utilizacao, StatusReserva statusReserva) {
        return transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow()).pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(utilizacao).dataHoraReserva(utilizacao.minusDays(1).atTime(17, 0))
                .statusReserva(statusReserva).dataHoraCancelamento(statusReserva == StatusReserva.CONFIRMADA ? null
                        : utilizacao.atTime(9, 0)).build()).getId());
    }

    @Test void deveManterComprovanteAtualAposCriarFuturaEMudarSelecaoNaMeiaNoite() {
        UUID sextaId = persistirReservaParaPainel(data.minusDays(3), StatusReserva.CONFIRMADA);
        var somenteAtual = service.consultarPainel(alunoId);
        assertEquals(sextaId, somenteAtual.reservaAtual().id());
        assertNull(somenteAtual.proximaReserva());
        var segunda = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        relogio.definir("2026-10-09T23:59:59");
        var ambas = service.consultarPainel(alunoId);
        assertEquals(somenteAtual.reservaAtual(), ambas.reservaAtual());
        assertEquals(data, ambas.proximaReserva().dataUtilizacao());
        relogio.definir("2026-10-10T00:00:00");
        var sabado = service.consultarPainel(alunoId);
        assertNull(sabado.reservaAtual()); assertEquals(data, sabado.proximaReserva().dataUtilizacao());
        relogio.definir("2026-10-11T12:00:00");
        assertEquals(sabado, service.consultarPainel(alunoId));
        relogio.definir("2026-10-12T00:00:00");
        var atual = service.consultarPainel(alunoId);
        assertEquals(segunda, atual.reservaAtual()); assertNull(atual.proximaReserva());
        transacao.executeWithoutResult(status -> {
            assertEquals(2, reservas.count());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(sextaId).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(segunda.id()).orElseThrow().getStatusReserva());
        });
    }

    @ParameterizedTest @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void deveExcluirCanceladasDeAmbasPosicoesSemModificarHistorico(StatusReserva statusReserva) {
        UUID hojeId = persistirReservaParaPainel(data.minusDays(3), statusReserva);
        UUID futuraId = persistirReservaParaPainel(data, statusReserva);
        var painel = service.consultarPainel(alunoId);
        assertNull(painel.reservaAtual()); assertNull(painel.proximaReserva());
        transacao.executeWithoutResult(status -> {
            assertEquals(statusReserva, reservas.findById(hojeId).orElseThrow().getStatusReserva());
            assertEquals(statusReserva, reservas.findById(futuraId).orElseThrow().getStatusReserva());
            assertEquals(2, reservas.count());
        });
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveDetectarDuplicadasConfirmadasPersistidasNoPainel(boolean futura) {
        LocalDate utilizacao = futura ? data : data.minusDays(3);
        persistirReservaParaPainel(utilizacao, StatusReserva.CONFIRMADA);
        assertThrows(DataIntegrityViolationException.class,
                () -> persistirReservaParaPainel(utilizacao, StatusReserva.CONFIRMADA));
        transacao.executeWithoutResult(status -> assertEquals(1, reservas.count()));
    }

    @Test void naoDeveBuscarUmaReservaMaisDistanteNemUsarComprovanteNoFimDeSemana() {
        persistirReservaParaPainel(data.plusDays(1), StatusReserva.CONFIRMADA);
        persistirReservaParaPainel(data.minusDays(2), StatusReserva.CONFIRMADA);
        relogio.definir("2026-10-10T12:00:00");
        var painel = service.consultarPainel(alunoId);
        assertNull(painel.reservaAtual()); assertNull(painel.proximaReserva());
    }

    @ParameterizedTest @ValueSource(ints = {0, 1, 2, 3})
    void devePaginarEOrdenarHistoricoNoPostgresSemModificarRegistros(int pagina) {
        UUID futura = persistirReservaParaPainel(data.plusDays(1), StatusReserva.CONFIRMADA);
        UUID antiga = persistirReservaParaPainel(data.minusDays(5), StatusReserva.CONFIRMADA);
        UUID canceladaAluno = persistirReservaParaPainel(data, StatusReserva.CANCELADA_PELO_ALUNO);
        UUID canceladaSuspensao = persistirReservaParaPainel(data, StatusReserva.CANCELADA_POR_SUSPENSAO);
        UUID recente = persistirReservaParaPainel(data, StatusReserva.CONFIRMADA);
        transacao.executeWithoutResult(status -> reservas.findById(recente).orElseThrow()
                .setDataHoraReserva(data.minusDays(1).atTime(18, 0)));
        var desempate = java.util.stream.Stream.of(canceladaAluno, canceladaSuspensao)
                .sorted(java.util.Comparator.comparing(UUID::toString)).toList();
        var esperados = java.util.List.of(futura, recente, desempate.get(0), desempate.get(1), antiga);
        var antes = transacao.execute(status -> jdbc.queryForList("select * from reservas order by id"));
        var resultado = service.consultarHistorico(alunoId, pagina, 2);
        assertEquals(5, resultado.getTotalElements()); assertEquals(3, resultado.getTotalPages());
        assertEquals(pagina, resultado.getNumber()); assertEquals(2, resultado.getSize());
        assertEquals(pagina < 2, resultado.hasNext());
        int inicio = Math.min(pagina * 2, esperados.size());
        assertEquals(esperados.subList(inicio, Math.min(inicio + 2, esperados.size())),
                resultado.getContent().stream().map(r -> r.id()).toList());
        resultado.forEach(r -> {
            assertEquals(alunoId, r.alunoId()); assertEquals(pontoId, r.pontoEmbarqueId());
            assertEquals("Centro", r.pontoEmbarqueNome());
            assertEquals(r.statusReserva() != StatusReserva.CONFIRMADA, r.dataHoraCancelamento() != null);
        });
        var depois = transacao.execute(status -> jdbc.queryForList("select * from reservas order by id"));
        assertEquals(antes, depois);
    }

    @Test void deveIsolarHistoricosDeAlunosDiferentes() {
        UUID original = persistirReservaParaPainel(data, StatusReserva.CANCELADA_PELO_ALUNO);
        UUID outroId = transacao.execute(status -> usuarios.save(Usuario.builder().nome("Outro Aluno")
                .cpf("11144477735").telefone("82988888888").endereco("Rua Outra").email("outro@example.com")
                .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build()).getId());
        UUID outraReserva = transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(outroId).orElseThrow()).pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(data.plusDays(2)).dataHoraReserva(data.atTime(17, 0)).build()).getId());
        var primeiro = service.consultarHistorico(alunoId, 0, null);
        var segundo = service.consultarHistorico(outroId, 0, 50);
        assertEquals(1, primeiro.getTotalElements()); assertEquals(10, primeiro.getSize());
        assertEquals(java.util.List.of(original), primeiro.getContent().stream().map(r -> r.id()).toList());
        assertEquals(1, segundo.getTotalElements()); assertEquals(50, segundo.getSize());
        assertEquals(java.util.List.of(outraReserva), segundo.getContent().stream().map(r -> r.id()).toList());
        assertEquals(outroId, segundo.getContent().getFirst().alunoId());
        transacao.executeWithoutResult(status -> assertEquals(2, reservas.count()));
    }

    @Autowired jakarta.persistence.EntityManagerFactory entityManagerFactory;

    @Test void deveCarregarPontosDistintosSemNMaisUmEContarPaginaCompleta() {
        for (int i = 0; i < 12; i++) {
            UUID embarque = novoPonto("Ponto histórico " + i);
            int deslocamento = i;
            transacao.executeWithoutResult(status -> reservas.save(Reserva.builder()
                    .aluno(usuarios.findById(alunoId).orElseThrow()).pontoEmbarque(pontos.findById(embarque).orElseThrow())
                    .dataUtilizacao(data.plusDays(deslocamento)).dataHoraReserva(data.minusDays(1).atTime(17, 0)).build()));
        }
        var estatisticas = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        boolean habilitado = estatisticas.isStatisticsEnabled();
        estatisticas.setStatisticsEnabled(true); estatisticas.clear();
        try {
            var resposta = service.consultarHistorico(alunoId, 0, 10);
            assertEquals(12, resposta.getTotalElements()); assertEquals(2, resposta.getTotalPages());
            assertEquals(10, resposta.getNumberOfElements()); assertTrue(resposta.hasNext());
            resposta.forEach(r -> assertTrue(r.pontoEmbarqueNome().startsWith("Ponto histórico ")));
            // Usuário, conteúdo paginado com joins e contagem; nenhum SELECT adicional por item.
            assertEquals(3, estatisticas.getPrepareStatementCount());
            assertEquals(0, estatisticas.getEntityFetchCount());
            assertEquals(0, estatisticas.getEntityUpdateCount());
            assertEquals(0, estatisticas.getEntityInsertCount());
            assertEquals(0, estatisticas.getEntityDeleteCount());
        } finally { estatisticas.setStatisticsEnabled(habilitado); }
        transacao.executeWithoutResult(status -> assertEquals(12, reservas.count()));
    }

    @Test void deveRetornarHistoricoVazioNoPostgres() {
        var resultado = service.consultarHistorico(alunoId, 0, null);
        assertTrue(resultado.isEmpty()); assertEquals(0, resultado.getTotalElements());
        assertEquals(0, resultado.getTotalPages()); assertFalse(resultado.hasNext());
    }

    private UUID motoristaParaResumo() {
        return transacao.execute(status -> usuarios.save(Usuario.builder().nome("Motorista Teste")
                .cpf("12345678901").telefone("82977777777").endereco("Rua Motorista")
                .email("motorista@example.com").senha("hash-teste").tipoUsuario(TipoUsuario.MOTORISTA).build()).getId());
    }

    private UUID alunoParaResumo(UUID ofertaId, int numero) {
        return transacao.execute(status -> {
            var aluno = usuarios.save(Usuario.builder().nome("Aluno " + numero).cpf(String.format("%011d", numero))
                    .telefone("82999999999").endereco("Rua Teste").email("aluno" + numero + "@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(ofertas.findById(ofertaId).orElseThrow())
                    .semestreAtual(2).pontoEmbarquePadrao(pontos.findById(pontoId).orElseThrow()).build());
            return aluno.getId();
        });
    }

    private void reservaParaResumo(UUID aluno, UUID embarque, LocalDate utilizacao, StatusReserva estado) {
        transacao.executeWithoutResult(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(aluno).orElseThrow()).pontoEmbarque(pontos.findById(embarque).orElseThrow())
                .dataUtilizacao(utilizacao).dataHoraReserva(utilizacao.minusDays(1).atTime(17, 0))
                .statusReserva(estado).dataHoraCancelamento(estado == StatusReserva.CONFIRMADA ? null : utilizacao.atTime(9, 0)).build()));
    }

    @Test void deveAgregarResumoNoBancoComVinculosInativosSemNMaisUmOuAlteracoes() {
        UUID motorista = motoristaParaResumo();
        UUID ofertaA = transacao.execute(status -> perfis.findByUsuarioId(alunoId).orElseThrow().getCursoOfertado().getId());
        UUID faculdadeA = transacao.execute(status -> {
            var faculdade = ofertas.findById(ofertaA).orElseThrow().getFaculdade();
            faculdade.setNome("Alfa"); return faculdade.getId();
        });
        UUID ofertaB = transacao.execute(status -> ofertas.save(CursoOfertado.builder()
                .curso(ofertas.findById(ofertaA).orElseThrow().getCurso())
                .faculdade(faculdades.save(Faculdade.builder().nome("Beta").build()))
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build()).getId());
        UUID faculdadeB = transacao.execute(status -> ofertas.findById(ofertaB).orElseThrow().getFaculdade().getId());
        UUID bairro = novoPonto("Bairro");
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(bairro));
        reservaParaResumo(alunoParaResumo(ofertaA, 1), pontoId, data, StatusReserva.CONFIRMADA);
        reservaParaResumo(alunoParaResumo(ofertaA, 6), pontoId, data, StatusReserva.CONFIRMADA);
        reservaParaResumo(alunoParaResumo(ofertaB, 2), bairro, data, StatusReserva.CONFIRMADA);
        reservaParaResumo(alunoParaResumo(ofertaB, 3), pontoId, data, StatusReserva.CONFIRMADA);
        reservaParaResumo(alunoParaResumo(ofertaA, 4), pontoId, data, StatusReserva.CANCELADA_PELO_ALUNO);
        reservaParaResumo(alunoParaResumo(ofertaB, 5), bairro, data, StatusReserva.CANCELADA_POR_SUSPENSAO);
        reservaParaResumo(alunoId, pontoId, data.plusDays(1), StatusReserva.CONFIRMADA);
        transacao.executeWithoutResult(status -> {
            faculdades.findAll().forEach(f -> f.setAtivo(false));
            cursos.findAll().forEach(c -> c.setAtivo(false));
            ofertas.findAll().forEach(o -> o.setAtivo(false));
            pontos.findAll().forEach(p -> p.setAtivo(false));
        });
        var antes = transacao.execute(status -> jdbc.queryForList("select * from reservas order by id"));
        var estatisticas = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        boolean habilitado = estatisticas.isStatisticsEnabled();
        estatisticas.setStatisticsEnabled(true); estatisticas.clear();
        try {
            var resposta = consultaMotorista.consultarResumo(motorista, data);
            assertEquals(data, resposta.dataUtilizacao()); assertEquals(5, resposta.totalReservas());
            assertEquals(2, resposta.quantidadeFaculdades());
            assertEquals(java.util.List.of(faculdadeA, faculdadeB), resposta.faculdades().stream().map(f -> f.faculdadeId()).toList());
            assertEquals(java.util.List.of("Alfa", "Beta"), resposta.faculdades().stream().map(f -> f.faculdadeNome()).toList());
            resposta.faculdades().forEach(f -> {
                assertEquals(f.faculdadeId().equals(faculdadeA) ? 3 : 2, f.totalReservas());
                assertEquals(java.util.List.of(bairro, pontoId), f.pontosEmbarque().stream().map(p -> p.pontoEmbarqueId()).toList());
                assertEquals(java.util.List.of("Bairro", "Centro"), f.pontosEmbarque().stream().map(p -> p.pontoEmbarqueNome()).toList());
                f.pontosEmbarque().forEach(p -> assertEquals(
                        f.faculdadeId().equals(faculdadeA) && p.pontoEmbarqueId().equals(pontoId) ? 2 : 1, p.totalReservas()));
            });
            // Apenas motorista e agregação; nenhuma entidade de reserva/perfil é carregada.
            assertEquals(2, estatisticas.getPrepareStatementCount());
            assertEquals(1, estatisticas.getEntityLoadCount()); assertEquals(0, estatisticas.getEntityFetchCount());
            assertEquals(0, estatisticas.getEntityUpdateCount()); assertEquals(0, estatisticas.getEntityInsertCount());
            assertEquals(0, estatisticas.getEntityDeleteCount());
        } finally { estatisticas.setStatisticsEnabled(habilitado); }
        assertEquals(antes, transacao.execute(status -> jdbc.queryForList("select * from reservas order by id")));
        transacao.executeWithoutResult(status -> assertEquals(pontoId,
                perfis.findByUsuarioId(alunoId).orElseThrow().getPontoEmbarquePadrao().getId()));
        var futuro = consultaMotorista.consultarResumo(motorista, data.plusDays(1));
        assertEquals(1, futuro.totalReservas());
        assertEquals(pontoId, futuro.faculdades().getFirst().pontosEmbarque().getFirst().pontoEmbarqueId());
    }

    @Test void deveRefletirFaculdadeAtualDoPerfilSemAlterarReservaHistorica() {
        UUID motorista = motoristaParaResumo();
        UUID reserva = persistirReservaParaPainel(data.minusDays(3), StatusReserva.CONFIRMADA);
        var antes = consultaMotorista.consultarResumo(motorista, data.minusDays(3));
        UUID novaFaculdade = transacao.execute(status -> {
            var perfil = perfis.findByUsuarioId(alunoId).orElseThrow();
            var faculdade = faculdades.save(Faculdade.builder().nome("Outra Faculdade").build());
            var oferta = ofertas.save(CursoOfertado.builder().curso(perfil.getCursoOfertado().getCurso())
                    .faculdade(faculdade).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            perfil.setCursoOfertado(oferta); return faculdade.getId();
        });
        var depois = consultaMotorista.consultarResumo(motorista, data.minusDays(3));
        assertNotEquals(antes.faculdades().getFirst().faculdadeId(), depois.faculdades().getFirst().faculdadeId());
        assertEquals(novaFaculdade, depois.faculdades().getFirst().faculdadeId());
        assertEquals(1, depois.totalReservas());
        transacao.executeWithoutResult(status -> {
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(reserva).orElseThrow().getStatusReserva());
            assertEquals(data.minusDays(3), reservas.findById(reserva).orElseThrow().getDataUtilizacao());
        });
    }

    @Test void deveRetornarResumoVazioParaDataSemConfirmadas() {
        UUID motorista = motoristaParaResumo();
        persistirReservaParaPainel(data, StatusReserva.CANCELADA_PELO_ALUNO);
        persistirReservaParaPainel(data, StatusReserva.CANCELADA_POR_SUSPENSAO);
        var resposta = consultaMotorista.consultarResumo(motorista, data);
        assertEquals(0, resposta.totalReservas()); assertEquals(0, resposta.quantidadeFaculdades());
        assertTrue(resposta.faculdades().isEmpty());
        transacao.executeWithoutResult(status -> assertEquals(2, reservas.count()));
    }

    @Test void deveDetectarReservaSemPerfilEmVezDeOmitirDaContagem() {
        UUID motorista = motoristaParaResumo();
        persistirReservaParaPainel(data, StatusReserva.CONFIRMADA);
        transacao.executeWithoutResult(status -> perfis.deleteAllInBatch());
        assertThrows(RegraNegocioException.class, () -> consultaMotorista.consultarResumo(motorista, data));
        transacao.executeWithoutResult(status -> assertEquals(1, reservas.count()));
    }

    private record DadosPassageiros(UUID motorista, UUID faculdadeA, UUID faculdadeB, UUID bairro,
                                    java.util.List<com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse> esperados) {}

    private DadosPassageiros prepararPassageiros() {
        UUID motorista = motoristaParaResumo();
        UUID ofertaA = transacao.execute(status -> {
            var perfil = perfis.findByUsuarioId(alunoId).orElseThrow();
            perfil.getCursoOfertado().getFaculdade().setNome("Alfa");
            perfil.getUsuario().setNome("Ana"); return perfil.getCursoOfertado().getId();
        });
        UUID faculdadeA = transacao.execute(status -> ofertas.findById(ofertaA).orElseThrow().getFaculdade().getId());
        UUID ofertaB = transacao.execute(status -> ofertas.save(CursoOfertado.builder()
                .curso(ofertas.findById(ofertaA).orElseThrow().getCurso())
                .faculdade(faculdades.save(Faculdade.builder().nome("Beta").build()))
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build()).getId());
        UUID faculdadeB = transacao.execute(status -> ofertas.findById(ofertaB).orElseThrow().getFaculdade().getId());
        UUID bairro = novoPonto("Bairro");
        var original = service.cadastrar(alunoId, new CriacaoReservaRequest(data));
        service.alterarPontoEmbarque(alunoId, original.id(), new AtualizacaoPontoEmbarqueReservaRequest(bairro));
        var esperados = new java.util.ArrayList<com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse>();
        esperados.add(new com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse(original.id(), alunoId, "Ana", data,
                faculdadeA, "Alfa", bairro, "Bairro"));
        // Segunda aluna homônima ("Ana") para validar desempate por ID respeitando a unicidade por aluno/data.
        UUID outraAnaId = alunoParaResumo(ofertaA, 99);
        transacao.executeWithoutResult(status -> usuarios.findById(outraAnaId).orElseThrow().setNome("Ana"));
        UUID segundaAnaReserva = transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(outraAnaId).orElseThrow()).pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(data).dataHoraReserva(original.dataHoraReserva()).build()).getId());
        esperados.add(new com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse(segundaAnaReserva, outraAnaId, "Ana", data,
                faculdadeA, "Alfa", pontoId, "Centro"));
        for (int i = 1; i <= 3; i++) {
            UUID aluno = alunoParaResumo(i == 1 ? ofertaA : ofertaB, i);
            String nome = i == 1 ? "Ana" : i == 2 ? "Bruno" : "Carlos";
            transacao.executeWithoutResult(status -> usuarios.findById(aluno).orElseThrow().setNome(nome));
            UUID embarque = i == 2 ? bairro : pontoId;
            UUID reserva = transacao.execute(status -> reservas.save(Reserva.builder()
                    .aluno(usuarios.findById(aluno).orElseThrow()).pontoEmbarque(pontos.findById(embarque).orElseThrow())
                    .dataUtilizacao(data).dataHoraReserva(original.dataHoraReserva()).build()).getId());
            esperados.add(new com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse(reserva, aluno, nome, data,
                    i == 1 ? faculdadeA : faculdadeB, i == 1 ? "Alfa" : "Beta", embarque, i == 2 ? "Bairro" : "Centro"));
        }
        reservaParaResumo(alunoParaResumo(ofertaA, 4), pontoId, data, StatusReserva.CANCELADA_PELO_ALUNO);
        reservaParaResumo(alunoParaResumo(ofertaB, 5), bairro, data, StatusReserva.CANCELADA_POR_SUSPENSAO);
        reservaParaResumo(alunoId, pontoId, data.plusDays(1), StatusReserva.CONFIRMADA);
        transacao.executeWithoutResult(status -> {
            usuarios.findAll().stream().filter(u -> u.getTipoUsuario() == TipoUsuario.ALUNO).forEach(u -> u.setAtivo(false));
            faculdades.findAll().forEach(f -> f.setAtivo(false)); cursos.findAll().forEach(c -> c.setAtivo(false));
            ofertas.findAll().forEach(o -> o.setAtivo(false)); pontos.findAll().forEach(p -> p.setAtivo(false));
        });
        esperados.sort(java.util.Comparator.comparing(com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse::alunoNome)
                .thenComparing(p -> p.reservaId().toString()));
        return new DadosPassageiros(motorista, faculdadeA, faculdadeB, bairro, java.util.List.copyOf(esperados));
    }

    @ParameterizedTest @ValueSource(strings = {"nenhum", "facA", "facB", "centro", "bairro", "ac", "ab", "bc", "bb", "facAusente", "pontoAusente"})
    void deveFiltrarPassageirosNoPostgresEConferirTotaisComResumo(String filtro) {
        var fixture = prepararPassageiros();
        UUID faculdade = switch (filtro) {
            case "facA", "ac", "ab" -> fixture.faculdadeA();
            case "facB", "bc", "bb" -> fixture.faculdadeB();
            case "facAusente" -> UUID.randomUUID();
            default -> null;
        };
        UUID ponto = switch (filtro) {
            case "centro", "ac", "bc" -> pontoId;
            case "bairro", "ab", "bb" -> fixture.bairro();
            case "pontoAusente" -> UUID.randomUUID();
            default -> null;
        };
        var antes = transacao.execute(status -> jdbc.queryForList("select * from reservas order by id"));
        var resultado = consultaMotorista.consultarPassageirosConfirmados(fixture.motorista(), data, faculdade, ponto, 0, 1);
        var esperados = fixture.esperados().stream().filter(p -> faculdade == null || p.faculdadeId().equals(faculdade))
                .filter(p -> ponto == null || p.pontoEmbarqueId().equals(ponto)).toList();
        assertEquals(esperados.size(), resultado.getTotalElements()); assertEquals(esperados.size(), resultado.getTotalPages());
        assertEquals(esperados.isEmpty() ? java.util.List.of() : java.util.List.of(esperados.getFirst()), resultado.getContent());
        var resumo = consultaMotorista.consultarResumo(fixture.motorista(), data);
        long total = resumo.faculdades().stream().filter(f -> faculdade == null || f.faculdadeId().equals(faculdade))
                .flatMap(f -> f.pontosEmbarque().stream()).filter(p -> ponto == null || p.pontoEmbarqueId().equals(ponto))
                .mapToLong(p -> p.totalReservas()).sum();
        assertEquals(total, resultado.getTotalElements());
        assertEquals(antes, transacao.execute(status -> jdbc.queryForList("select * from reservas order by id")));
    }

    @ParameterizedTest @ValueSource(ints = {0, 1, 2, 3})
    void devePaginarPassageirosComOrdenacaoPorNomeEDesempatePorId(int pagina) {
        var fixture = prepararPassageiros();
        var resultado = consultaMotorista.consultarPassageirosConfirmados(fixture.motorista(), data, null, null, pagina, 2);
        assertEquals(5, resultado.getTotalElements()); assertEquals(3, resultado.getTotalPages());
        assertEquals(pagina < 2, resultado.hasNext());
        int inicio = Math.min(pagina * 2, 5);
        assertEquals(fixture.esperados().subList(inicio, Math.min(inicio + 2, 5)), resultado.getContent());
        var todas = consultaMotorista.consultarPassageirosConfirmados(fixture.motorista(), data, null, null, 0, null);
        assertEquals(10, todas.getSize()); assertEquals(fixture.esperados(), todas.getContent());
        assertEquals(1, todas.stream().filter(p -> p.alunoId().equals(alunoId)).count());
        assertEquals(3, todas.stream().filter(p -> p.alunoNome().equals("Ana")).count());
        var futuro = consultaMotorista.consultarPassageirosConfirmados(fixture.motorista(), data.plusDays(1), null, null, 0, 50);
        assertEquals(1, futuro.getTotalElements()); assertEquals(pontoId, futuro.getContent().getFirst().pontoEmbarqueId());
    }

    @Test void deveProjetarPassageirosSemNMaisUmNemCarregarEntidadesDeAlunoOuReserva() {
        var fixture = prepararPassageiros();
        var estatisticas = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        boolean habilitado = estatisticas.isStatisticsEnabled(); estatisticas.setStatisticsEnabled(true); estatisticas.clear();
        try {
            var resultado = consultaMotorista.consultarPassageirosConfirmados(fixture.motorista(), data, null, null, 0, 2);
            assertEquals(5, resultado.getTotalElements());
            // Motorista, integridade acadêmica, projeção paginada e countQuery.
            assertEquals(4, estatisticas.getPrepareStatementCount()); assertEquals(1, estatisticas.getEntityLoadCount());
            assertEquals(0, estatisticas.getEntityFetchCount()); assertEquals(0, estatisticas.getEntityUpdateCount());
            assertEquals(0, estatisticas.getEntityInsertCount()); assertEquals(0, estatisticas.getEntityDeleteCount());
        } finally { estatisticas.setStatisticsEnabled(habilitado); }
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveRejeitarListagemSemPerfilMesmoComFiltrosOuPaginaVazia(boolean filtrada) {
        UUID motorista = motoristaParaResumo(); persistirReservaParaPainel(data, StatusReserva.CONFIRMADA);
        transacao.executeWithoutResult(status -> perfis.deleteAllInBatch());
        assertThrows(RegraNegocioException.class, () -> consultaMotorista.consultarPassageirosConfirmados(
                motorista, data, filtrada ? UUID.randomUUID() : null, filtrada ? UUID.randomUUID() : null, 10, 10));
        assertThrows(RegraNegocioException.class, () -> consultaMotorista.consultarResumo(motorista, data));
        transacao.executeWithoutResult(status -> assertEquals(1, reservas.count()));
    }
}
