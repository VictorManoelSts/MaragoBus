package com.maragogi.maragobus.dto.reserva;

import com.maragogi.maragobus.enums.StatusReserva;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReservaResponse(UUID id, UUID alunoId, LocalDate dataUtilizacao,
                              LocalDateTime dataHoraReserva, StatusReserva statusReserva,
                              UUID pontoEmbarqueId, String pontoEmbarqueNome,
                              LocalDateTime dataHoraCancelamento) {}
