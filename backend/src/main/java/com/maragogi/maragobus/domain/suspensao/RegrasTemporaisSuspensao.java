package com.maragogi.maragobus.domain.suspensao;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.enums.DuracaoSuspensao;
import com.maragogi.maragobus.exception.RegraNegocioException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;
import java.util.Set;

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
     * A partir das 11:00 ou em dia sem transporte -> inicia no próximo dia de transporte.
     */
    public LocalDate calcularDataInicio(LocalDateTime dataHoraAplicacao) {
        return calcularDataInicio(dataHoraAplicacao, Set.of());
    }

    public LocalDate calcularDataInicio(LocalDateTime dataHoraAplicacao, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(dataHoraAplicacao, "A data e hora de aplicação são obrigatórias.");
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        LocalDate data = dataHoraAplicacao.toLocalDate();
        LocalTime hora = dataHoraAplicacao.toLocalTime();

        if (regrasTemporaisReserva.ehDiaTransporte(data, datasSemFuncionamento)
                && hora.isBefore(LIMITE_INICIO_MESMO_DIA)) {
            return data;
        }
        return regrasTemporaisReserva.proximoDiaTransporte(data, datasSemFuncionamento);
    }

    /** Conta somente dias com funcionamento do transporte, sendo dataInicio o 1º dia. */
    public LocalDate calcularDataFim(LocalDate dataInicio, DuracaoSuspensao duracao) {
        return calcularDataFim(dataInicio, duracao, Set.of());
    }

    public LocalDate calcularDataFim(LocalDate dataInicio, DuracaoSuspensao duracao, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(dataInicio, "A data de início é obrigatória.");
        Objects.requireNonNull(duracao, "A duração da suspensão é obrigatória.");
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        if (!regrasTemporaisReserva.ehDiaTransporte(dataInicio, datasSemFuncionamento)) {
            throw new RegraNegocioException("A data de início da suspensão deve ser um dia de transporte.");
        }

        LocalDate dataFim = dataInicio;
        for (int i = 1; i < duracao.getDias(); i++) {
            dataFim = regrasTemporaisReserva.proximoDiaTransporte(dataFim, datasSemFuncionamento);
        }
        return dataFim;
    }

    /** Avança a data de término em um dia de transporte quando uma data interna à suspensão é bloqueada. */
    public LocalDate estenderDataFim(LocalDate dataFimAtual, Set<LocalDate> datasSemFuncionamento) {
        Objects.requireNonNull(dataFimAtual, "A data de término atual é obrigatória.");
        Objects.requireNonNull(datasSemFuncionamento, "As datas sem funcionamento são obrigatórias.");
        return regrasTemporaisReserva.proximoDiaTransporte(dataFimAtual, datasSemFuncionamento);
    }

    public boolean cobreData(LocalDate dataInicio, LocalDate dataFim, LocalDate dataUtilizacao) {
        Objects.requireNonNull(dataInicio, "A data de início é obrigatória.");
        Objects.requireNonNull(dataFim, "A data de término é obrigatória.");
        Objects.requireNonNull(dataUtilizacao, "A data de utilização é obrigatória.");
        return !dataUtilizacao.isBefore(dataInicio) && !dataUtilizacao.isAfter(dataFim);
    }
}