package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.cursoofertado.CadastroCursoOfertadoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.ModalidadeEnsino;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CursoOfertadoServiceTest {
    @Mock private CursoOfertadoRepository ofertaRepository;
    @Mock private CursoRepository cursoRepository;
    @Mock private FaculdadeRepository faculdadeRepository;
    @InjectMocks private CursoOfertadoService service;
    private CursoOfertadoService proxy;
    private static ValidatorFactory validatorFactory;
    private final Curso curso = Curso.builder().id(UUID.randomUUID()).nome("Direito").build();
    private final Faculdade faculdade = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade").build();
    private final UUID id = UUID.randomUUID();
    private final CursoOfertado oferta = CursoOfertado.builder().id(id).curso(curso).faculdade(faculdade)
            .modalidadeEnsino(ModalidadeEnsino.PRESENCIAL).build();

    @BeforeAll
    static void iniciarValidador() { validatorFactory = Validation.buildDefaultValidatorFactory(); }

    @AfterAll
    static void fecharValidador() { validatorFactory.close(); }

    @BeforeEach
    void criarProxyComValidacaoReal() {
        var factory = new ProxyFactory(service);
        factory.addAdvice(new MethodValidationInterceptor(validatorFactory.getValidator()));
        proxy = (CursoOfertadoService) factory.getProxy();
    }

    private CadastroCursoOfertadoRequest dados(ModalidadeEnsino modalidade) {
        return new CadastroCursoOfertadoRequest(curso.getId(), faculdade.getId(), modalidade);
    }

    private void cursoDisponivel() { when(cursoRepository.findById(curso.getId())).thenReturn(Optional.of(curso)); }

    private void referenciasDisponiveis() {
        cursoDisponivel();
        when(faculdadeRepository.findById(faculdade.getId())).thenReturn(Optional.of(faculdade));
    }

    private void ofertaDisponivel() { when(ofertaRepository.findById(id)).thenReturn(Optional.of(oferta)); }

    private void verificarCombinacaoPreservada() {
        assertAll(() -> assertEquals(id, oferta.getId()), () -> assertSame(curso, oferta.getCurso()),
                () -> assertSame(faculdade, oferta.getFaculdade()),
                () -> assertEquals(ModalidadeEnsino.PRESENCIAL, oferta.getModalidadeEnsino()));
    }

    @ParameterizedTest
    @EnumSource(ModalidadeEnsino.class)
    void deveCadastrarAtivaComQualquerModalidadeValida(ModalidadeEnsino modalidade) {
        referenciasDisponiveis();
        when(ofertaRepository.save(any(CursoOfertado.class))).thenAnswer(invocacao -> {
            CursoOfertado salvo = invocacao.getArgument(0);
            assertNull(salvo.getId());
            assertSame(curso, salvo.getCurso());
            assertSame(faculdade, salvo.getFaculdade());
            assertEquals(modalidade, salvo.getModalidadeEnsino());
            assertTrue(salvo.isAtivo());
            salvo.setId(id);
            return salvo;
        });
        var resposta = proxy.cadastrar(dados(modalidade));
        assertAll(() -> assertEquals(id, resposta.id()), () -> assertEquals(curso.getId(), resposta.cursoId()),
                () -> assertEquals("Direito", resposta.cursoNome()),
                () -> assertEquals(faculdade.getId(), resposta.faculdadeId()),
                () -> assertEquals("Faculdade", resposta.faculdadeNome()),
                () -> assertEquals(modalidade, resposta.modalidadeEnsino()), () -> assertTrue(resposta.ativo()));
        verify(ofertaRepository).findByCursoIdAndFaculdadeIdAndModalidadeEnsino(curso.getId(), faculdade.getId(), modalidade);
        verify(ofertaRepository).save(any(CursoOfertado.class));
        verifyNoMoreInteractions(ofertaRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"dados", "curso", "faculdade", "modalidade"})
    void deveRejeitarCamposObrigatoriosAusentesPelaValidacaoJakarta(String campo) {
        var request = switch (campo) {
            case "dados" -> null;
            case "curso" -> new CadastroCursoOfertadoRequest(null, faculdade.getId(), ModalidadeEnsino.EAD);
            case "faculdade" -> new CadastroCursoOfertadoRequest(curso.getId(), null, ModalidadeEnsino.EAD);
            default -> dados(null);
        };
        assertThrows(ConstraintViolationException.class, () -> proxy.cadastrar(request));
        verifyNoInteractions(ofertaRepository, cursoRepository, faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "desativacao", "reativacao"})
    void deveRejeitarIdNulo(String operacao) {
        assertThrows(ConstraintViolationException.class, () -> {
            switch (operacao) {
                case "consulta" -> proxy.buscarPorId(null);
                case "desativacao" -> proxy.desativar(null);
                default -> proxy.reativar(null);
            }
        });
        verifyNoInteractions(ofertaRepository, cursoRepository, faculdadeRepository);
    }

    @Test
    void deveRejeitarCursoInexistenteSemPersistir() {
        when(cursoRepository.findById(curso.getId())).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> proxy.cadastrar(dados(ModalidadeEnsino.EAD)));
        assertEquals("Curso não encontrado.", erro.getMessage());
        verifyNoInteractions(faculdadeRepository, ofertaRepository);
    }

    @Test
    void deveRejeitarCursoInativoSemPersistir() {
        curso.setAtivo(false);
        cursoDisponivel();
        var erro = assertThrows(RegraNegocioException.class, () -> proxy.cadastrar(dados(ModalidadeEnsino.EAD)));
        assertEquals("O curso está inativo.", erro.getMessage());
        assertFalse(curso.isAtivo());
        verifyNoInteractions(faculdadeRepository, ofertaRepository);
    }

    @Test
    void deveRejeitarFaculdadeInexistenteSemPersistir() {
        cursoDisponivel();
        when(faculdadeRepository.findById(faculdade.getId())).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> proxy.cadastrar(dados(ModalidadeEnsino.EAD)));
        assertEquals("Faculdade não encontrada.", erro.getMessage());
        verifyNoInteractions(ofertaRepository);
    }

    @Test
    void deveRejeitarFaculdadeInativaSemPersistir() {
        faculdade.setAtivo(false);
        referenciasDisponiveis();
        var erro = assertThrows(RegraNegocioException.class, () -> proxy.cadastrar(dados(ModalidadeEnsino.EAD)));
        assertEquals("A faculdade está inativa.", erro.getMessage());
        assertFalse(faculdade.isAtivo());
        verifyNoInteractions(ofertaRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveRejeitarCombinacaoDuplicadaInclusiveOfertaInativa(boolean ativo) {
        oferta.setAtivo(ativo);
        referenciasDisponiveis();
        when(ofertaRepository.findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                curso.getId(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL)).thenReturn(Optional.of(oferta));
        var erro = assertThrows(RegraNegocioException.class, () -> proxy.cadastrar(dados(ModalidadeEnsino.PRESENCIAL)));
        assertEquals("Já existe uma oferta para este curso, faculdade e modalidade de ensino.", erro.getMessage());
        verificarCombinacaoPreservada();
        assertEquals(ativo, oferta.isAtivo());
        verify(ofertaRepository).findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                curso.getId(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL);
        verifyNoMoreInteractions(ofertaRepository);
    }

    @Test
    void devePermitirMesmoCursoEFaculdadeComModalidadesDiferentes() {
        referenciasDisponiveis();
        when(ofertaRepository.save(any(CursoOfertado.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
        when(ofertaRepository.findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                curso.getId(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL)).thenReturn(Optional.empty());
        var primeira = proxy.cadastrar(dados(ModalidadeEnsino.PRESENCIAL));
        when(ofertaRepository.findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                curso.getId(), faculdade.getId(), ModalidadeEnsino.EAD)).thenReturn(Optional.empty());
        var segunda = proxy.cadastrar(dados(ModalidadeEnsino.EAD));
        assertEquals(primeira.cursoId(), segunda.cursoId());
        assertEquals(primeira.faculdadeId(), segunda.faculdadeId());
        assertNotEquals(primeira.modalidadeEnsino(), segunda.modalidadeEnsino());
        verify(ofertaRepository, times(2)).save(any(CursoOfertado.class));
    }

    @Test
    void devePropagarViolacaoDeUnicidadeDoBancoSemTentarReativarOuSubstituirOferta() {
        referenciasDisponiveis();
        var falha = new DataIntegrityViolationException("uk_curso_faculdade_modalidade");
        when(ofertaRepository.save(any(CursoOfertado.class))).thenThrow(falha);
        assertSame(falha, assertThrows(DataIntegrityViolationException.class,
                () -> proxy.cadastrar(dados(ModalidadeEnsino.PRESENCIAL))));
        verificarCombinacaoPreservada();
        verify(ofertaRepository).findByCursoIdAndFaculdadeIdAndModalidadeEnsino(
                curso.getId(), faculdade.getId(), ModalidadeEnsino.PRESENCIAL);
        verify(ofertaRepository).save(any(CursoOfertado.class));
        verifyNoMoreInteractions(ofertaRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveConsultarHistoricoMesmoComCursoEFaculdadeInativos(boolean ativo) {
        oferta.setAtivo(ativo);
        curso.setAtivo(false);
        faculdade.setAtivo(false);
        ofertaDisponivel();
        var resposta = proxy.buscarPorId(id);
        assertAll(() -> assertEquals(id, resposta.id()), () -> assertEquals(curso.getId(), resposta.cursoId()),
                () -> assertEquals("Direito", resposta.cursoNome()),
                () -> assertEquals(faculdade.getId(), resposta.faculdadeId()),
                () -> assertEquals("Faculdade", resposta.faculdadeNome()),
                () -> assertEquals(ModalidadeEnsino.PRESENCIAL, resposta.modalidadeEnsino()),
                () -> assertEquals(ativo, resposta.ativo()));
        verificarCombinacaoPreservada();
        assertEquals(ativo, oferta.isAtivo());
        verify(ofertaRepository).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "desativacao", "reativacao"})
    void deveRejeitarOfertaInexistente(String operacao) {
        when(ofertaRepository.findById(id)).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> {
            switch (operacao) {
                case "consulta" -> proxy.buscarPorId(id);
                case "desativacao" -> proxy.desativar(id);
                default -> proxy.reativar(id);
            }
        });
        assertEquals("Curso ofertado não encontrado.", erro.getMessage());
        verify(ofertaRepository).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @Test
    void deveListarTodasIncluindoInativasSemAlteracoes() {
        var inativa = CursoOfertado.builder().id(UUID.randomUUID()).curso(curso).faculdade(faculdade)
                .modalidadeEnsino(ModalidadeEnsino.EAD).ativo(false).build();
        when(ofertaRepository.findAll()).thenReturn(List.of(oferta, inativa));
        var respostas = proxy.listarTodos();
        assertEquals(2, respostas.size());
        assertTrue(respostas.getFirst().ativo());
        assertFalse(respostas.getLast().ativo());
        assertEquals(inativa.getId(), respostas.getLast().id());
        assertEquals(ModalidadeEnsino.EAD, respostas.getLast().modalidadeEnsino());
        verificarCombinacaoPreservada();
        assertTrue(oferta.isAtivo());
        assertFalse(inativa.isAtivo());
        verify(ofertaRepository).findAll();
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @Test
    void deveListarAtivasPeloEstadoDaOfertaMesmoComVinculosInativos() {
        curso.setAtivo(false);
        faculdade.setAtivo(false);
        when(ofertaRepository.findAllByAtivoTrue()).thenReturn(List.of(oferta));
        var respostas = proxy.listarAtivos();
        assertEquals(1, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        assertFalse(curso.isAtivo());
        assertFalse(faculdade.isAtivo());
        verify(ofertaRepository).findAllByAtivoTrue();
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @Test
    void deveRetornarListasVazias() {
        when(ofertaRepository.findAll()).thenReturn(List.of());
        when(ofertaRepository.findAllByAtivoTrue()).thenReturn(List.of());
        assertTrue(proxy.listarTodos().isEmpty());
        assertTrue(proxy.listarAtivos().isEmpty());
        verify(ofertaRepository).findAll();
        verify(ofertaRepository).findAllByAtivoTrue();
        verifyNoMoreInteractions(ofertaRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveDesativarSemAlterarCombinacaoOuVinculosMesmoComPaisInativos(boolean ativo) {
        oferta.setAtivo(ativo);
        curso.setAtivo(false);
        faculdade.setAtivo(false);
        ofertaDisponivel();
        proxy.desativar(id);
        assertFalse(oferta.isAtivo());
        assertFalse(curso.isAtivo());
        assertFalse(faculdade.isAtivo());
        verificarCombinacaoPreservada();
        verify(ofertaRepository).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveReativarSomenteEstadoDaOfertaComPaisAtivos(boolean ativo) {
        oferta.setAtivo(ativo);
        ofertaDisponivel();
        proxy.reativar(id);
        assertTrue(oferta.isAtivo());
        assertTrue(curso.isAtivo());
        assertTrue(faculdade.isAtivo());
        verificarCombinacaoPreservada();
        verify(ofertaRepository).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @ParameterizedTest
    @CsvSource({"curso,false", "faculdade,false", "curso,true", "faculdade,true"})
    void deveRejeitarReativacaoComPaisInativosSemAlterarOferta(String vinculo, boolean ativo) {
        oferta.setAtivo(ativo);
        if (vinculo.equals("curso")) curso.setAtivo(false);
        else faculdade.setAtivo(false);
        ofertaDisponivel();
        var erro = assertThrows(RegraNegocioException.class, () -> proxy.reativar(id));
        assertEquals(vinculo.equals("curso") ? "O curso está inativo." : "A faculdade está inativa.", erro.getMessage());
        assertEquals(ativo, oferta.isAtivo());
        assertEquals(!vinculo.equals("curso"), curso.isAtivo());
        assertEquals(!vinculo.equals("faculdade"), faculdade.isAtivo());
        verificarCombinacaoPreservada();
        verify(ofertaRepository).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @Test
    void devePreservarPerfisAcademicosAoDesativarEReativarOferta() {
        ofertaDisponivel();
        var usuario = Usuario.builder().id(UUID.randomUUID()).build();
        var ponto = PontoEmbarque.builder().id(UUID.randomUUID()).build();
        var perfil = PerfilAluno.builder().id(UUID.randomUUID()).usuario(usuario).cursoOfertado(oferta)
                .semestreAtual(3).pontoEmbarquePadrao(ponto).build();
        UUID perfilId = perfil.getId();
        proxy.desativar(id);
        assertSame(oferta, perfil.getCursoOfertado());
        assertFalse(oferta.isAtivo());
        assertTrue(curso.isAtivo());
        assertTrue(faculdade.isAtivo());
        proxy.reativar(id);
        assertAll(() -> assertSame(oferta, perfil.getCursoOfertado()), () -> assertEquals(perfilId, perfil.getId()),
                () -> assertSame(usuario, perfil.getUsuario()), () -> assertSame(ponto, perfil.getPontoEmbarquePadrao()),
                () -> assertEquals(3, perfil.getSemestreAtual()), () -> assertTrue(oferta.isAtivo()));
        verificarCombinacaoPreservada();
        verify(ofertaRepository, times(2)).findById(id);
        verifyNoMoreInteractions(ofertaRepository);
        verifyNoInteractions(cursoRepository, faculdadeRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"buscarPorId", "listarTodos", "listarAtivos", "cadastrar", "desativar", "reativar"})
    void deveDeclararTransacoesDeLeituraOuEscrita(String metodo) throws NoSuchMethodException {
        var assinatura = switch (metodo) {
            case "listarTodos", "listarAtivos" -> CursoOfertadoService.class.getMethod(metodo);
            case "cadastrar" -> CursoOfertadoService.class.getMethod(metodo, CadastroCursoOfertadoRequest.class);
            default -> CursoOfertadoService.class.getMethod(metodo, UUID.class);
        };
        var atributo = new AnnotationTransactionAttributeSource().getTransactionAttribute(assinatura, CursoOfertadoService.class);
        assertNotNull(atributo);
        assertEquals(List.of("buscarPorId", "listarTodos", "listarAtivos").contains(metodo), atributo.isReadOnly());
    }
}
