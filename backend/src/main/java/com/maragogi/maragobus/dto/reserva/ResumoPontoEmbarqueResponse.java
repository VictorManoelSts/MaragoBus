package com.maragogi.maragobus.dto.reserva;

import java.util.UUID;

public record ResumoPontoEmbarqueResponse(UUID pontoEmbarqueId, String pontoEmbarqueNome, long totalReservas) {}
