package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import java.time.LocalDateTime;
import java.util.UUID;

public record SolicitacaoAdvertenciaPendenteResponse(UUID id, UUID alunoId, String alunoNome,
        UUID motoristaSolicitanteId, String motoristaSolicitanteNome, String descricao,
        LocalDateTime dataHoraSolicitacao, StatusSolicitacaoAdvertencia status) {}
