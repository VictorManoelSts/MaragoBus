package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.dto.pontoembarque.AtualizacaoPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.CadastroPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.CursoOfertadoService;
import com.maragogi.maragobus.service.PontoEmbarqueService;
import com.maragogi.maragobus.service.ReservaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
@Import({PostgresTestConfiguration.class, ReservaAdequacaoIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReservaAdequacaoIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockAdequacaoReservaTeste() {
            return new RelogioControlado();
        }
    }

    static class RelogioControlado extends Clock {
        private final AtomicReference<Instant> instante;
        private final ZoneId zona;

        RelogioControlado() {
            this(new AtomicReference<>(LocalDateTime.of(2026, 10, 14, 9, 0)
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
    @Autowired ReservaService reservaService;
    @Autowired PontoEmbarqueService pontoService;
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
    @Autowired CursoOfertadoService cursoOfertadoService;
    @Autowired PontoEmbarqueRepository pontos;
    @Autowired CursoRepository cursos;
    @Autowired FaculdadeRepository faculdades;
    @Autowired PlatformTransactionManager manager;
    @Autowired DataSource dataSource;
    @Autowired PostgreSQLContainer postgres;
    @Autowired JdbcTemplate jdbc;

    private TransactionTemplate transacao;
    private UUID alunoId;
    private UUID pontoId;
    private UUID faculdadeId;

    @BeforeEach
    void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        relogio.definir("2026-10-14T09:00:00"); // Quarta-feira às 09:00 (janela de quarta aberta)
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            limparBanco();

            var aluno = usuarios.save(Usuario.builder().nome("Aluno Adequacao").cpf("52998224725")
                    .telefone("82999999999").endereco("Rua Aluno").email("aluno@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var ponto = pontos.save(PontoEmbarque.builder().nome("Praça Central").build());
            var curso = cursos.save(Curso.builder().nome("Direito").build());
            var faculdade = faculdades.save(Faculdade.builder().nome("Faculdade Original").build());
            var oferta = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(faculdade).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            perfis.save(PerfilAluno.builder().usuario(aluno).cursoOfertado(oferta)
                    .semestreAtual(5).pontoEmbarquePadrao(ponto).build());

            alunoId = aluno.getId();
            pontoId = ponto.getId();
            faculdadeId = faculdade.getId();
        });
    }

    @AfterEach
    void limparAposTeste() {
        transacao.executeWithoutResult(status -> limparBanco());
    }

    private void limparBanco() {
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
    void deveCalcularDataNoServidorSerIdempotenteEPreservarSnapshotsNoHistorico() {
        // 1. Servidor calcula quarta 14/10 automaticamente e cria a reserva com snapshots
        var primeira = reservaService.reservarProximaDataDisponivel(alunoId);
        assertEquals(LocalDate.of(2026, 10, 14), primeira.dataUtilizacao());
        assertEquals("Praça Central", primeira.pontoEmbarqueNome());

        // 2. Chamada repetida na mesma janela é idempotente (retorna a mesma reserva sem duplicar)
        var repetida = reservaService.reservarProximaDataDisponivel(alunoId);
        assertEquals(primeira.id(), repetida.id());
        assertEquals(1, reservas.count());

        // 3. Alterar o nome do ponto e da faculdade no cadastro não altera o snapshot da reserva histórica
        transacao.executeWithoutResult(status -> {
            var ponto = pontos.findById(pontoId).orElseThrow();
            ponto.setNome("Praça Renomeada");
            pontos.save(ponto);

            var faculdade = faculdades.findById(faculdadeId).orElseThrow();
            faculdade.setNome("Faculdade Renomeada");
            faculdades.save(faculdade);
        });

        var historico = reservaService.consultarHistorico(alunoId, 0, 10);
        assertEquals(1, historico.getTotalElements());
        assertEquals("Praça Central", historico.getContent().getFirst().pontoEmbarqueNome());

        transacao.executeWithoutResult(status -> {
            var r = reservas.findById(primeira.id()).orElseThrow();
            assertEquals("Praça Central", r.getPontoEmbarqueNomeSnapshot());
            assertEquals("Faculdade Original", r.getFaculdadeNomeSnapshot());
            assertEquals("Direito", r.getCursoNomeSnapshot());
        });

        // 4. Fora de qualquer janela (13:00 do mesmo dia) deve rejeitar
        relogio.definir("2026-10-14T13:00:00");
        assertThrows(RegraNegocioException.class, () -> reservaService.reservarProximaDataDisponivel(alunoId));
    }

    @Test
    void preservaReservaESnapshotsAoAtualizarEDesativarOferta() {
        var reserva = reservaService.reservarProximaDataDisponivel(alunoId);
        var ofertaId = ofertas.findAll().getFirst().getId();
        var novoCurso = cursos.save(Curso.builder().nome("Engenharia").build());
        var novaFaculdade = faculdades.save(Faculdade.builder().nome("Faculdade Nova").build());
        var dados = new CadastroCursoOfertadoRequest(novoCurso.getId(), novaFaculdade.getId(), ModalidadeEnsino.EAD);

        cursoOfertadoService.atualizarDados(ofertaId, dados);
        cursoOfertadoService.desativar(ofertaId);

        var inativa = cursoOfertadoService.buscarPorId(ofertaId);
        assertFalse(inativa.ativo());
        assertEquals(novoCurso.getId(), inativa.cursoId());
        assertEquals(novaFaculdade.getId(), inativa.faculdadeId());
        assertEquals(ModalidadeEnsino.EAD, inativa.modalidadeEnsino());
        verificarReservaDaOferta(reserva.id(), ofertaId);

        cursoOfertadoService.reativar(ofertaId);
        assertTrue(cursoOfertadoService.buscarPorId(ofertaId).ativo());
        verificarReservaDaOferta(reserva.id(), ofertaId);
    }

    private void verificarReservaDaOferta(UUID reservaId, UUID ofertaId) {
        transacao.executeWithoutResult(status -> {
            assertEquals(1, reservas.count());
            var reserva = reservas.findById(reservaId).orElseThrow();
            assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
            assertEquals(faculdadeId, reserva.getFaculdadeIdSnapshot());
            assertEquals("Direito", reserva.getCursoNomeSnapshot());
            assertEquals("Faculdade Original", reserva.getFaculdadeNomeSnapshot());
            assertEquals("Praça Central", reserva.getPontoEmbarqueNomeSnapshot());
            assertEquals(ofertaId, perfis.findAll().getFirst().getCursoOfertado().getId());
        });
    }

    @Test
    void devePreservarPerfilEReservasAoDesativarEReativarPonto() {
        var cancelada = reservaService.reservarProximaDataDisponivel(alunoId);
        reservaService.cancelar(alunoId, cancelada.id());
        var confirmada = reservaService.reservarProximaDataDisponivel(alunoId);
        var alternativa = pontoService.cadastrar(new CadastroPontoEmbarqueRequest("Terminal", "Rua Sul"));
        var pagina = PageRequest.of(0, 1, Sort.by("nome", "id"));

        pontoService.desativar(pontoId);
        pontoService.atualizarDados(pontoId, new AtualizacaoPontoEmbarqueRequest("Praça Renomeada", "Rua Norte"));

        assertFalse(pontoService.buscarPorId(pontoId).ativo());
        assertEquals(pontoId, pontoService.listar(pagina, false).getContent().getFirst().id());
        var ativos = pontoService.listar(pagina, true);
        assertEquals(1, ativos.getTotalElements());
        assertEquals(alternativa.id(), ativos.getContent().getFirst().id());
        transacao.executeWithoutResult(status -> {
            assertEquals(pontoId, perfis.findByUsuarioId(alunoId).orElseThrow().getPontoEmbarquePadrao().getId());
            var reserva = reservas.findById(confirmada.id()).orElseThrow();
            assertEquals(pontoId, reserva.getPontoEmbarque().getId());
            assertEquals("Praça Central", reserva.getPontoEmbarqueNomeSnapshot());
            assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
        });
        var erro = assertThrows(RegraNegocioException.class,
                () -> reservaService.reservarProximaDataDisponivel(alunoId));
        assertEquals("O ponto de embarque está inativo.", erro.getMessage());
        assertThrows(RegraNegocioException.class, () -> reservaService.alterarPontoEmbarque(
                alunoId, confirmada.id(), new AtualizacaoPontoEmbarqueReservaRequest(pontoId)));

        var regularizada = reservaService.alterarPontoEmbarque(
                alunoId, confirmada.id(), new AtualizacaoPontoEmbarqueReservaRequest(alternativa.id()));
        assertEquals(alternativa.id(), regularizada.pontoEmbarqueId());

        pontoService.reativar(pontoId);
        assertTrue(pontoService.buscarPorId(pontoId).ativo());
        transacao.executeWithoutResult(status -> {
            assertEquals(pontoId, perfis.findByUsuarioId(alunoId).orElseThrow().getPontoEmbarquePadrao().getId());
            assertEquals(alternativa.id(), reservas.findById(confirmada.id()).orElseThrow().getPontoEmbarque().getId());
            var anterior = reservas.findById(cancelada.id()).orElseThrow();
            assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, anterior.getStatusReserva());
            assertEquals(pontoId, anterior.getPontoEmbarque().getId());
            assertEquals("Praça Central", anterior.getPontoEmbarqueNomeSnapshot());
        });
    }

    @Test
    void deveGarantirUnicidadeParcialNoPostgresPermitindoMultiplasCanceladasNoHistorico() {
        var r1 = reservaService.reservarProximaDataDisponivel(alunoId);

        // Inserção direta de uma segunda reserva CONFIRMADA para mesmo aluno e data deve falhar no índice parcial
        assertThrows(DataIntegrityViolationException.class, () -> transacao.executeWithoutResult(status -> {
            reservas.saveAndFlush(Reserva.builder()
                    .aluno(usuarios.findById(alunoId).orElseThrow())
                    .pontoEmbarque(pontos.findById(pontoId).orElseThrow())
                    .dataUtilizacao(r1.dataUtilizacao())
                    .dataHoraReserva(LocalDateTime.of(2026, 10, 14, 9, 5))
                    .statusReserva(StatusReserva.CONFIRMADA)
                    .build());
        }));

        // Cancelar e reservar novamente na mesma data deve funcionar, mantendo ambas no histórico
        reservaService.cancelar(alunoId, r1.id());
        var r2 = reservaService.reservarProximaDataDisponivel(alunoId);
        assertNotEquals(r1.id(), r2.id());
        assertEquals(2, reservas.count());
    }

    @Test
    void deveSerializarReservasIdempotentesSimultaneasSemDuplicarNoPostgres() throws Exception {
        var barreira = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<UUID> tarefa = () -> {
                barreira.await(10, TimeUnit.SECONDS);
                return reservaService.reservarProximaDataDisponivel(alunoId).id();
            };

            var f1 = executor.submit(tarefa);
            var f2 = executor.submit(tarefa);

            UUID id1 = f1.get(15, TimeUnit.SECONDS);
            UUID id2 = f2.get(15, TimeUnit.SECONDS);

            assertEquals(id1, id2);
            assertEquals(1, reservas.count());
        }
    }
}
