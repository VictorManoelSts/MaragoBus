package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.AnaliseSolicitacaoAdvertenciaService;
import com.maragogi.maragobus.service.ReservaService;
import com.maragogi.maragobus.service.SuspensaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
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
    void deveGerarSuspensaoAntesDas11CancelarReservaDoDiaEBloquearNovaReserva() {
        // Quarta-feira 07/10/2026 às 09:30 (antes das 11:00)
        LocalDate quarta = LocalDate.of(2026, 10, 7);
        LocalDate quinta = LocalDate.of(2026, 10, 8);
        UUID reservaQuartaId = criarReservaConfirmada(quarta);

        var r1 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Ocorrência 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r2 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Ocorrência 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        assertNull(r1.suspensaoId());
        assertNull(r2.suspensaoId());

        var r3 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Ocorrência 3"), new AprovacaoSolicitacaoAdvertenciaRequest("Gatilho"));
        assertNotNull(r3.suspensaoId());

        transacao.executeWithoutResult(status -> {
            assertEquals(3, advertencias.count());
            assertEquals(1, suspensoes.count());

            var suspensao = suspensoes.findById(r3.suspensaoId()).orElseThrow();
            assertEquals(DuracaoSuspensao.UM_DIA, suspensao.getDuracao());
            assertEquals(quarta, suspensao.getDataInicio());
            assertEquals(quarta, suspensao.getDataFim());
            assertEquals(r3.advertenciaId(), suspensao.getAdvertenciaOrigem().getId());
            assertEquals(adminId, suspensao.getAdministradorResponsavel().getId());
            assertEquals(LocalDateTime.of(2026, 10, 7, 9, 30), suspensao.getDataHoraAplicacao());

            var reservaQuarta = reservas.findById(reservaQuartaId).orElseThrow();
            assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservaQuarta.getStatusReserva());
            assertEquals(LocalDateTime.of(2026, 10, 7, 9, 30), reservaQuarta.getDataHoraCancelamento());
        });

        // Ainda antes das 11:00: janela de quarta está aberta, mas o aluno está suspenso.
        var erro = assertThrows(RegraNegocioException.class,
                () -> reservaService.cadastrar(alunoId, new CriacaoReservaRequest(quarta)));
        assertEquals("O aluno está suspenso para a data de utilização informada.", erro.getMessage());

        // Às 17:00 abre a reserva de quinta (fora da suspensão): deve permitir normalmente.
        relogio.definir("2026-10-07T17:00:00");
        var reservaQuinta = reservaService.cadastrar(alunoId, new CriacaoReservaRequest(quinta));
        assertEquals(StatusReserva.CONFIRMADA, reservaQuinta.statusReserva());
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
    void deveAplicarProgressaoDeTresECincoDiasPulandoFimDeSemanaEConsultarVigencia() {
        // Ciclo 1: 3ª advertência na quarta 07/10 às 09:00 -> 1 dia (07/10 a 07/10)
        relogio.definir("2026-10-07T09:00:00");
        for (int i = 1; i <= 3; i++) {
            analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv " + i), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        }

        // Ciclo 2: 6ª advertência na quinta 08/10 às 10:00 -> 3 dias úteis: Qui(08), Sex(09), pula Sab/Dom, Seg(12)
        relogio.definir("2026-10-08T10:00:00");
        UUID reservaSegundaId = criarReservaConfirmada(LocalDate.of(2026, 10, 12));
        UUID reservaTercaId = criarReservaConfirmada(LocalDate.of(2026, 10, 13));

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 4"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 5"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r6 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 6"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
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
        relogio.definir("2026-10-14T10:00:00");
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 7"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 8"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var r9 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 9"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        assertNotNull(r9.suspensaoId());

        transacao.executeWithoutResult(status -> {
            assertEquals(9, advertencias.count());
            assertEquals(3, suspensoes.count());
            var s3 = suspensoes.findById(r9.suspensaoId()).orElseThrow();
            assertEquals(DuracaoSuspensao.CINCO_DIAS, s3.getDuracao());
            assertEquals(LocalDate.of(2026, 10, 14), s3.getDataInicio());
            assertEquals(LocalDate.of(2026, 10, 20), s3.getDataFim());
        });

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
    void deveFazerRollbackAtomicoQuandoPersistenciaDaSuspensaoFalharNoPostgres() {
        LocalDate quarta = LocalDate.of(2026, 10, 7);
        UUID reservaId = criarReservaConfirmada(quarta);

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        UUID terceiraSolicitacaoId = novaSolicitacaoPendente("Adv 3");

        jdbc.execute("""
                create function falhar_suspensao_teste() returns trigger language plpgsql as $$
                begin
                    raise exception 'FALHA_CONTROLADA_SUSPENSAO' using errcode = '23514';
                    return new;
                end $$
                """);
        try {
            jdbc.execute("create trigger falhar_suspensao_teste after insert on suspensoes for each row execute function falhar_suspensao_teste()");
            var erro = assertThrows(DataIntegrityViolationException.class,
                    () -> analiseService.aprovar(adminId, terceiraSolicitacaoId, new AprovacaoSolicitacaoAdvertenciaRequest("Falha")));
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_SUSPENSAO"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_suspensao_teste on suspensoes");
            jdbc.execute("drop function falhar_suspensao_teste()");
        }

        transacao.executeWithoutResult(status -> {
            assertEquals(StatusSolicitacaoAdvertencia.PENDENTE, solicitacoes.findById(terceiraSolicitacaoId).orElseThrow().getStatus());
            assertEquals(2, advertencias.count());
            assertEquals(0, suspensoes.count());
            assertEquals(StatusReserva.CONFIRMADA, reservas.findById(reservaId).orElseThrow().getStatusReserva());
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
                    assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO,
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

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        UUID terceiraId = novaSolicitacaoPendente("Adv 3");

        var suspensaoAplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var aprovacao = executor.submit(() -> transacao.execute(status -> {
                var resposta = analiseService.aprovar(adminId, terceiraId, new AprovacaoSolicitacaoAdvertenciaRequest("Terceira"));
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

                assertNotNull(aprovacao.get(15, TimeUnit.SECONDS).suspensaoId());
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