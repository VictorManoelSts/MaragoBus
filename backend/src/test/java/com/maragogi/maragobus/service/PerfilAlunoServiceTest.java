package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.perfilaluno.AtualizacaoPerfilAlunoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PerfilAlunoServiceTest {
    @Mock private PerfilAlunoRepository perfilAlunoRepository;
    @Mock private CursoOfertadoRepository cursoOfertadoRepository;
    @Mock private PontoEmbarqueRepository pontoEmbarqueRepository;
    @InjectMocks private PerfilAlunoService service;

    private final Usuario usuario = Usuario.builder().id(UUID.randomUUID()).build();
    private final CursoOfertado original = oferta();
    private final PontoEmbarque pontoOriginal = ponto();
    private final PerfilAluno perfil = PerfilAluno.builder().id(UUID.randomUUID()).usuario(usuario)
            .cursoOfertado(original).semestreAtual(2).pontoEmbarquePadrao(pontoOriginal).build();
    private final CursoOfertado novaOferta = oferta();
    private final PontoEmbarque novoPonto = ponto();

    private static CursoOfertado oferta() {
        return CursoOfertado.builder().id(UUID.randomUUID())
                .curso(Curso.builder().id(UUID.randomUUID()).nome("Direito").build())
                .faculdade(Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade Teste").build())
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build();
    }

    private static PontoEmbarque ponto() {
        return PontoEmbarque.builder().id(UUID.randomUUID()).nome("Centro").descricao("Praça central").build();
    }

    @BeforeEach
    void perfilDisponivel() {
        when(perfilAlunoRepository.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(perfil));
    }

    private AtualizacaoPerfilAlunoRequest dados(Integer semestre) {
        return new AtualizacaoPerfilAlunoRequest(novaOferta.getId(), semestre, novoPonto.getId());
    }

    private void ofertaDisponivel() {
        when(cursoOfertadoRepository.findById(novaOferta.getId())).thenReturn(Optional.of(novaOferta));
    }

    private void referenciasDisponiveis() {
        ofertaDisponivel();
        when(pontoEmbarqueRepository.findById(novoPonto.getId())).thenReturn(Optional.of(novoPonto));
    }

    private void verificarPerfilPreservado() {
        assertAll(() -> assertSame(usuario, perfil.getUsuario()),
                () -> assertSame(original, perfil.getCursoOfertado()),
                () -> assertSame(pontoOriginal, perfil.getPontoEmbarquePadrao()),
                () -> assertEquals(2, perfil.getSemestreAtual()));
        verify(perfilAlunoRepository).findByUsuarioId(usuario.getId());
        verifyNoMoreInteractions(perfilAlunoRepository);
    }

    @Test
    void deveConsultarTodosOsDadosAcademicos() {
        var resposta = service.buscarPorUsuarioId(usuario.getId());
        assertAll(() -> assertEquals(usuario.getId(), resposta.usuarioId()),
                () -> assertEquals(perfil.getId(), resposta.perfilId()),
                () -> assertEquals(original.getId(), resposta.cursoOfertadoId()),
                () -> assertEquals(original.getCurso().getId(), resposta.cursoId()),
                () -> assertEquals("Direito", resposta.cursoNome()),
                () -> assertEquals(original.getFaculdade().getId(), resposta.faculdadeId()),
                () -> assertEquals("Faculdade Teste", resposta.faculdadeNome()),
                () -> assertEquals(ModalidadeEnsino.PRESENCIAL, resposta.modalidadeEnsino()),
                () -> assertEquals(2, resposta.semestreAtual()),
                () -> assertEquals(pontoOriginal.getId(), resposta.pontoEmbarquePadraoId()),
                () -> assertEquals("Centro", resposta.pontoEmbarquePadraoNome()),
                () -> assertEquals("Praça central", resposta.pontoEmbarquePadraoDescricao()));
        verificarPerfilPreservado();
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void deveRejeitarPerfilInexistenteNaConsultaOuAtualizacao(boolean atualizar) {
        when(perfilAlunoRepository.findByUsuarioId(usuario.getId())).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> {
            if (atualizar) service.atualizarDados(usuario.getId(), dados(3));
            else service.buscarPorUsuarioId(usuario.getId());
        });
        assertEquals("Perfil de aluno não encontrado.", erro.getMessage());
        verificarPerfilPreservado();
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @EnumSource(ModalidadeEnsino.class)
    void deveAtualizarSemCriarPerfilOuAlterarUsuarioEPermitirQualquerModalidade(ModalidadeEnsino modalidade) {
        novaOferta.setModalidadeEnsino(modalidade);
        referenciasDisponiveis();
        UUID perfilId = perfil.getId();
        var resposta = service.atualizarDados(usuario.getId(), dados(Integer.MAX_VALUE));
        assertAll(() -> assertSame(usuario, perfil.getUsuario()),
                () -> assertEquals(perfilId, perfil.getId()),
                () -> assertSame(novaOferta, perfil.getCursoOfertado()),
                () -> assertSame(novoPonto, perfil.getPontoEmbarquePadrao()),
                () -> assertEquals(Integer.MAX_VALUE, perfil.getSemestreAtual()),
                () -> assertEquals(usuario.getId(), resposta.usuarioId()),
                () -> assertEquals(perfilId, resposta.perfilId()),
                () -> assertEquals(novaOferta.getId(), resposta.cursoOfertadoId()),
                () -> assertEquals(novoPonto.getId(), resposta.pontoEmbarquePadraoId()),
                () -> assertEquals(modalidade, resposta.modalidadeEnsino()),
                () -> assertEquals(Integer.MAX_VALUE, resposta.semestreAtual()));
        verify(perfilAlunoRepository).findByUsuarioId(usuario.getId());
        verifyNoMoreInteractions(perfilAlunoRepository);
    }

    @Test
    void deveRejeitarOfertaInexistenteSemModificarPerfil() {
        when(cursoOfertadoRepository.findById(novaOferta.getId())).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class,
                () -> service.atualizarDados(usuario.getId(), dados(3)));
        assertEquals("Curso ofertado não encontrado.", erro.getMessage());
        verificarPerfilPreservado();
        verifyNoInteractions(pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"oferta", "curso", "faculdade"})
    void deveRejeitarVinculoAcademicoInativoSemModificarPerfil(String vinculo) {
        String mensagem = switch (vinculo) {
            case "oferta" -> { novaOferta.setAtivo(false); yield "O curso ofertado está inativo."; }
            case "curso" -> { novaOferta.getCurso().setAtivo(false); yield "O curso está inativo."; }
            default -> { novaOferta.getFaculdade().setAtivo(false); yield "A faculdade está inativa."; }
        };
        ofertaDisponivel();
        var erro = assertThrows(RegraNegocioException.class, () -> service.atualizarDados(usuario.getId(), dados(3)));
        assertEquals(mensagem, erro.getMessage());
        verificarPerfilPreservado();
        verifyNoInteractions(pontoEmbarqueRepository);
    }

    @Test
    void deveRejeitarPontoInexistenteSemAplicarOfertaJaValidada() {
        ofertaDisponivel();
        when(pontoEmbarqueRepository.findById(novoPonto.getId())).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class,
                () -> service.atualizarDados(usuario.getId(), dados(3)));
        assertEquals("Ponto de embarque não encontrado.", erro.getMessage());
        verificarPerfilPreservado();
    }

    @Test
    void deveRejeitarPontoInativoSemAplicarOfertaJaValidada() {
        novoPonto.setAtivo(false);
        referenciasDisponiveis();
        var erro = assertThrows(RegraNegocioException.class, () -> service.atualizarDados(usuario.getId(), dados(3)));
        assertEquals("O ponto de embarque está inativo.", erro.getMessage());
        verificarPerfilPreservado();
    }

    static Stream<Integer> semestresInvalidos() { return Stream.of(null, 0, -1); }

    @ParameterizedTest
    @MethodSource("semestresInvalidos")
    void deveRejeitarSemestreInvalidoSemModificarPerfil(Integer semestre) {
        var erro = assertThrows(RegraNegocioException.class,
                () -> service.atualizarDados(usuario.getId(), dados(semestre)));
        assertEquals("O semestre atual deve ser um número positivo.", erro.getMessage());
        verificarPerfilPreservado();
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"dados", "curso", "ponto"})
    void deveRejeitarDadosObrigatoriosAusentes(String campo) {
        var request = switch (campo) {
            case "dados" -> null;
            case "curso" -> new AtualizacaoPerfilAlunoRequest(null, 3, novoPonto.getId());
            default -> new AtualizacaoPerfilAlunoRequest(novaOferta.getId(), 3, null);
        };
        assertThrows(RegraNegocioException.class, () -> service.atualizarDados(usuario.getId(), request));
        verificarPerfilPreservado();
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    private void desativarHistorico() {
        original.setAtivo(false);
        original.getCurso().setAtivo(false);
        original.getFaculdade().setAtivo(false);
        pontoOriginal.setAtivo(false);
    }

    @Test
    void deveConsultarHistoricoInativo() {
        desativarHistorico();
        assertEquals(original.getId(), service.buscarPorUsuarioId(usuario.getId()).cursoOfertadoId());
        verificarPerfilPreservado();
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    @Test
    void deveAtualizarSemestreMantendoVinculosHistoricosInativosSemConsultasAdicionais() {
        desativarHistorico();
        var resposta = service.atualizarDados(usuario.getId(),
                new AtualizacaoPerfilAlunoRequest(original.getId(), 3, pontoOriginal.getId()));
        assertEquals(3, resposta.semestreAtual());
        assertSame(usuario, perfil.getUsuario());
        assertSame(original, perfil.getCursoOfertado());
        assertSame(pontoOriginal, perfil.getPontoEmbarquePadrao());
        verify(perfilAlunoRepository).findByUsuarioId(usuario.getId());
        verifyNoMoreInteractions(perfilAlunoRepository);
        verifyNoInteractions(cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void deveValidarSomenteOVinculoSubstituido(boolean trocarCurso) {
        desativarHistorico();
        if (trocarCurso) ofertaDisponivel();
        else when(pontoEmbarqueRepository.findById(novoPonto.getId())).thenReturn(Optional.of(novoPonto));
        var resposta = service.atualizarDados(usuario.getId(), new AtualizacaoPerfilAlunoRequest(
                trocarCurso ? novaOferta.getId() : original.getId(), 3,
                trocarCurso ? pontoOriginal.getId() : novoPonto.getId()));
        assertEquals(trocarCurso ? novaOferta.getId() : original.getId(), resposta.cursoOfertadoId());
        assertEquals(trocarCurso ? pontoOriginal.getId() : novoPonto.getId(), resposta.pontoEmbarquePadraoId());
        if (trocarCurso) verifyNoInteractions(pontoEmbarqueRepository);
        else verifyNoInteractions(cursoOfertadoRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "atualizacao", "rejeicao"})
    void deveAplicarFronteiraTransacionalPeloProxySpring(String operacao) {
        var manager = mock(PlatformTransactionManager.class);
        var status = mock(TransactionStatus.class);
        when(manager.getTransaction(any())).thenReturn(status);
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(manager);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(service);
        factory.addAdvice(interceptor);
        var proxy = (PerfilAlunoService) factory.getProxy();

        switch (operacao) {
            case "consulta" -> proxy.buscarPorUsuarioId(usuario.getId());
            case "atualizacao" -> {
                referenciasDisponiveis();
                proxy.atualizarDados(usuario.getId(), dados(3));
            }
            default -> {
                assertThrows(RegraNegocioException.class, () -> proxy.atualizarDados(usuario.getId(), dados(0)));
                verificarPerfilPreservado();
            }
        }
        verify(manager).getTransaction(argThat(definition ->
                definition.isReadOnly() == operacao.equals("consulta")
                        && definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRED));
        if (operacao.equals("rejeicao")) verify(manager).rollback(status);
        else verify(manager).commit(status);
        verifyNoMoreInteractions(manager);
        // O proxy verifica a fronteira transacional, sem comprovar dirty checking ou rollback no PostgreSQL.
    }
}
