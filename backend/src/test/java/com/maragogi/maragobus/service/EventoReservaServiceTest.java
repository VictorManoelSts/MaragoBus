package com.maragogi.maragobus.service;

import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoEventoReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.EventoReservaRepository;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventoReservaServiceTest {

    @Mock EventoReservaRepository eventos;
    @Mock ReservaRepository reservas;
    @Mock UsuarioRepository usuarios;

    private EventoReservaService service;

    private final Usuario admin = Usuario.builder()
            .id(UUID.randomUUID()).nome("Admin").tipoUsuario(TipoUsuario.ADMIN).build();
    private final Usuario aluno = Usuario.builder()
            .id(UUID.randomUUID()).nome("Aluno A").tipoUsuario(TipoUsuario.ALUNO).build();
    private final Usuario outroAluno = Usuario.builder()
            .id(UUID.randomUUID()).nome("Aluno B").tipoUsuario(TipoUsuario.ALUNO).build();
    private final Usuario motorista = Usuario.builder()
            .id(UUID.randomUUID()).nome("Motorista").tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final PontoEmbarque ponto = PontoEmbarque.builder()
            .id(UUID.randomUUID()).nome("Praça Central").build();

    @BeforeEach
    void configurar() {
        service = new EventoReservaService(eventos, reservas, usuarios);
    }

    private Reserva reservaExemplo() {
        return Reserva.builder()
                .id(UUID.randomUUID())
                .aluno(aluno)
                .pontoEmbarque(ponto)
                .pontoEmbarqueNomeSnapshot("Praça Central")
                .faculdadeIdSnapshot(UUID.randomUUID())
                .faculdadeNomeSnapshot("Faculdade Alfa")
                .cursoNomeSnapshot("Direito")
                .dataUtilizacao(LocalDate.of(2026, 10, 14))
                .dataHoraReserva(LocalDateTime.of(2026, 10, 14, 9, 0))
                .statusReserva(StatusReserva.CONFIRMADA)
                .build();
    }

    @Test
    void deveRegistrarCriacaoECancelamentoComMotivoPadraoEExplicito() {
        when(eventos.saveAndFlush(any(EventoReserva.class))).thenAnswer(inv -> inv.getArgument(0));
        var reserva = reservaExemplo();

        var criacao = service.registrarCriacao(reserva, aluno, LocalDateTime.of(2026, 10, 14, 9, 0));
        assertEquals(TipoEventoReserva.CRIACAO, criacao.tipoEvento());
        assertNull(criacao.statusAnterior());
        assertEquals(StatusReserva.CONFIRMADA, criacao.statusNovo());
        assertEquals("Aluno A", criacao.autorNome());
        assertEquals("Praça Central", criacao.pontoEmbarqueNome());
        assertEquals("Faculdade Alfa", criacao.faculdadeNome());
        assertEquals("Direito", criacao.cursoNome());

        var cancelamentoPadrao = service.registrarCancelamentoPeloAluno(
                reserva, aluno, "   ", LocalDateTime.of(2026, 10, 14, 10, 0));
        assertEquals(TipoEventoReserva.CANCELAMENTO_PELO_ALUNO, cancelamentoPadrao.tipoEvento());
        assertEquals("Cancelamento solicitado pelo aluno.", cancelamentoPadrao.motivo());

        var cancelamentoSuspensao = service.registrarCancelamentoPorSuspensao(
                reserva, admin, "  Suspensão disciplinar de 7 dias  ", LocalDateTime.of(2026, 10, 14, 11, 0));
        assertEquals(TipoEventoReserva.CANCELAMENTO_POR_SUSPENSAO, cancelamentoSuspensao.tipoEvento());
        assertEquals(TipoUsuario.ADMIN, cancelamentoSuspensao.autorTipo());
        assertEquals("Suspensão disciplinar de 7 dias", cancelamentoSuspensao.motivo());
    }

    @Test
    void deveAutorizarApenasAdminEOProprioAlunoNaConsultaPorReserva() {
        var reserva = reservaExemplo();
        when(reservas.findById(reserva.getId())).thenReturn(Optional.of(reserva));
        when(eventos.findByReservaIdOrderByDataHoraEventoAscIdAsc(reserva.getId())).thenReturn(List.of());

        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));
        assertTrue(service.consultarPorReserva(admin.getId(), reserva.getId()).isEmpty());

        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        assertTrue(service.consultarPorReserva(aluno.getId(), reserva.getId()).isEmpty());

        when(usuarios.findById(outroAluno.getId())).thenReturn(Optional.of(outroAluno));
        assertThrows(RegraNegocioException.class,
                () -> service.consultarPorReserva(outroAluno.getId(), reserva.getId()));

        when(usuarios.findById(motorista.getId())).thenReturn(Optional.of(motorista));
        assertThrows(RegraNegocioException.class,
                () -> service.consultarPorReserva(motorista.getId(), reserva.getId()));
    }

    @Test
    void deveBloquearConsultaPorAlunoParaUsuarioInativoOuNaoAutorizado() {
        var inativo = Usuario.builder()
                .id(UUID.randomUUID()).nome("Inativo").tipoUsuario(TipoUsuario.ADMIN).ativo(false).build();
        when(usuarios.findById(inativo.getId())).thenReturn(Optional.of(inativo));

        assertThrows(RegraNegocioException.class,
                () -> service.consultarPorAluno(inativo.getId(), aluno.getId(), 0, 10));

        when(usuarios.findById(outroAluno.getId())).thenReturn(Optional.of(outroAluno));
        assertThrows(RegraNegocioException.class,
                () -> service.consultarPorAluno(outroAluno.getId(), aluno.getId(), 0, 10));
    }
}