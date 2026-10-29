package com.maragogi.maragobus.dto.reserva;

/** Campos nulos representam ausência de reserva na respectiva posição do painel. */
public record PainelReservasAlunoResponse(ReservaResponse reservaAtual,
                                         ConfirmacaoProximaReservaResponse proximaReserva) {}
