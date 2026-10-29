package com.maragogi.maragobus.dto.solicitacaoadvertencia;

import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import java.time.LocalDateTime;
import java.util.UUID;

public record AprovacaoSolicitacaoAdvertenciaResponse(UUID id, StatusSolicitacaoAdvertencia status,
        UUID administradorResponsavelId, LocalDateTime dataHoraAnalise, String observacaoAnalise, UUID advertenciaId) {}
