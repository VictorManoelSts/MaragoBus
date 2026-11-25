package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.repository.ReservaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FechamentoReservasPontoInativoTest {
    @Mock ReservaRepository reservas;
    @Mock ReservaService reservaService;

    @Test
    void naoDeveConsultarCandidatasAntesDoCorte() {
        fechamento(LocalDateTime.parse("2026-10-14T10:59:59")).executar();
        verifyNoInteractions(reservas, reservaService);
    }

    @Test
    void deveProcessarCandidatasAPartirDoCorteMesmoSeUmaFalhar() {
        var agora = LocalDateTime.parse("2026-10-14T11:00:00");
        var primeira = candidata();
        var segunda = candidata();
        UUID primeiroAluno = primeira.getAlunoId();
        UUID primeiraReserva = primeira.getReservaId();
        UUID segundoAluno = segunda.getAlunoId();
        UUID segundaReserva = segunda.getReservaId();
        when(reservas.buscarParaFechamentoPorPontoInativo(agora.toLocalDate(), StatusReserva.CONFIRMADA))
                .thenReturn(List.of(primeira, segunda));
        doThrow(new IllegalStateException("Falha na gravação"))
                .when(reservaService).cancelarPorPontoInativo(primeiroAluno, primeiraReserva);

        fechamento(agora).executar();

        var ordem = inOrder(reservaService);
        ordem.verify(reservaService).cancelarPorPontoInativo(primeiroAluno, primeiraReserva);
        ordem.verify(reservaService).cancelarPorPontoInativo(segundoAluno, segundaReserva);
    }

    private ReservaRepository.CandidataFechamento candidata() {
        var candidata = mock(ReservaRepository.CandidataFechamento.class);
        when(candidata.getAlunoId()).thenReturn(UUID.randomUUID());
        when(candidata.getReservaId()).thenReturn(UUID.randomUUID());
        return candidata;
    }

    private FechamentoReservasPontoInativo fechamento(LocalDateTime agora) {
        var fuso = ZoneId.of("America/Maceio");
        var clock = Clock.fixed(agora.atZone(fuso).toInstant(), fuso);
        return new FechamentoReservasPontoInativo(reservas, reservaService, new RegrasTemporaisReserva(clock), clock);
    }
}
