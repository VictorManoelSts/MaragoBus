package com.maragogi.maragobus.integration;

import com.maragogi.maragobus.dto.perfilaluno.AtualizacaoPerfilAlunoRequest;
import com.maragogi.maragobus.dto.usuario.CadastroAlunoRequest;
import com.maragogi.maragobus.dto.usuario.CadastroUsuarioRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.service.PerfilAlunoService;
import com.maragogi.maragobus.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(PostgresTestConfiguration.class)
class PersistenciaAlunoIntegrationTest {
    @Autowired private UsuarioService usuarioService;
    @Autowired private PerfilAlunoService perfilAlunoService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PerfilAlunoRepository perfilAlunoRepository;
    @Autowired private CursoRepository cursoRepository;
    @Autowired private FaculdadeRepository faculdadeRepository;
    @Autowired private CursoOfertadoRepository cursoOfertadoRepository;
    @Autowired private PontoEmbarqueRepository pontoEmbarqueRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PostgreSQLContainer postgres;

    private TransactionTemplate novaTransacao;
    private Referencias referencias;

    private record Referencias(UUID ofertaId, UUID pontoId) {}

    @BeforeEach
    void prepararBancoIsolado() throws SQLException {
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive(),
                "O teste não pode envolver a transação do serviço.");
        // Confere o destino antes de executar qualquer limpeza ou DDL de teste.
        try (var connection = dataSource.getConnection()) {
            assertEquals(postgres.getJdbcUrl(), connection.getMetaData().getURL());
            assertEquals("maragobus_integration_test", connection.getCatalog());
        }
        novaTransacao = new TransactionTemplate(transactionManager);
        novaTransacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        novaTransacao.executeWithoutResult(status -> {
            perfilAlunoRepository.deleteAllInBatch();
            usuarioRepository.deleteAllInBatch();
            cursoOfertadoRepository.deleteAllInBatch();
            pontoEmbarqueRepository.deleteAllInBatch();
            cursoRepository.deleteAllInBatch();
            faculdadeRepository.deleteAllInBatch();
        });
        referencias = persistirReferencias("Original", ModalidadeEnsino.PRESENCIAL);
    }

    private Referencias persistirReferencias(String sufixo, ModalidadeEnsino modalidade) {
        return Objects.requireNonNull(novaTransacao.execute(status -> {
            var curso = cursoRepository.save(Curso.builder().nome("Curso " + sufixo).build());
            var faculdade = faculdadeRepository.save(Faculdade.builder().nome("Faculdade " + sufixo).build());
            var oferta = cursoOfertadoRepository.save(CursoOfertado.builder().curso(curso)
                    .faculdade(faculdade).modalidadeEnsino(modalidade).build());
            var ponto = pontoEmbarqueRepository.save(PontoEmbarque.builder().nome("Ponto " + sufixo).build());
            return new Referencias(oferta.getId(), ponto.getId());
        }));
    }

    private CadastroAlunoRequest cadastro(String email, String cpf) {
        var pessoal = new CadastroUsuarioRequest("Aluno Integração", cpf, "82999999999",
                "Rua Teste", null, email, "Senha123!");
        return new CadastroAlunoRequest(pessoal, referencias.ofertaId(), 2, referencias.pontoId());
    }

    @Test
    void deveConfirmarCommitDoUsuarioEPerfilNaMesmaOperacao() {
        var resposta = usuarioService.cadastrarAluno(cadastro("commit@example.com", "52998224725"));
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());

        novaTransacao.executeWithoutResult(status -> {
            var usuario = usuarioRepository.findById(resposta.id()).orElseThrow();
            var perfil = perfilAlunoRepository.findByUsuarioId(resposta.id()).orElseThrow();
            assertAll(() -> assertEquals("commit@example.com", usuario.getEmail()),
                    () -> assertEquals(TipoUsuario.ALUNO, usuario.getTipoUsuario()),
                    () -> assertEquals(usuario.getId(), perfil.getUsuario().getId()),
                    () -> assertEquals(referencias.ofertaId(), perfil.getCursoOfertado().getId()),
                    () -> assertEquals(referencias.pontoId(), perfil.getPontoEmbarquePadrao().getId()),
                    () -> assertEquals(2, perfil.getSemestreAtual()),
                    () -> assertEquals(1, usuarioRepository.count()),
                    () -> assertEquals(1, perfilAlunoRepository.count()));
        });
    }

    @Test
    void deveReverterUsuarioEPerfilQuandoInsertDoPerfilFalharNoPostgres() {
        var confirmado = usuarioService.cadastrarAluno(cadastro("preservado@example.com", "52998224725"));
        // O trigger só rejeita o segundo cadastro, após enxergar o INSERT real do usuário.
        // SQLSTATE 23514 representa uma violação de integridade gerada pelo PostgreSQL.
        jdbc.execute("""
                CREATE FUNCTION rejeitar_perfil_teste() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM usuarios
                               WHERE id = NEW.usuario_id AND email = 'rollback@example.com') THEN
                        RAISE EXCEPTION 'FALHA_PERFIL_APOS_INSERT_USUARIO:%', NEW.usuario_id
                            USING ERRCODE = '23514';
                    END IF;
                    RETURN NEW;
                END;
                $$
                """);
        try {
            jdbc.execute("""
                    CREATE TRIGGER rejeitar_perfil_teste BEFORE INSERT ON perfis_aluno
                    FOR EACH ROW EXECUTE FUNCTION rejeitar_perfil_teste()
                    """);
            var erro = assertThrows(DataIntegrityViolationException.class, () ->
                    usuarioService.cadastrarAluno(cadastro("rollback@example.com", "11144477735")));
            var causa = erro.getMostSpecificCause();
            assertInstanceOf(SQLException.class, causa);
            assertEquals("23514", ((SQLException) causa).getSQLState());
            String marcador = "FALHA_PERFIL_APOS_INSERT_USUARIO:";
            String mensagem = causa.getMessage();
            assertTrue(mensagem.contains(marcador), "A falha deve vir do trigger após o INSERT do usuário.");
            int inicioId = mensagem.indexOf(marcador) + marcador.length();
            UUID usuarioRevertidoId = UUID.fromString(mensagem.substring(inicioId, inicioId + 36));
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());

            novaTransacao.executeWithoutResult(status -> {
                assertAll(() -> assertFalse(usuarioRepository.existsById(usuarioRevertidoId)),
                        () -> assertFalse(usuarioRepository.existsByEmail("rollback@example.com")),
                        () -> assertFalse(usuarioRepository.existsByCpf("11144477735")),
                        () -> assertFalse(perfilAlunoRepository.existsByUsuarioId(usuarioRevertidoId)),
                        () -> assertTrue(usuarioRepository.existsById(confirmado.id())),
                        () -> assertTrue(perfilAlunoRepository.existsByUsuarioId(confirmado.id())),
                        () -> assertEquals(1, usuarioRepository.count()),
                        () -> assertEquals(1, perfilAlunoRepository.count()));
            });
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS rejeitar_perfil_teste ON perfis_aluno");
            jdbc.execute("DROP FUNCTION rejeitar_perfil_teste()");
        }
    }

    @Test
    void devePersistirAtualizacaoPorDirtyCheckingPreservandoPerfilEUsuario() {
        var aluno = usuarioService.cadastrarAluno(cadastro("dirty@example.com", "52998224725"));
        UUID perfilId = Objects.requireNonNull(novaTransacao.execute(status ->
                perfilAlunoRepository.findByUsuarioId(aluno.id()).orElseThrow().getId()));
        var novasReferencias = persistirReferencias("Novo", ModalidadeEnsino.PRESENCIAL);

        perfilAlunoService.atualizarDados(aluno.id(), new AtualizacaoPerfilAlunoRequest(
                novasReferencias.ofertaId(), 7, novasReferencias.pontoId()));
        assertFalse(TransactionSynchronizationManager.isActualTransactionActive());

        // Novo EntityManager e nova transação: não verifica apenas o objeto alterado em memória.
        novaTransacao.executeWithoutResult(status -> {
            var perfil = perfilAlunoRepository.findByUsuarioId(aluno.id()).orElseThrow();
            assertAll(() -> assertEquals(perfilId, perfil.getId()),
                    () -> assertEquals(aluno.id(), perfil.getUsuario().getId()),
                    () -> assertEquals(novasReferencias.ofertaId(), perfil.getCursoOfertado().getId()),
                    () -> assertEquals(novasReferencias.pontoId(), perfil.getPontoEmbarquePadrao().getId()),
                    () -> assertEquals(7, perfil.getSemestreAtual()),
                    () -> assertEquals(1, perfilAlunoRepository.count()),
                    () -> assertEquals(1, usuarioRepository.count()));
        });
    }
}
