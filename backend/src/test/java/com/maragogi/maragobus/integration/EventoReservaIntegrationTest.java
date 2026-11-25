package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoEventoReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.EventoReservaService;
import com.maragogi.maragobus.service.FechamentoReservasPontoInativo;
import com.maragogi.maragobus.service.PontoEmbarqueService;
import com.maragogi.maragobus.service.ReservaService;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, EventoReservaIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventoReservaIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockEventoReservaTeste() {
            return new RelogioControlado();
        }
    }

    static class RelogioControlado extends Clock {
        private static final ZoneId MACEIO = ZoneId.of("America/Maceio");
        private final AtomicReference<Clock> fixo;
        private final ZoneId zona;

        RelogioControlado() {
            this(new AtomicReference<>(), MACEIO);
            definir("2026-10-14T09:00:00");
        }

        private RelogioControlado(AtomicReference<Clock> fixo, ZoneId zona) {
            this.fixo = fixo;
            this.zona = zona;
        }

        void definir(String local) {
            fixo.set(Clock.fixed(LocalDateTime.parse(local).atZone(MACEIO).toInstant(), MACEIO));
        }

        @Override public ZoneId getZone() { return zona; }
        @Override public Clock withZone(ZoneId zone) { return new RelogioControlado(fixo, zone); }
        @Override public Instant instant() { return fixo.get().instant(); }
    }

    @Autowired RelogioControlado relogio;
    @Autowired ReservaService reservaService;
    @Autowired PontoEmbarqueService pontoEmbarqueService;
    @Autowired FechamentoReservasPontoInativo fechamento;
    @Autowired EventoReservaService eventoReservaService;
    @Autowired EventoReservaRepository eventosReserva;
    @Autowired LeituraAvisoAlunoRepository leituras;
    @Autowired AvisoAdministrativoRepository avisos;
    @Autowired HistoricoDistribuicaoTransporteRepository historicoDistribuicoes;
    @Autowired ItemDistribuicaoTransporteRepository itensDistribuicao;
    @Autowired DistribuicaoTransporteRepository distribuicoes;
    @Autowired DataSemFuncionamentoRepository datasSemFuncionamento;
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
    private UUID alunoId;
    private UUID pontoInicialId;
    private UUID pontoAlternativoId;
    private UUID faculdadeId;

    @BeforeEach
    void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        relogio.definir("2026-10-14T09:00:00");
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            limparBanco();

            var admin = usuarios.save(Usuario.builder().nome("Admin Auditor").cpf("11144477735")
                    .telefone("82988888880").endereco("Rua Admin").email("admin@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build());
            var aluno = usuarios.save(Usuario.builder().nome("Aluno Original").cpf("52998224725")
                    .telefone("82999999999").endereco("Rua Aluno").email("aluno@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var pontoInicial = pontos.save(PontoEmbarque.builder().nome("Praça Central").build());
            var pontoAlt = pontos.save(PontoEmbarque.builder().nome("Terminal Rodoviário").build());
            var curso = cursos.save(Curso.builder().nome("Direito").build());
            var faculdade = faculdades.save(Faculdade.builder().nome("Faculdade Original").build());
            var oferta = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(faculdade).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(oferta)
                    .semestreAtual(4).pontoEmbarquePadrao(pontoInicial).build());

            adminId = admin.getId();
            alunoId = aluno.getId();
            pontoInicialId = pontoInicial.getId();
            pontoAlternativoId = pontoAlt.getId();
            faculdadeId = faculdade.getId();
        });
    }

    @AfterEach
    void limparAposTeste() {
        transacao.executeWithoutResult(status -> limparBanco());
    }

    private void limparBanco() {
        jdbc.execute("truncate table eventos_reserva");
        leituras.deleteAllInBatch();
        avisos.deleteAllInBatch();
        historicoDistribuicoes.deleteAllInBatch();
        itensDistribuicao.deleteAllInBatch();
        distribuicoes.deleteAllInBatch();
        datasSemFuncionamento.deleteAllInBatch();
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
    }

    @Test
    void deveCancelarUmaVezComHistoricoImutavelEExcluirDasConsultasOperacionais() {
        UUID id = criarReservaComPontoInativo();
        relogio.definir("2026-10-14T10:59:59");
        fechamento.executar();
        assertEquals(StatusReserva.CONFIRMADA, reservas.findById(id).orElseThrow().getStatusReserva());

        relogio.definir("2026-10-14T11:00:00");
        assertThrows(RegraNegocioException.class, () -> alterarPonto(id));
        fechamento.executar();
        relogio.definir("2026-10-14T11:01:00");
        fechamento.executar();

        var data = LocalDate.of(2026, 10, 14);
        var horario = data.atTime(11, 0);
        var cancelada = reservas.findById(id).orElseThrow();
        assertEquals(StatusReserva.CANCELADA_POR_PONTO_INATIVO, cancelada.getStatusReserva());
        assertEquals(horario, cancelada.getDataHoraCancelamento());
        assertNull(reservaService.consultarPainel(alunoId).reservaAtual());
        assertEquals(id, reservaService.consultarHistorico(alunoId, 0, 10).getContent().getFirst().id());
        assertTrue(reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA).isEmpty());
        assertEquals(0, reservas.consultarPassageirosConfirmados(
                data, StatusReserva.CONFIRMADA, null, null, PageRequest.of(0, 10)).getTotalElements());

        var eventos = eventoReservaService.consultarPorReserva(alunoId, id);
        assertEquals(2, eventos.size());
        var evento = eventos.getLast();
        assertAll(
                () -> assertEquals(TipoEventoReserva.CANCELAMENTO_POR_PONTO_INATIVO, evento.tipoEvento()),
                () -> assertEquals(StatusReserva.CONFIRMADA, evento.statusAnterior()),
                () -> assertEquals(cancelada.getStatusReserva(), evento.statusNovo()),
                () -> assertEquals("PONTO_EMBARQUE_INATIVO", evento.motivo()),
                () -> assertEquals("SISTEMA", evento.origem()),
                () -> assertNull(evento.autorId()),
                () -> assertNull(evento.autorTipo()),
                () -> assertEquals(alunoId, evento.alunoId()),
                () -> assertEquals(horario, evento.dataHoraEvento()),
                () -> assertEquals(data, evento.dataUtilizacao()),
                () -> assertEquals(pontoInicialId, evento.pontoEmbarqueId()),
                () -> assertEquals(cancelada.getPontoEmbarqueNomeSnapshot(), evento.pontoEmbarqueNome()),
                () -> assertEquals(faculdadeId, evento.faculdadeId()),
                () -> assertEquals("Faculdade Original", evento.faculdadeNome()),
                () -> assertEquals("Direito", evento.cursoNome()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "update eventos_reserva set origem = 'USUARIO' where id = ?", evento.id()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "delete from eventos_reserva where id = ?", evento.id()));
        assertEquals(eventos, eventoReservaService.consultarPorReserva(alunoId, id));
    }

    @Test
    void devePreservarReservaJaCanceladaPeloAluno() {
        UUID id = criarReservaComPontoInativo();
        var original = reservaService.cancelar(alunoId, id);
        relogio.definir("2026-10-14T11:00:00");
        fechamento.executar();
        reservaService.cancelarPorPontoInativo(alunoId, id);
        var persistida = reservas.findById(id).orElseThrow();
        assertEquals(original.statusReserva(), persistida.getStatusReserva());
        assertEquals(original.dataHoraCancelamento(), persistida.getDataHoraCancelamento());
        assertEquals(2, eventoReservaService.consultarPorReserva(alunoId, id).size());
    }

    @Test
    void deveReverterCancelamentoQuandoPostgresRejeitaEventoEPermitirNovaTentativa() {
        UUID id = criarReservaComPontoInativo();
        relogio.definir("2026-10-14T11:00:00");
        jdbc.execute("""
                alter table eventos_reserva add constraint teste_rejeitar_evento
                check (tipo_evento <> 'CANCELAMENTO_POR_PONTO_INATIVO')
                """);
        try {
            assertThrows(DataAccessException.class, () -> reservaService.cancelarPorPontoInativo(alunoId, id));
            var persistida = reservas.findById(id).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, persistida.getStatusReserva());
            assertNull(persistida.getDataHoraCancelamento());
            assertEquals(1, eventoReservaService.consultarPorReserva(alunoId, id).size());
        } finally {
            jdbc.execute("alter table eventos_reserva drop constraint teste_rejeitar_evento");
        }
        fechamento.executar();
        assertEquals(StatusReserva.CANCELADA_POR_PONTO_INATIVO, reservas.findById(id).orElseThrow().getStatusReserva());
        assertEquals(2, eventoReservaService.consultarPorReserva(alunoId, id).size());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveSerializarAlteracaoEFechamentoNasDuasOrdens(boolean alteracaoPrimeiro) throws Exception {
        UUID id = criarReservaComPontoInativo();
        relogio.definir(alteracaoPrimeiro ? "2026-10-14T10:59:59" : "2026-10-14T11:00:00");
        var primeiraAplicada = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> transacao.executeWithoutResult(status -> {
                if (alteracaoPrimeiro) {
                    alterarPonto(id);
                } else {
                    reservaService.cancelarPorPontoInativo(alunoId, id);
                }
                primeiraAplicada.countDown();
                try {
                    assertTrue(liberarCommit.await(15, TimeUnit.SECONDS));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
            }));
            try {
                assertTrue(primeiraAplicada.await(15, TimeUnit.SECONDS));
                relogio.definir("2026-10-14T11:00:00");
                var segunda = executor.submit(() -> {
                    if (alteracaoPrimeiro) {
                        fechamento.executar();
                    } else {
                        assertThrows(RegraNegocioException.class, () -> alterarPonto(id));
                    }
                });
                aguardarLockDoAluno();
                liberarCommit.countDown();
                primeira.get(15, TimeUnit.SECONDS);
                segunda.get(15, TimeUnit.SECONDS);
            } finally {
                liberarCommit.countDown();
            }
        }

        var persistida = reservas.findById(id).orElseThrow();
        assertEquals(alteracaoPrimeiro ? StatusReserva.CONFIRMADA : StatusReserva.CANCELADA_POR_PONTO_INATIVO,
                persistida.getStatusReserva());
        var eventos = eventoReservaService.consultarPorReserva(alunoId, id);
        assertEquals(2, eventos.size());
        assertEquals(alteracaoPrimeiro ? pontoAlternativoId : pontoInicialId, eventos.getLast().pontoEmbarqueId());
        assertEquals(alteracaoPrimeiro ? TipoEventoReserva.ALTERACAO_PONTO_EMBARQUE
                : TipoEventoReserva.CANCELAMENTO_POR_PONTO_INATIVO, eventos.getLast().tipoEvento());
    }

    private void aguardarLockDoAluno() throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < limite) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("""
                    select exists(select 1 from pg_stat_activity
                    where datname = current_database() and pid <> pg_backend_pid()
                    and wait_event_type = 'Lock' and query like '%usuarios%')
                    """, Boolean.class))) {
                return;
            }
            Thread.sleep(25);
        }
        fail("A segunda operação deve aguardar o lock do aluno.");
    }

    private UUID criarReservaComPontoInativo() {
        var reserva = reservaService.reservarProximaDataDisponivel(alunoId);
        pontoEmbarqueService.desativar(pontoInicialId);
        return reserva.id();
    }

    private void alterarPonto(UUID id) {
        reservaService.alterarPontoEmbarque(alunoId, id, new AtualizacaoPontoEmbarqueReservaRequest(pontoAlternativoId));
    }

    @Test
    void deveRegistrarCicloCompletoDeEventosPreservandoSnapshotsEImpedindoMutacaoNoPostgres() {
        // 1. Criação da reserva às 09:00
        var reserva = reservaService.reservarProximaDataDisponivel(alunoId);

        // 2. Alteração do ponto de embarque às 09:30
        relogio.definir("2026-10-14T09:30:00");
        reservaService.alterarPontoEmbarque(
                alunoId, reserva.id(), new AtualizacaoPontoEmbarqueReservaRequest(pontoAlternativoId));

        // 3. Cancelamento pelo aluno com motivo explícito às 10:00
        relogio.definir("2026-10-14T10:00:00");
        reservaService.cancelar(alunoId, reserva.id(), "Consulta médica imprevista");

        // 4. Alterar cadastros originais não deve afetar os snapshots dos eventos históricos
        transacao.executeWithoutResult(status -> {
            var u = usuarios.findById(alunoId).orElseThrow();
            u.setNome("Aluno Renomeado");
            usuarios.save(u);

            var p1 = pontos.findById(pontoInicialId).orElseThrow();
            p1.setNome("Ponto Renomeado");
            pontos.save(p1);

            var fac = faculdades.findById(faculdadeId).orElseThrow();
            fac.setNome("Faculdade Renomeada");
            faculdades.save(fac);
        });

        // 5. Consultar timeline cronológica da reserva
        var trilha = eventoReservaService.consultarPorReserva(adminId, reserva.id());
        assertEquals(3, trilha.size());

        var ev1 = trilha.get(0);
        assertEquals(TipoEventoReserva.CRIACAO, ev1.tipoEvento());
        assertNull(ev1.statusAnterior());
        assertEquals(StatusReserva.CONFIRMADA, ev1.statusNovo());
        assertEquals("Aluno Original", ev1.autorNome());
        assertEquals("Praça Central", ev1.pontoEmbarqueNome());
        assertEquals("Faculdade Original", ev1.faculdadeNome());
        assertEquals("Direito", ev1.cursoNome());
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 0), ev1.dataHoraEvento());

        var ev2 = trilha.get(1);
        assertEquals(TipoEventoReserva.ALTERACAO_PONTO_EMBARQUE, ev2.tipoEvento());
        assertEquals(StatusReserva.CONFIRMADA, ev2.statusAnterior());
        assertEquals(StatusReserva.CONFIRMADA, ev2.statusNovo());
        assertEquals("Terminal Rodoviário", ev2.pontoEmbarqueNome());
        assertTrue(ev2.motivo().contains("Praça Central") && ev2.motivo().contains("Terminal Rodoviário"));

        var ev3 = trilha.get(2);
        assertEquals(TipoEventoReserva.CANCELAMENTO_PELO_ALUNO, ev3.tipoEvento());
        assertEquals(StatusReserva.CONFIRMADA, ev3.statusAnterior());
        assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, ev3.statusNovo());
        assertEquals("Consulta médica imprevista", ev3.motivo());
        assertEquals(LocalDateTime.of(2026, 10, 14, 10, 0), ev3.dataHoraEvento());

        // 6. Consulta paginada por aluno retorna em ordem decrescente de data/hora
        var paginaAluno = eventoReservaService.consultarPorAluno(alunoId, alunoId, 0, 10);
        assertEquals(3, paginaAluno.getTotalElements());
        assertEquals(TipoEventoReserva.CANCELAMENTO_PELO_ALUNO, paginaAluno.getContent().getFirst().tipoEvento());

        // 7. Imutabilidade real no PostgreSQL: UPDATE e DELETE devem ser bloqueados pela trigger
        assertThrows(DataAccessException.class, () ->
                jdbc.update("update eventos_reserva set motivo = 'adulterado' where id = ?", ev3.id()));
        assertThrows(DataAccessException.class, () ->
                jdbc.update("delete from eventos_reserva where id = ?", ev3.id()));
        assertEquals(3, eventosReserva.count());
    }
}
