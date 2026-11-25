package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.datasemfuncionamento.CadastroDataSemFuncionamentoRequest;
import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.solicitacaoadvertencia.AprovacaoSolicitacaoAdvertenciaRequest;
import com.maragogi.maragobus.dto.suspensao.DefinicaoDuracaoSuspensaoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.AnaliseSolicitacaoAdvertenciaService;
import com.maragogi.maragobus.service.DataSemFuncionamentoService;
import com.maragogi.maragobus.service.ReservaService;
import com.maragogi.maragobus.service.SuspensaoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataAccessException;
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
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, DataSemFuncionamentoIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DataSemFuncionamentoIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockDataSemFuncionamentoTeste() {
            return new RelogioControlado();
        }
    }

    static class RelogioControlado extends Clock {
        private final AtomicReference<Instant> instante;
        private final ZoneId zona;

        RelogioControlado() {
            this(new AtomicReference<>(LocalDateTime.of(2026, 10, 12, 10, 0)
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
    @Autowired DataSemFuncionamentoService dataSemFuncionamentoService;
    @Autowired AnaliseSolicitacaoAdvertenciaService analiseService;
    @Autowired SuspensaoService suspensaoService;
    @Autowired ReservaService reservaService;
    @Autowired DataSemFuncionamentoRepository datasSemFuncionamento;
    @Autowired SuspensaoRepository suspensoes;
    @Autowired AdvertenciaRepository advertencias;
    @Autowired SolicitacaoAdvertenciaRepository solicitacoes;
    @Autowired ReservaRepository reservas;
    @Autowired EventoReservaRepository eventos;
    @Autowired JdbcTemplate jdbc;
    @Autowired PerfilAlunoRepository perfis;
    @Autowired UsuarioRepository usuarios;
    @Autowired CursoOfertadoRepository ofertas;
    @Autowired PontoEmbarqueRepository pontos;
    @Autowired CursoRepository cursos;
    @Autowired FaculdadeRepository faculdades;
    @Autowired PlatformTransactionManager manager;
    @Autowired DataSource dataSource;
    @Autowired PostgreSQLContainer postgres;

    private TransactionTemplate transacao;
    private UUID adminId;
    private UUID motoristaId;
    private UUID alunoId;
    private UUID pontoId;

    @BeforeEach
    void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        relogio.definir("2026-10-12T10:00:00");
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            limparBanco();

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

    @AfterEach
    void limparAposTeste() {
        transacao.executeWithoutResult(status -> limparBanco());
    }

    private void limparBanco() {
        jdbc.execute("truncate table eventos_reserva");
        datasSemFuncionamento.deleteAllInBatch();
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
                .pontoEmbarqueNomeSnapshot("Ponto histórico")
                .faculdadeNomeSnapshot("Faculdade histórica")
                .cursoNomeSnapshot("Curso histórico")
                .dataUtilizacao(dataUtilizacao)
                .dataHoraReserva(dataUtilizacao.minusDays(1).atTime(18, 0))
                .statusReserva(StatusReserva.CONFIRMADA)
                .build()).getId());
    }

    @Test
    void deveCadastrarBloqueioCancelarReservasDaDataEBloquearNovaReserva() {
        LocalDate quarta = LocalDate.of(2026, 10, 14);
        LocalDate quinta = LocalDate.of(2026, 10, 15);
        UUID reservaQuartaId = criarReservaConfirmada(quarta);
        UUID reservaQuintaId = criarReservaConfirmada(quinta);

        var resposta = dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(quarta, "  Feriado municipal  "));

        assertAll(
                () -> assertNotNull(resposta.id()),
                () -> assertEquals(quarta, resposta.data()),
                () -> assertEquals("Feriado municipal", resposta.motivo()),
                () -> assertEquals(1L, resposta.reservasCanceladas()),
                () -> assertEquals(0L, resposta.suspensoesEstendidas())
        );

        UUID eventoId = transacao.execute(status -> {
            assertTrue(datasSemFuncionamento.existsByData(quarta));

            var reservaQuarta = reservas.findById(reservaQuartaId).orElseThrow();
            assertEquals(StatusReserva.CANCELADA_SEM_FUNCIONAMENTO, reservaQuarta.getStatusReserva());
            assertEquals(LocalDateTime.of(2026, 10, 12, 10, 0), reservaQuarta.getDataHoraCancelamento());

            var reservaQuinta = reservas.findById(reservaQuintaId).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, reservaQuinta.getStatusReserva());
            assertNull(reservaQuinta.getDataHoraCancelamento());
            assertTrue(eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaQuintaId).isEmpty());

            var historico = eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaQuartaId);
            assertEquals(1, historico.size());
            var evento = historico.getFirst();
            assertEquals(TipoEventoReserva.CANCELAMENTO_SEM_FUNCIONAMENTO, evento.getTipoEvento());
            assertEquals(StatusReserva.CONFIRMADA, evento.getStatusAnterior());
            assertEquals(reservaQuarta.getStatusReserva(), evento.getStatusNovo());
            assertEquals(reservaQuarta.getDataHoraCancelamento(), evento.getDataHoraEvento());
            assertEquals(adminId, evento.getAutorId());
            assertEquals("Admin Teste", evento.getAutorNomeSnapshot());
            assertEquals(TipoUsuario.ADMIN, evento.getAutorTipoSnapshot());
            assertEquals("Feriado municipal", evento.getMotivo());
            assertEquals(quarta, evento.getDataUtilizacaoSnapshot());
            assertEquals(pontoId, evento.getPontoEmbarqueIdSnapshot());
            assertEquals("Ponto histórico", evento.getPontoEmbarqueNomeSnapshot());
            assertEquals("Faculdade histórica", evento.getFaculdadeNomeSnapshot());
            assertEquals("Curso histórico", evento.getCursoNomeSnapshot());
            return evento.getId();
        });

        assertThrows(DataAccessException.class, () -> jdbc.update(
                "update eventos_reserva set motivo = 'Alterado' where id = ?", eventoId));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "delete from eventos_reserva where id = ?", eventoId));
        assertEquals("Feriado municipal", eventos.findById(eventoId).orElseThrow().getMotivo());

        // Mesmo na janela normal da quarta (terça às 18:00), a reserva deve ser rejeitada
        relogio.definir("2026-10-13T18:00:00");
        var erro = assertThrows(RegraNegocioException.class,
                () -> reservaService.cadastrar(alunoId, new CriacaoReservaRequest(quarta)));
        assertEquals("Não há funcionamento do transporte na data informada.", erro.getMessage());
    }

    @Test
    void deveReverterBloqueioECancelamentoQuandoEventoFalharNoPostgres() {
        LocalDate data = LocalDate.of(2026, 10, 14);
        UUID reservaId = criarReservaConfirmada(data);

        jdbc.execute("""
                create function falhar_evento_teste() returns trigger language plpgsql as $$
                begin
                    raise exception 'FALHA_CONTROLADA_EVENTO' using errcode = '23514';
                end $$;
                """);
        try {
            jdbc.execute("""
                    create trigger falhar_evento_teste after insert on eventos_reserva
                    for each row execute function falhar_evento_teste()
                    """);
            var erro = assertThrows(DataIntegrityViolationException.class, () ->
                    dataSemFuncionamentoService.cadastrar(adminId,
                            new CadastroDataSemFuncionamentoRequest(data, "Feriado municipal")));
            assertTrue(erro.getMostSpecificCause().getMessage().contains("FALHA_CONTROLADA_EVENTO"));
        } finally {
            jdbc.execute("drop trigger if exists falhar_evento_teste on eventos_reserva");
            jdbc.execute("drop function falhar_evento_teste()");
        }

        transacao.executeWithoutResult(status -> {
            assertFalse(datasSemFuncionamento.existsByData(data));
            var reserva = reservas.findById(reservaId).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
            assertNull(reserva.getDataHoraCancelamento());
            assertTrue(eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaId).isEmpty());
        });
    }

    @Test
    void deveAnteciparAberturaDaReservaEPularDataBloqueadaNoPainelDoAluno() {
        // Quarta 14/10 às 17:00 com quinta 15/10 bloqueada -> reserva de sexta 16/10 já abre
        relogio.definir("2026-10-14T17:00:00");
        LocalDate quintaBloqueada = LocalDate.of(2026, 10, 15);
        LocalDate sexta = LocalDate.of(2026, 10, 16);

        dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(quintaBloqueada, "Ponto facultativo"));

        var reservaSexta = reservaService.cadastrar(alunoId, new CriacaoReservaRequest(sexta));
        assertEquals(sexta, reservaSexta.dataUtilizacao());
        assertEquals(StatusReserva.CONFIRMADA, reservaSexta.statusReserva());

        var painel = reservaService.consultarPainel(alunoId);
        assertNull(painel.reservaAtual());
        assertNotNull(painel.proximaReserva());
        assertEquals(sexta, painel.proximaReserva().dataUtilizacao());
        assertEquals(StatusReserva.CONFIRMADA, painel.proximaReserva().statusReserva());
    }

    @Test
    void deveEstenderSuspensaoVigentePulandoFimDeSemanaECancelarReservaNaNovaDataFim() {
        relogio.definir("2026-10-13T09:30:00");
        for (int i = 1; i <= 5; i++) {
            analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv " + i),
                    new AprovacaoSolicitacaoAdvertenciaRequest(null));
        }
        var aprovacao6 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 6"),
                new AprovacaoSolicitacaoAdvertenciaRequest("Gatilho 3 dias"));
        suspensaoService.definirDuracao(adminId, aprovacao6.suspensaoId(),
                new DefinicaoDuracaoSuspensaoRequest(3, "Reincidência"));
        assertNotNull(aprovacao6.suspensaoId());

        LocalDate quintaBloqueada = LocalDate.of(2026, 10, 15);
        LocalDate segundaNovaDataFim = LocalDate.of(2026, 10, 19);
        UUID reservaSegundaId = criarReservaConfirmada(segundaNovaDataFim);

        relogio.definir("2026-10-14T09:30:00");
        // Bloqueio da quinta-feira interna à suspensão -> dataFim estendida de Sex(16) para Seg(19)
        var resposta = dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(quintaBloqueada, "Manutenção preventiva"));

        assertEquals(1L, resposta.suspensoesEstendidas());

        transacao.executeWithoutResult(status -> {
            var suspensao = suspensoes.findById(aprovacao6.suspensaoId()).orElseThrow();
            assertEquals(LocalDate.of(2026, 10, 14), suspensao.getDataInicio());
            assertEquals(segundaNovaDataFim, suspensao.getDataFim());

            var reservaSegunda = reservas.findById(reservaSegundaId).orElseThrow();
            assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservaSegunda.getStatusReserva());
            assertEquals(LocalDateTime.of(2026, 10, 14, 9, 30), reservaSegunda.getDataHoraCancelamento());

            var historico = eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reservaSegundaId);
            assertEquals(1, historico.size());
            var evento = historico.getFirst();
            assertEquals(TipoEventoReserva.CANCELAMENTO_POR_SUSPENSAO, evento.getTipoEvento());
            assertEquals(StatusReserva.CONFIRMADA, evento.getStatusAnterior());
            assertEquals(reservaSegunda.getStatusReserva(), evento.getStatusNovo());
            assertEquals(reservaSegunda.getDataHoraCancelamento(), evento.getDataHoraEvento());
            assertEquals(adminId, evento.getAutorId());
            assertTrue(evento.getMotivo().contains(quintaBloqueada.toString()));
        });

        // Na sexta às 18:00 (janela da segunda aberta), o aluno segue bloqueado pela suspensão estendida
        relogio.definir("2026-10-16T18:00:00");
        var erro = assertThrows(RegraNegocioException.class,
                () -> reservaService.cadastrar(alunoId, new CriacaoReservaRequest(segundaNovaDataFim)));
        assertEquals("O aluno está suspenso para a data de utilização informada.", erro.getMessage());
    }

    @Test
    void devePularDataSemFuncionamentoJaCadastradaAoAplicarNovaSuspensao() {
        // Segunda 12/10 às 18:00 com terça 13/10 já bloqueada -> suspensão de 1 dia deve cair na quarta 14/10
        relogio.definir("2026-10-12T18:00:00");
        LocalDate tercaBloqueada = LocalDate.of(2026, 10, 13);
        LocalDate quarta = LocalDate.of(2026, 10, 14);

        dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(tercaBloqueada, "Recesso"));

        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 1"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 2"), new AprovacaoSolicitacaoAdvertenciaRequest(null));
        var aprovacao3 = analiseService.aprovar(adminId, novaSolicitacaoPendente("Adv 3"),
                new AprovacaoSolicitacaoAdvertenciaRequest(null));
        suspensaoService.definirDuracao(adminId, aprovacao3.suspensaoId(),
                new DefinicaoDuracaoSuspensaoRequest(1, "Reincidência"));

        assertNotNull(aprovacao3.suspensaoId());
        transacao.executeWithoutResult(status -> {
            var suspensao = suspensoes.findById(aprovacao3.suspensaoId()).orElseThrow();
            assertEquals(quarta, suspensao.getDataInicio());
            assertEquals(quarta, suspensao.getDataFim());
        });
    }

    @Test
    void deveConsultarPaginadoRejeitarDuplicidadeERemoverSomenteDataFutura() {
        LocalDate quarta = LocalDate.of(2026, 10, 14);
        LocalDate sexta = LocalDate.of(2026, 10, 16);

        var rQuarta = dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(quarta, "Feriado 1"));
        var rSexta = dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(sexta, "Feriado 2"));

        assertThrows(RegraNegocioException.class, () -> dataSemFuncionamentoService.cadastrar(
                adminId, new CadastroDataSemFuncionamentoRequest(quarta, "Duplicado")));

        var pagina = dataSemFuncionamentoService.consultarTodas(adminId, 0, 10);
        assertEquals(2, pagina.getTotalElements());
        assertEquals(quarta, pagina.getContent().get(0).data());
        assertEquals(sexta, pagina.getContent().get(1).data());

        // Remoção de data futura permitida
        dataSemFuncionamentoService.remover(adminId, rSexta.id());
        assertEquals(1, datasSemFuncionamento.count());

        // Avançando para quinta 15/10, quarta 14/10 vira passada e não pode mais ser removida
        relogio.definir("2026-10-15T10:00:00");
        assertThrows(RegraNegocioException.class, () -> dataSemFuncionamentoService.remover(adminId, rQuarta.id()));
        assertEquals(1, datasSemFuncionamento.count());
    }
}