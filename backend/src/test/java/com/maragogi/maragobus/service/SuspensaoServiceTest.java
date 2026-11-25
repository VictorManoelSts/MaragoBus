package com.maragogi.maragobus.domain.reserva;

import com.maragogi.maragobus.domain.suspensao.RegrasTemporaisSuspensao;
import com.maragogi.maragobus.entity.Advertencia;
import com.maragogi.maragobus.entity.Reserva;
import com.maragogi.maragobus.entity.SolicitacaoAdvertencia;
import com.maragogi.maragobus.entity.Suspensao;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
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
    void naoDeveGerarSuspensaoQuandoTotalDeAdvertenciasNaoForMultiploDeTres() {
        Usuario aluno = criarUsuario(TipoUsuario.ALUNO, true);
        Usuario admin = criarUsuario(TipoUsuario.ADMIN, true);
        Advertencia advertencia = criarAdvertencia(aluno);

        when(advertenciaRepository.countBySolicitacaoAdvertenciaAlunoId(aluno.getId())).thenReturn(2L);

        Optional<Suspensao> resultado = suspensaoService.avaliarEAplicarPorAdvertencia(
                advertencia, admin, LocalDateTime.of(2026, 10, 7, 10, 0));

        assertTrue(resultado.isEmpty());
        verify(suspensaoRepository, never()).save(any());
        verify(reservaRepository, never()).findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(any(), any(), any(), any());
    }

    @Test
    void deveGerarSuspensaoDeUmDiaAntesDas11ECancelarReservaDoProprioDia() {
        Usuario aluno = criarUsuario(TipoUsuario.ALUNO, true);
        Usuario admin = criarUsuario(TipoUsuario.ADMIN, true);
        Advertencia advertencia = criarAdvertencia(aluno);
        LocalDateTime agora = LocalDateTime.of(2026, 10, 7, 9, 30);

        Reserva reservaHoje = Reserva.builder()
                .id(UUID.randomUUID())
                .aluno(aluno)
                .dataUtilizacao(LocalDate.of(2026, 10, 7))
                .statusReserva(StatusReserva.CONFIRMADA)
                .build();

        when(advertenciaRepository.countBySolicitacaoAdvertenciaAlunoId(aluno.getId())).thenReturn(3L);
        when(suspensaoRepository.save(any(Suspensao.class))).thenAnswer(inv -> {
            Suspensao s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                aluno.getId(), StatusReserva.CONFIRMADA, LocalDate.of(2026, 10, 7), LocalDate.of(2026, 10, 7)))
                .thenReturn(List.of(reservaHoje));

        Optional<Suspensao> resultado = suspensaoService.avaliarEAplicarPorAdvertencia(advertencia, admin, agora);

        assertTrue(resultado.isPresent());
        Suspensao suspensao = resultado.get();
        assertEquals(DuracaoSuspensao.UM_DIA, suspensao.getDuracao());
        assertEquals(LocalDate.of(2026, 10, 7), suspensao.getDataInicio());
        assertEquals(LocalDate.of(2026, 10, 7), suspensao.getDataFim());
        assertEquals(admin, suspensao.getAdministradorResponsavel());
        assertEquals(agora, suspensao.getDataHoraAplicacao());

        assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservaHoje.getStatusReserva());
        assertEquals(agora, reservaHoje.getDataHoraCancelamento());
        verify(eventos).registrarCancelamentoPorSuspensao(reservaHoje, admin, null, agora);
    }

    @Test
    void deveGerarSuspensaoDeTresDiasAposAs11PreservandoODiaAtualECancelandoFuturas() {
        Usuario aluno = criarUsuario(TipoUsuario.ALUNO, true);
        Usuario admin = criarUsuario(TipoUsuario.ADMIN, true);
        Advertencia advertencia = criarAdvertencia(aluno);
        // Quarta 07/10 às 18:00 -> período: Qui 08/10 a Seg 12/10
        LocalDateTime agora = LocalDateTime.of(2026, 10, 7, 18, 0);

        Reserva reservaQuinta = Reserva.builder()
                .id(UUID.randomUUID())
                .aluno(aluno)
                .dataUtilizacao(LocalDate.of(2026, 10, 8))
                .statusReserva(StatusReserva.CONFIRMADA)
                .build();

        when(advertenciaRepository.countBySolicitacaoAdvertenciaAlunoId(aluno.getId())).thenReturn(6L);
        when(suspensaoRepository.save(any(Suspensao.class))).thenAnswer(inv -> {
            Suspensao s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                aluno.getId(), StatusReserva.CONFIRMADA, LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 12)))
                .thenReturn(List.of(reservaQuinta));

        Optional<Suspensao> resultado = suspensaoService.avaliarEAplicarPorAdvertencia(advertencia, admin, agora);

        assertTrue(resultado.isPresent());
        assertEquals(DuracaoSuspensao.TRES_DIAS, resultado.get().getDuracao());
        assertEquals(LocalDate.of(2026, 10, 8), resultado.get().getDataInicio());
        assertEquals(LocalDate.of(2026, 10, 12), resultado.get().getDataFim());

        assertEquals(StatusReserva.CANCELADA_POR_SUSPENSAO, reservaQuinta.getStatusReserva());
        assertEquals(agora, reservaQuinta.getDataHoraCancelamento());
    }

    @Test
    void devePularDatasSemFuncionamentoAoAplicarNovaSuspensao() {
        Usuario aluno = criarUsuario(TipoUsuario.ALUNO, true);
        Usuario admin = criarUsuario(TipoUsuario.ADMIN, true);
        Advertencia advertencia = criarAdvertencia(aluno);
        // Quarta 07/10 às 09:30, mas Qua 07/10 e Sex 09/10 estão bloqueadas -> 3 dias úteis: Qui 08/10, Seg 12/10, Ter 13/10
        LocalDateTime agora = LocalDateTime.of(2026, 10, 7, 9, 30);

        when(advertenciaRepository.countBySolicitacaoAdvertenciaAlunoId(aluno.getId())).thenReturn(6L);
        when(dataSemFuncionamentoRepository.findDatasAPartirDe(LocalDate.of(2026, 10, 7)))
                .thenReturn(Set.of(LocalDate.of(2026, 10, 7), LocalDate.of(2026, 10, 9)));
        when(suspensaoRepository.save(any(Suspensao.class))).thenAnswer(inv -> {
            Suspensao s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(reservaRepository.findByAlunoIdAndStatusReservaAndDataUtilizacaoBetweenOrderById(
                aluno.getId(), StatusReserva.CONFIRMADA, LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 13)))
                .thenReturn(List.of());

        Optional<Suspensao> resultado = suspensaoService.avaliarEAplicarPorAdvertencia(advertencia, admin, agora);

        assertTrue(resultado.isPresent());
        assertEquals(DuracaoSuspensao.TRES_DIAS, resultado.get().getDuracao());
        assertEquals(LocalDate.of(2026, 10, 8), resultado.get().getDataInicio());
        assertEquals(LocalDate.of(2026, 10, 13), resultado.get().getDataFim());
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