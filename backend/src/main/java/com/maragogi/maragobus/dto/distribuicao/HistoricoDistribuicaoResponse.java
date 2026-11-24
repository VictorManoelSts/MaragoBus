package com.maragogi.maragobus.dto.distribuicao;

import com.maragogi.maragobus.enums.AcaoAuditoriaDistribuicao;

import java.time.LocalDateTime;
import java.util.UUID;

public record HistoricoDistribuicaoResponse(
        UUID id,
        int numeroRevisao,
        AcaoAuditoriaDistribuicao acao,
        UUID motoristaResponsavelId,
        String motoristaResponsavelNome,
        LocalDateTime dataHora,
        String resumoAlteracao
) {}