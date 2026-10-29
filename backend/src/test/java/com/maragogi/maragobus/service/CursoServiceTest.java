package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.curso.AtualizacaoCursoRequest;
import com.maragogi.maragobus.dto.curso.CadastroCursoRequest;
import com.maragogi.maragobus.entity.Curso;
import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.entity.Faculdade;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.CursoRepository;
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
class CursoServiceTest {
    @Mock private CursoRepository cursoRepository;
    @InjectMocks private CursoService service;
    private CursoService proxy;
    private static ValidatorFactory validatorFactory;
    private final UUID id = UUID.randomUUID();
    private final Curso curso = Curso.builder().id(id).nome("Direito").build();

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
        proxy = (CursoService) factory.getProxy();
    }

    private void cursoDisponivel() {
        when(cursoRepository.findById(id)).thenReturn(Optional.of(curso));
    }

    private void verificarCursoPreservado(boolean ativo) {
        assertAll(() -> assertEquals(id, curso.getId()),
                () -> assertEquals("Direito", curso.getNome()),
                () -> assertEquals(ativo, curso.isAtivo()));
    }

    @Test
    void deveCadastrarAtivoComNomeAparado() {
        when(cursoRepository.save(any(Curso.class))).thenAnswer(invocacao -> {
            Curso salvo = invocacao.getArgument(0);
            salvo.setId(id);
            return salvo;
        });
        var resposta = proxy.cadastrar(new CadastroCursoRequest(" Direito "));
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Direito", resposta.nome()),
                () -> assertTrue(resposta.ativo()));
        verify(cursoRepository).existsByNome("Direito");
        verify(cursoRepository).save(org.mockito.ArgumentMatchers.argThat(salvo ->
                salvo.isAtivo() && salvo.getNome().equals("Direito")));
        verifyNoMoreInteractions(cursoRepository);
    }

    static Stream<String> nomesInvalidos() {
        return Stream.of(null, "", "   ", "\t\n", "a".repeat(151));
    }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarCadastroComNomeInvalidoPelaValidacaoJakarta(String nome) {
        assertThrows(ConstraintViolationException.class, () -> proxy.cadastrar(new CadastroCursoRequest(nome)));
        verifyNoInteractions(cursoRepository);
    }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarAtualizacaoInvalidaAntesDeConsultarOuModificarCurso(String nome) {
        assertThrows(ConstraintViolationException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoCursoRequest(nome)));
        verificarCursoPreservado(true);
        verifyNoInteractions(cursoRepository);
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
        verificarCursoPreservado(true);
        verifyNoInteractions(cursoRepository);
    }

    @Test
    void deveAceitarNomeComExatamente150Caracteres() {
        String nome = "a".repeat(150);
        when(cursoRepository.save(any(Curso.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
        assertEquals(nome, proxy.cadastrar(new CadastroCursoRequest(nome)).nome());
        cursoDisponivel();
        assertEquals(nome, proxy.atualizarDados(id, new AtualizacaoCursoRequest(nome)).nome());
    }

    @Test
    void deveRejeitarCadastroComNomeJaExistenteInclusiveInativo() {
        when(cursoRepository.existsByNome("Direito")).thenReturn(true);
        var erro = assertThrows(RegraNegocioException.class,
                () -> proxy.cadastrar(new CadastroCursoRequest(" Direito ")));
        assertEquals("Já existe um curso com este nome.", erro.getMessage());
        verify(cursoRepository).existsByNome("Direito");
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveConsultarCursoAtivoOuInativoSemAlteracoes(boolean ativo) {
        curso.setAtivo(ativo);
        cursoDisponivel();
        var resposta = proxy.buscarPorId(id);
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Direito", resposta.nome()),
                () -> assertEquals(ativo, resposta.ativo()));
        verificarCursoPreservado(ativo);
        verify(cursoRepository).findById(id);
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "atualizacao", "desativacao", "reativacao"})
    void deveRejeitarCursoInexistenteSemOutrasOperacoes(String operacao) {
        when(cursoRepository.findById(id)).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> {
            switch (operacao) {
                case "consulta" -> proxy.buscarPorId(id);
                case "atualizacao" -> proxy.atualizarDados(id, new AtualizacaoCursoRequest("Medicina"));
                case "desativacao" -> proxy.desativar(id);
                default -> proxy.reativar(id);
            }
        });
        assertEquals("Curso não encontrado.", erro.getMessage());
        verificarCursoPreservado(true);
        verify(cursoRepository).findById(id);
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void deveListarTodosIncluindoInativosSemModificaLos() {
        var inativo = Curso.builder().id(UUID.randomUUID()).nome("Medicina").ativo(false).build();
        when(cursoRepository.findAll()).thenReturn(List.of(curso, inativo));
        var respostas = proxy.listarTodos();
        assertEquals(2, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        assertEquals(inativo.getId(), respostas.getLast().id());
        assertEquals("Medicina", respostas.getLast().nome());
        assertFalse(respostas.getLast().ativo());
        verificarCursoPreservado(true);
        assertFalse(inativo.isAtivo());
        verify(cursoRepository).findAll();
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void deveListarAtivosPeloRepositorySemFiltrarEmMemoria() {
        when(cursoRepository.findAllByAtivoTrue()).thenReturn(List.of(curso));
        var respostas = proxy.listarAtivos();
        assertEquals(1, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        verificarCursoPreservado(true);
        verify(cursoRepository).findAllByAtivoTrue();
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void deveRetornarListasVaziasQuandoNaoHaCursos() {
        when(cursoRepository.findAll()).thenReturn(List.of());
        when(cursoRepository.findAllByAtivoTrue()).thenReturn(List.of());
        assertTrue(proxy.listarTodos().isEmpty());
        assertTrue(proxy.listarAtivos().isEmpty());
        verify(cursoRepository).findAll();
        verify(cursoRepository).findAllByAtivoTrue();
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveAtualizarSomenteNomePreservandoIdEAtivacao(boolean ativo) {
        curso.setAtivo(ativo);
        cursoDisponivel();
        var resposta = proxy.atualizarDados(id, new AtualizacaoCursoRequest(" Medicina "));
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Medicina", resposta.nome()),
                () -> assertEquals(ativo, resposta.ativo()),
                () -> assertEquals("Medicina", curso.getNome()),
                () -> assertEquals(id, curso.getId()),
                () -> assertEquals(ativo, curso.isAtivo()));
        verify(cursoRepository).findById(id);
        verify(cursoRepository).existsByNome("Medicina");
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void devePermitirManterNomeSemConsiderarOProprioCursoDuplicado() {
        cursoDisponivel();
        assertEquals("Direito", proxy.atualizarDados(id, new AtualizacaoCursoRequest(" Direito ")).nome());
        verificarCursoPreservado(true);
        verify(cursoRepository).findById(id);
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void deveRejeitarNomeDuplicadoNaAtualizacaoSemAlteracoesParciais() {
        curso.setAtivo(false);
        cursoDisponivel();
        when(cursoRepository.existsByNome("Medicina")).thenReturn(true);
        assertThrows(RegraNegocioException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoCursoRequest("Medicina")));
        verificarCursoPreservado(false);
        verify(cursoRepository).findById(id);
        verify(cursoRepository).existsByNome("Medicina");
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveDesativarLogicamenteInclusiveSeJaInativo(boolean ativo) {
        curso.setAtivo(ativo);
        cursoDisponivel();
        proxy.desativar(id);
        verificarCursoPreservado(false);
        verify(cursoRepository).findById(id);
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveReativarInclusiveSeJaAtivo(boolean ativo) {
        curso.setAtivo(ativo);
        cursoDisponivel();
        proxy.reativar(id);
        verificarCursoPreservado(true);
        verify(cursoRepository).findById(id);
        verifyNoMoreInteractions(cursoRepository);
    }

    @Test
    void devePreservarOfertasAoRenomearDesativarEReativarCurso() {
        cursoDisponivel();
        var faculdade = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade").build();
        UUID ofertaId = UUID.randomUUID();
        var oferta = CursoOfertado.builder().id(ofertaId).curso(curso).faculdade(faculdade)
                .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build();
        var ofertaInativa = CursoOfertado.builder().id(UUID.randomUUID()).curso(curso)
                .faculdade(faculdade).modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).ativo(false).build();
        proxy.atualizarDados(id, new AtualizacaoCursoRequest("Medicina"));
        proxy.desativar(id);
        assertFalse(oferta.getCurso().isAtivo());
        assertTrue(oferta.isAtivo());
        assertFalse(ofertaInativa.isAtivo());
        proxy.reativar(id);
        assertAll(() -> assertSame(curso, oferta.getCurso()),
                () -> assertSame(curso, ofertaInativa.getCurso()),
                () -> assertEquals(id, curso.getId()),
                () -> assertEquals(ofertaId, oferta.getId()),
                () -> assertSame(faculdade, oferta.getFaculdade()),
                () -> assertEquals(ModalidadeEnsino.PRESENCIAL, oferta.getModalidadeEnsino()),
                () -> assertTrue(oferta.isAtivo()),
                () -> assertFalse(ofertaInativa.isAtivo()),
                () -> assertEquals("Medicina", oferta.getCurso().getNome()));
        verify(cursoRepository, times(3)).findById(id);
        verify(cursoRepository).existsByNome("Medicina");
        verifyNoMoreInteractions(cursoRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"buscarPorId", "listarTodos", "listarAtivos", "cadastrar", "atualizarDados", "desativar", "reativar"})
    void deveDeclararTransacoesDeLeituraOuEscrita(String metodo) throws NoSuchMethodException {
        var assinatura = switch (metodo) {
            case "listarTodos", "listarAtivos" -> CursoService.class.getMethod(metodo);
            case "cadastrar" -> CursoService.class.getMethod(metodo, CadastroCursoRequest.class);
            case "atualizarDados" -> CursoService.class.getMethod(metodo, UUID.class, AtualizacaoCursoRequest.class);
            default -> CursoService.class.getMethod(metodo, UUID.class);
        };
        var atributo = new AnnotationTransactionAttributeSource().getTransactionAttribute(assinatura, CursoService.class);
        assertNotNull(atributo);
        assertEquals(List.of("buscarPorId", "listarTodos", "listarAtivos").contains(metodo), atributo.isReadOnly());
    }
}
