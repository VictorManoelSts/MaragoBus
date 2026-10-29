package com.maragogi.maragobus.domain.reserva;

import com.maragogi.maragobus.exception.RegraNegocioException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Objects;

/** Regras exclusivamente temporais; não avalia status, autorização ou existência de reservas. */
@Component
public class RegrasTemporaisReserva {
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private static final LocalTime ABERTURA = LocalTime.of(17, 0);
    private static final LocalTime ENCERRAMENTO = LocalTime.of(11, 0);
    private static final LocalTime CANCELAMENTO = LocalTime.of(16, 0);
    private final Clock clock;

    public RegrasTemporaisReserva(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "O relógio é obrigatório.").withZone(FUSO);
    }

    public boolean ehDiaTransporte(LocalDate data) {
        Objects.requireNonNull(data, "A data é obrigatória.");
        return data.getDayOfWeek() != DayOfWeek.SATURDAY && data.getDayOfWeek() != DayOfWeek.SUNDAY;
    }

    /** Retorna um dia estritamente posterior à data recebida, inclusive quando ela cai no fim de semana. */
    public LocalDate proximoDiaTransporte(LocalDate data) {
        Objects.requireNonNull(data, "A data é obrigatória.");
        LocalDate proximo = data.plusDays(1);
        while (!ehDiaTransporte(proximo)) {
            proximo = proximo.plusDays(1);
        }
        return proximo;
    }

    /** Retorna um dia estritamente anterior à data recebida. */
    public LocalDate diaTransporteAnterior(LocalDate data) {
        Objects.requireNonNull(data, "A data é obrigatória.");
        LocalDate anterior = data.minusDays(1);
        while (!ehDiaTransporte(anterior)) {
            anterior = anterior.minusDays(1);
        }
        return anterior;
    }

    public LocalDateTime aberturaReserva(LocalDate dataUtilizacao) {
        validarDiaUtilizacao(dataUtilizacao);
        return diaTransporteAnterior(dataUtilizacao).atTime(ABERTURA);
    }

    public LocalDateTime encerramentoReserva(LocalDate dataUtilizacao) {
        validarDiaUtilizacao(dataUtilizacao);
        return dataUtilizacao.atTime(ENCERRAMENTO);
    }

    public LocalDateTime limiteCancelamento(LocalDate dataUtilizacao) {
        validarDiaUtilizacao(dataUtilizacao);
        return dataUtilizacao.atTime(CANCELAMENTO);
    }

    public LocalDateTime limiteAlteracaoPontoEmbarque(LocalDate dataUtilizacao) {
        return encerramentoReserva(dataUtilizacao);
    }

    public boolean permiteReservar(LocalDate dataUtilizacao) {
        if (!ehDiaTransporte(dataUtilizacao)) {
            return false;
        }
        LocalDateTime agora = LocalDateTime.now(clock);
        return !agora.isBefore(aberturaReserva(dataUtilizacao)) && agora.isBefore(encerramentoReserva(dataUtilizacao));
    }

    /** Apenas o prazo temporal: não exige que a data atual seja a data de utilização. */
    public boolean permiteCancelar(LocalDate dataUtilizacao) {
        return ehDiaTransporte(dataUtilizacao) && LocalDateTime.now(clock).isBefore(limiteCancelamento(dataUtilizacao));
    }

    public boolean permiteAlterarPontoEmbarque(LocalDate dataUtilizacao) {
        return ehDiaTransporte(dataUtilizacao)
                && LocalDateTime.now(clock).isBefore(limiteAlteracaoPontoEmbarque(dataUtilizacao));
    }

    private void validarDiaUtilizacao(LocalDate dataUtilizacao) {
        if (!ehDiaTransporte(dataUtilizacao)) {
            throw new RegraNegocioException("A data de utilização deve ser de segunda a sexta-feira.");
        }
    }
}
