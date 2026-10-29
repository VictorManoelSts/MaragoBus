package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import java.time.LocalDateTime;
import java.util.UUID;

public record RecusaSolicitacaoAdvertenciaResponse(UUID id, StatusSolicitacaoAdvertencia status,
        UUID administradorResponsavelId, LocalDateTime dataHoraAnalise, String observacaoAnalise) {}
