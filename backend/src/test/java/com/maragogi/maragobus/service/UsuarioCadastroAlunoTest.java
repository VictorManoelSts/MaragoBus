package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.usuario.CadastroAlunoRequest;
import com.maragogi.maragobus.dto.usuario.CadastroUsuarioRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioCadastroAlunoTest {
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CursoOfertadoRepository cursoOfertadoRepository;
    @Mock private PontoEmbarqueRepository pontoEmbarqueRepository;
    @Mock private PerfilAlunoRepository perfilAlunoRepository;
    @InjectMocks private UsuarioService service;

    private final UUID cursoId = UUID.randomUUID();
    private final UUID pontoId = UUID.randomUUID();
    private final UUID usuarioId = UUID.randomUUID();
    private final CadastroUsuarioRequest pessoal = new CadastroUsuarioRequest(" Aluno ", "52998224725",
            "82999999999", " Rua Teste ", null, " ALUNO@EXEMPLO.COM ", "Senha123!");
    private final CursoOfertado cursoOfertado = CursoOfertado.builder().id(cursoId)
            .curso(new Curso()).faculdade(new Faculdade()).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build();
    private final PontoEmbarque ponto = PontoEmbarque.builder().id(pontoId).build();

    private CadastroAlunoRequest dados(Integer semestre) {
        return new CadastroAlunoRequest(pessoal, cursoId, semestre, pontoId);
    }

    private void cursoDisponivel() {
        when(cursoOfertadoRepository.findById(cursoId)).thenReturn(Optional.of(cursoOfertado));
    }

    private void referenciasDisponiveis() {
        cursoDisponivel();
        when(pontoEmbarqueRepository.findById(pontoId)).thenReturn(Optional.of(ponto));
    }

    private void salvarUsuario() {
        when(passwordEncoder.encode(pessoal.senha())).thenReturn("hash-da-senha");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacao -> {
            Usuario usuario = invocacao.getArgument(0);
            usuario.setId(usuarioId);
            return usuario;
        });
    }

    private void verificarNenhumaPersistencia() {
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(perfilAlunoRepository);
    }

    @ParameterizedTest
    @EnumSource(ModalidadeEnsino.class)
    void deveCadastrarUsuarioEPerfilAssociadosSemRestringirModalidadeOuSemestre(ModalidadeEnsino modalidade) {
        cursoOfertado.setModalidadeEnsino(modalidade);
        referenciasDisponiveis();
        salvarUsuario();

        var resposta = service.cadastrarAluno(dados(Integer.MAX_VALUE));

        var usuarios = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        var perfis = org.mockito.ArgumentCaptor.forClass(PerfilAluno.class);
        var ordem = inOrder(usuarioRepository, perfilAlunoRepository);
        ordem.verify(usuarioRepository).save(usuarios.capture());
        ordem.verify(perfilAlunoRepository).existsByUsuarioId(usuarioId);
        ordem.verify(perfilAlunoRepository).save(perfis.capture());
        Usuario usuario = usuarios.getValue();
        PerfilAluno perfil = perfis.getValue();
        assertAll(
                () -> assertEquals(usuarioId, resposta.id()),
                () -> assertEquals(TipoUsuario.ALUNO, resposta.tipoUsuario()),
                () -> assertTrue(resposta.ativo()),
                () -> assertEquals("Aluno", usuario.getNome()),
                () -> assertEquals("aluno@exemplo.com", usuario.getEmail()),
                () -> assertEquals("Rua Teste", usuario.getEndereco()),
                () -> assertEquals("hash-da-senha", usuario.getSenha()),
                () -> assertSame(usuario, perfil.getUsuario()),
                () -> assertSame(cursoOfertado, perfil.getCursoOfertado()),
                () -> assertSame(cursoOfertado.getFaculdade(), perfil.getCursoOfertado().getFaculdade()),
                () -> assertEquals(modalidade, perfil.getCursoOfertado().getModalidadeEnsino()),
                () -> assertSame(ponto, perfil.getPontoEmbarquePadrao()),
                () -> assertEquals(Integer.MAX_VALUE, perfil.getSemestreAtual())
        );
        verifyNoMoreInteractions(perfilAlunoRepository);
    }

    @Test
    void naoDeveCadastrarComCursoOfertadoInexistente() {
        when(cursoOfertadoRepository.findById(cursoId)).thenReturn(Optional.empty());
        var excecao = assertThrows(RecursoNaoEncontradoException.class, () -> service.cadastrarAluno(dados(1)));
        assertEquals("Curso ofertado não encontrado.", excecao.getMessage());
        verificarNenhumaPersistencia();
        verifyNoInteractions(pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"oferta", "curso", "faculdade"})
    void naoDeveCadastrarComRelacionamentoAcademicoInativo(String relacionamento) {
        String mensagem = switch (relacionamento) {
            case "oferta" -> { cursoOfertado.setAtivo(false); yield "O curso ofertado está inativo."; }
            case "curso" -> { cursoOfertado.getCurso().setAtivo(false); yield "O curso está inativo."; }
            default -> { cursoOfertado.getFaculdade().setAtivo(false); yield "A faculdade está inativa."; }
        };
        cursoDisponivel();
        var excecao = assertThrows(RegraNegocioException.class, () -> service.cadastrarAluno(dados(1)));
        assertEquals(mensagem, excecao.getMessage());
        verificarNenhumaPersistencia();
        verifyNoInteractions(pontoEmbarqueRepository);
    }

    @Test
    void naoDeveCadastrarComPontoInexistente() {
        cursoDisponivel();
        when(pontoEmbarqueRepository.findById(pontoId)).thenReturn(Optional.empty());
        var excecao = assertThrows(RecursoNaoEncontradoException.class, () -> service.cadastrarAluno(dados(1)));
        assertEquals("Ponto de embarque não encontrado.", excecao.getMessage());
        verificarNenhumaPersistencia();
    }

    @Test
    void naoDeveCadastrarComPontoInativo() {
        ponto.setAtivo(false);
        referenciasDisponiveis();
        var excecao = assertThrows(RegraNegocioException.class, () -> service.cadastrarAluno(dados(1)));
        assertEquals("O ponto de embarque está inativo.", excecao.getMessage());
        verificarNenhumaPersistencia();
    }

    static Stream<Integer> semestresInvalidos() { return Stream.of(null, 0, -1); }

    @ParameterizedTest
    @MethodSource("semestresInvalidos")
    void naoDeveCadastrarComSemestreInvalido(Integer semestre) {
        var excecao = assertThrows(RegraNegocioException.class, () -> service.cadastrarAluno(dados(semestre)));
        assertEquals("O semestre atual deve ser um número positivo.", excecao.getMessage());
        verifyNoInteractions(usuarioRepository, passwordEncoder, cursoOfertadoRepository,
                pontoEmbarqueRepository, perfilAlunoRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"dados", "pessoal", "curso", "ponto"})
    void naoDeveCadastrarComDadosObrigatoriosAusentes(String campo) {
        CadastroAlunoRequest request = switch (campo) {
            case "dados" -> null;
            case "pessoal" -> new CadastroAlunoRequest(null, cursoId, 1, pontoId);
            case "curso" -> new CadastroAlunoRequest(pessoal, null, 1, pontoId);
            default -> new CadastroAlunoRequest(pessoal, cursoId, 1, null);
        };
        assertThrows(RegraNegocioException.class, () -> service.cadastrarAluno(request));
        verifyNoInteractions(usuarioRepository, passwordEncoder, cursoOfertadoRepository,
                pontoEmbarqueRepository, perfilAlunoRepository);
    }

    @Test
    void naoDeveCriarPerfilDuplicadoParaUsuario() {
        referenciasDisponiveis();
        salvarUsuario();
        when(perfilAlunoRepository.existsByUsuarioId(usuarioId)).thenReturn(true);
        var excecao = assertThrows(RegraNegocioException.class, () -> service.cadastrarAluno(dados(1)));
        assertEquals("Já existe um perfil de aluno para este usuário.", excecao.getMessage());
        verify(perfilAlunoRepository, never()).save(any());
    }

    @Test
    void devePropagarFalhaDePersistenciaDoPerfilParaRollbackPeloSpring() {
        referenciasDisponiveis();
        salvarUsuario();
        var falha = new org.springframework.dao.DataIntegrityViolationException("Falha de persistência do perfil.");
        when(perfilAlunoRepository.save(any(PerfilAluno.class))).thenThrow(falha);

        assertSame(falha, assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.cadastrarAluno(dados(1))));
        verify(usuarioRepository).save(any(Usuario.class));
        verify(perfilAlunoRepository).save(any(PerfilAluno.class));
        // Mockito comprova a propagação, mas não executa uma transação nem comprova rollback no banco.
    }

    @Test
    void naoDevePersistirPerfilSePersistenciaDoUsuarioFalhar() {
        referenciasDisponiveis();
        var falha = new org.springframework.dao.DataIntegrityViolationException("Falha de persistência do usuário.");
        when(usuarioRepository.save(any(Usuario.class))).thenThrow(falha);
        assertSame(falha, assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> service.cadastrarAluno(dados(1))));
        verifyNoInteractions(perfilAlunoRepository);
    }

    @ParameterizedTest
    @CsvSource({"true", "false"})
    void deveConcluirUmaUnicaTransacaoPeloProxySpring(boolean falhaNoPerfil) {
        referenciasDisponiveis();
        salvarUsuario();
        var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
        var status = mock(org.springframework.transaction.TransactionStatus.class);
        when(manager.getTransaction(any())).thenReturn(status);
        var interceptor = new org.springframework.transaction.interceptor.TransactionInterceptor();
        interceptor.setTransactionManager(manager);
        interceptor.setTransactionAttributeSource(
                new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource());
        var factory = new org.springframework.aop.framework.ProxyFactory(service);
        factory.addAdvice(interceptor);
        var proxy = (UsuarioService) factory.getProxy();

        if (falhaNoPerfil) {
            var falha = new org.springframework.dao.DataIntegrityViolationException("Falha de persistência do perfil.");
            when(perfilAlunoRepository.save(any(PerfilAluno.class))).thenThrow(falha);
            assertSame(falha, assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                    () -> proxy.cadastrarAluno(dados(1))));
            verify(manager).rollback(status);
            verify(manager, never()).commit(any());
        } else {
            assertEquals(usuarioId, proxy.cadastrarAluno(dados(1)).id());
            verify(manager).commit(status);
            verify(manager, never()).rollback(any());
        }
        verify(manager).getTransaction(org.mockito.ArgumentMatchers.argThat(definition ->
                definition.getPropagationBehavior() == org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRED));
        verifyNoMoreInteractions(manager);
        verify(usuarioRepository).save(any(Usuario.class));
        verify(perfilAlunoRepository).save(any(PerfilAluno.class));
        // O proxy comprova a fronteira transacional; os repositories simulados não comprovam rollback no PostgreSQL.
    }
}
