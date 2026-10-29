package com.maragogi.maragobus.dto.reserva;

import com.maragogi.maragobus.enums.StatusReserva;
import java.time.LocalDate;

public record ConfirmacaoProximaReservaResponse(LocalDate dataUtilizacao, StatusReserva statusReserva) {}
