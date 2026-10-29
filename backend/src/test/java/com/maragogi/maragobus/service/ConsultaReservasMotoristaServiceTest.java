package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.*;
import com.maragogi.maragobus.repository.*;
import com.maragogi.maragobus.repository.projection.ResumoReservasPorFaculdadePonto;
import com.maragogi.maragobus.dto.reserva.PassageiroConfirmadoResponse;
import org.springframework.data.domain.*;
import jakarta.validation.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.validation.beanvalidation.MethodValidationInterceptor;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultaReservasMotoristaServiceTest {
    @Mock UsuarioRepository usuarios;
    @Mock ReservaRepository reservas;
    private static ValidatorFactory validador;
    private final Usuario motorista = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final LocalDate data = LocalDate.of(2026, 10, 12);

    @BeforeAll static void abrir() { validador = Validation.buildDefaultValidatorFactory(); }
    @AfterAll static void fechar() { validador.close(); }

    private ConsultaReservasMotoristaService service() {
        var regras = new RegrasTemporaisReserva(Clock.fixed(Instant.parse("2026-10-12T20:00:00Z"), ZoneOffset.UTC));
        var proxy = new ProxyFactory(new ConsultaReservasMotoristaService(usuarios, reservas, regras));
        proxy.addAdvice(new MethodValidationInterceptor(validador.getValidator()));
        return (ConsultaReservasMotoristaService) proxy.getProxy();
    }
    private void disponivel() { when(usuarios.findById(motorista.getId())).thenReturn(Optional.of(motorista)); }

    @Test void deveSomarGruposPorIdPreservarOrdemESepararMesmoPontoEntreFaculdades() {
        disponivel();
        UUID a = new UUID(0, 1), b = new UUID(0, 2), pontoA = new UUID(0, 3), pontoB = new UUID(0, 4);
        when(reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA)).thenReturn(List.of(
                new ResumoReservasPorFaculdadePonto(a, "Alfa", pontoA, "Centro", 2L),
                new ResumoReservasPorFaculdadePonto(a, "Alfa", pontoB, "Centro", 3L),
                new ResumoReservasPorFaculdadePonto(b, "Alfa", pontoA, "Centro", 4L)));
        var resposta = service().consultarResumo(motorista.getId(), data);
        assertEquals(data, resposta.dataUtilizacao()); assertEquals(9, resposta.totalReservas());
        assertEquals(2, resposta.quantidadeFaculdades());
        assertEquals(List.of(a, b), resposta.faculdades().stream().map(f -> f.faculdadeId()).toList());
        var primeira = resposta.faculdades().getFirst();
        assertEquals(5, primeira.totalReservas());
        assertEquals(List.of(pontoA, pontoB), primeira.pontosEmbarque().stream().map(p -> p.pontoEmbarqueId()).toList());
        assertEquals(List.of(2L, 3L), primeira.pontosEmbarque().stream().map(p -> p.totalReservas()).toList());
        assertEquals(4, resposta.faculdades().getLast().totalReservas());
        verify(reservas).resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA);
        verifyNoMoreInteractions(reservas);
        verify(usuarios).findById(motorista.getId()); verifyNoMoreInteractions(usuarios);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveApresentarUmaOuVariasFaculdadesComPontosEmOrdemAlfabetica(boolean varias) {
        disponivel(); UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        var linhas = new ArrayList<ResumoReservasPorFaculdadePonto>();
        linhas.add(new ResumoReservasPorFaculdadePonto(a, "Alfa", UUID.randomUUID(), "Bairro", 2L));
        linhas.add(new ResumoReservasPorFaculdadePonto(a, "Alfa", UUID.randomUUID(), "Centro", 1L));
        if (varias) linhas.add(new ResumoReservasPorFaculdadePonto(b, "Beta", UUID.randomUUID(), "Centro", 3L));
        when(reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA)).thenReturn(linhas);
        var resposta = service().consultarResumo(motorista.getId(), data);
        assertEquals(varias ? 6 : 3, resposta.totalReservas());
        assertEquals(varias ? List.of("Alfa", "Beta") : List.of("Alfa"),
                resposta.faculdades().stream().map(f -> f.faculdadeNome()).toList());
        assertEquals(List.of("Bairro", "Centro"), resposta.faculdades().getFirst().pontosEmbarque().stream()
                .map(p -> p.pontoEmbarqueNome()).toList());
        assertEquals(3, resposta.faculdades().getFirst().totalReservas());
        verify(reservas).resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA); verifyNoMoreInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"2020-01-06", "2026-10-12", "2030-01-07"})
    void deveConsultarQualquerDiaDeTransporteSemAplicarJanelas(String dia) {
        disponivel(); LocalDate utilizacao = LocalDate.parse(dia);
        when(reservas.resumirPorFaculdadeEPonto(utilizacao, StatusReserva.CONFIRMADA)).thenReturn(List.of());
        var resposta = service().consultarResumo(motorista.getId(), utilizacao);
        assertEquals(utilizacao, resposta.dataUtilizacao()); assertEquals(0, resposta.totalReservas());
        assertEquals(0, resposta.quantidadeFaculdades()); assertTrue(resposta.faculdades().isEmpty());
        verify(reservas).resumirPorFaculdadeEPonto(utilizacao, StatusReserva.CONFIRMADA); verifyNoMoreInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "ADMIN", "inativo"})
    void deveRejeitarSolicitanteInvalido(String caso) {
        if (caso.equals("inativo")) motorista.setAtivo(false);
        else if (!caso.equals("ausente")) motorista.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(motorista.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(motorista));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().consultarResumo(motorista.getId(), data));
        verifyNoInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-10", "2026-10-11"})
    void deveRejeitarFimDeSemana(String dia) {
        disponivel();
        assertThrows(RegraNegocioException.class, () -> service().consultarResumo(motorista.getId(), LocalDate.parse(dia)));
        verifyNoInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveExecutarValidacaoJakartaDosParametros(boolean motoristaNulo) {
        assertThrows(ConstraintViolationException.class, () -> service().consultarResumo(
                motoristaNulo ? null : motorista.getId(), motoristaNulo ? data : null));
        verifyNoInteractions(usuarios, reservas);
    }

    @Test void naoDeveOmitirReservasSemFaculdadeDoTotalSilenciosamente() {
        disponivel();
        when(reservas.resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA)).thenReturn(List.of(
                new ResumoReservasPorFaculdadePonto(null, null, UUID.randomUUID(), "Centro", 1L)));
        assertThrows(RegraNegocioException.class, () -> service().consultarResumo(motorista.getId(), data));
        verify(reservas).resumirPorFaculdadeEPonto(data, StatusReserva.CONFIRMADA); verifyNoMoreInteractions(reservas);
    }
    @ParameterizedTest @CsvSource({"0,10,25,10", "1,10,25,10", "2,10,25,5", "3,10,25,0", "0,50,51,50", "0,,0,0", "0,,1,1"})
    void deveRetornarPassageirosPaginadosComMetadados(int pagina, Integer tamanho, int total, int quantidade) {
        disponivel(); var pageable = PageRequest.of(pagina, tamanho == null ? 10 : tamanho);
        var itens = new ArrayList<PassageiroConfirmadoResponse>();
        for (int i = 0; i < quantidade; i++) itens.add(new PassageiroConfirmadoResponse(new UUID(0, i), UUID.randomUUID(),
                "Aluno " + i, data, UUID.randomUUID(), "Faculdade", UUID.randomUUID(), "Centro"));
        when(reservas.consultarPassageirosConfirmados(data, StatusReserva.CONFIRMADA, null, null, pageable))
                .thenReturn(new PageImpl<>(itens, pageable, total));
        var resposta = service().consultarPassageirosConfirmados(motorista.getId(), data, null, null, pagina, tamanho);
        assertEquals(itens, resposta.getContent()); assertEquals(pagina, resposta.getNumber());
        assertEquals(pageable.getPageSize(), resposta.getSize()); assertEquals(total, resposta.getTotalElements());
        assertEquals((int) Math.ceil((double) total / pageable.getPageSize()), resposta.getTotalPages());
        assertEquals((long) (pagina + 1) * pageable.getPageSize() < total, resposta.hasNext());
        verify(reservas).contarReservasSemFaculdade(data, StatusReserva.CONFIRMADA);
        verify(reservas).consultarPassageirosConfirmados(data, StatusReserva.CONFIRMADA, null, null, pageable);
        verifyNoMoreInteractions(reservas);
        verify(usuarios).findById(motorista.getId()); verifyNoMoreInteractions(usuarios);
    }

    @ParameterizedTest @ValueSource(strings = {"nenhum", "faculdade", "ponto", "ambos", "semCorrespondencia"})
    void deveEncaminharFiltrosOpcionaisAoBancoSemConsultarCatalogos(String caso) {
        disponivel(); UUID faculdade = caso.equals("faculdade") || caso.equals("ambos") || caso.equals("semCorrespondencia") ? UUID.randomUUID() : null;
        UUID ponto = caso.equals("ponto") || caso.equals("ambos") || caso.equals("semCorrespondencia") ? UUID.randomUUID() : null;
        var pageable = PageRequest.of(0, 10);
        when(reservas.consultarPassageirosConfirmados(data, StatusReserva.CONFIRMADA, faculdade, ponto, pageable)).thenReturn(Page.empty(pageable));
        var resposta = service().consultarPassageirosConfirmados(motorista.getId(), data, faculdade, ponto, 0, null);
        assertTrue(resposta.isEmpty()); assertEquals(0, resposta.getTotalElements());
        verify(reservas).contarReservasSemFaculdade(data, StatusReserva.CONFIRMADA);
        verify(reservas).consultarPassageirosConfirmados(data, StatusReserva.CONFIRMADA, faculdade, ponto, pageable);
        verifyNoMoreInteractions(reservas);
    }

    @ParameterizedTest @CsvSource({"-1,10", "0,0", "0,-1", "0,51", "0,2147483647"})
    void deveRejeitarPaginacaoInvalidaDePassageiros(int pagina, int tamanho) {
        assertThrows(RegraNegocioException.class, () -> service().consultarPassageirosConfirmados(motorista.getId(), data, null, null, pagina, tamanho));
        verifyNoInteractions(usuarios, reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ALUNO", "ADMIN", "inativo"})
    void deveValidarMotoristaNaListagem(String caso) {
        if (caso.equals("inativo")) motorista.setAtivo(false);
        else if (!caso.equals("ausente")) motorista.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(motorista.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(motorista));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service().consultarPassageirosConfirmados(motorista.getId(), data, null, null, 0, 10));
        verifyNoInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveValidarParametrosObrigatoriosNaListagem(boolean motoristaNulo) {
        assertThrows(ConstraintViolationException.class, () -> service().consultarPassageirosConfirmados(
                motoristaNulo ? null : motorista.getId(), motoristaNulo ? data : null, null, null, 0, 10));
        verifyNoInteractions(usuarios, reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-10", "2026-10-11"})
    void deveRejeitarListagemDePassageirosNoFimDeSemana(String dia) {
        disponivel();
        assertThrows(RegraNegocioException.class, () -> service().consultarPassageirosConfirmados(motorista.getId(), LocalDate.parse(dia), null, null, 0, 10));
        verifyNoInteractions(reservas);
    }

    @ParameterizedTest @ValueSource(strings = {"2020-01-06", "2026-10-12", "2030-01-07"})
    void devePermitirListagemPassadaAtualEFutura(String dia) {
        disponivel(); LocalDate utilizacao = LocalDate.parse(dia); var pageable = PageRequest.of(0, 10);
        when(reservas.consultarPassageirosConfirmados(utilizacao, StatusReserva.CONFIRMADA, null, null, pageable)).thenReturn(Page.empty(pageable));
        assertTrue(service().consultarPassageirosConfirmados(motorista.getId(), utilizacao, null, null, 0, 10).isEmpty());
    }

    @Test void deveRejeitarVinculoInconsistenteMesmoForaDaPaginaOuFiltros() {
        disponivel(); when(reservas.contarReservasSemFaculdade(data, StatusReserva.CONFIRMADA)).thenReturn(1L);
        assertThrows(RegraNegocioException.class, () -> service().consultarPassageirosConfirmados(
                motorista.getId(), data, UUID.randomUUID(), UUID.randomUUID(), 20, 10));
        verify(reservas).contarReservasSemFaculdade(data, StatusReserva.CONFIRMADA); verifyNoMoreInteractions(reservas);
    }
}
