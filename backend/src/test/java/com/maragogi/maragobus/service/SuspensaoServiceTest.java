package com.maragogi.maragobus.domain.reserva;

import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.enums.StatusSuspensao;
import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import com.maragogi.maragobus.dto.suspensao.DefinicaoDuracaoSuspensaoRequest;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.AdvertenciaRepository;
import com.maragogi.maragobus.repository.DataSemFuncionamentoRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.SuspensaoRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import com.maragogi.maragobus.service.EventoReservaService;
import com.maragogi.maragobus.service.SuspensaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspensaoServiceTest {

    private static final ZoneId FUSO = ZoneId.of("America/Maceio");

    @Mock
    private AdvertenciaRepository advertenciaRepository;
    @Mock
    private SuspensaoRepository suspensaoRepository;
    @Mock
    private ReservaRepository reservaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private DataSemFuncionamentoRepository dataSemFuncionamentoRepository;

    @Mock
    private EventoReservaService eventos;

    private SuspensaoService suspensaoService;
    private Clock clock;

    @BeforeEach
    void setUp() {
        // Quarta-feira 07/10/2026 às 10:00 (America/Maceio = UTC-3)
        clock = Clock.fixed(LocalDateTime.of(2026, 10, 7, 10, 0).atZone(FUSO).toInstant(), FUSO);
        var regrasReserva = new RegrasTemporaisReserva(clock);
        var regrasSuspensao = new RegrasTemporaisSuspensao(regrasReserva);

        suspensaoService = new SuspensaoService(
                advertenciaRepository,
                suspensaoRepository,
                reservaRepository,
                usuarioRepository,
                dataSemFuncionamentoRepository,
                regrasSuspensao,
                eventos,
                clock
        );
    }

    @Test
    void deveReservarTresAdvertenciasSemConsultarReservas() {
        var aluno = criarUsuario(TipoUsuario.ALUNO, true);
        var primeira = criarAdvertencia(aluno);
        var segunda = criarAdvertencia(aluno);
        var terceira = criarAdvertencia(aluno);
        when(advertenciaRepository
                .findBySolicitacaoAdvertenciaAlunoIdAndSolicitacaoAdvertenciaStatusAndSuspensaoIsNullOrderBySolicitacaoAdvertenciaDataHoraAnaliseAscIdAsc(
                        eq(aluno.getId()), eq(StatusSolicitacaoAdvertencia.APROVADA), any(Pageable.class)))
                .thenReturn(List.of(primeira, segunda))
                .thenReturn(List.of(primeira, segunda, terceira));
        when(suspensaoRepository.save(any(Suspensao.class))).thenAnswer(inv -> inv.getArgument(0));

        assertTrue(suspensaoService.avaliarSuspensaoPendente(segunda).isEmpty());
        var resultado = suspensaoService.avaliarSuspensaoPendente(terceira).orElseThrow();

        assertEquals(StatusSuspensao.PENDENTE_DURACAO, resultado.getStatus());
        assertSame(terceira, resultado.getAdvertenciaOrigem());
        assertSame(resultado, primeira.getSuspensao());
        assertSame(resultado, segunda.getSuspensao());
        assertSame(resultado, terceira.getSuspensao());
        assertNull(resultado.getDataInicio());
        verifyNoInteractions(reservaRepository, eventos);
    }

    @Test
    void deveAplicarDecisaoPulandoDatasSemFuncionamentoEReservandoODiaAtual() {
        var aluno = criarUsuario(TipoUsuario.ALUNO, true);
        var admin = criarUsuario(TipoUsuario.ADMIN, true);
        var suspensao = pendencia(aluno);
        var hoje = LocalDate.of(2026, 10, 7);
        var inicio = LocalDate.of(2026, 10, 9);
        var fim = LocalDate.of(2026, 10, 13);
        var reserva = Reserva.builder().statusReserva(StatusReserva.CONFIRMADA).build();

        when(usuarioRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(usuarioRepository.findByIdParaCriarReserva(aluno.getId())).thenReturn(Optional.of(aluno));
        when(suspensaoRepository.findAlunoId(suspensao.getId())).thenReturn(Optional.of(aluno.getId()));
        when(suspensaoRepository.findById(suspensao.getId())).thenReturn(Optional.of(suspensao));
        when(dataSemFuncionamentoRepository.findDatasAPartirDe(hoje)).thenReturn(Set.of(hoje.plusDays(1)));
        when(reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                aluno.getId(), StatusReserva.CONFIRMADA, inicio, fim)).thenReturn(List.of(reserva));

        var resultado = suspensaoService.definirDuracao(admin.getId(), suspensao.getId(),
                new DefinicaoDuracaoSuspensaoRequest(3, "  Reincidência  "));

        assertEquals(StatusSuspensao.APLICADA, resultado.status());
        assertEquals(DuracaoSuspensao.TRES_DIAS, resultado.duracao());
        assertEquals(inicio, resultado.dataInicio());
        assertEquals(fim, resultado.dataFim());
        assertEquals(admin.getId(), resultado.administradorResponsavelId());
        assertEquals("Reincidência", resultado.justificativa());
        assertFalse(resultado.vigente());
        assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reserva.getStatusReserva());
        verify(eventos).registrarCancelamentoPorSuspensao(reserva, admin, "Reincidência",
                hoje.atTime(10, 0));
    }

    @Test
    void deveRejeitarDuracaoInvalidaAntesDeModificarPendencia() {
        var admin = criarUsuario(TipoUsuario.ADMIN, true);
        when(usuarioRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThrows(RegraNegocioException.class, () -> suspensaoService.definirDuracao(
                admin.getId(), UUID.randomUUID(), new DefinicaoDuracaoSuspensaoRequest(2, "Reincidência")));
        verifyNoInteractions(suspensaoRepository, reservaRepository, eventos);
    }

    private Suspensao pendencia(Usuario aluno) {
        return Suspensao.builder().id(UUID.randomUUID()).advertenciaOrigem(criarAdvertencia(aluno))
                .status(StatusSuspensao.PENDENTE_DURACAO).build();
    }

    @Test
    void deveConsultarSuspensoesPorAlunoCalculandoVigencia() {
        Usuario admin = criarUsuario(TipoUsuario.ADMIN, true);
        Usuario aluno = criarUsuario(TipoUsuario.ALUNO, true);
        Advertencia advertencia = criarAdvertencia(aluno);

        Suspensao suspensaoVigente = Suspensao.builder()
                .id(UUID.randomUUID())
                .advertenciaOrigem(advertencia)
                .administradorResponsavel(admin)
                .duracao(DuracaoSuspensao.UM_DIA)
                .dataInicio(LocalDate.of(2026, 10, 7))
                .dataFim(LocalDate.of(2026, 10, 7))
                .dataHoraAplicacao(LocalDateTime.of(2026, 10, 7, 9, 0))
                .build();

        when(usuarioRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(usuarioRepository.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        when(suspensaoRepository.findByAlunoId(eq(aluno.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(suspensaoVigente)));

        var pagina = suspensaoService.consultarPorAluno(admin.getId(), aluno.getId(), 0, 10);

        assertEquals(1, pagina.getTotalElements());
        var item = pagina.getContent().getFirst();
        assertEquals(aluno.getId(), item.alunoId());
        assertEquals(1, item.duracaoDiasTransporte());
        assertTrue(item.vigente());
    }

    @Test
    void deveBloquearConsultaPorUsuarioQueNaoEhAdmin() {
        Usuario motorista = criarUsuario(TipoUsuario.MOTORISTA, true);
        when(usuarioRepository.findById(motorista.getId())).thenReturn(Optional.of(motorista));

        assertThrows(RegraNegocioException.class,
                () -> suspensaoService.consultarTodas(motorista.getId(), false, 0, 10));
    }

    private Usuario criarUsuario(TipoUsuario tipo, boolean ativo) {
        return Usuario.builder()
                .id(UUID.randomUUID())
                .nome("Teste " + tipo)
                .tipoUsuario(tipo)
                .ativo(ativo)
                .build();
    }

    private Advertencia criarAdvertencia(Usuario aluno) {
        SolicitacaoAdvertencia solicitacao = SolicitacaoAdvertencia.builder()
                .id(UUID.randomUUID())
                .aluno(aluno)
                .build();
        return Advertencia.builder()
                .id(UUID.randomUUID())
                .solicitacaoAdvertencia(solicitacao)
                .build();
    }
}