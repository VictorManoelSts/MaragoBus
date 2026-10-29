package com.maragogi.maragobus.dto.reserva;

import java.util.List;
import java.util.UUID;

public record ResumoFaculdadeResponse(UUID faculdadeId, String faculdadeNome, long totalReservas,
                                      List<ResumoPontoEmbarqueResponse> pontosEmbarque) {}
