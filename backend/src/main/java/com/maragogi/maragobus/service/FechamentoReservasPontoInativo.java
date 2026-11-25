package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.repository.ReservaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
@EnableScheduling
public class FechamentoReservasPontoInativo {
    private static final Logger log = LoggerFactory.getLogger(FechamentoReservasPontoInativo.class);
    private final ReservaRepository reservas;
    private final ReservaService reservaService;
    private final RegrasTemporaisReserva regrasTemporais;
    private final Clock clock;

    public FechamentoReservasPontoInativo(ReservaRepository reservas, ReservaService reservaService,
                                        RegrasTemporaisReserva regrasTemporais, Clock clock) {
        this.reservas = reservas;
        this.reservaService = reservaService;
        this.regrasTemporais = regrasTemporais;
        this.clock = clock.withZone(ZoneId.of("America/Maceio"));
    }

    @Scheduled(cron = "${maragobus.reservas.fechamento-ponto-inativo.cron:0 * 11-23 * * MON-FRI}",
            zone = "America/Maceio")
    public void executar() {
        var agora = LocalDateTime.now(clock);
        if (!regrasTemporais.atingiuFechamentoDoDia(agora)) {
            return;
        }
        for (var candidata : reservas.buscarParaFechamentoPorPontoInativo(agora.toLocalDate(), StatusReserva.CONFIRMADA)) {
            try {
                reservaService.cancelarPorPontoInativo(candidata.getAlunoId(), candidata.getReservaId());
            } catch (RuntimeException e) {
                log.error("Falha ao fechar reserva {} com ponto inativo", candidata.getReservaId(), e);
            }
        }
    }
}
