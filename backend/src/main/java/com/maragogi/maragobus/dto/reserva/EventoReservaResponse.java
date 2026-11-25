package com.maragogi.maragobus.dto.reserva;

import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoEventoReserva;
import com.maragogi.maragobus.enums.TipoUsuario;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record EventoReservaResponse(
        UUID id,
        UUID reservaId,
        UUID alunoId,
        TipoEventoReserva tipoEvento,
        StatusReserva statusAnterior,
        StatusReserva statusNovo,
        UUID autorId,
        String autorNome,
        TipoUsuario autorTipo,
        String motivo,
        LocalDateTime dataHoraEvento,
        LocalDate dataUtilizacao,
        UUID pontoEmbarqueId,
        String pontoEmbarqueNome,
        UUID faculdadeId,
        String faculdadeNome,
        String cursoNome
) {}