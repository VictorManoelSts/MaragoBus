package com.maragogi.maragobus.dto.reserva;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CriacaoReservaRequest(@NotNull LocalDate dataUtilizacao) {}
