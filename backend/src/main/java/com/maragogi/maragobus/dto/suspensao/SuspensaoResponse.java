package com.maragogi.maragobus.dto.suspensao;

import com.maragogi.maragobus.enums.DuracaoSuspensao;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record SuspensaoResponse(
        UUID id,
        UUID alunoId,
        String nomeAluno,
        UUID advertenciaOrigemId,
        UUID administradorResponsavelId,
        DuracaoSuspensao duracao,
        int duracaoDiasTransporte,
        LocalDate dataInicio,
        LocalDate dataFim,
        LocalDateTime dataHoraAplicacao,
        boolean vigente) {}