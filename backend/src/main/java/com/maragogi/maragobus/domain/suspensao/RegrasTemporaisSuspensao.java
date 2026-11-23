package com.maragogi.maragobus.domain.suspensao;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.exception.RegraNegocioException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;

/** Regras puras de progressão e calendário de suspensão; sem acesso à persistência. */
@Component
public class RegrasTemporaisSuspensao {
    private static final LocalTime LIMITE_INICIO_MESMO_DIA = LocalTime.of(11, 0);
    private final RegrasTemporaisReserva regrasTemporaisReserva;

    public RegrasTemporaisSuspensao(RegrasTemporaisReserva regrasTemporaisReserva) {
        this.regrasTemporaisReserva = Objects.requireNonNull(
                regrasTemporaisReserva, "As regras temporais de reserva são obrigatórias.");
    }

    public boolean deveGerarSuspensao(long totalAdvertenciasAprovadas) {
        return totalAdvertenciasAprovadas > 0 && totalAdvertenciasAprovadas % 3 == 0;
    }

    public DuracaoSuspensao calcularDuracao(long totalAdvertenciasAprovadas) {
        if (!deveGerarSuspensao(totalAdvertenciasAprovadas)) {
            throw new RegraNegocioException(
                    "A quantidade de advertências aprovadas não completa um ciclo de suspensão.");
        }
        if (totalAdvertenciasAprovadas == 3) {
            return DuracaoSuspensao.UM_DIA;
        }
        if (totalAdvertenciasAprovadas == 6) {
            return DuracaoSuspensao.TRES_DIAS;
        }
        return DuracaoSuspensao.CINCO_DIAS;
    }

    /**
     * Antes das 11:00 em dia de transporte -> inicia no próprio dia.
     * A partir das 11:00 ou em fim de semana -> inicia no próximo dia de transporte.
     */
    public LocalDate calcularDataInicio(LocalDateTime dataHoraAplicacao) {
        Objects.requireNonNull(dataHoraAplicacao, "A data e hora de aplicação são obrigatórias.");
        LocalDate data = dataHoraAplicacao.toLocalDate();
        LocalTime hora = dataHoraAplicacao.toLocalTime();

        if (regrasTemporaisReserva.ehDiaTransporte(data) && hora.isBefore(LIMITE_INICIO_MESMO_DIA)) {
            return data;
        }
        return regrasTemporaisReserva.proximoDiaTransporte(data);
    }

    /** Conta somente dias de transporte (segunda a sexta), sendo dataInicio o 1º dia. */
    public LocalDate calcularDataFim(LocalDate dataInicio, DuracaoSuspensao duracao) {
        Objects.requireNonNull(dataInicio, "A data de início é obrigatória.");
        Objects.requireNonNull(duracao, "A duração da suspensão é obrigatória.");
        if (!regrasTemporaisReserva.ehDiaTransporte(dataInicio)) {
            throw new RegraNegocioException("A data de início da suspensão deve ser um dia de transporte.");
        }

        LocalDate dataFim = dataInicio;
        for (int i = 1; i < duracao.getDias(); i++) {
            dataFim = regrasTemporaisReserva.proximoDiaTransporte(dataFim);
        }
        return dataFim;
    }

    public boolean cobreData(LocalDate dataInicio, LocalDate dataFim, LocalDate dataUtilizacao) {
        Objects.requireNonNull(dataInicio, "A data de início é obrigatória.");
        Objects.requireNonNull(dataFim, "A data de término é obrigatória.");
        Objects.requireNonNull(dataUtilizacao, "A data de utilização é obrigatória.");
        return !dataUtilizacao.isBefore(dataInicio) && !dataUtilizacao.isAfter(dataFim);
    }
}