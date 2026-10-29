package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.pontoembarque.AtualizacaoPontoEmbarqueRequest;
import com.maragogi.maragobus.dto.pontoembarque.CadastroPontoEmbarqueRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PontoEmbarqueServiceTest {
    @Mock private PontoEmbarqueRepository repository;
    @InjectMocks private PontoEmbarqueService service;
    private PontoEmbarqueService proxy;
    private static ValidatorFactory validatorFactory;
    private final UUID id = UUID.randomUUID();
    private final PontoEmbarque ponto = PontoEmbarque.builder().id(id).nome("Centro")
            .descricao("Praça central").build();

    @BeforeAll
    static void iniciarValidador() { validatorFactory = Validation.buildDefaultValidatorFactory(); }

    @AfterAll
    static void fecharValidador() { validatorFactory.close(); }

    @BeforeEach
    void criarProxyComValidacaoReal() {
        var factory = new ProxyFactory(service);
        factory.addAdvice(new MethodValidationInterceptor(validatorFactory.getValidator()));
        proxy = (PontoEmbarqueService) factory.getProxy();
    }

    private void pontoDisponivel() { when(repository.findById(id)).thenReturn(Optional.of(ponto)); }

    private void verificarPreservado(boolean ativo) {
        assertAll(() -> assertEquals(id, ponto.getId()),
                () -> assertEquals("Centro", ponto.getNome()),
                () -> assertEquals("Praça central", ponto.getDescricao()),
                () -> assertEquals(ativo, ponto.isAtivo()));
    }

    static Stream<String> descricoesValidas() { return Stream.of(null, "", "   ", " Descrição válida ", "a".repeat(256)); }

    @ParameterizedTest
    @MethodSource("descricoesValidas")
    void deveCadastrarAtivoNormalizandoSomenteNomeEPreservandoDescricao(String descricao) {
        when(repository.save(any(PontoEmbarque.class))).thenAnswer(invocacao -> {
            PontoEmbarque salvo = invocacao.getArgument(0);
            assertNull(salvo.getId());
            salvo.setId(id);
            return salvo;
        });
        var resposta = proxy.cadastrar(new CadastroPontoEmbarqueRequest(" Centro ", descricao));
        assertAll(() -> assertEquals(id, resposta.id()),
                () -> assertEquals("Centro", resposta.nome()),
                () -> assertEquals(descricao, resposta.descricao()),
                () -> assertTrue(resposta.ativo()));
        verify(repository).existsByNome("Centro");
        verify(repository).save(argThat(salvo -> salvo.getNome().equals("Centro") && salvo.isAtivo()
                && java.util.Objects.equals(descricao, salvo.getDescricao())));
        verifyNoMoreInteractions(repository);
    }

    static Stream<String> nomesInvalidos() { return Stream.of(null, "", "   ", "\t\n", "a".repeat(151)); }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarCadastroComNomeInvalidoPelaValidacaoJakarta(String nome) {
        assertThrows(ConstraintViolationException.class,
                () -> proxy.cadastrar(new CadastroPontoEmbarqueRequest(nome, "Descrição")));
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @MethodSource("nomesInvalidos")
    void deveRejeitarAtualizacaoComNomeInvalidoSemAlterarDescricao(String nome) {
        assertThrows(ConstraintViolationException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest(nome, "Nova descrição")));
        verificarPreservado(true);
        verifyNoInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void deveRejeitarDescricaoAcimaDe256CaracteresSemAlteracoesParciais(boolean atualizar) {
        assertThrows(ConstraintViolationException.class, () -> {
            if (atualizar) proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest("Novo", "a".repeat(257)));
            else proxy.cadastrar(new CadastroPontoEmbarqueRequest("Novo", "a".repeat(257)));
        });
        verificarPreservado(true);
        verifyNoInteractions(repository);
    }

    @Test
    void deveAceitarNomeCom150CaracteresNoCadastroEAtualizacao() {
        String nome = "a".repeat(150);
        when(repository.save(any(PontoEmbarque.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
        assertEquals(nome, proxy.cadastrar(new CadastroPontoEmbarqueRequest(nome, null)).nome());
        pontoDisponivel();
        assertEquals(nome, proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest(nome, null)).nome());
    }

    @ParameterizedTest
    @ValueSource(strings = {"cadastro", "atualizacao", "idAtualizacao", "consulta", "desativacao", "reativacao"})
    void deveRejeitarParametrosObrigatoriosNulos(String operacao) {
        assertThrows(ConstraintViolationException.class, () -> {
            switch (operacao) {
                case "cadastro" -> proxy.cadastrar(null);
                case "atualizacao" -> proxy.atualizarDados(id, null);
                case "idAtualizacao" -> proxy.atualizarDados(null, new AtualizacaoPontoEmbarqueRequest("Novo", null));
                case "consulta" -> proxy.buscarPorId(null);
                case "desativacao" -> proxy.desativar(null);
                default -> proxy.reativar(null);
            }
        });
        verificarPreservado(true);
        verifyNoInteractions(repository);
    }

    @Test
    void deveRejeitarNomeDuplicadoNoCadastroSemPersistir() {
        when(repository.existsByNome("Centro")).thenReturn(true);
        var erro = assertThrows(RegraNegocioException.class,
                () -> proxy.cadastrar(new CadastroPontoEmbarqueRequest(" Centro ", null)));
        assertEquals("Já existe um ponto de embarque com este nome.", erro.getMessage());
        verify(repository).existsByNome("Centro");
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveConsultarAtivosOuInativosSemModificacoes(boolean ativo) {
        ponto.setAtivo(ativo);
        pontoDisponivel();
        var resposta = proxy.buscarPorId(id);
        assertAll(() -> assertEquals(id, resposta.id()), () -> assertEquals("Centro", resposta.nome()),
                () -> assertEquals("Praça central", resposta.descricao()), () -> assertEquals(ativo, resposta.ativo()));
        verificarPreservado(ativo);
        verify(repository).findById(id);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"consulta", "atualizacao", "desativacao", "reativacao"})
    void deveRejeitarPontoInexistenteSemOutrasOperacoes(String operacao) {
        when(repository.findById(id)).thenReturn(Optional.empty());
        var erro = assertThrows(RecursoNaoEncontradoException.class, () -> {
            switch (operacao) {
                case "consulta" -> proxy.buscarPorId(id);
                case "atualizacao" -> proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest("Novo", null));
                case "desativacao" -> proxy.desativar(id);
                default -> proxy.reativar(id);
            }
        });
        assertEquals("Ponto de embarque não encontrado.", erro.getMessage());
        verificarPreservado(true);
        verify(repository).findById(id);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void deveListarTodosIncluindoInativos() {
        var inativo = PontoEmbarque.builder().id(UUID.randomUUID()).nome("Bairro").ativo(false).build();
        when(repository.findAll()).thenReturn(List.of(ponto, inativo));
        var respostas = proxy.listarTodos();
        assertEquals(2, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertEquals("Centro", respostas.getFirst().nome());
        assertEquals("Praça central", respostas.getFirst().descricao());
        assertTrue(respostas.getFirst().ativo());
        assertEquals(inativo.getId(), respostas.getLast().id());
        assertEquals("Bairro", respostas.getLast().nome());
        assertNull(respostas.getLast().descricao());
        assertFalse(respostas.getLast().ativo());
        verificarPreservado(true);
        assertFalse(inativo.isAtivo());
        verify(repository).findAll();
        verifyNoMoreInteractions(repository);
    }

    @Test
    void deveListarAtivosPelaConsultaDoRepository() {
        when(repository.findByAtivoTrue()).thenReturn(List.of(ponto));
        var respostas = proxy.listarAtivos();
        assertEquals(1, respostas.size());
        assertEquals(id, respostas.getFirst().id());
        assertTrue(respostas.getFirst().ativo());
        verificarPreservado(true);
        verify(repository).findByAtivoTrue();
        verifyNoMoreInteractions(repository);
    }

    @Test
    void deveRetornarListasVaziasSemRegistros() {
        when(repository.findAll()).thenReturn(List.of());
        when(repository.findByAtivoTrue()).thenReturn(List.of());
        assertTrue(proxy.listarTodos().isEmpty());
        assertTrue(proxy.listarAtivos().isEmpty());
        verify(repository).findAll();
        verify(repository).findByAtivoTrue();
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @MethodSource("descricoesValidas")
    void deveAtualizarNomeEDescricaoPreservandoIdEEstadoInativo(String descricao) {
        ponto.setAtivo(false);
        pontoDisponivel();
        var resposta = proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest(" Bairro ", descricao));
        assertAll(() -> assertEquals(id, resposta.id()), () -> assertEquals("Bairro", resposta.nome()),
                () -> assertEquals(descricao, resposta.descricao()), () -> assertFalse(resposta.ativo()),
                () -> assertEquals(id, ponto.getId()), () -> assertEquals("Bairro", ponto.getNome()),
                () -> assertEquals(descricao, ponto.getDescricao()), () -> assertFalse(ponto.isAtivo()));
        verify(repository).findById(id);
        verify(repository).existsByNome("Bairro");
        verifyNoMoreInteractions(repository);
    }

    @Test
    void deveAtualizarDescricaoMantendoNomeEEstadoAtivoSemConsultarDuplicidade() {
        pontoDisponivel();
        var resposta = proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest(" Centro ", "Nova descrição"));
        assertEquals("Nova descrição", resposta.descricao());
        assertEquals("Nova descrição", ponto.getDescricao());
        assertEquals("Centro", resposta.nome());
        assertEquals(id, resposta.id());
        assertTrue(resposta.ativo());
        verify(repository).findById(id);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void deveRejeitarNomeDuplicadoSemModificarNomeDescricaoOuEstado() {
        ponto.setAtivo(false);
        pontoDisponivel();
        when(repository.existsByNome("Bairro")).thenReturn(true);
        assertThrows(RegraNegocioException.class,
                () -> proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest(" Bairro ", "Nova descrição")));
        verificarPreservado(false);
        verify(repository).findById(id);
        verify(repository).existsByNome("Bairro");
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveDesativarLogicamenteInclusiveSeJaInativo(boolean ativo) {
        ponto.setAtivo(ativo);
        pontoDisponivel();
        proxy.desativar(id);
        verificarPreservado(false);
        verify(repository).findById(id);
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void deveReativarInclusiveSeJaAtivo(boolean ativo) {
        ponto.setAtivo(ativo);
        pontoDisponivel();
        proxy.reativar(id);
        verificarPreservado(true);
        verify(repository).findById(id);
        verifyNoMoreInteractions(repository);
    }

    @Test
    void devePreservarPerfisEReservasAoAtualizarDesativarEReativar() {
        pontoDisponivel();
        var usuario = Usuario.builder().id(UUID.randomUUID()).build();
        var oferta = CursoOfertado.builder().id(UUID.randomUUID()).build();
        var perfil = PerfilAluno.builder().id(UUID.randomUUID()).usuario(usuario).cursoOfertado(oferta)
                .semestreAtual(3).pontoEmbarquePadrao(ponto).build();
        var data = LocalDate.of(2026, 10, 8);
        var hora = data.atTime(8, 30);
        var reserva = Reserva.builder().id(UUID.randomUUID()).aluno(usuario).pontoEmbarque(ponto)
                .dataUtilizacao(data).dataHoraReserva(hora).build();
        UUID perfilId = perfil.getId();
        UUID reservaId = reserva.getId();
        proxy.atualizarDados(id, new AtualizacaoPontoEmbarqueRequest("Bairro", "Nova descrição"));
        proxy.desativar(id);
        assertSame(ponto, perfil.getPontoEmbarquePadrao());
        assertSame(ponto, reserva.getPontoEmbarque());
        assertFalse(ponto.isAtivo());
        assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
        proxy.reativar(id);
        assertAll(() -> assertSame(ponto, perfil.getPontoEmbarquePadrao()),
                () -> assertSame(ponto, reserva.getPontoEmbarque()),
                () -> assertEquals(id, ponto.getId()), () -> assertTrue(ponto.isAtivo()),
                () -> assertEquals("Bairro", ponto.getNome()), () -> assertEquals("Nova descrição", ponto.getDescricao()),
                () -> assertEquals(perfilId, perfil.getId()), () -> assertEquals(reservaId, reserva.getId()),
                () -> assertSame(usuario, perfil.getUsuario()), () -> assertSame(usuario, reserva.getAluno()),
                () -> assertSame(oferta, perfil.getCursoOfertado()), () -> assertEquals(3, perfil.getSemestreAtual()),
                () -> assertEquals(data, reserva.getDataUtilizacao()), () -> assertEquals(hora, reserva.getDataHoraReserva()),
                () -> assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva()),
                () -> assertNull(reserva.getDataHoraCancelamento()));
        verify(repository, times(3)).findById(id);
        verify(repository).existsByNome("Bairro");
        verifyNoMoreInteractions(repository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"buscarPorId", "listarTodos", "listarAtivos", "cadastrar", "atualizarDados", "desativar", "reativar"})
    void deveDeclararTransacoesDeLeituraOuEscrita(String metodo) throws NoSuchMethodException {
        var assinatura = switch (metodo) {
            case "listarTodos", "listarAtivos" -> PontoEmbarqueService.class.getMethod(metodo);
            case "cadastrar" -> PontoEmbarqueService.class.getMethod(metodo, CadastroPontoEmbarqueRequest.class);
            case "atualizarDados" -> PontoEmbarqueService.class.getMethod(metodo, UUID.class, AtualizacaoPontoEmbarqueRequest.class);
            default -> PontoEmbarqueService.class.getMethod(metodo, UUID.class);
        };
        var atributo = new AnnotationTransactionAttributeSource().getTransactionAttribute(assinatura, PontoEmbarqueService.class);
        assertNotNull(atributo);
        assertEquals(List.of("buscarPorId", "listarTodos", "listarAtivos").contains(metodo), atributo.isReadOnly());
    }
}
