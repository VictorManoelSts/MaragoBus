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
import java.util.Set;

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

    public boolean ehDiaTransporte(LocalDate data, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        return ehDiaTransporte(data) && !datasSemFuncionamento.contains(data);
    }

    /** Retorna um dia estritamente posterior à data recebida, inclusive quando ela cai no fim de semana. */
    public LocalDate proximoDiaTransporte(LocalDate data) {
        return proximoDiaTransporte(data, Set.of());
    }

    public LocalDate proximoDiaTransporte(LocalDate data, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(data, "A data é obrigatória.");
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        LocalDate proximo = data.plusDays(1);
        while (!ehDiaTransporte(proximo, datasSemFuncionamento)) {
            proximo = proximo.plusDays(1);
        }
        return proximo;
    }

    /** Retorna um dia estritamente anterior à data recebida. */
    public LocalDate diaTransporteAnterior(LocalDate data) {
        return diaTransporteAnterior(data, Set.of());
    }

    public LocalDate diaTransporteAnterior(LocalDate data, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(data, "A data é obrigatória.");
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        LocalDate anterior = data.minusDays(1);
        while (!ehDiaTransporte(anterior, datasSemFuncionamento)) {
            anterior = anterior.minusDays(1);
        }
        return anterior;
    }

    public LocalDateTime aberturaReserva(LocalDate dataUtilizacao) {
        return aberturaReserva(dataUtilizacao, Set.of());
    }

    public LocalDateTime aberturaReserva(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        validarDiaUtilizacao(dataUtilizacao, datasSemFuncionamento);
        return diaTransporteAnterior(dataUtilizacao, datasSemFuncionamento).atTime(ABERTURA);
    }

    public LocalDateTime encerramentoReserva(LocalDate dataUtilizacao) {
        return encerramentoReserva(dataUtilizacao, Set.of());
    }

    public LocalDateTime encerramentoReserva(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        validarDiaUtilizacao(dataUtilizacao, datasSemFuncionamento);
        return dataUtilizacao.atTime(ENCERRAMENTO);
    }

    public LocalDateTime limiteCancelamento(LocalDate dataUtilizacao) {
        return limiteCancelamento(dataUtilizacao, Set.of());
    }

    public LocalDateTime limiteCancelamento(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        validarDiaUtilizacao(dataUtilizacao, datasSemFuncionamento);
        return dataUtilizacao.atTime(CANCELAMENTO);
    }

    public LocalDateTime limiteAlteracaoPontoEmbarque(LocalDate dataUtilizacao) {
        return encerramentoReserva(dataUtilizacao);
    }

    public LocalDateTime limiteAlteracaoPontoEmbarque(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        return encerramentoReserva(dataUtilizacao, datasSemFuncionamento);
    }

    public boolean permiteReservar(LocalDate dataUtilizacao) {
        return permiteReservar(dataUtilizacao, Set.of());
    }

    public boolean permiteReservar(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        if (!ehDiaTransporte(dataUtilizacao, datasSemFuncionamento)) {
            return false;
        }
        LocalDateTime agora = LocalDateTime.now(clock);
        return !agora.isBefore(aberturaReserva(dataUtilizacao, datasSemFuncionamento))
                && agora.isBefore(encerramentoReserva(dataUtilizacao, datasSemFuncionamento));
    }

    /** Apenas o prazo temporal: não exige que a data atual seja a data de utilização. */
    public boolean permiteCancelar(LocalDate dataUtilizacao) {
        return permiteCancelar(dataUtilizacao, Set.of());
    }

    public boolean permiteCancelar(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        return ehDiaTransporte(dataUtilizacao, datasSemFuncionamento)
                && LocalDateTime.now(clock).isBefore(limiteCancelamento(dataUtilizacao, datasSemFuncionamento));
    }

    public boolean permiteAlterarPontoEmbarque(LocalDate dataUtilizacao) {
        return permiteAlterarPontoEmbarque(dataUtilizacao, Set.of());
    }

    public boolean permiteAlterarPontoEmbarque(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        return ehDiaTransporte(dataUtilizacao, datasSemFuncionamento)
                && LocalDateTime.now(clock).isBefore(limiteAlteracaoPontoEmbarque(dataUtilizacao, datasSemFuncionamento));
    }

    private void validarDiaUtilizacao(LocalDate dataUtilizacao, Set<LocalDate> datasSemFuncionamento) {
        if (!ehDiaTransporte(dataUtilizacao)) {
            throw new RegraNegocioException("A data de utilização deve ser de segunda a sexta-feira.");
        }
        if (datasSemFuncionamento.contains(dataUtilizacao)) {
            throw new RegraNegocioException("Não há funcionamento do transporte na data informada.");
        }
    }
}