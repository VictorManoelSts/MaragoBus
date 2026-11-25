package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.reserva.CriacaoReservaRequest;
import com.maragogi.maragobus.dto.reserva.AtualizacaoPontoEmbarqueReservaRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.*;
import com.maragogi.maragobus.exception.*;
import com.maragogi.maragobus.repository.*;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservaServiceTest {
    @Mock UsuarioRepository usuarios;
    @Mock PerfilAlunoRepository perfis;
    @Mock ReservaRepository reservas;
    @Mock PontoEmbarqueRepository pontos;
    @Mock SuspensaoRepository suspensoes;
    @Mock DataSemFuncionamentoRepository datasSemFuncionamento;
    private static ValidatorFactory validatorFactory;
    private final Usuario aluno = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.ALUNO).build();
    private final PontoEmbarque ponto = PontoEmbarque.builder().id(UUID.randomUUID()).nome("Centro").build();
    private final PerfilAluno perfil = PerfilAluno.builder().usuario(aluno).pontoEmbarquePadrao(ponto).build();
    private final LocalDate data = LocalDate.of(2026, 10, 12);
    private final CriacaoReservaRequest dados = new CriacaoReservaRequest(data);

    @BeforeAll static void abrirValidador() { validatorFactory = Validation.buildDefaultValidatorFactory(); }
    @AfterAll static void fecharValidador() { validatorFactory.close(); }

    private ReservaService service(String agora) {
        Clock clock = Clock.fixed(LocalDateTime.parse(agora).atZone(ZoneId.of("America/Maceio")).toInstant(), ZoneOffset.UTC);
        var service = new ReservaService(usuarios, perfis, reservas, pontos, suspensoes,
                datasSemFuncionamento, new RegrasTemporaisReserva(clock), clock);
        var factory = new ProxyFactory(service);
        factory.addAdvice(new MethodValidationInterceptor(validatorFactory.getValidator()));
        return (ReservaService) factory.getProxy();
    }

    private void alunoDisponivel() { when(usuarios.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.of(aluno)); }
    private void perfilDisponivel() {
        alunoDisponivel();
        when(perfis.findByUsuarioId(aluno.getId())).thenReturn(Optional.of(perfil));
    }
    private void salvar() {
        when(reservas.save(any(Reserva.class))).thenAnswer(i -> {
            Reserva reserva = i.getArgument(0);
            assertSame(aluno, reserva.getAluno());
            assertSame(ponto, reserva.getPontoEmbarque());
            assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
            assertNull(reserva.getDataHoraCancelamento());
            assertNull(reserva.getId());
            reserva.setId(UUID.randomUUID());
            return reserva;
        });
    }
    private void semPersistencia() {
        verify(reservas, never()).save(any());
        verify(perfis, never()).save(any());
        verify(usuarios, never()).save(any());
        assertSame(aluno, perfil.getUsuario());
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-09T17:00:00", "2026-10-10T12:00:00", "2026-10-11T18:00:00", "2026-10-12T10:59:59"})
    void deveCriarComAlunoPontoPadraoStatusEHorarioCorretos(String agora) {
        perfilDisponivel(); salvar();
        var resposta = service(agora).cadastrar(aluno.getId(), dados);
        assertAll(() -> assertNotNull(resposta.id()), () -> assertEquals(aluno.getId(), resposta.alunoId()),
                () -> assertEquals(data, resposta.dataUtilizacao()),
                () -> assertEquals(LocalDateTime.parse(agora), resposta.dataHoraReserva()),
                () -> assertEquals(StatusReserva.CONFIRMADA, resposta.statusReserva()),
                () -> assertEquals(ponto.getId(), resposta.pontoEmbarqueId()),
                () -> assertEquals("Centro", resposta.pontoEmbarqueNome()));
        var ordem = inOrder(usuarios, suspensoes, reservas);
        ordem.verify(usuarios).findByIdParaCriarReserva(aluno.getId());
        ordem.verify(suspensoes).existsSuspensaoVigenteParaData(aluno.getId(), data);
        ordem.verify(reservas).existsByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA);
        ordem.verify(reservas).save(any());
    }

    @Test void deveRejeitarReservaQuandoAlunoEstiverSuspensoParaAData() {
        perfilDisponivel();
        when(suspensoes.existsSuspensaoVigenteParaData(aluno.getId(), data)).thenReturn(true);
        var erro = assertThrows(RegraNegocioException.class,
                () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        assertEquals("O aluno está suspenso para a data de utilização informada.", erro.getMessage());
        verifyNoInteractions(reservas);
        semPersistencia();
    }

    @Test void deveRejeitarUsuarioInexistente() {
        when(usuarios.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        verifyNoInteractions(perfis, reservas, suspensoes);
    }
    @ParameterizedTest @EnumSource(value = TipoUsuario.class, names = {"ADMIN", "MOTORISTA"})
    void deveRejeitarUsuarioNaoAluno(TipoUsuario tipo) {
        aluno.setTipoUsuario(tipo); alunoDisponivel();
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        verifyNoInteractions(perfis, reservas, suspensoes);
    }
    @Test void deveRejeitarAlunoInativo() {
        aluno.setAtivo(false); alunoDisponivel();
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        assertFalse(aluno.isAtivo()); verifyNoInteractions(perfis, reservas, suspensoes);
    }
    @Test void deveRejeitarPerfilInexistente() {
        alunoDisponivel(); when(perfis.findByUsuarioId(aluno.getId())).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        verifyNoInteractions(suspensoes); semPersistencia();
    }
    @Test void deveRejeitarPontoAusente() {
        perfil.setPontoEmbarquePadrao(null); perfilDisponivel();
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        verifyNoInteractions(suspensoes); semPersistencia(); assertNull(perfil.getPontoEmbarquePadrao());
    }
    @Test void deveRejeitarPontoInativo() {
        ponto.setAtivo(false); perfilDisponivel();
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        verifyNoInteractions(suspensoes); semPersistencia(); assertFalse(ponto.isAtivo());
    }
    @ParameterizedTest @ValueSource(strings = {"2026-10-09T16:59:59", "2026-10-12T11:00:00", "2026-10-13T08:00:00"})
    void deveRejeitarForaDaJanela(String agora) {
        perfilDisponivel();
        assertThrows(RegraNegocioException.class, () -> service(agora).cadastrar(aluno.getId(), dados));
        verifyNoInteractions(reservas, suspensoes); semPersistencia();
    }
    @ParameterizedTest @ValueSource(strings = {"2026-10-10", "2026-10-11", "2026-10-19"})
    void deveRejeitarDatasInvalidasOuForaDaJanela(String utilizacao) {
        perfilDisponivel();
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T18:00:00").cadastrar(aluno.getId(),
                new CriacaoReservaRequest(LocalDate.parse(utilizacao))));
        verifyNoInteractions(reservas, suspensoes); semPersistencia();
    }
    @Test void deveRejeitarConfirmadaDuplicada() {
        perfilDisponivel();
        when(reservas.existsByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA)).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados));
        semPersistencia();
    }
    @ParameterizedTest @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void devePermitirNovaReservaSemModificarCancelada(StatusReserva status) {
        var historica = Reserva.builder().id(UUID.randomUUID()).aluno(aluno).dataUtilizacao(data).statusReserva(status).build();
        perfilDisponivel(); salvar();
        when(reservas.existsByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA)).thenReturn(false);
        var resposta = service("2026-10-09T17:00:00").cadastrar(aluno.getId(), dados);
        assertNotEquals(historica.getId(), resposta.id()); assertEquals(status, historica.getStatusReserva());
        verify(reservas).existsByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA);
        verify(reservas).save(any()); verifyNoMoreInteractions(reservas);
    }
    @ParameterizedTest @ValueSource(strings = {"aluno", "dados", "data"})
    void deveExecutarValidacaoJakarta(String campo) {
        assertThrows(ConstraintViolationException.class, () -> service("2026-10-09T17:00:00").cadastrar(
                campo.equals("aluno") ? null : aluno.getId(),
                campo.equals("dados") ? null : new CriacaoReservaRequest(campo.equals("data") ? null : data)));
        verifyNoInteractions(usuarios, perfis, reservas, suspensoes);
    }

    private Reserva reservaConfirmada() {
        return Reserva.builder().id(UUID.randomUUID()).aluno(aluno).pontoEmbarque(ponto).dataUtilizacao(data)
                .dataHoraReserva(LocalDateTime.parse("2026-10-09T17:00:00")).build();
    }

    private void reservaDisponivel(Reserva reserva) {
        alunoDisponivel();
        when(reservas.findLockedById(reserva.getId())).thenReturn(Optional.of(reserva));
    }

    private void verificarReservaPreservada(Reserva reserva, StatusReserva status, LocalDateTime cancelamento) {
        assertAll(() -> assertSame(aluno, reserva.getAluno()), () -> assertSame(ponto, reserva.getPontoEmbarque()),
                () -> assertEquals(data, reserva.getDataUtilizacao()),
                () -> assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), reserva.getDataHoraReserva()),
                () -> assertEquals(status, reserva.getStatusReserva()),
                () -> assertEquals(cancelamento, reserva.getDataHoraCancelamento()));
        verify(reservas, never()).save(any());
        verifyNoInteractions(perfis);
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-09T17:00:00", "2026-10-11T12:00:00", "2026-10-12T11:00:00",
            "2026-10-12T12:00:00", "2026-10-12T15:59:59.999999999"})
    void deveCancelarPreservandoDadosOriginaisInclusiveAposEncerramentoDasReservas(String agora) {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        UUID reservaId = reserva.getId();
        var resposta = service(agora).cancelar(aluno.getId(), reservaId);
        verificarReservaPreservada(reserva, StatusReserva.CANCELADA_PELO_ALUNO, LocalDateTime.parse(agora));
        assertAll(() -> assertEquals(reservaId, resposta.id()), () -> assertEquals(reservaId, reserva.getId()),
                () -> assertEquals(aluno.getId(), resposta.alunoId()), () -> assertEquals(data, resposta.dataUtilizacao()),
                () -> assertEquals(reserva.getDataHoraReserva(), resposta.dataHoraReserva()),
                () -> assertEquals(StatusReserva.CANCELADA_PELO_ALUNO, resposta.statusReserva()),
                () -> assertEquals(LocalDateTime.parse(agora), resposta.dataHoraCancelamento()),
                () -> assertEquals(ponto.getId(), resposta.pontoEmbarqueId()), () -> assertEquals("Centro", resposta.pontoEmbarqueNome()));
        var ordem = inOrder(usuarios, reservas);
        ordem.verify(usuarios).findByIdParaCriarReserva(aluno.getId());
        ordem.verify(reservas).findLockedById(reservaId);
        verifyNoMoreInteractions(reservas);
    }

    @Test void deveRejeitarCancelamentoComAlunoInexistente() {
        when(usuarios.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), UUID.randomUUID()));
        verifyNoInteractions(reservas, perfis);
    }

    @ParameterizedTest @EnumSource(value = TipoUsuario.class, names = {"ADMIN", "MOTORISTA"})
    void deveRejeitarCancelamentoPorUsuarioNaoAluno(TipoUsuario tipo) {
        aluno.setTipoUsuario(tipo); alunoDisponivel();
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), UUID.randomUUID()));
        verifyNoInteractions(reservas, perfis);
    }

    @Test void deveRejeitarCancelamentoPorAlunoInativo() {
        aluno.setAtivo(false); alunoDisponivel();
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), UUID.randomUUID()));
        assertFalse(aluno.isAtivo()); verifyNoInteractions(reservas, perfis);
    }

    @Test void deveRejeitarCancelamentoDeReservaInexistente() {
        alunoDisponivel(); UUID reservaId = UUID.randomUUID();
        when(reservas.findLockedById(reservaId)).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), reservaId));
        semPersistencia();
    }

    @Test void deveRejeitarCancelamentoDeReservaDeOutroAluno() {
        var reserva = reservaConfirmada();
        var outro = Usuario.builder().id(UUID.randomUUID()).tipoUsuario(TipoUsuario.ALUNO).build();
        reserva.setAluno(outro); reservaDisponivel(reserva);
        var erro = assertThrows(RegraNegocioException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), reserva.getId()));
        assertEquals("A reserva não pertence ao aluno solicitante.", erro.getMessage());
        assertSame(outro, reserva.getAluno()); assertSame(ponto, reserva.getPontoEmbarque());
        assertEquals(data, reserva.getDataUtilizacao());
        assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), reserva.getDataHoraReserva());
        assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
        assertNull(reserva.getDataHoraCancelamento()); semPersistencia();
    }

    @ParameterizedTest @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void deveRejeitarReservaJaCanceladaSemSobrescreverHorario(StatusReserva status) {
        var reserva = reservaConfirmada(); var anterior = LocalDateTime.parse("2026-10-10T12:00:00");
        reserva.setStatusReserva(status); reserva.setDataHoraCancelamento(anterior); reservaDisponivel(reserva);
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-12T12:00:00").cancelar(aluno.getId(), reserva.getId()));
        verificarReservaPreservada(reserva, status, anterior);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-12T16:00:00", "2026-10-12T16:00:00.000000001",
            "2026-10-12T17:00:00", "2026-10-13T08:00:00", "2026-10-09T16:59:59.999999999"})
    void deveRejeitarCancelamentoForaDoPrazoOuAntesDaCriacaoSemAlteracoes(String agora) {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        assertThrows(RegraNegocioException.class,
                () -> service(agora).cancelar(aluno.getId(), reserva.getId()));
        verificarReservaPreservada(reserva, StatusReserva.CONFIRMADA, null);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveValidarIdsObrigatoriosNoCancelamento(boolean alunoNulo) {
        assertThrows(ConstraintViolationException.class, () -> service("2026-10-12T12:00:00")
                .cancelar(alunoNulo ? null : aluno.getId(), alunoNulo ? UUID.randomUUID() : null));
        verifyNoInteractions(usuarios, reservas, perfis);
    }

    @ParameterizedTest
    @ValueSource(strings = {"2026-10-09T17:00:00", "2026-10-10T12:00:00", "2026-10-11T12:00:00", "2026-10-12T10:59:59.999999999"})
    void deveAlterarSomentePontoPreservandoPerfilEDadosOriginais(String agora) {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        var novo = PontoEmbarque.builder().id(UUID.randomUUID()).nome("Praça").build();
        when(pontos.findById(novo.getId())).thenReturn(Optional.of(novo));
        UUID id = reserva.getId();
        var resposta = service(agora).alterarPontoEmbarque(aluno.getId(), id,
                new AtualizacaoPontoEmbarqueReservaRequest(novo.getId()));
        assertSame(novo, reserva.getPontoEmbarque());
        assertSame(ponto, perfil.getPontoEmbarquePadrao());
        assertAll(() -> assertEquals(id, reserva.getId()), () -> assertEquals(id, resposta.id()),
                () -> assertSame(aluno, reserva.getAluno()), () -> assertEquals(data, reserva.getDataUtilizacao()),
                () -> assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), reserva.getDataHoraReserva()),
                () -> assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva()),
                () -> assertNull(reserva.getDataHoraCancelamento()),
                () -> assertEquals(aluno.getId(), resposta.alunoId()), () -> assertEquals(data, resposta.dataUtilizacao()),
                () -> assertEquals(reserva.getDataHoraReserva(), resposta.dataHoraReserva()),
                () -> assertEquals(StatusReserva.CONFIRMADA, resposta.statusReserva()),
                () -> assertNull(resposta.dataHoraCancelamento()),
                () -> assertEquals(novo.getId(), resposta.pontoEmbarqueId()), () -> assertEquals("Praça", resposta.pontoEmbarqueNome()));
        var ordem = inOrder(usuarios, reservas, pontos);
        ordem.verify(usuarios).findByIdParaCriarReserva(aluno.getId());
        ordem.verify(reservas).findLockedById(id);
        ordem.verify(pontos).findById(novo.getId());
        verifyNoMoreInteractions(usuarios, reservas, pontos); verifyNoInteractions(perfis);
    }

    @Test void devePermitirAlteracaoIdempotente() {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        when(pontos.findById(ponto.getId())).thenReturn(Optional.of(ponto));
        var resposta = service("2026-10-12T10:00:00").alterarPontoEmbarque(aluno.getId(), reserva.getId(),
                new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId()));
        verificarReservaPreservada(reserva, StatusReserva.CONFIRMADA, null);
        assertEquals(ponto.getId(), resposta.pontoEmbarqueId());
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ADMIN", "MOTORISTA", "inativo"})
    void deveRejeitarSolicitanteInvalidoNaAlteracao(String caso) {
        if (caso.equals("ausente")) when(usuarios.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.empty());
        else {
            if (caso.equals("inativo")) aluno.setAtivo(false);
            else aluno.setTipoUsuario(TipoUsuario.valueOf(caso));
            alunoDisponivel();
        }
        Class<? extends RuntimeException> erroEsperado = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erroEsperado,
                () -> service("2026-10-12T10:00:00").alterarPontoEmbarque(aluno.getId(), UUID.randomUUID(),
                        new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId())));
        verifyNoInteractions(reservas, pontos, perfis);
    }

    @Test void deveRejeitarAlteracaoDeReservaInexistente() {
        alunoDisponivel(); UUID id = UUID.randomUUID();
        when(reservas.findLockedById(id)).thenReturn(Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service("2026-10-12T10:00:00")
                .alterarPontoEmbarque(aluno.getId(), id, new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId())));
        verifyNoInteractions(pontos, perfis); verify(reservas, never()).save(any());
    }

    @Test void deveRejeitarAlteracaoDeReservaDeOutroAluno() {
        var reserva = reservaConfirmada(); var outro = Usuario.builder().id(UUID.randomUUID()).build();
        reserva.setAluno(outro); reservaDisponivel(reserva);
        assertThrows(RegraNegocioException.class, () -> service("2026-10-12T10:00:00")
                .alterarPontoEmbarque(aluno.getId(), reserva.getId(), new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId())));
        assertSame(outro, reserva.getAluno());
        assertSame(ponto, reserva.getPontoEmbarque());
        assertEquals(data, reserva.getDataUtilizacao());
        assertEquals(LocalDateTime.parse("2026-10-09T17:00:00"), reserva.getDataHoraReserva());
        assertEquals(StatusReserva.CONFIRMADA, reserva.getStatusReserva());
        assertNull(reserva.getDataHoraCancelamento());
        verify(reservas, never()).save(any()); verifyNoInteractions(perfis);
        verifyNoInteractions(pontos);
    }

    @ParameterizedTest @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void deveRejeitarAlteracaoDeReservaCancelada(StatusReserva status) {
        var reserva = reservaConfirmada(); reserva.setStatusReserva(status);
        var cancelamento = LocalDateTime.parse("2026-10-10T12:00:00");
        reserva.setDataHoraCancelamento(cancelamento); reservaDisponivel(reserva);
        assertThrows(RegraNegocioException.class, () -> service("2026-10-12T10:00:00")
                .alterarPontoEmbarque(aluno.getId(), reserva.getId(), new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId())));
        verificarReservaPreservada(reserva, status, cancelamento); verifyNoInteractions(pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-12T11:00:00", "2026-10-12T11:00:00.000000001", "2026-10-12T12:00:00", "2026-10-09T16:59:59"})
    void deveRejeitarAlteracaoForaDoPrazoOuAntesDaCriacao(String agora) {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        assertThrows(RegraNegocioException.class, () -> service(agora)
                .alterarPontoEmbarque(aluno.getId(), reserva.getId(), new AtualizacaoPontoEmbarqueReservaRequest(ponto.getId())));
        verificarReservaPreservada(reserva, StatusReserva.CONFIRMADA, null); verifyNoInteractions(pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "inativo", "mesmoInativo"})
    void deveRejeitarNovoPontoInvalidoSemAlteracoesParciais(String caso) {
        var reserva = reservaConfirmada(); reservaDisponivel(reserva);
        var novo = caso.equals("mesmoInativo") ? ponto : PontoEmbarque.builder().id(UUID.randomUUID()).nome("Praça").build();
        novo.setAtivo(false);
        when(pontos.findById(novo.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(novo));
        Class<? extends RuntimeException> erroEsperado = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erroEsperado,
                () -> service("2026-10-12T10:00:00").alterarPontoEmbarque(aluno.getId(), reserva.getId(),
                        new AtualizacaoPontoEmbarqueReservaRequest(novo.getId())));
        verificarReservaPreservada(reserva, StatusReserva.CONFIRMADA, null);
        assertSame(ponto, perfil.getPontoEmbarquePadrao());
    }

    @ParameterizedTest @ValueSource(strings = {"aluno", "reserva", "dados", "ponto"})
    void deveExecutarValidacaoJakartaNaAlteracao(String campo) {
        assertThrows(ConstraintViolationException.class, () -> service("2026-10-12T10:00:00").alterarPontoEmbarque(
                campo.equals("aluno") ? null : aluno.getId(), campo.equals("reserva") ? null : UUID.randomUUID(),
                campo.equals("dados") ? null : new AtualizacaoPontoEmbarqueReservaRequest(campo.equals("ponto") ? null : ponto.getId())));
        verifyNoInteractions(usuarios, reservas, pontos, perfis);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-12T08:00:00", "2026-10-12T11:00:00", "2026-10-12T16:00:00", "2026-10-12T17:00:00", "2026-10-12T23:59:59", "2026-10-12T00:00:00"})
    void deveManterReservaAtualDuranteTodoODia(String agora) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var reserva = reservaConfirmada();
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA)).thenReturn(Optional.of(reserva));
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data.plusDays(1), StatusReserva.CONFIRMADA)).thenReturn(Optional.empty());
        var painel = service(agora).consultarPainel(aluno.getId());
        assertEquals(reserva.getId(), painel.reservaAtual().id());
        assertEquals(ponto.getId(), painel.reservaAtual().pontoEmbarqueId());
        assertNull(painel.proximaReserva());
        verificarReservaPreservada(reserva, StatusReserva.CONFIRMADA, null);
        verify(usuarios, never()).findByIdParaCriarReserva(any());
        verifyNoInteractions(pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"ambas", "atual", "proxima", "nenhuma"})
    void deveSelecionarPosicoesIndependentesNoPainel(String caso) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var atual = reservaConfirmada(); var futura = reservaConfirmada(); futura.setDataUtilizacao(data.plusDays(1));
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA))
                .thenReturn(caso.equals("ambas") || caso.equals("atual") ? Optional.of(atual) : Optional.empty());
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data.plusDays(1), StatusReserva.CONFIRMADA))
                .thenReturn(caso.equals("ambas") || caso.equals("proxima") ? Optional.of(futura) : Optional.empty());
        var painel = service("2026-10-12T18:00:00").consultarPainel(aluno.getId());
        assertEquals(caso.equals("ambas") || caso.equals("atual"), painel.reservaAtual() != null);
        assertEquals(caso.equals("ambas") || caso.equals("proxima"), painel.proximaReserva() != null);
        if (painel.proximaReserva() != null) {
            assertEquals(data.plusDays(1), painel.proximaReserva().dataUtilizacao());
            assertEquals(StatusReserva.CONFIRMADA, painel.proximaReserva().statusReserva());
        }
        verifyNoMoreInteractions(reservas); semPersistencia(); verifyNoInteractions(perfis, pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"2026-10-09T18:00:00", "2026-10-09T23:59:59", "2026-10-10T00:00:00", "2026-10-11T12:00:00"})
    void deveSelecionarSegundaComoProximaSemSubstituirSexta(String agora) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var futura = reservaConfirmada();
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA)).thenReturn(Optional.of(futura));
        var hoje = LocalDateTime.parse(agora).toLocalDate();
        boolean sexta = hoje.equals(data.minusDays(3));
        var atual = reservaConfirmada(); atual.setDataUtilizacao(hoje);
        if (sexta) when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), hoje, StatusReserva.CONFIRMADA)).thenReturn(Optional.of(atual));
        var painel = service(agora).consultarPainel(aluno.getId());
        assertEquals(sexta, painel.reservaAtual() != null);
        if (sexta) assertEquals(atual.getId(), painel.reservaAtual().id());
        else verify(reservas, never()).findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), hoje, StatusReserva.CONFIRMADA);
        assertEquals(data, painel.proximaReserva().dataUtilizacao());
        semPersistencia(); verifyNoInteractions(perfis, pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ADMIN", "MOTORISTA", "inativo"})
    void deveValidarSolicitanteDoPainel(String caso) {
        if (caso.equals("inativo")) aluno.setAtivo(false);
        else if (!caso.equals("ausente")) aluno.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(aluno.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(aluno));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service("2026-10-12T18:00:00").consultarPainel(aluno.getId()));
        verifyNoInteractions(reservas, perfis, pontos);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void deveRejeitarDuplicidadeConfirmadaNoPainel(boolean futura) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        if (futura) when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA)).thenReturn(Optional.empty());
        when(reservas.findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), futura ? data.plusDays(1) : data, StatusReserva.CONFIRMADA))
                .thenThrow(new org.springframework.dao.IncorrectResultSizeDataAccessException(1, 2));
        assertThrows(RegraNegocioException.class, () -> service("2026-10-12T18:00:00").consultarPainel(aluno.getId()));
        semPersistencia();
    }

    @Test void deveValidarAlunoObrigatorioNoPainel() {
        assertThrows(ConstraintViolationException.class, () -> service("2026-10-12T18:00:00").consultarPainel(null));
        verifyNoInteractions(usuarios, reservas, perfis, pontos);
    }

    @ParameterizedTest @EnumSource(value = StatusReserva.class, names = {"CANCELADA_PELO_ALUNO", "CANCELADA_POR_SUSPENSAO"})
    void deveConsultarApenasConfirmadasSemModificarCanceladas(StatusReserva status) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var cancelada = reservaConfirmada(); cancelada.setStatusReserva(status);
        var cancelamento = LocalDateTime.parse("2026-10-10T12:00:00"); cancelada.setDataHoraCancelamento(cancelamento);
        var painel = service("2026-10-12T18:00:00").consultarPainel(aluno.getId());
        assertNull(painel.reservaAtual()); assertNull(painel.proximaReserva());
        verify(reservas).findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA);
        verify(reservas).findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data.plusDays(1), StatusReserva.CONFIRMADA);
        verifyNoMoreInteractions(reservas);
        verificarReservaPreservada(cancelada, status, cancelamento);
    }

    @Test void deveLerRelogioUmaUnicaVezMesmoNaViradaDoDia() {
        Clock clock = mock(Clock.class);
        when(clock.withZone(ZoneId.of("America/Maceio"))).thenReturn(clock);
        when(clock.getZone()).thenReturn(ZoneId.of("America/Maceio"));
        when(clock.instant()).thenReturn(Instant.parse("2026-10-10T02:59:59Z"), Instant.parse("2026-10-10T03:00:00Z"));
        var servico = new ReservaService(usuarios, perfis, reservas, pontos, suspensoes,
                datasSemFuncionamento, new RegrasTemporaisReserva(clock), clock);
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var painel = servico.consultarPainel(aluno.getId());
        assertNull(painel.reservaAtual()); assertNull(painel.proximaReserva());
        verify(clock, times(1)).instant();
        verify(reservas).findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), LocalDate.of(2026, 10, 9), StatusReserva.CONFIRMADA);
        verify(reservas).findByAlunoIdAndDataUtilizacaoAndStatusReserva(aluno.getId(), data, StatusReserva.CONFIRMADA);
        verifyNoMoreInteractions(reservas);
    }

    @ParameterizedTest
    @CsvSource({"0,10,25,10", "1,10,25,10", "2,10,25,5", "3,10,25,0", "0,50,51,50", "0,,0,0", "0,,1,1"})
    void devePaginarHistoricoPreservandoMetadadosEOrdenacao(int pagina, Integer tamanho, int total, int quantidade) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var itens = new ArrayList<Reserva>();
        for (int i = 0; i < quantidade; i++) itens.add(reservaConfirmada());
        int limite = tamanho == null ? 10 : tamanho;
        var pageable = org.springframework.data.domain.PageRequest.of(pagina, limite,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Order.desc("dataUtilizacao"),
                        org.springframework.data.domain.Sort.Order.desc("dataHoraReserva"), org.springframework.data.domain.Sort.Order.asc("id")));
        when(reservas.findByAlunoId(aluno.getId(), pageable)).thenReturn(new org.springframework.data.domain.PageImpl<>(itens, pageable, total));
        var resposta = service("2026-10-12T12:00:00").consultarHistorico(aluno.getId(), pagina, tamanho);
        assertEquals(pagina, resposta.getNumber()); assertEquals(limite, resposta.getSize());
        assertEquals(total, resposta.getTotalElements());
        assertEquals((int) Math.ceil((double) total / limite), resposta.getTotalPages());
        assertEquals(quantidade, resposta.getNumberOfElements());
        assertEquals((long) (pagina + 1) * limite < total, resposta.hasNext());
        assertEquals(itens.stream().map(Reserva::getId).toList(), resposta.getContent().stream().map(r -> r.id()).toList());
        verify(reservas).findByAlunoId(aluno.getId(), pageable); verifyNoMoreInteractions(reservas);
        verify(usuarios).findById(aluno.getId()); verifyNoMoreInteractions(usuarios);
        verifyNoInteractions(perfis, pontos);
        itens.forEach(r -> verificarReservaPreservada(r, StatusReserva.CONFIRMADA, null));
    }

    @ParameterizedTest @CsvSource({"CONFIRMADA,2026-10-08", "CANCELADA_PELO_ALUNO,2026-10-12", "CANCELADA_POR_SUSPENSAO,2026-10-15"})
    void deveMapearHistoricoComQualquerStatusEData(StatusReserva status, LocalDate utilizacao) {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var reserva = reservaConfirmada(); reserva.setStatusReserva(status); reserva.setDataUtilizacao(utilizacao);
        LocalDateTime cancelamento = status == StatusReserva.CONFIRMADA ? null : LocalDateTime.parse("2026-10-09T18:00:00");
        reserva.setDataHoraCancelamento(cancelamento);
        when(reservas.findByAlunoId(org.mockito.ArgumentMatchers.eq(aluno.getId()), any(org.springframework.data.domain.Pageable.class)))
                .thenAnswer(i -> new org.springframework.data.domain.PageImpl<>(List.of(reserva), i.getArgument(1), 1));
        var item = service("2026-10-12T12:00:00").consultarHistorico(aluno.getId(), 0, 10).getContent().getFirst();
        assertAll(() -> assertEquals(reserva.getId(), item.id()), () -> assertEquals(aluno.getId(), item.alunoId()),
                () -> assertEquals(utilizacao, item.dataUtilizacao()), () -> assertEquals(reserva.getDataHoraReserva(), item.dataHoraReserva()),
                () -> assertEquals(status, item.statusReserva()), () -> assertEquals(ponto.getId(), item.pontoEmbarqueId()),
                () -> assertEquals(ponto.getNome(), item.pontoEmbarqueNome()), () -> assertEquals(cancelamento, item.dataHoraCancelamento()));
        assertEquals(status, reserva.getStatusReserva()); assertEquals(cancelamento, reserva.getDataHoraCancelamento());
        semPersistencia(); verifyNoInteractions(perfis, pontos);
    }

    @ParameterizedTest @CsvSource({"-1,10", "0,0", "0,-1", "0,51", "0,2147483647"})
    void deveRejeitarPaginacaoInvalidaSemConsultarBanco(int pagina, int tamanho) {
        assertThrows(RegraNegocioException.class, () -> service("2026-10-12T12:00:00").consultarHistorico(aluno.getId(), pagina, tamanho));
        verifyNoInteractions(usuarios, reservas, perfis, pontos);
    }

    @ParameterizedTest @ValueSource(strings = {"ausente", "ADMIN", "MOTORISTA", "inativo"})
    void deveValidarAlunoNoHistorico(String caso) {
        if (caso.equals("inativo")) aluno.setAtivo(false);
        else if (!caso.equals("ausente")) aluno.setTipoUsuario(TipoUsuario.valueOf(caso));
        when(usuarios.findById(aluno.getId())).thenReturn(caso.equals("ausente") ? Optional.empty() : Optional.of(aluno));
        Class<? extends RuntimeException> erro = caso.equals("ausente") ? RecursoNaoEncontradoException.class : RegraNegocioException.class;
        assertThrows(erro, () -> service("2026-10-12T12:00:00").consultarHistorico(aluno.getId(), 0, 10));
        verifyNoInteractions(reservas, perfis, pontos);
        verify(usuarios, never()).findByIdParaCriarReserva(any());
    }

    @Test void deveValidarUuidObrigatorioNoHistorico() {
        assertThrows(ConstraintViolationException.class, () -> service("2026-10-12T12:00:00").consultarHistorico(null, 0, 10));
        verifyNoInteractions(usuarios, reservas, perfis, pontos);
    }

    @Test void deveRejeitarReservaEmDataSemFuncionamento() {
        perfilDisponivel();
        when(datasSemFuncionamento.findDatasNoPeriodo(data.minusDays(30), data)).thenReturn(Set.of(data));
        var erro = assertThrows(RegraNegocioException.class,
                () -> service("2026-10-09T18:00:00").cadastrar(aluno.getId(), dados));
        assertEquals("Não há funcionamento do transporte na data informada.", erro.getMessage());
        verifyNoInteractions(reservas, suspensoes);
        semPersistencia();
    }

    @Test void devePermitirReservaComAberturaAntecipadaQuandoDiaAnteriorNaoTemFuncionamento() {
        LocalDate sexta = LocalDate.of(2026, 10, 16);
        LocalDate quintaBloqueada = LocalDate.of(2026, 10, 15);
        perfilDisponivel();
        salvar();
        when(datasSemFuncionamento.findDatasNoPeriodo(sexta.minusDays(30), sexta))
                .thenReturn(Set.of(quintaBloqueada));

        var resposta = service("2026-10-14T17:00:00").cadastrar(aluno.getId(), new CriacaoReservaRequest(sexta));
        assertEquals(sexta, resposta.dataUtilizacao());
        assertEquals(StatusReserva.CONFIRMADA, resposta.statusReserva());
    }
}