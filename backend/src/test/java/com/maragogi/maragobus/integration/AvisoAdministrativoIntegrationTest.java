package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.aviso.CriacaoAvisoAdministrativoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.EscopoAviso;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.AvisoAdministrativoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
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
@Import({PostgresTestConfiguration.class, AvisoAdministrativoIntegrationTest.RelogioFixo.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AvisoAdministrativoIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RelogioFixo {
        @Bean
        @Primary
        RelogioControlado clockAvisoTeste() {
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
    @Autowired AvisoAdministrativoService avisoService;
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

    private TransactionTemplate transacao;
    private UUID adminId;
    private UUID alunoAId;
    private UUID alunoBId;
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

            var admin = usuarios.save(Usuario.builder().nome("Admin Aviso").cpf("11144477735")
                    .telefone("82988888880").endereco("Rua Admin").email("admin@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ADMIN).build());
            var alunoA = usuarios.save(Usuario.builder().nome("Aluno A").cpf("52998224725")
                    .telefone("82999999991").endereco("Rua A").email("alunoa@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());
            var alunoB = usuarios.save(Usuario.builder().nome("Aluno B").cpf("98765432100")
                    .telefone("82999999992").endereco("Rua B").email("alunob@example.com")
                    .senha("hash-teste").tipoUsuario(TipoUsuario.ALUNO).build());

            var ponto = pontos.save(PontoEmbarque.builder().nome("Centro").build());
            var curso = cursos.save(Curso.builder().nome("Direito").build());
            var facA = faculdades.save(Faculdade.builder().nome("Faculdade A").build());
            var facB = faculdades.save(Faculdade.builder().nome("Faculdade B").build());

            var ofertaA = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(facA).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());
            var ofertaB = ofertas.save(CursoOfertado.builder()
                    .curso(curso).faculdade(facB).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build());

            perfis.save(PerfilAluno.builder().usuario(alunoA).cursoOfertado(ofertaA)
                    .semestreAtual(4).pontoEmbarquePadrao(ponto).build());
            perfis.save(PerfilAluno.builder().usuario(alunoB).cursoOfertado(ofertaB)
                    .semestreAtual(4).pontoEmbarquePadrao(ponto).build());

            adminId = admin.getId();
            alunoAId = alunoA.getId();
            alunoBId = alunoB.getId();
            faculdadeAId = facA.getId();
            faculdadeBId = facB.getId();
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
    void deveSegmentarAvisosPorFaculdadeMarcarLeituraIdempotenteEArquivar() {
        // 1. Admin publica 1 aviso geral e 1 aviso exclusivo para Faculdade A
        var avisoGeral = avisoService.publicar(adminId, new CriacaoAvisoAdministrativoRequest(
                "Recado Geral", "Saída pontual às 17h30.", EscopoAviso.GERAL, null));

        relogio.definir("2026-10-14T10:15:00");
        var avisoFacA = avisoService.publicar(adminId, new CriacaoAvisoAdministrativoRequest(
                "Aviso Faculdade A", "Portão lateral fechado hoje.", EscopoAviso.POR_FACULDADE, faculdadeAId));

        // 2. Aluno A enxerga ambos (não lidos); Aluno B enxerga apenas o geral
        var listaA = avisoService.consultarParaAluno(alunoAId, 0, 10);
        assertEquals(2, listaA.getTotalElements());
        assertFalse(listaA.getContent().get(0).lido());

        var listaB = avisoService.consultarParaAluno(alunoBId, 0, 10);
        assertEquals(1, listaB.getTotalElements());
        assertEquals(avisoGeral.id(), listaB.getContent().getFirst().id());

        // 3. Aluno B não pode marcar aviso da Faculdade A como lido
        assertThrows(RegraNegocioException.class, () -> avisoService.marcarComoLido(alunoBId, avisoFacA.id()));

        // 4. Aluno A marca como lido; segunda leitura é idempotente e preserva o horário original
        relogio.definir("2026-10-14T11:00:00");
        var leitura1 = avisoService.marcarComoLido(alunoAId, avisoFacA.id());
        assertTrue(leitura1.lido());
        assertEquals(LocalDateTime.of(2026, 10, 14, 11, 0), leitura1.dataHoraLeitura());

        relogio.definir("2026-10-14T11:30:00");
        var leitura2 = avisoService.marcarComoLido(alunoAId, avisoFacA.id());
        assertEquals(LocalDateTime.of(2026, 10, 14, 11, 0), leitura2.dataHoraLeitura());
        assertEquals(1, leituras.count());

        // 5. Admin arquiva o aviso da Faculdade A -> deixa de aparecer para o aluno, mas segue no histórico admin
        relogio.definir("2026-10-14T12:00:00");
        var arquivado = avisoService.arquivar(adminId, avisoFacA.id());
        assertTrue(arquivado.arquivado());
        assertEquals(adminId, arquivado.arquivadoPorId());

        assertEquals(1, avisoService.consultarParaAluno(alunoAId, 0, 10).getTotalElements());
        assertEquals(1, avisoService.consultarParaAdministracao(adminId, false, 0, 10).getTotalElements());
        assertEquals(2, avisoService.consultarParaAdministracao(adminId, true, 0, 10).getTotalElements());
    }
}