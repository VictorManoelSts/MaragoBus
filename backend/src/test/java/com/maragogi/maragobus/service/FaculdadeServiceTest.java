package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.faculdade.AtualizacaoFaculdadeRequest;
import com.maragogi.maragobus.dto.faculdade.CadastroFaculdadeRequest;
import com.maragogi.maragobus.entity.Faculdade;
import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.entity.Curso;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.FaculdadeRepository;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FaculdadeServiceTest {
    @Mock private FaculdadeRepository faculdadeRepository;
    @InjectMocks private FaculdadeService service;
    private FaculdadeService proxy;
    private static ValidatorFactory validatorFactory;
    private final UUID id = UUID.randomUUID();
    private final Faculdade faculdade = Faculdade.builder().id(id).nome("Faculdade Original").build();

    @BeforeAll
    static void iniciarValidador() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
    }

    @AfterAll
    static void fecharValidador() {
        validatorFactory.close();
    }

    @BeforeEach
    void criarProxyComValidacaoReal() {
        var factory = new ProxyFactory(service);
        factory.addAdvice(new MethodValidationInterceptor(validatorFactory.getValidator()));
        proxy = (FaculdadeService) factory.getProxy();
    }

    private void faculdadeDisponivel() {
        when(faculdadeRepository.findById(id)).thenReturn(Optional.of(faculdade));
    }

    private void verificarFaculdadePreservada(boolean ativo) {
        assertAll(() -> assertEquals(id, faculdade.getId()),
                () -> assertEquals("Faculdade Original", faculdade.getNome()),
                () -> assertEquals(ativo, faculdade.isAtivo()));
    }

    @Test
    void deveCadastrarAtivoComNomeAparado() {
        when(faculdadeRepository.save(any(Faculdade.class))).thenAnswer(invocacao -> {
            Faculdade salvo = invocacao.getArgument(0);
            salvo.setId(id);
            return salvo;
        });
        var resposta = proxy.cadastrar(new CadastroFaculdadeRequest(" Faculdade Original "));
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Faculdade Original", resposta.nome()),
                () -> assertTrue(resposta.ativo()));
        verify(faculdadeRepository).existsByNome("Faculdade Original");
        verify(faculdadeRepository).save(org.mockito.ArgumentMatchers.argThat(salvo ->
                salvo.isAtivo() && salvo.getNome().equals("Faculdade Original")));
        verifyNoMoreInteractions(faculdadeRepository);
    }

    static Stream<String> nomesInvalidos() {
        return Stream.of(null, "", "   ", "\t\n", "a".repeat(151));
    }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarCadastroComNomeInvalidoPelaValidacaoJakarta(String nome) {
        assertThrows(ConstraintViolationException.class, () -> proxy.cadastrar(new CadastroFaculdadeRequest(nome)));
        verifyNoInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarAtualizacaoInvalidaAntesDeConsultarOuModificarFaculdade(String nome) {
        assertThrows(ConstraintViolationException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest(nome)));
        verificarFaculdadePreservada(true);
        verifyNoInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"cadastro", "atualizacao", "consulta", "desativacao", "reativacao"})
    void deveRejeitarParametrosObrigatoriosNulos(String operacao) {
        assertThrows(ConstraintViolationException.class, () -> {
            switch (operacao) {
                case "cadastro" -> proxy.cadastrar(null);
                case "atualizacao" -> proxy.atualizarDados(id, null);
                case "consulta" -> proxy.buscarPorId(null);
                case "desativacao" -> proxy.desativar(null);
                default -> proxy.reativar(null);
            }
        });
        verificarFaculdadePreservada(true);
        verifyNoInteractions(faculdadeRepository);
    }

    @Test
    void deveAceitarNomeComExatamente150Caracteres() {
        String nome = "a".repeat(150);
        when(faculdadeRepository.save(any(Faculdade.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
        assertEquals(nome, proxy.cadastrar(new CadastroFaculdadeRequest(nome)).nome());
        faculdadeDisponivel();
        assertEquals(nome, proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest(nome)).nome());
    }

    @Test
    void deveRejeitarCadastroComNomeJaExistenteInclusiveInativo() {
        when(faculdadeRepository.existsByNome("Faculdade Original")).thenReturn(true);
        var erro = assertThrows(RegraNegocioException.class,
                () -> proxy.cadastrar(new CadastroFaculdadeRequest(" Faculdade Original ")));
        assertEquals("Já existe uma faculdade com este nome.", erro.getMessage());
        verify(faculdadeRepository).existsByNome("Faculdade Original");
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveConsultarFaculdadeAtivaOuInativaSemAlteracoes(boolean ativo) {
        faculdade.setAtivo(ativo);
        faculdadeDisponivel();
        var resposta = proxy.buscarPorId(id);
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Faculdade Original", resposta.nome()),
                () -> assertEquals(ativo, resposta.ativo()));
        verificarFaculdadePreservada(ativo);
        verify(faculdadeRepository).findById(id);
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "atualizacao", "desativacao", "reativacao"})
    void deveRejeitarFaculdadeInexistenteSemOutrasOperacoes(String operacao) {
        when(faculdadeRepository.findById(id)).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> {
            switch (operacao) {
                case "consulta" -> proxy.buscarPorId(id);
                case "atualizacao" -> proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest("Faculdade Nova"));
                case "desativacao" -> proxy.desativar(id);
                default -> proxy.reativar(id);
            }
        });
        assertEquals("Faculdade não encontrada.", erro.getMessage());
        verificarFaculdadePreservada(true);
        verify(faculdadeRepository).findById(id);
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void deveListarTodosIncluindoInativosSemModificaLos() {
        var inativo = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade Nova").ativo(false).build();
        when(faculdadeRepository.findAll()).thenReturn(List.of(faculdade, inativo));
        var respostas = proxy.listarTodos();
        assertEquals(2, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        assertEquals(inativo.getId(), respostas.getLast().id());
        assertEquals("Faculdade Nova", respostas.getLast().nome());
        assertFalse(respostas.getLast().ativo());
        verificarFaculdadePreservada(true);
        assertFalse(inativo.isAtivo());
        verify(faculdadeRepository).findAll();
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void deveListarAtivosPeloRepositorySemFiltrarEmMemoria() {
        when(faculdadeRepository.findByAtivoTrue()).thenReturn(List.of(faculdade));
        var respostas = proxy.listarAtivos();
        assertEquals(1, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        verificarFaculdadePreservada(true);
        verify(faculdadeRepository).findByAtivoTrue();
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void deveRetornarListasVaziasQuandoNaoHaFaculdades() {
        when(faculdadeRepository.findAll()).thenReturn(List.of());
        when(faculdadeRepository.findByAtivoTrue()).thenReturn(List.of());
        assertTrue(proxy.listarTodos().isEmpty());
        assertTrue(proxy.listarAtivos().isEmpty());
        verify(faculdadeRepository).findAll();
        verify(faculdadeRepository).findByAtivoTrue();
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveAtualizarSomenteNomePreservandoIdEAtivacao(boolean ativo) {
        faculdade.setAtivo(ativo);
        faculdadeDisponivel();
        var resposta = proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest(" Faculdade Nova "));
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Faculdade Nova", resposta.nome()),
                () -> assertEquals(ativo, resposta.ativo()),
                () -> assertEquals("Faculdade Nova", faculdade.getNome()),
                () -> assertEquals(id, faculdade.getId()),
                () -> assertEquals(ativo, faculdade.isAtivo()));
        verify(faculdadeRepository).findById(id);
        verify(faculdadeRepository).existsByNome("Faculdade Nova");
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void devePermitirManterNomeSemConsiderarAPropriaFaculdadeDuplicada() {
        faculdadeDisponivel();
        assertEquals("Faculdade Original", proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest(" Faculdade Original ")).nome());
        verificarFaculdadePreservada(true);
        verify(faculdadeRepository).findById(id);
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void deveRejeitarNomeDuplicadoNaAtualizacaoSemAlteracoesParciais() {
        faculdade.setAtivo(false);
        faculdadeDisponivel();
        when(faculdadeRepository.existsByNome("Faculdade Nova")).thenReturn(true);
        assertThrows(RegraNegocioException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest("Faculdade Nova")));
        verificarFaculdadePreservada(false);
        verify(faculdadeRepository).findById(id);
        verify(faculdadeRepository).existsByNome("Faculdade Nova");
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveDesativarLogicamenteInclusiveSeJaInativo(boolean ativo) {
        faculdade.setAtivo(ativo);
        faculdadeDisponivel();
        proxy.desativar(id);
        verificarFaculdadePreservada(false);
        verify(faculdadeRepository).findById(id);
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveReativarInclusiveSeJaAtivo(boolean ativo) {
        faculdade.setAtivo(ativo);
        faculdadeDisponivel();
        proxy.reativar(id);
        verificarFaculdadePreservada(true);
        verify(faculdadeRepository).findById(id);
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @Test
    void devePreservarOfertasAoRenomearDesativarEReativarFaculdade() {
        faculdadeDisponivel();
        var curso = Curso.builder().id(UUID.randomUUID()).nome("Direito").build();
        UUID ofertaId = UUID.randomUUID();
        var oferta = CursoOfertado.builder().id(ofertaId).faculdade(faculdade).curso(curso)
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build();
        var ofertaInativa = CursoOfertado.builder().id(UUID.randomUUID()).faculdade(faculdade)
                .curso(curso).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).ativo(false).build();
        proxy.atualizarDados(id, new AtualizacaoFaculdadeRequest("Faculdade Nova"));
        proxy.desativar(id);
        assertFalse(oferta.getFaculdade().isAtivo());
        assertTrue(oferta.isAtivo());
        assertFalse(ofertaInativa.isAtivo());
        proxy.reativar(id);
        assertAll(() -> assertSame(faculdade, oferta.getFaculdade()),
                () -> assertSame(faculdade, ofertaInativa.getFaculdade()),
                () -> assertEquals(id, faculdade.getId()),
                () -> assertEquals(ofertaId, oferta.getId()),
                () -> assertSame(curso, oferta.getCurso()),
                () -> assertEquals(ModalidadeEnsino.PRESENCIAL, oferta.getModalidadeEnsino()),
                () -> assertTrue(oferta.isAtivo()),
                () -> assertFalse(ofertaInativa.isAtivo()),
                () -> assertEquals("Faculdade Nova", oferta.getFaculdade().getNome()));
        verify(faculdadeRepository, times(3)).findById(id);
        verify(faculdadeRepository).existsByNome("Faculdade Nova");
        verifyNoMoreInteractions(faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"buscarPorId", "listarTodos", "listarAtivos", "cadastrar", "atualizarDados", "desativar", "reativar"})
    void deveDeclararTransacoesDeLeituraOuEscrita(String metodo) throws NoSuchMethodException {
        var assinatura = switch (metodo) {
            case "listarTodos", "listarAtivos" -> FaculdadeService.class.getMethod(metodo);
            case "cadastrar" -> FaculdadeService.class.getMethod(metodo, CadastroFaculdadeRequest.class);
            case "atualizarDados" -> FaculdadeService.class.getMethod(metodo, UUID.class, AtualizacaoFaculdadeRequest.class);
            default -> FaculdadeService.class.getMethod(metodo, UUID.class);
        };
        var atributo = new AnnotationTransactionAttributeSource().getTransactionAttribute(assinatura, FaculdadeService.class);
        assertNotNull(atributo);
        assertEquals(List.of("buscarPorId", "listarTodos", "listarAtivos").contains(metodo), atributo.isReadOnly());
    }
}
