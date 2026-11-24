package com.maragogi.maragobus.dto.distribuicao;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ItemDistribuicaoRequest(
        @NotNull(message = "A faculdade é obrigatória.")
        UUID faculdadeId,
        @NotNull(message = "O motorista é obrigatório.")
        UUID motoristaId
) {}