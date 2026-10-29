package com.maragogi.maragobus.dto.reserva;

import java.time.LocalDate;
import java.util.List;

public record ResumoReservasMotoristaResponse(LocalDate dataUtilizacao, long totalReservas,
                                             int quantidadeFaculdades, List<ResumoFaculdadeResponse> faculdades) {}
