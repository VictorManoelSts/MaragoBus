package com.maragogi.maragobus.dto.datasemfuncionamento;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record DataSemFuncionamentoResponse(
        UUID id,
        LocalDate data,
        String motivo,
        UUID administradorResponsavelId,
        String administradorResponsavelNome,
        LocalDateTime dataHoraCadastro,
        long reservasCanceladas,
        long suspensoesEstendidas
) {}