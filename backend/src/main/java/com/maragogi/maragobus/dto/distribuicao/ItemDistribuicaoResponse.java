package com.maragogi.maragobus.dto.distribuicao;

import java.util.UUID;

public record ItemDistribuicaoResponse(
        UUID faculdadeId,
        String faculdadeNome,
        UUID motoristaId,
        String motoristaNome
) {}