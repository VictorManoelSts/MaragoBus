package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.suspensao.DefinicaoDuracaoSuspensaoRequest;
import com.maragogi.maragobus.dto.suspensao.SuspensaoResponse;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.AnaliseSolicitacaoAdvertenciaService;
import com.maragogi.maragobus.service.ReservaService;
import com.maragogi.maragobus.service.SuspensaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, SuspensaoIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class SuspensaoIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockSuspensaoTeste() {
            return new RelogioControlado();
        }
    }

    static class RelogioControlado extends Clock {
        private final AtomicReference<Instant> instante;
        private final ZoneId zona;

        RelogioControlado() {
            this(new AtomicReference<>(LocalDateTime.of(2026, 10, 7, 9, 30)
                    .atZone(ZoneId.of("America/Maceio")).toInstant()), ZoneOffset.UTC);
        }

        private RelogioControlado(AtomicReference<Instant> instante, ZoneId zona) {
            this.instante = instante;
            this.zona = zona;
        }

        void definir(String local) {
            instante.set(LocalDateTime.parse(local).atZone(ZoneId.of("America/Maceio")).toInstant());
        }

        @Override public ZoneId getZone() { return zona; }
        @Override public Clock withZone(ZoneId zone) { return new RelogioControlado(instante, zone); }
        @Override public Instant instant() { return instante.get(); }
    }

    @Autowired RelogioControlado relogio;
    @Autowired AnaliseSolicitacaoAdvertenciaService analiseService;
    @Autowired SuspensaoService suspensaoService;
    @Autowired ReservaService reservaService;
    @Autowired SuspensaoRepository suspensoes;
    @Autowired AdvertenciaRepository advertencias;
    @Autowired SolicitacaoAdvertenciaRepository solicitacoes;
    @Autowired ReservaRepository reservas;
    @Autowired EventoReservaRepository eventos;
    @Autowired PerfilAlunoRepository perfis;
    @Autowired UsuarioRepository usuarios;
    @Autowired CursoOfertadoRepository ofertas;
    @Autowired PontoEmbarqueRepository pontos;
    @Autowired CursoRepository cursos;
    @Autowired FaculdadeRepository faculdades;
    @Autowired PlatformTransactionManager manager;
    @Autowired DataSource dataSource;
    @Autowired PostgreSQLContainer postgres;
    @Autowired JdbcTemplate jdbc;

    private TransactionTemplate transacao;
    private UUID adminId;
    private UUID motoristaId;
    private UUID alunoId;
    private UUID pontoId;

    @BeforeEach
    void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        relogio.definir("2026-10-07T09:30:00");
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            jdbc.execute("truncate table eventos_reserva");
            jdbc.update("update advertencias set suspensao_id = null where suspensao_id is not null");
            suspensoes.deleteAllInBatch();
            advertencias.deleteAllInBatch();
            solicitacoes.deleteAllInBatch();
            reservas.deleteAllInBatch();
            perfis.deleteAllInBatch();
            usuarios.deleteAllInBatch();
            ofertas.deleteAllInBatch();
            pontos.deleteAllInBatch();
            cursos.deleteAllInBatch();
            faculdades.deleteAllInBatch();

            var admin = usuarios.save(Usuario.builder().nome("Admin Teste").cpf("11144477735")
                    .telefone("82988888888").endereco("Rua Admin").email("admin@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build());
            var motorista = usuarios.save(Usuario.builder().nome("Motorista Teste").cpf("12345678901")
                    .telefone("82977777777").endereco("Rua Motorista").email("motorista@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.MOTORISTA).build());
            var aluno = usuarios.save(Usuario.builder().nome("Aluno Teste").cpf("52998224725")
                    .telefone("82999999999").endereco("Rua Aluno").email("aluno@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var ponto = pontos.save(PontoEmbarque.builder().nome("Centro").build());
            var oferta = ofertas.save(CursoOfertado.builder()
                    .curso(cursos.save(Curso.builder().nome("Direito").build()))
                    .faculdade(faculdades.save(Faculdade.builder().nome("Faculdade").build()))
                    .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(oferta)
                    .semestreAtual(4).pontoEmbarquePadrao(ponto).build());

            adminId = admin.getId();
            motoristaId = motorista.getId();
            alunoId = aluno.getId();
            pontoId = ponto.getId();
        });
    }

    private UUID novaSolicitacaoPendente(String descricao) {
        return transacao.execute(status -> solicitacoes.save(SolicitacaoAdvertencia.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow())
                .motoristaSolicitante(usuarios.findById(motoristaId).orElseThrow())
                .descricao(descricao)
                .dataHoraSolicitacao(LocalDateTime.now(relogio.withZone(ZoneId.of("America/Maceio"))))
                .status(StatusSolicitacaoAdvertencia.PENDENTE)
                .build()).getId());
    }

    private UUID criarReservaConfirmada(LocalDate dataUtilizacao) {
        return transacao.execute(status -> reservas.save(Reserva.builder()
                .aluno(usuarios.findById(alunoId).orElseThrow())
                .pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                .dataUtilizacao(dataUtilizacao)
                .dataHoraReserva(dataUtilizacao.minusDays(1).atTime(18, 0))
                .statusReserva(StatusReserva.CONFIRMADA)
                .build()).getId());
    }

    @Test
    void terceiraAprovacaoVinculaAdvertenciasSemCancelarEDecisaoPreservaReservasDoDia() {
        LocalDate quarta = LocalDate.of(2026, 10, 7);
        LocalDate quinta = quarta.plusDays(1);
        UUID reservaQuarta = criarReservaConfirmada(quarta);
        UUID reservaQuinta = criarReservaConfirmada(quinta);
        UUID pendencia = aprovarCiclo();

        transacao.executeWithoutResult(status -> {
            assertEquals(3, advertencias.count());
            assertEquals(1, suspensoes.count());
            for (var advertencia : advertencias.findAll()) {
                assertEquals(pendencia, advertencia.getSuspensao().getId());
            }
            var suspensao = suspensoes.findById(pendencia).orElseThrow();
            assertEquals(StatusSuspensao.PENDENTE_DURACAO, suspensao.getStatus());
            assertNull(suspensao.getDuracao());
            assertNull(suspensao.getDataInicio());
            assertNull(suspensao.getAdministradorResponsavel());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(reservaQuarta).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(reservaQuinta).orElseThrow().getStatusReserva());
            assertEquals(0, eventos.count());
        });
        var pendentes = suspensaoService.consultarPorAluno(adminId, alunoId, 0, 10);
        assertEquals(StatusSuspensao.PENDENTE_DURACAO, pendentes.getContent().getFirst().status());
        assertFalse(pendentes.getContent().getFirst().vigente());

        relogio.definir("2026-10-07T10:00:00");
        var aplicada = aplicar(pendencia, 1);

        assertEquals(StatusSuspensao.APLICADA, aplicada.status());
        assertEquals(quinta, aplicada.dataInicio());
        assertEquals(quinta, aplicada.dataFim());
        assertEquals(adminId, aplicada.administradorResponsavelId());
        assertEquals("Reincidência", aplicada.justificativa());
        assertEquals(quarta.atTime(10, 0), aplicada.dataHoraAplicacao());

        var preservada = reservas.findById(reservaQuarta).orElseThrow();
        assertEquals(StatusReserva.CONFIRMADA, preservada.getStatusReserva());
        assertNull(preservada.getDataHoraCancelamento());
        assertTrue(eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaQuarta).isEmpty());

        var cancelada = reservas.findById(reservaQuinta).orElseThrow();
        assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, cancelada.getStatusReserva());
        var historico = eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaQuinta);
        assertEquals(1, historico.size());
        var evento = historico.getFirst();
        assertEquals(TipoEventoReserva.CANCELAMENTO_POR_SUSPENSAO, evento.getTipoEvento());
        assertEquals(StatusReserva.CONFIRMADA, evento.getStatusAnterior());
        assertEquals(cancelada.getStatusReserva(), evento.getStatusNovo());
        assertEquals(aplicada.dataHoraAplicacao(), evento.getDataHoraEvento());
        assertEquals(adminId, evento.getAutorId());
        assertEquals("Reincidência", evento.getMotivo());
    }

    @Test
    void devePreservarReservaDoDiaECancelarFuturaQuandoSuspensoAposAs11() {
        // Quarta-feira 07/10/2026 às 18:00 (após as 11:00)
        relogio.definir("2026-10-07T18:00:00");
        LocalDate quarta = LocalDate.of(2026, 10, 7);
        LocalDate quinta = LocalDate.of(2026, 10, 8);

        UUID reservaQuartaId = criarReservaConfirmada(quarta);
        UUID reservaQuintaId = criarReservaConfirmada(quinta);

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r3 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 3"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        aplicar(r3.suspensaoId(), 1);
        assertNotNull(r3.suspensaoId());

        transacao.executeWithoutResult(status -> {
            var suspensao = suspensoes.findById(r3.suspensaoId()).orElseThrow();
            assertEquals(DuracaoSuspensao.UM_DIA, suspensao.getDuracao());
            assertEquals(quinta, suspensao.getDataInicio());
            assertEquals(quinta, suspensao.getDataFim());

            // Quarta-feira preservada (garante retorno do aluno)
            var reservaQuarta = reservas.findById(reservaQuartaId).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, reservaQuarta.getStatusReserva());
            assertNull(reservaQuarta.getDataHoraCancelamento());

            // Quinta-feira cancelada automaticamente por suspensão
            var reservaQuinta = reservas.findById(reservaQuintaId).orElseThrow();
            assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservaQuinta.getStatusReserva());
            assertEquals(LocalDateTime.of(2026, 10, 7, 18, 0), reservaQuinta.getDataHoraCancelamento());
        });

        // Nova tentativa para quinta fica bloqueada
        assertThrows(RegraNegocioException.class,
                () -> reservaService.cadastrar(alunoId, new CriacaoReservaRequest(quinta)));
    }

    @Test
    void deveAplicarDuracoesEscolhidasEmCadaCicloPulandoFimDeSemanaEConsultarVigencia() {
        relogio.definir("2026-10-06T09:00:00");
        aplicar(aprovarCiclo(), 1);

        relogio.definir("2026-10-07T10:00:00");
        UUID reservaSegundaId = criarReservaConfirmada(LocalDate.of(2026, 10, 12));
        UUID reservaTercaId = criarReservaConfirmada(LocalDate.of(2026, 10, 13));

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 4"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 5"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r6 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 6"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        aplicar(r6.suspensaoId(), 3);
        assertNotNull(r6.suspensaoId());

        transacao.executeWithoutResult(status -> {
            var s2 = suspensoes.findById(r6.suspensaoId()).orElseThrow();
            assertEquals(DuracaoSuspensao.TRES_DIAS, s2.getDuracao());
            assertEquals(LocalDate.of(2026, 10, 8), s2.getDataInicio());
            assertEquals(LocalDate.of(2026, 10, 12), s2.getDataFim());

            assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservas.findById(reservaSegundaId).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(reservaTercaId).orElseThrow().getStatusReserva());
        });

        // Segunda 12/10 bloqueada (último dia da suspensão de 3 dias)
        relogio.definir("2026-10-12T08:00:00");
        assertThrows(RegraNegocioException.class,
                () -> reservaService.cadastrar(alunoId, new CriacaoReservaRequest(LocalDate.of(2026, 10, 12))));

        // Ciclo 3: 9ª advertência na quarta 14/10 às 10:00 -> 5 dias úteis: Qua(14), Qui(15), Sex(16), Seg(19), Ter(20)
        relogio.definir("2026-10-13T10:00:00");
        UUID reservaUltimoDiaId = criarReservaConfirmada(LocalDate.of(2026, 10, 20));
        UUID reservaAposSuspensaoId = criarReservaConfirmada(LocalDate.of(2026, 10, 21));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 7"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 8"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r9 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 9"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        aplicar(r9.suspensaoId(), 5);
        assertNotNull(r9.suspensaoId());

        transacao.executeWithoutResult(status -> {
            assertEquals(9, advertencias.count());
            assertEquals(3, suspensoes.count());
            var s3 = suspensoes.findById(r9.suspensaoId()).orElseThrow();
            assertEquals(DuracaoSuspensao.CINCO_DIAS, s3.getDuracao());
            assertEquals(LocalDate.of(2026, 10, 14), s3.getDataInicio());
            assertEquals(LocalDate.of(2026, 10, 20), s3.getDataFim());
            assertEquals(adminId, s3.getAdministradorResponsavel().getId());
            assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO,
                    reservas.findById(reservaUltimoDiaId).orElseThrow().getStatusReserva());
            assertEquals(StatusReserva.CONFIRMADA,
                    reservas.findById(reservaAposSuspensaoId).orElseThrow().getStatusReserva());
        });

        relogio.definir("2026-10-14T10:00:00");
        // Consultas administrativas em 14/10/2026: 3 históricas, apenas 1 vigente
        var historicoAluno = suspensaoService.consultarPorAluno(adminId, alunoId, 0, 10);
        assertEquals(3, historicoAluno.getTotalElements());
        assertEquals(1, historicoAluno.getContent().stream().filter(s -> s.vigente()).count());

        var somenteVigentes = suspensaoService.consultarTodas(adminId, true, 0, 10);
        assertEquals(1, somenteVigentes.getTotalElements());
        assertEquals(r9.suspensaoId(), somenteVigentes.getContent().getFirst().id());
        assertTrue(somenteVigentes.getContent().getFirst().vigente());
    }

    @Test
    void deveRejeitarDuracaoInvalidaEImpedirSobreposicaoMantendoPendencia() {
        UUID primeira = aprovarCiclo();
        UUID segunda = aprovarCiclo();

        assertThrows(RegraNegocioException.class, () -> aplicar(primeira, 2));
        assertThrows(RegraNegocioException.class, () -> suspensaoService.definirDuracao(
                alunoId, primeira, new DefinicaoDuracaoSuspensaoRequest(1, "Reincidência")));
        assertEquals(StatusSuspensao.PENDENTE_DURACAO, suspensoes.findById(primeira).orElseThrow().getStatus());

        aplicar(primeira, 3);
        assertThrows(RegraNegocioException.class, () -> aplicar(segunda, 1));
        transacao.executeWithoutResult(status -> {
            var pendencia = suspensoes.findById(segunda).orElseThrow();
            assertEquals(StatusSuspensao.PENDENTE_DURACAO, pendencia.getStatus());
            assertNull(pendencia.getDuracao());
            assertNull(pendencia.getDataHoraAplicacao());
            assertEquals(3, advertencias.findAll().stream()
                    .filter(a -> segunda.equals(a.getSuspensao().getId())).count());
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"suspensoes", "eventos_reserva"})
    void deveFazerRollbackAtomicoQuandoPersistenciaDaSuspensaoOuDoEventoFalharNoPostgres(String tabela) {
        UUID reservaId = criarReservaConfirmada(LocalDate.of(2026, 10, 8));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        UUID terceiraSolicitacaoId = novaSolicitacaoPendente("Adv 3");
        boolean falhaNaAprovacao = tabela.equals("suspensoes");
        UUID pendencia = falhaNaAprovacao ? null : analiseService.aprovar(adminId, terceiraSolicitacaoId,
                new AprovacaoSolicitacaoAdvertenciaRequest(null)).suspensaoId();

        jdbc.execute("""
                create function falhar_suspensao_teste() returns trigger language plpgsql as $$
                begin
                    raise exception 'FALHA_CONTROLADA_SUSPENSAO' using errcode = '23514';
                    return new;
                end $$
                """);
        try {
            jdbc.execute("create trigger falhar_suspensao_teste after insert on " + tabela
                    + " for each row execute function falhar_suspensao_teste()");
            var erro = assertThrows(DataIntegrityViolationException.class,
                    () -> {
                        if (falhaNaAprovacao) {
                            analiseService.aprovar(adminId, terceiraSolicitacaoId,
                                    new AprovacaoSolicitacaoAdvertenciaRequest("Falha"));
                        } else {
                            aplicar(pendencia, 1);
                        }
                    });
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_SUSPENSAO"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_suspensao_teste on " + tabela);
            jdbc.execute("drop function falhar_suspensao_teste()");
        }

        transacao.executeWithoutResult(status -> {
            assertEquals(falhaNaAprovacao ? StatusSolicitacaoAdvertencia.PENDENTE : StatusSolicitacaoAdvertencia.APROVADA,
                    solicitacoes.findById(terceiraSolicitacaoId).orElseThrow().getStatus());
            assertEquals(falhaNaAprovacao ? 2 : 3, advertencias.count());
            assertEquals(falhaNaAprovacao ? 0 : 1, suspensoes.count());
            if (!falhaNaAprovacao) {
                var suspensao = suspensoes.findById(pendencia).orElseThrow();
                assertEquals(StatusSuspensao.PENDENTE_DURACAO, suspensao.getStatus());
                assertNull(suspensao.getDuracao());
                assertNull(suspensao.getDataInicio());
                assertNull(suspensao.getJustificativa());
                assertEquals(3, advertencias.findAll().stream()
                        .filter(a -> pendencia.equals(a.getSuspensao().getId())).count());
            }
            var reserva = reservas.findById(reservaId).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
            assertNull(reserva.getDataHoraCancelamento());
            assertTrue(eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaId).isEmpty());
        });
    }

    @Test
    void deveSerializarDuasAprovacoesSimultaneasDoMesmoAlunoEGerarExatamenteUmaSuspensao() throws Exception {
        LocalDate quarta = LocalDate.of(2026, 10, 7);
        UUID reservaId = criarReservaConfirmada(quarta);

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        UUID segundaId = novaSolicitacaoPendente("Adv 2");
        UUID terceiraId = novaSolicitacaoPendente("Adv 3");

        var primeiraAplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.execute(status -> {
                var resposta = analiseService.aprovar(adminId, segundaId, new AprovacaoSolicitacaoAdvertenciaRequest("Segunda"));
                primeiraAplicada.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(primeiraAplicada.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() ->
                        analiseService.aprovar(adminId, terceiraId, new AprovacaoSolicitacaoAdvertenciaRequest("Terceira")));

                assertTrue(aguardarLockEmUsuarios(), "A segunda aprovação do mesmo aluno deve aguardar o lock do aluno.");
                liberarCommit.countDown();

                var respSegunda = primeira.get(15, TimeUnit.SECONDS);
                var respTerceira = segunda.get(15, TimeUnit.SECONDS);

                assertNull(respSegunda.suspensaoId());
                assertNotNull(respTerceira.suspensaoId());

                transacao.executeWithoutResult(status -> {
                    assertEquals(3, advertencias.count());
                    assertEquals(1, suspensoes.count());
                    assertEquals(StatusReserva.CONFIRMADA,
                            reservas.findById(reservaId).orElseThrow().getStatusReserva());
                });
            } finally {
                liberarCommit.countDown();
            }
        }
    }

    @Test
    void deveSerializarSuspensaoComCriacaoConcorrenteDeReservaBloqueandoAReserva() throws Exception {
        // Quarta 07/10 às 18:00: janela aberta para quinta 08/10 e suspensão iniciará em quinta 08/10
        relogio.definir("2026-10-07T18:00:00");
        LocalDate quinta = LocalDate.of(2026, 10, 8);

        UUID pendencia = aprovarCiclo();

        var suspensaoAplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var aprovacao = executor.submit(() -> transacao.execute(status -> {
                var resposta = aplicar(pendencia, 1);
                suspensoes.flush();
                suspensaoAplicada.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resposta;
            }));
            try {
                assertTrue(suspensaoAplicada.await(15, TimeUnit.SECONDS));
                var tentativaReserva = executor.submit(() ->
                        reservaService.cadastrar(alunoId, new CriacaoReservaRequest(quinta)));

                assertTrue(aguardarLockEmUsuarios(), "A criação de reserva concorrente deve aguardar o lock do aluno.");
                liberarCommit.countDown();

                assertNotNull(aprovacao.get(15, TimeUnit.SECONDS).id());
                var erro = assertThrows(ExecutionException.class, () -> tentativaReserva.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
                assertEquals("O aluno está suspenso para a data de utilização informada.", erro.getCause().getMessage());

                transacao.executeWithoutResult(status -> {
                    assertEquals(1, suspensoes.count());
                    assertEquals(0, reservas.count());
                });
            } finally {
                liberarCommit.countDown();
            }
        }
    }

    @Test
    void deveAplicarUmaUnicaVezComDuasDecisoesSimultaneas() throws Exception {
        UUID pendencia = aprovarCiclo();
        UUID reserva = criarReservaConfirmada(LocalDate.of(2026, 10, 8));
        var aplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.executeWithoutResult(status -> {
                aplicar(pendencia, 1);
                aplicada.countDown();
                try {
                    assertTrue(liberarCommit.await(15, TimeUnit.SECONDS));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
            }));
            try {
                assertTrue(aplicada.await(15, TimeUnit.SECONDS));
                var segunda = executor.submit(() -> aplicar(pendencia, 3));
                assertTrue(aguardarLockEmUsuarios());
                liberarCommit.countDown();
                primeira.get(15, TimeUnit.SECONDS);
                var erro = assertThrows(ExecutionException.class, () -> segunda.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
            } finally {
                liberarCommit.countDown();
            }
        }

        assertEquals(DuracaoSuspensao.UM_DIA, suspensoes.findById(pendencia).orElseThrow().getDuracao());
        assertEquals(1, eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reserva).size());
    }

    @Test
    void deveMigrarSuspensoesLegadasEVincularSomenteAdvertenciasDosCiclosFechados() throws Exception {
        String migracao = new ClassPathResource("db/migration/V1_1__suspensao_pendente_duracao.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        try (var conexao = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var sql = conexao.createStatement()) {
            sql.execute("""
                    create temporary table solicitacoes_advertencia (
                        id uuid primary key, aluno_id uuid, data_hora_analise timestamp, status varchar(20)
                    );
                    create temporary table advertencias (
                        id uuid primary key, solicitacao_advertencia_id uuid
                    );
                    create temporary table suspensoes (
                        id uuid primary key, advertencia_origem_id uuid, duracao varchar(20) not null,
                        data_inicio date not null, data_fim date not null,
                        administrador_responsavel_id uuid not null, data_hora_aplicacao timestamp not null
                    );
                    insert into solicitacoes_advertencia
                    select md5(n::text)::uuid, md5('aluno')::uuid, date '2026-10-01' + n, 'APROVADA'
                    from generate_series(1, 7) n;
                    insert into advertencias select id, id from solicitacoes_advertencia;
                    insert into suspensoes
                    select md5('ciclo' || n)::uuid, md5(n::text)::uuid, 'UM_DIA',
                           date '2026-10-01' + n, date '2026-10-01' + n,
                           md5('admin')::uuid, date '2026-10-01' + n
                    from (values (3), (6)) ciclos(n);
                    """);
            sql.execute(migracao);

            try (var registros = sql.executeQuery("""
                    select a.suspensao_id, s.status, s.duracao,
                           s.advertencia_origem_id = md5('3')::uuid as primeiro_ciclo
                    from advertencias a
                    join solicitacoes_advertencia sa on sa.id = a.solicitacao_advertencia_id
                    left join suspensoes s on s.id = a.suspensao_id
                    order by sa.data_hora_analise
                    """)) {
                for (int i = 0; i < 6; i++) {
                    assertTrue(registros.next());
                    assertNotNull(registros.getObject("suspensao_id"));
                    assertEquals(i < 3, registros.getBoolean("primeiro_ciclo"));
                    assertEquals("APLICADA", registros.getString("status"));
                    assertEquals("UM_DIA", registros.getString("duracao"));
                }
                assertTrue(registros.next());
                assertNull(registros.getObject("suspensao_id"));
                assertFalse(registros.next());
            }
        }
    }

    private UUID aprovarCiclo() {
        for (int i = 1; i <= 2; i++) {
            assertNull(analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv " + i),
                    new AprovacaoSolicitacaoAdvertenciaRequest(null)).suspensaoId());
        }
        var terceira = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 3"),
                new AprovacaoSolicitacaoAdvertenciaRequest(null));
        assertNotNull(terceira.suspensaoId());
        return terceira.suspensaoId();
    }

    private SuspensaoResponse aplicar(UUID pendencia, int dias) {
        return suspensaoService.definirDuracao(adminId, pendencia,
                new DefinicaoDuracaoSuspensaoRequest(dias, "Reincidência"));
    }

    private boolean aguardarLockEmUsuarios() throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < limite) {
            boolean bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                    select exists(select 1 from pg_stat_activity
                    where datname = current_database() and pid <> pg_backend_pid()
                    and wait_event_type = 'Lock' and query like '%usuarios%')
                    """, Boolean.class));
            if (bloqueada) {
                return true;
            }
            Thread.sleep(25);
        }
        return false;
    }
}