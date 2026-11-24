package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.distribuicao.ItemDistribuicaoRequest;
import com.maragogi.maragobus.dto.distribuicao.PublicarDistribuicaoRequest;
import com.maragogi.maragobus.dto.distribuicao.SalvarDistribuicaoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.DistribuicaoTransporteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.time.*;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import({PostgresTestConfiguration.class, DistribuicaoTransporteIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DistribuicaoTransporteIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockDistribuicaoTeste() {
            return new RelogioControlado();
        }
    }

    static class RelogioControlado extends Clock {
        private final AtomicReference<Instant> instante;
        private final ZoneId zona;

        RelogioControlado() {
            this(new AtomicReference<>(LocalDateTime.of(2026, 10, 14, 10, 0)
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
    @Autowired DistribuicaoTransporteService distribuicaoService;
    @Autowired HistoricoDistribuicaoTransporteRepository historicoRepository;
    @Autowired ItemDistribuicaoTransporteRepository itensRepository;
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
    private UUID motorista1Id;
    private UUID motorista2Id;
    private UUID faculdadeAId;
    private UUID faculdadeBId;

    @BeforeEach
    void preparar() throws Exception {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
        relogio.definir("2026-10-14T10:00:00");
        try (var conexao = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), conexao.getMetaData().getURL());
            assertEquals("maragobus_integration_test", conexao.getCatalog());
        }
        transacao = new TransactionTemplate(manager);
        transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transacao.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        transacao.executeWithoutResult(status -> {
            limparBanco();

            var m1 = usuarios.save(Usuario.builder().nome("Motorista Um").cpf("11144477735")
                    .telefone("82988888881").endereco("Rua 1").email("m1@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.MOTORISTA).build());
            var m2 = usuarios.save(Usuario.builder().nome("Motorista Dois").cpf("12345678901")
                    .telefone("82988888882").endereco("Rua 2").email("m2@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.MOTORISTA).build());
            var alunoA = usuarios.save(Usuario.builder().nome("Aluno A").cpf("52998224725")
                    .telefone("82999999991").endereco("Rua A").email("alunoa@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var alunoB = usuarios.save(Usuario.builder().nome("Aluno B").cpf("98765432100")
                    .telefone("82999999992").endereco("Rua B").email("alunob@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());

            var ponto = pontos.save(PontoEmbarque.builder().nome("Centro").build());
            var curso = cursos.save(Curso.builder().nome("Sistemas").build());
            var facA = faculdades.save(Faculdade.builder().nome("Faculdade A").build());
            var facB = faculdades.save(Faculdade.builder().nome("Faculdade B").build());

            var ofertaA = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(facA).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            var ofertaB = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(facB).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());

            perfis.save(PerfilAluno.builder().usuario(alunoA).cursoOfertado(ofertaA)
                    .semestreAtual(3).pontoEmbarquePadrao(ponto).build());
            perfis.save(PerfilAluno.builder().usuario(alunoB).cursoOfertado(ofertaB)
                    .semestreAtual(3).pontoEmbarquePadrao(ponto).build());

            LocalDate data = LocalDate.of(2026, 10, 14);
            reservas.save(Reserva.builder().aluno(alunoA).pontoEmbarque(ponto).dataUtilizacao(data)
                    .dataHoraReserva(LocalDateTime.of(2026, 10, 13, 18, 0)).statusReserva(StatusReserva.CONFIRMADA).build());
            reservas.save(Reserva.builder().aluno(alunoB).pontoEmbarque(ponto).dataUtilizacao(data)
                    .dataHoraReserva(LocalDateTime.of(2026, 10, 13, 18, 5)).statusReserva(StatusReserva.CONFIRMADA).build());

            motorista1Id = m1.getId();
            motorista2Id = m2.getId();
            faculdadeAId = facA.getId();
            faculdadeBId = facB.getId();
        });
    }

    @AfterEach
    void limparAposTeste() {
        transacao.executeWithoutResult(status -> limparBanco());
    }

    private void limparBanco() {
        historicoRepository.deleteAllInBatch();
        itensRepository.deleteAllInBatch();
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
    void deveExecutarFluxoCompartilhadoExigindoCoberturaDeFaculdadesERegistrandoAuditoria() {
        LocalDate data = LocalDate.of(2026, 10, 14);

        // 1. Motorista 1 cria rascunho cobrindo apenas Faculdade A
        var r1 = distribuicaoService.salvarRascunho(motorista1Id, new SalvarDistribuicaoRequest(
                data, null, List.of(new ItemDistribuicaoRequest(faculdadeAId, motorista1Id))));
        assertEquals(StatusDistribuicaoTransporte.RASCUNHO, r1.status());
        assertEquals(1, r1.numeroRevisao());

        // 2. Publicação falha pois Faculdade B possui reserva confirmada sem cobertura
        assertThrows(RegraNegocioException.class, () ->
                distribuicaoService.publicar(motorista1Id, new PublicarDistribuicaoRequest(data, r1.versao())));

        // 3. Motorista 2 edita o rascunho compartilhado cobrindo Faculdade A e Faculdade B
        relogio.definir("2026-10-14T10:30:00");
        var r2 = distribuicaoService.salvarRascunho(motorista2Id, new SalvarDistribuicaoRequest(
                data, r1.versao(), List.of(
                new ItemDistribuicaoRequest(faculdadeAId, motorista1Id),
                new ItemDistribuicaoRequest(faculdadeBId, motorista2Id)
        )));
        assertEquals(2, r2.numeroRevisao());
        assertEquals(motorista2Id, r2.ultimoEditorId());
        assertTrue(r2.versao() > r1.versao());

        // 4. Motorista 1 publica com sucesso
        relogio.definir("2026-10-14T11:00:00");
        var publicada = distribuicaoService.publicar(motorista1Id, new PublicarDistribuicaoRequest(data, r2.versao()));
        assertEquals(StatusDistribuicaoTransporte.PUBLICADA, publicada.status());
        assertEquals(3, publicada.numeroRevisao());
        assertEquals(motorista1Id, publicada.publicadoPorId());
        assertEquals(2, publicada.itens().size());

        // 5. Histórico de auditoria registra CRIACAO, EDICAO e PUBLICACAO em ordem decrescente de revisão
        var historico = distribuicaoService.consultarHistorico(motorista2Id, data, 0, 10);
        assertEquals(3, historico.getTotalElements());
        assertEquals(AcaoAuditoriaDistribuicao.PUBLICACAO, historico.getContent().get(0).acao());
        assertEquals(AcaoAuditoriaDistribuicao.EDICAO, historico.getContent().get(1).acao());
        assertEquals(AcaoAuditoriaDistribuicao.CRIACAO, historico.getContent().get(2).acao());
    }

    @Test
    void deveSerializarEdicoesSimultaneasERejeitarVersaoObsoletaNoPostgres() throws Exception {
        LocalDate data = LocalDate.of(2026, 10, 14);
        var inicial = distribuicaoService.salvarRascunho(motorista1Id, new SalvarDistribuicaoRequest(
                data, null, List.of(new ItemDistribuicaoRequest(faculdadeAId, motorista1Id))));

        var primeiraSalva = new CountDownLatch(1);
        var liberarCommit = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(2)) {
            var edicaoMotorista1 = executor.submit(() -> transacao.execute(status -> {
                var resp = distribuicaoService.salvarRascunho(motorista1Id, new SalvarDistribuicaoRequest(
                        data, inicial.versao(), List.of(
                        new ItemDistribuicaoRequest(faculdadeAId, motorista1Id),
                        new ItemDistribuicaoRequest(faculdadeBId, motorista1Id)
                )));
                primeiraSalva.countDown();
                try { assertTrue(liberarCommit.await(15, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                return resp;
            }));

            try {
                assertTrue(primeiraSalva.await(15, TimeUnit.SECONDS));
                var edicaoMotorista2 = executor.submit(() -> distribuicaoService.salvarRascunho(
                        motorista2Id, new SalvarDistribuicaoRequest(
                                data, inicial.versao(), List.of(
                                new ItemDistribuicaoRequest(faculdadeAId, motorista2Id)
                        ))));

                assertTrue(aguardarLockEmDistribuicoes(), "A segunda edição deve aguardar o lock pessimista da distribuição.");
                liberarCommit.countDown();

                var resp1 = edicaoMotorista1.get(15, TimeUnit.SECONDS);
                assertEquals(2, resp1.numeroRevisao());

                var erro = assertThrows(ExecutionException.class, () -> edicaoMotorista2.get(15, TimeUnit.SECONDS));
                assertInstanceOf(RegraNegocioException.class, erro.getCause());
                assertTrue(erro.getCause().getMessage().contains("Conflito de versão"));
            } finally {
                liberarCommit.countDown();
            }
        }
    }

    private boolean aguardarLockEmDistribuicoes() throws InterruptedException {
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < limite) {
            boolean bloqueada = Boolean.TRUE.equals(jdbc.queryForObject("""
                    select exists(select 1 from pg_stat_activity
                    where datname = current_database() and pid <> pg_backend_pid()
                    and wait_event_type = 'Lock' and query like '%distribuicoes_transporte%')
                    """, Boolean.class));
            if (bloqueada) {
                return true;
            }
            Thread.sleep(25);
        }
        return false;
    }
}