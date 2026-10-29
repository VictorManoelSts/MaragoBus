package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import java.time.LocalDateTime;
import java.util.UUID;

public record SolicitacaoAdvertenciaResponse(UUID id, UUID motoristaSolicitanteId, UUID alunoId,
                                            String descricao, StatusSolicitacaoAdvertencia status,
                                            LocalDateTime dataHoraSolicitacao) {}
